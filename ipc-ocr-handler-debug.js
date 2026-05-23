const fs = require('fs');

// Versión mínima para debug
async function extraerDatosConOCR(pdfPath) {
  console.log('[DEBUG] Iniciando extracción mínima...');
  console.log('[DEBUG] PDF:', pdfPath);
  
  try {
    // Solo retornar datos de prueba para ver si la comunicación funciona
    return {
      success: true,
      datos: {
        numero: "00003-00000813",
        monto: 28100.00,
        fecha: "12/02/2025"
      },
      metadata: {
        metodo: 'debug-test',
        camposEncontrados: 3
      }
    };
  } catch (error) {
    console.error('[DEBUG] Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

function registrarHandlersOCR() {
  const { ipcMain } = require('electron');
  
  console.log('[DEBUG] Registrando handlers...');
  
  ipcMain.handle('extraer-datos-factura', async (event, filePath) => {
    console.log('[DEBUG] Handler llamado con:', filePath);
    
    try {
      const resultado = await extraerDatosConOCR(filePath);
      console.log('[DEBUG] Resultado:', resultado);
      return resultado;
    } catch (error) {
      console.error('[DEBUG] Error en handler:', error.message);
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
  
  console.log('[DEBUG] Handlers registrados correctamente (versión debug)');
}

module.exports = {
  extraerDatosConOCR,
  registrarHandlersOCR
};
