// Versión mínima de frontend para debug
async function procesarPDF() {
  console.log('[FRONTEND-DEBUG] Iniciando procesamiento PDF...')
  alert('DEBUG: Iniciando procesamiento PDF')
  
  try {
    console.log('[FRONTEND-DEBUG] Abriendo selector de PDF...')
    const pdfPath = await window.api.seleccionarPDF()
    console.log('[FRONTEND-DEBUG] PDF seleccionado:', pdfPath)
    alert('PDF seleccionado: ' + pdfPath)
    
    if (!pdfPath) { 
      console.log('[FRONTEND-DEBUG] No se seleccionó PDF')
      return 
    }

    console.log('[FRONTEND-DEBUG] Enviando al extractor...')
    const resultado = await window.api.extraerDatosFactura(pdfPath)
    console.log('[FRONTEND-DEBUG] Respuesta:', resultado)
    alert('Respuesta: ' + JSON.stringify(resultado, null, 2))
    
    if (resultado.success) {
      alert('¡ÉXITO! Datos: ' + JSON.stringify(resultado.datos, null, 2))
    } else {
      alert('ERROR: ' + resultado.error)
    }
    
  } catch (err) {
    console.error('[FRONTEND-DEBUG] Error:', err)
    alert('ERROR: ' + err.message)
  }
}
