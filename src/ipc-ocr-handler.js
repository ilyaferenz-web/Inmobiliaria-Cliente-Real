// src/ipc-ocr-handler.js — VERSIÓN FINAL CON PATRONES CORREGIDOS
const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────
// IMPORTACIÓN CORRECTA DE pdf-parse (funciona con v1.1.x)
// ─────────────────────────────────────────────────────────────
let pdfParseFunc = null;
try {
  const mod = require('pdf-parse');
  if (typeof mod === 'function') {
    pdfParseFunc = mod; // versiones antiguas: función directa
  } else if (mod && typeof mod.PDFParse === 'function') {
    // v1.1.x: exporta clase — envolverla como función async
    pdfParseFunc = async (buffer) => {
      const parser = new mod.PDFParse();
      const data = await parser.extractText(buffer);
      if (typeof data === 'string') return { text: data };
      if (data && data.text) return data;
      return { text: '' };
    };
  } else if (mod && typeof mod.default === 'function') {
    pdfParseFunc = mod.default;
  }
  console.log('[OCR] pdf-parse cargado, tipo:', typeof pdfParseFunc);
} catch (e) {
  console.error('[OCR] Error cargando pdf-parse:', e.message);
}

// ─────────────────────────────────────────────────────────────
// EXTRACTOR DE TEXTO PDF
// ─────────────────────────────────────────────────────────────
async function extraerTextoPDF(bufferPDF) {
  // Método 1: pdf-parse
  if (pdfParseFunc) {
    try {
      const data = await pdfParseFunc(bufferPDF);
      const texto = data && data.text ? data.text : null;
      if (texto && texto.trim().length > 30) {
        console.log('[OCR-PDFPARSE] ✅ Texto extraído, largo:', texto.length);
        return texto;
      }
    } catch (e) {
      console.warn('[OCR-PDFPARSE] Error:', e.message);
    }
  }

  // Método 2: parseo manual BT...ET
  try {
    const raw = bufferPDF.toString('binary');
    const textos = [];
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let match;
    while ((match = btEtRegex.exec(raw)) !== null) {
      const strRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(match[1])) !== null) {
        const str = strMatch[1]
          .replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
          .replace(/\\\\/g, '\\')
          .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\(.)/g, '$1');
        if (str.trim().length > 1) textos.push(str.trim());
      }
    }
    if (textos.length > 5) {
      const res = textos.join(' ');
      const legibles = res.split('').filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127).length;
      if (legibles / res.length > 0.6) {
        console.log('[OCR-MANUAL] ✅ largo:', res.length);
        return res;
      }
    }
  } catch (e) {
    console.warn('[OCR-MANUAL] Error:', e.message);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// PARSER AFIP — PATRONES CORREGIDOS
// ─────────────────────────────────────────────────────────────
function parsearDatosAFIP(texto, debugPath) {
  console.log('[OCR-PARSER] Texto largo:', texto.length);
  console.log('[OCR-PARSER] Preview:\n', texto.substring(0, 500));

  // Guardar texto completo para debug — genera debug-texto.txt en raíz del proyecto
  if (debugPath) {
    try { fs.writeFileSync(debugPath, texto, 'utf8'); console.log('[OCR] Debug guardado en:', debugPath); }
    catch(e) { console.warn('[OCR] No se pudo guardar debug:', e.message); }
  }

  const resultado = { numero: null, monto: null, fecha: null, razonSocial: null, cuit: null };

  // ── NÚMERO: Punto de Venta + Comp. Nro ────────────────────
  // Permitir hasta 300 chars entre ellos y aceptar "Comp.Nro:" sin espacio
  const mNum = texto.match(
    /Punto\s+de\s+Venta[:\s]*Comp\.?N?r?o?[:\s]*[\s\S]{0,10}([\d]{5})([\d]{8})/i
  );
  if (mNum) {
    resultado.numero = `${mNum[1]}-${mNum[2]}`;
    console.log(`[OCR-NUM] ✓ Número compuesto encontrado: ${resultado.numero}`);
  } else {
    // Fallback: buscar por separado
    const mPdv = texto.match(/Punto\s+de\s+Venta[:\s]*Comp\.?N?r?o?[:\s]*[\s\S]{0,10}([\d]{5})/i);
    const mNro = texto.match(/Punto\s+de\s+Venta[:\s]*Comp\.?N?r?o?[:\s]*[\s\S]{0,10}[\d]{5}([\d]{8})/i);
    if (mPdv && mNro) {
      resultado.numero = `${mPdv[1]}-${mNro[1]}`;
      console.log(`[OCR-NUM] ✓ Número por separado encontrado: ${resultado.numero}`);
    } else {
      // Último fallback: buscar el patrón exacto del PDF
      const mExacto = texto.match(/Punto\s+de\s+Venta[:\s]*Comp\.?N?r?o?[:\s]*\s*([\d]{5})([\d]{8})/im);
      if (mExacto) {
        resultado.numero = `${mExacto[1]}-${mExacto[2]}`;
        console.log(`[OCR-NUM] ✓ Número exacto encontrado: ${resultado.numero}`);
      }
    }
  }

  // ── MONTO: buscar SOLO después de "Importe Total" ─────────
  // NUNCA usar el primer $ ni "Total" genérico — agarra la dirección "173" o subtotales
  const idxImporteTotal = texto.search(/Importe\s+Total/i);
  if (idxImporteTotal !== -1) {
    // Trabajar solo con los 80 chars después de "Importe Total"
    const fragmento = texto.substring(idxImporteTotal, idxImporteTotal + 80);
    console.log('[OCR-MONTO] Fragmento Importe Total:', fragmento.replace(/\n/g,' '));

    // Buscar número con formato argentino: 36900,00 o 36.900,00
    const mMonto = fragmento.match(/([\d]{2,}(?:\.\d{3})*,\d{2})/);
    if (mMonto) {
      const raw = mMonto[1].replace(/\./g, '').replace(',', '.');
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0) resultado.monto = num;
    }

    // Fallback: cualquier secuencia numérica de 3+ dígitos en ese fragmento
    if (!resultado.monto) {
      const mMonto2 = fragmento.match(/(\d{3,})/);
      if (mMonto2) {
        const num = parseFloat(mMonto2[1]);
        if (!isNaN(num) && num >= 100) resultado.monto = num;
      }
    }
  }

  // Si no se encontró monto después de "Importe Total", buscar en todo el texto
  if (!resultado.monto) {
    console.log('[OCR-MONTO] Buscando monto en todo el texto...');
    
    // Buscar "$ XXXXX,XX" en todo el texto
    const montosDinero = [...texto.matchAll(/\$\s*([\d]{1,3}(?:[\.,][\d]{3})*[,\d]{2})/g)];
    for (const m of montosDinero) {
      const raw = m[1].replace(/\./g, '').replace(',', '.');
      const num = parseFloat(raw);
      if (!isNaN(num) && num >= 100) {
        resultado.monto = num;
        console.log(`[OCR-MONTO] ✓ Monto encontrado con $: $${num}`);
        break;
      }
    }
    
    // Último fallback: la ÚLTIMA cantidad X,XX que aparece en todo el texto
    if (!resultado.monto) {
      const todosMontos = [...texto.matchAll(/(\d{3,}),(\d{2})/g)];
      if (todosMontos.length > 0) {
        const ultimo = todosMontos[todosMontos.length - 1];
        const num = parseFloat(ultimo[1].replace(/\./g, '') + '.' + ultimo[2]);
        if (!isNaN(num) && num >= 100) {
          resultado.monto = num;
          console.log(`[OCR-MONTO] ✓ Último monto encontrado: $${num}`);
        }
      }
    }
  }

  // ── FECHA: priorizar "Fecha de Emisión" ───────────────────
  const mFechaEmision = texto.match(
    /Fecha\s+de\s+Emisi[oó]n[:\s]*([\d]{1,2}\/[\d]{1,2}\/[\d]{4})/i
  );
  if (mFechaEmision) {
    resultado.fecha = mFechaEmision[1];
  } else {
    const mFecha = texto.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    if (mFecha) resultado.fecha = mFecha[1];
  }

  // ── DATOS ADICIONALES ─────────────────────────────────────
  const mCuit = texto.match(/CUIT[:\s]*([\d\-]{11,13})/i);
  if (mCuit) resultado.cuit = mCuit[1];

  const mRS = texto.match(/Raz[oó]n\s+Social[:\s]*([^\n\r]+)/i);
  if (mRS) resultado.razonSocial = mRS[1].trim().substring(0, 80);

  const camposEncontrados = [resultado.numero, resultado.monto, resultado.fecha].filter(Boolean).length;
  console.log(`[OCR] ✅ N=${resultado.numero} | $=${resultado.monto} | fecha=${resultado.fecha} | campos=${camposEncontrados}/3`);

  return { ...resultado, camposEncontrados };
}

// ─────────────────────────────────────────────────────────────
// IPC HANDLERS
// ─────────────────────────────────────────────────────────────
function registrarHandlersOCR() {

  ipcMain.handle('extraer-datos-factura', async (event, filePath) => {
    console.log('[OCR] ── Procesando:', path.basename(filePath), '──');
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: `Archivo no encontrado: ${filePath}`, datos: null };
      }

      const buffer = fs.readFileSync(filePath);
      console.log(`[OCR] Leído: ${(buffer.length / 1024).toFixed(1)} KB`);

      const texto = await extraerTextoPDF(buffer);
      if (!texto) {
        return {
          success: false,
          error: 'No se pudo extraer texto. El PDF puede ser una imagen escaneada.',
          datos: null
        };
      }

      // debugPath: guarda el texto completo para que puedas ver qué extrae pdf-parse
      const debugPath = path.join(__dirname, '..', 'debug-texto.txt');
      const datos = parsearDatosAFIP(texto, debugPath);

      return {
        success: true,
        datos,
        metadata: {
          archivo: path.basename(filePath),
          tamano: buffer.length,
          camposEncontrados: datos.camposEncontrados
        }
      };
    } catch (error) {
      console.error('[OCR] Error inesperado:', error.message);
      return { success: false, error: error.message, datos: null };
    }
  });

  ipcMain.handle('extraer-datos-factura-buffer', async (event, bufferArray) => {
    try {
      const buffer = Buffer.from(bufferArray);
      const texto = await extraerTextoPDF(buffer);
      if (!texto) return { success: false, error: 'No se pudo extraer texto', datos: null };
      const debugPath = path.join(__dirname, '..', 'debug-texto.txt');
      const datos = parsearDatosAFIP(texto, debugPath);
      return { success: true, datos, metadata: { tamano: buffer.length, camposEncontrados: datos.camposEncontrados } };
    } catch (error) {
      return { success: false, error: error.message, datos: null };
    }
  });

  console.log('[OCR] Handlers registrados correctamente');
}

module.exports = { registrarHandlersOCR };
