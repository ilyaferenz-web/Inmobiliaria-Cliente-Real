🚨 PROMPT PARA CLAUDE - PROBLEMAS CRÍTICOS EN PROYECTO PALO

PROBLEMAS PRINCIPALES
1. OCR NATIVO NO FUNCIONA - El extractor de texto PDF devuelve caracteres binarios/corruptos en lugar de texto legible
2. MÓDULO DEUDA EXPLOTA - Al seleccionar "deuda" en el formulario de pagos, toda la aplicación se cierra/crasha

CONTEXTO DEL PROYECTO
- Aplicación Electron + React para gestión de edificios
- Base de datos SQLite
- Sistema OCR para extraer datos de facturas AFIP desde PDFs
- Frontend: src/GestionEdificios.jsx
- Backend: main.js (proceso principal de Electron)
- Handler OCR: src/ipc-ocr-handler.js

ESTADO ACTUAL DEL OCR
✅ Handler nativo creado y registrado
✅ Múltiples fallbacks implementados
❌ El extractor devuelve texto binario en lugar de texto legible

LOGS DEL ERROR OCR:
```
[OCR] Procesando: 4-Abril 1118.pdf (85.5 KB)
[OCR-NATIVO] Fallback 1: Buscando texto directo en streams
[OCR-NATIVO] Texto total: 539 chars
[OCR-NATIVO] Preview (primeros 300 chars): ëé-ÿùh¼¤6Ìåµ½·9qi1FQ¿P;Æk]y¡ÿË°·íÁ3ÆÚ9áÔU&¹åßÓÏÕIå¶ÔØðÏÝ-EáÅ9·8®_õ¨V¡òBÁº[Fä´gî¡^ ªÏQO2ÉÔÁ||n¶dýz}k@V
[OCR-PARSER] Texto a parsear (500 chars): ëé-ÿùh¼¤6Ìåµ½·9qi1FQ¿P;Æk]y¡ÿË°·íÁ3ÆÚ9áÔU&¹åßÓÏÕIå¶ÔØðÏÝ-EáÅ9·8®_õ¨V¡òBÁº[Fä´gî¡^ ªÏQO2ÉÔÁ|nn¶dýz}k@V
[OCR] Resultado: N=null | $=null | fecha=null | campos=0/3
```

PROBLEMA: El texto extraído es binario/corrupto (caracteres como ëé-ÿùh¼¤) en lugar de texto legible español.

CÓDIGO ACTUAL DEL EXTRACTOR (src/ipc-ocr-handler.js)
```javascript
// Función para verificar si el texto es legible (no binario)
function esTextoLegible(texto) {
  if (!texto || texto.length < 2) return false;
  
  // Contar caracteres legibles
  const legibles = texto.split('').filter(char => 
    (char >= ' ' && char <= '~') || // ASCII printable
    (char >= 'a' && char <= 'z') || // lowercase
    (char >= 'A' && char <= 'Z') || // uppercase
    (char >= '0' && char <= '9') || // digits
    'áéíóúÁÉÍÓÚñÑüÜöäÄÖßçÇ'.includes(char) // extended latin
  ).length;
  
  // Si menos del 70% es legible, probablemente es binario
  return (legibles / texto.length) > 0.7;
}

// Extractor principal
function extraerTextoPDFNativo(bufferPDF) {
  const raw = bufferPDF.toString('latin1');
  const textosEncontrados = [];

  // Múltiples fallbacks implementados...
  // Fallback 1: Streams
  // Fallback 2: Búsqueda agresiva
  // Fallback 3: Texto plano
  // Fallback 4: Diferentes codificaciones
  
  return textoFinal;
}
```

PROBLEMA CON MÓDULO DEUDA
- Al hacer clic en la pestaña "deuda" del formulario de pagos
- La aplicación se cierra completamente sin logs de error
- Esto sugiere un error síncrono que crashea el renderer process

FUNCIONAMIENTO ESPERADO
1. El OCR debe extraer texto legible en español como:
   "Fecha de Emisión: 21/04/2025 ... CONSORCIO PROPIETARIOS ..."

2. El módulo de deuda debe funcionar sin crashes

REQUERIMIENTOS
1. **SOLUCIÓN DEFINITIVA OCR**: Implementar un extractor que funcione con PDFs de facturas AFIP reales
2. **SOLUCIÓN MÓDULO DEUDA**: Identificar y arreglar el crash al seleccionar deuda
3. **PRUEBAS**: Verificar que ambas funcionalidades trabajen juntas

INFORMACIÓN ADICIONAL
- Antes funcionaba con pdf-parse/pdf2json pero causaba pantalla negra
- Los PDFs son facturas AFIP argentinas con texto embebido
- El frontend tiene una función procesarPDF() que llama a window.api.extraerDatosFactura()
- Hay un sistema de pestañas en PagosView: ['pagos', 'deudas']

SOLUCIONES A CONSIDERAR
1. Para OCR: Usar una librería diferente más estable en Electron, o mejorar drásticamente el extractor actual
2. Para deuda: Revisar el estado/tab switching en PagosView que puede estar causando el crash

ENTREGABLE ESPERADO
- Código corregido para ambos problemas
- Explicación de las causas raíz
- Instrucciones para probar

URGENTE: Ambos problemas bloquean el uso normal de la aplicación.
