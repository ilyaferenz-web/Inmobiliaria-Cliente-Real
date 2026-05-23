const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Extractor OCR AFIP - Versión para PDFs con texto seleccionable
 * Si puedes copiar/pegar del PDF, este método funcionará
 */

/**
 * Extrae texto de PDF usando pdf-parse (para PDFs con texto seleccionable)
 */
async function extraerTextoSeleccionable(pdfPath) {
  console.log('\n[PDF-PARSE] Extrayendo texto de PDF seleccionable...');
  
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Opciones para pdf-parse
    const options = {
      // Máximo de caracteres por página (sin límite)
      max: 0,
      // Intentar extraer todo el texto posible
      normalizeWhitespace: false,
      // No combinar líneas automáticamente
      disableCombineTextItems: false
    };
    
    const data = await pdfParse(dataBuffer);
    
    console.log(`[PDF-PARSE] Páginas: ${data.numpages}`);
    console.log(`[PDF-PARSE] Texto extraído: ${data.text.length} caracteres`);
    
    if (data.text && data.text.trim().length > 0) {
      console.log(`[PDF-PARSE] Preview (primeros 500 chars):`);
      console.log(data.text.substring(0, 500));
      
      return {
        success: true,
        texto: data.text,
        metadata: {
          paginas: data.numpages,
          info: data.info,
          metadata: data.metadata
        }
      };
    }
    
    return { success: false, error: 'No se encontró texto' };
    
  } catch (error) {
    console.log(`[PDF-PARSE] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Parsea datos de factura AFIP desde texto extraído
 */
function parsearDatosFactura(texto) {
  console.log('\n[PARSER] Parseando datos de factura AFIP...');
  console.log(`[PARSER] Texto a procesar: ${texto.length} caracteres`);
  
  const datos = {};
  
  // Función auxiliar para buscar múltiples patrones
  function buscarPatrones(patronArray, campo) {
    for (const patron of patronArray) {
      const match = texto.match(patron);
      if (match && match[1]) {
        datos[campo] = match[1];
        console.log(`[PARSER] ✓ ${campo}: ${match[1]}`);
        return true;
      }
    }
    return false;
  }
  
  // PUNTO DE VENTA
  buscarPatrones([
    /Punto\s+de\s+Venta[:\s]*0*(\d{1,5})/i,
    /Pto\.?\s*Venta[:\s]*0*(\d{1,5})/i,
    /P\.?\s*de\s+Venta[:\s]*0*(\d{1,5})/i,
    /Pto\.?\s*de\s+Vta\.?[:\s]*0*(\d{1,5})/i,
    /Punto\s+de\s+Venta:\s*(\d{1,5})/i
  ], 'puntoVenta');
  
  // NÚMERO DE COMPROBANTE
  buscarPatrones([
    /Comp\.?\s*Nro\.?[:\s]*0*(\d{4,8})/i,
    /Comprobante\s+N[°º\.]\s*[:\s]*0*(\d{4,8})/i,
    /N[úu]mero[:\s]*0*(\d{4,8})/i,
    /Nro\.?[:\s]*0*(\d{8})/i,
    /Comp\.?\s+N[úu]mero[:\s]*0*(\d{4,8})/i
  ], 'numeroComprobante');
  
  // IMPORTE TOTAL - Búsqueda más exhaustiva
  buscarPatrones([
    /Importe\s+Total[:\s]*\$?\s*([\d.,]+)/i,
    /Total[:\s]+\$\s*([\d.,]+)/i,
    /Imp\.?\s*Total[:\s]*\$?\s*([\d.,]+)/i,
    /\$\s*([\d]{2,3}\.[\d]{3},[\d]{2})/,
    /Total\s+General[:\s]*\$?\s*([\d.,]+)/i,
    /Importe\s+a\s+Pagar[:\s]*\$?\s*([\d.,]+)/i
  ], 'montoStr');
  
  // Procesar monto encontrado
  if (datos.montoStr) {
    const montoStr = datos.montoStr.replace(/\./g, '').replace(',', '.');
    const monto = parseFloat(montoStr);
    if (!isNaN(monto) && monto >= 10 && monto <= 10000000) {
      datos.monto = monto;
      console.log(`[PARSER] ✓ Monto procesado: $${monto.toFixed(2)}`);
    }
    delete datos.montoStr;
  }
  
  // FECHA DE EMISIÓN
  buscarPatrones([
    /Fecha\s+de\s+Emisi[oó]n[:\s]*([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4})/i,
    /Emisi[oó]n[:\s]*([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4})/i,
    /Fecha[:\s]*([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4})/i,
    /Fecha\s+[:\s]*([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{4})/i
  ], 'fecha');
  
  // CUIT
  buscarPatrones([
    /CUIT[:\s]*([\d\-]{11,13})/i,
    /C\.?U\.?I\.?T\.?[:\s]*([\d\-]{11,13})/i,
    /([\d]{2}\-?[\d]{8}\-?[\d]{1})/
  ], 'cuit');
  
  // Procesar CUIT
  if (datos.cuit) {
    datos.cuit = datos.cuit.replace(/\-/g, '');
    if (datos.cuit.length === 11 && /^\d+$/.test(datos.cuit)) {
      console.log(`[PARSER] ✓ CUIT procesado: ${datos.cuit}`);
    } else {
      delete datos.cuit;
    }
  }
  
  // RAZÓN SOCIAL
  buscarPatrones([
    /Raz[oó]n\s+Social[:\s]+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{10,150})/i,
    /Apellido\s+y\s+Nombre[:\s]+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{10,150})/i,
    /Nombre[:\s]+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{10,100})/i
  ], 'razonSocial');
  
  // Generar número completo
  if (datos.puntoVenta && datos.numeroComprobante) {
    datos.numero = `${datos.puntoVenta.padStart(5, '0')}-${datos.numeroComprobante.padStart(8, '0')}`;
    console.log(`[PARSER] ✓ Número completo: ${datos.numero}`);
  }
  
  const camposEncontrados = Object.keys(datos).filter(k => k !== 'numero').length;
  
  console.log(`[PARSER] Campos extraídos: ${camposEncontrados}/6`);
  
  return {
    datos,
    camposEncontrados,
    exitoso: camposEncontrados >= 3
  };
}

/**
 * Función principal de extracción
 */
async function extraerDatosConOCR(pdfPath) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  EXTRACTOR OCR AFIP - PDFS CON TEXTO SELECCIONABLE       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`[MAIN] Procesando: ${pdfPath}`);
  
  try {
    // Extraer texto con pdf-parse
    const resultadoExtraccion = await extraerTextoSeleccionable(pdfPath);
    
    if (!resultadoExtraccion.success) {
      return {
        success: false,
        error: resultadoExtraccion.error,
        metadata: {
          metodo: 'pdf-parse',
          paginas: 0
        }
      };
    }
    
    console.log(`\n[MAIN] ✓ Texto extraído con pdf-parse`);
    
    // Parsear datos
    const resultadoParseo = parsearDatosFactura(resultadoExtraccion.texto);
    
    if (!resultadoParseo.exitoso) {
      return {
        success: false,
        error: `Solo se encontraron ${resultadoParseo.camposEncontrados} de 3 campos mínimos`,
        datosExtraidos: resultadoParseo.datos,
        metodo: 'pdf-parse',
        textoExtraido: resultadoExtraccion.texto.substring(0, 1000)
      };
    }
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                 ✓ EXTRACCIÓN EXITOSA                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    return {
      success: true,
      datos: resultadoParseo.datos,
      metadata: {
        metodo: 'pdf-parse',
        camposEncontrados: resultadoParseo.camposEncontrados,
        paginas: resultadoExtraccion.metadata.paginas
      }
    };
    
  } catch (error) {
    console.error('\n[MAIN] ❌ ERROR:', error.message);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// IPC Handlers para Electron
function registrarHandlersOCR() {
  const { ipcMain } = require('electron');
  
  ipcMain.handle('extraer-datos-factura', async (event, filePath) => {
    console.log('[OCR] Procesando:', filePath);
    
    try {
      const resultado = await extraerDatosConOCR(filePath);
      return resultado;
    } catch (error) {
      console.error('[OCR] Error en handler:', error.message);
      return {
        success: false,
        error: error.message,
        datos: null
      };
    }
  });
  
  ipcMain.handle('extraer-datos-factura-buffer', async (event, bufferArray) => {
    try {
      const buffer = Buffer.from(bufferArray);
      
      // Crear archivo temporal
      const path = require('path');
      const fs = require('fs');
      const tempPath = path.join(__dirname, 'temp_pdf.pdf');
      fs.writeFileSync(tempPath, buffer);
      
      // Procesar como archivo
      const resultado = await extraerDatosConOCR(tempPath);
      
      // Limpiar archivo temporal
      fs.unlinkSync(tempPath);
      
      return resultado;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        datos: null
      };
    }
  });
  
  console.log('[OCR] Handlers registrados correctamente (PDFs con texto seleccionable)');
}

module.exports = {
  extraerDatosConOCR,
  registrarHandlersOCR
};
