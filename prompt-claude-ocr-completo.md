🚨 PROMPT COMPLETO PARA CLAUDE - SOLUCIÓN DEFINITIVA OCR PROYECTO PALO

PROBLEMA CRÍTICO ACTUAL
El extractor OCR está extrayendo solo caracteres binarios (:Qw) en lugar de texto legible de facturas AFIP. Antes funcionaba con pdf2json pero ahora falla.

CONTEXTO COMPLETO DEL PROYECTO
- Aplicación Electron + React para gestión de edificios
- Base de datos SQLite en ./edificios.db
- Sistema OCR para extraer datos de facturas AFIP desde PDFs
- Frontend: src/GestionEdificios.jsx (React)
- Backend: main.js (proceso principal de Electron)
- Handler OCR: src/ipc-ocr-handler.js

ESTADO ACTUAL - LOGS DEL ERROR
```
[OCR] Procesando: 1 Enero - 796.pdf
[OCR] Archivo leído: 221.4 KB
[OCR] Iniciando extracción manual robusta
[OCR-MANUAL] Texto extraído con método manual, largo: 4
[OCR-MANUAL] Preview: :Qw
[OCR-PARSER] Texto legible recibido, largo: 4
[OCR-PARSER] Preview: :Qw
[OCR] N=null | $=null | fecha=null | campos=0/3
```

PROBLEMA: Solo extrae 4 caracteres binarios en lugar del texto completo.

FUNCIONAMIENTO ESPERADO (según conversaciones anteriores)
```
[OCR] Texto extraído via pdf2json ✓
[OCR] Texto extraído (primeros 400 chars):
Fecha de Emisión: ORIGINAL ROLDAN RUBEN ALBERTO Pellegrini Carlos 173 Piso:02 Dpto:C - Ciudad de Buenos Aires Período Facturado Desde: Hasta: Fecha de Vto. para el pago: Condición de venta: Condición frente al IVA: Apellido y Nombre / Razón Social: Domicilio: 01/07/2025 01/07/2025 30/07/2025 02/07/2025 20115999312 CONSORCIO PROPIETARIOS ONCE DE SEPTIEMBRE DE MIL OCHOCIENTOS 11 De Sept. De 1888 396
[OCR] Campos detectados: 3/3
```

DEPENDENCIAS INSTALADAS (package.json)
```json
{
  "dependencies": {
    "pdf-parse": "^2.4.5",
    "pdfjs-dist": "^5.6.205", 
    "pdf2json": "^4.0.2",
    "pdf-lib": "^1.17.1",
    "sqlite3": "^5.1.6",
    "electron": "^28.0.0"
  }
}
```

PROBLEMAS CON CADA LIBRERÍA (histórico)
1. **pdf-parse**: Causa pantalla negra en Electron (eval() bloqueado por contextIsolation)
2. **pdfjs-dist**: Problemas de importación en Node.js (.mjs modules, workerSrc issues)
3. **pdf2json**: Funciona pero a veces causa "URIError: URI malformed" en decodeURIComponent

CÓDIGOS ACTUALES COMPLETOS

=== 1. main.js (proceso principal Electron) ===
```javascript
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const { shell } = require('electron');
const { PDFDocument } = require('pdf-lib');
const { registrarHandlersOCR } = require('./src/ipc-ocr-handler');

// ... (código de base de datos y ventanas)

// Register the native OCR handler
registrarHandlersOCR();

// IPC Handlers for database operations
ipcMain.handle('obtenerEdificios', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, direccion FROM buildings', [], (err, rows) => {
      if (err) return reject(err);
      const mapped = (rows || []).map(r => ({ id: r.id, direccion: r.direccion }));
      resolve(mapped);
    });
  });
});

// ... más handlers IPC
```

=== 2. src/ipc-ocr-handler.js (handler OCR actual) ===
```javascript
/**
 * ipc-ocr-handler.js
 * SOLUCIÓN DEFINITIVA: usa pdf2json con manejo robusto de errores
 */

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Importación de pdf2json
let PDFParser;
try {
  PDFParser = require('pdf2json').PDFParser;
} catch (e) {
  console.error('[OCR] pdf2json no instalado. Ejecutar: npm install pdf2json');
}

// Parser AFIP
function parsearDatosAFIP(texto) {
  console.log('[OCR-PARSER] Texto legible recibido, largo:', texto.length);
  console.log('[OCR-PARSER] Preview:', texto.substring(0, 300));

  const resultado = {
    numero: null,
    monto: null,
    fecha: null,
    razonSocial: null,
    cuit: null,
    periodo: null,
    rawText: texto
  };

  // Número de factura AFIP
  const matchPdV = texto.match(
    /Punto\s+de\s+Venta[:\s]*([\d]+)[\s\S]{0,30}?Comp\.?\s*Nro[:\s]*([\d]+)/i
  );
  if (matchPdV) {
    resultado.numero = `${matchPdV[1].padStart(5,'0')}-${matchPdV[2].padStart(8,'0')}`;
  } else {
    const m = texto.match(/(\d{4,5})[- ](\d{7,8})/);
    if (m) resultado.numero = `${m[1]}-${m[2]}`;
  }

  // Monto total
  const patronesMonto = [
    /Importe\s+Total[:\s$]*\s*([\d.,]+)/i,
    /Total[:\s$]*\s*([\d.,]+)/i,
    /\$\s*([\d.,]+)/,
    /Importe\s+Total[:\s]*\$?\s*([\d.,]+)/i,
    /Total\s+a\s+Pagar[:\s]*\$?\s*([\d.,]+)/i,
    /Importe[:\s]*\$?\s*([\d.,]+)/i,
  ];
  for (const p of patronesMonto) {
    const m = texto.match(p);
    if (m) {
      let raw = m[1].replace(/\s/g, '');
      if (raw.includes('.') && raw.includes(',')) {
        raw = raw.replace(/\./g, '').replace(',', '.');
      } else if (raw.includes(',')) {
        raw = raw.replace(',', '.');
      } else if (raw.includes('.')) {
        if (!raw.endsWith('.00') && raw.split('.').length > 2) {
          raw = raw.replace(/\./g, '');
        }
      }
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0) {
        resultado.monto = num;
        console.log(`[OCR-PARSER] Monto detectado: ${num} (raw: "${m[1]}")`);
        break;
      }
    }
  }

  // Fecha de Emisión
  const patronesFecha = [
    /Fecha\s+de\s+Emisi[oó]n[:\s]*([\d]{1,2}\/[\d]{1,2}\/[\d]{4})/i,
    /Fecha\s+de\s+Vto[^:]*[:\s]*([\d]{1,2}\/[\d]{1,2}\/[\d]{4})/i,
    /([\d]{2}\/[\d]{2}\/[\d]{4})/,
  ];
  for (const p of patronesFecha) {
    const m = texto.match(p);
    if (m) { resultado.fecha = m[1]; break; }
  }

  const camposEncontrados = [resultado.numero, resultado.monto, resultado.fecha]
    .filter(Boolean).length;

  console.log(`[OCR] N=${resultado.numero} | $=${resultado.monto} | fecha=${resultado.fecha} | campos=${camposEncontrados}/3`);
  return resultado;
}

// Extractor con pdf2json
async function extraerTextoPDF(bufferPDF) {
  return new Promise((resolve, reject) => {
    if (!PDFParser) {
      reject(new Error('pdf2json no disponible'));
      return;
    }

    const pdfParser = new PDFParser();
    let texto = '';

    pdfParser.on('pdfParser_dataError', (errData) => {
      console.error('[OCR] Error en pdf2json:', errData.parserError);
      reject(new Error(errData.parserError));
    });

    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      try {
        if (pdfData.Pages) {
          pdfData.Pages.forEach(page => {
            if (page.Texts) {
              page.Texts.forEach(text => {
                if (text.R && text.R.length > 0) {
                  text.R.forEach(run => {
                    if (run.T) {
                      try {
                        let decoded = run.T;
                        try {
                          decoded = decodeURIComponent(run.T);
                        } catch (e) {
                          decoded = run.T;
                        }
                        if (decoded && decoded.trim().length > 0) {
                          texto += decoded + ' ';
                        }
                      } catch (e) {
                        // Ignorar errores individuales de texto
                      }
                    }
                  });
                }
              });
            }
          });
        }

        if (texto.trim().length > 20) {
          console.log('[OCR] Texto extraído via pdf2json ✓');
          console.log('[OCR] Texto extraído (primeros 400 chars):');
          console.log(texto.substring(0, 400));
          resolve(texto.trim());
        } else {
          reject(new Error('El PDF no contiene texto suficiente'));
        }
      } catch (e) {
        console.error('[OCR] Error procesando datos pdf2json:', e);
        reject(e);
      }
    });

    pdfParser.parseBuffer(bufferPDF);
  });
}

// Registro de handlers
function registrarHandlersOCR() {
  ipcMain.handle('extraer-datos-factura', async (event, filePath) => {
    console.log('[OCR] Procesando:', path.basename(filePath));
    
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
      }

      const buffer = fs.readFileSync(filePath);
      console.log(`[OCR] Archivo leído: ${(buffer.length / 1024).toFixed(1)} KB`);

      const texto = await extraerTextoPDF(buffer);
      
      if (!texto) {
        return { 
          success: false, 
          error: 'No se pudo extraer texto del PDF. El archivo puede estar escaneado (imagen).',
          datos: null 
        };
      }

      const datos = parsearDatosAFIP(texto);
      return { success: true, datos };

    } catch (error) {
      console.error('[OCR] Error:', error.message);
      return { success: false, error: error.message, datos: null };
    }
  });

  console.log('[OCR] Handlers registrados correctamente');
}

module.exports = { registrarHandlersOCR };
```

=== 3. src/GestionEdificios.jsx (frontend React) ===
```javascript
// Función procesarPDF actual
async function procesarPDF() {
  setPdfCargando(true)
  setPdfPreview(null)
  try {
    const pdfPath = await window.api.seleccionarPDF()
    if (!pdfPath) { setPdfCargando(false); return }

    const resultado = await window.api.extraerDatosFactura(pdfPath)

    if (!resultado.success) {
      flash('error', resultado.error?.includes('texto extraíble')
        ? '⚠️ El PDF es una imagen escaneada. Ingresá los datos manualmente.'
        : `Error al leer PDF: ${resultado.error || 'desconocido'}`)
      setPdfCargando(false)
      return
    }

    const datos = resultado.datos
    setPdfPreview(datos)
    const detectados = [datos.numero, datos.monto, datos.fecha].filter(Boolean).length
    if (detectados === 0) {
      flash('error', 'No se detectaron datos automáticamente. Verificá que sea una factura AFIP o completá manualmente.')
    } else {
      flash('success', `✓ Extraídos ${detectados}/3 campos. Revisá y confirmá antes de guardar.`)
    }

    // Autocompletar formulario según tipo
    if (tipoFactura === 'deuda') {
      setTab('deudas')
      if (datos.monto) setMontoDeuda(String(datos.monto))
      if (datos.fecha) setFechaDeuda(datos.fecha)
      if (datos.numero) setNumeroFacturaDeuda(datos.numero)
      setDescripcionDeuda(datos.numero ? `Factura ${datos.numero}` : 'Importado desde PDF')
    } else {
      setTab('pagos')
      if (datos.monto) setMontoPago(String(datos.monto))
      if (datos.fecha) setFechaPago(datos.fecha)
      if (datos.numero) setNumeroFacturaPago(datos.numero)
      setConceptoPago(datos.numero ? `Pago factura ${datos.numero}` : 'Pago importado desde PDF')
    }
  } catch (err) {
    flash('error', 'Error inesperado: ' + err.message)
  } finally {
    setPdfCargando(false)
  }
}
```

=== 4. preload.js (expone API al renderer) ===
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // OCR
  extraerDatosFactura: (pdfPath) => 
    ipcRenderer.invoke('extraer-datos-factura', pdfPath),
  
  seleccionarPDF: () => 
    ipcRenderer.invoke('seleccionar-pdf'),
    
  // Base de datos
  obtenerEdificios: () => 
    ipcRenderer.invoke('obtenerEdificios'),
  // ... más métodos
});
```

ESTRUCTURA DE BASE DE DATOS (SQLite)
```sql
-- Tablas relevantes
CREATE TABLE buildings (
  id INTEGER PRIMARY KEY,
  direccion TEXT NOT NULL
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  edificio_id INTEGER,
  monto REAL,
  fecha TEXT,
  concepto TEXT,
  numero_factura TEXT,
  created_at TEXT
);

CREATE TABLE debts (
  id INTEGER PRIMARY KEY,
  edificio_id INTEGER,
  monto REAL,
  fecha TEXT,
  descripcion TEXT,
  numero_factura TEXT,
  created_at TEXT
);
```

FORMATO DE FACTURAS AFIP ESPERADO
- Número: "Punto de Venta: 00003   Comp. Nro:  00000796" → "00003-00000796"
- Monto: "Importe Total: $   36900,00" → 36900.00
- Fecha: "Fecha de Emisión:  29/12/2024" → "29/12/2024"

REQUERIMIENTOS PARA LA SOLUCIÓN
1. **Extractor robusto** - Debe funcionar consistentemente con facturas AFIP reales
2. **Sin crashes** - No debe causar pantalla negra ni errores fatales en Electron
3. **Texto legible** - Debe extraer texto español legible como el ejemplo esperado
4. **Manejo de errores** - Robusto para diferentes tipos de PDFs
5. **Compatible** - Debe funcionar con el frontend actual

SOLUCIONES A CONSIDERAR
1. **Mejorar pdf2json actual** - Solucionar el problema de extracción de solo 4 caracteres
2. **Implementar extractor nativo mejorado** - Parsear PDF directamente con buffers
3. **Usar combinación de librerías** - pdf2json + fallback manual
4. **Optimizar parser AFIP** - Mejorar regex para diferentes formatos

PRUEBAS REALIZADAS
- ✅ pdf-parse: causa pantalla negra (eval() bloqueado)
- ✅ pdfjs-dist: problemas de importación .mjs en Node.js
- ❌ pdf2json: actualmente extrae solo 4 caracteres binarios
- ❌ extractor manual: extrae caracteres binarios

ENTREGABLE ESPERADO
1. **Código corregido** de src/ipc-ocr-handler.js que extraiga texto legible
2. **Explicación** de qué causaba el problema de extracción de caracteres binarios
3. **Instrucciones** para probar con diferentes tipos de facturas AFIP
4. **Manejo robusto** de errores para evitar crashes futuros

URGENCIA: Alta - El OCR es una funcionalidad crítica para la aplicación y actualmente no funciona correctamente.

OBJETIVO FINAL: Extraer consistentemente de facturas AFIP:
- Número de comprobante (ej: 00003-00000796)
- Monto total (ej: 36900.00)
- Fecha de emisión (ej: 29/12/2024)

Con formato de salida: { success: true, datos: { numero, monto, fecha, ... } }
