🚨 PROMPT URGENTE FINAL - PDF OCR CRÍTICO CON DATOS ACTUALES

PROBLEMA CRÍTICO FINAL
El extractor OCR está fallando completamente con PDFs AFIP reales. He implementado múltiples soluciones pero ninguna funciona. Los PDFs parecen estar corruptos o usar una codificación no estándar que no puedo decodificar.

DATOS ACTUALES DEL ERROR - ÚLTIMO INTENTO
```bash
[OCR] PDF cargado: 226693 bytes
[OCR-EXTRACT] Iniciando extracción de objetos PDF
[OCR-EXTRACT] Intentando decodificación con diferentes encodings...
[OCR-EXTRACT] Encoding cp1252 falló: Unknown encoding: cp1252
[OCR-EXTRACT] Textos únicos encontrados: 0
[OCR-EXTRACT] Texto total: 0 chars
[OCR-EXTRACT] Preview (primeros 300 chars):
[OCR] ⚠️ No se pudo extraer texto del PDF
```

PROBLEMAS IDENTIFICADOS:
1. **PDFs completamente corruptos** - Ningún método extrae texto
2. **Encoding no estándar** - `cp1252` no es reconocido por Node.js
3. **Strings binarios puros** - Todos los métodos encuentran solo basura
4. **0 caracteres extraídos** - Absolutamente nada de texto legible

ESTADO ACTUAL DEL CÓDIGO
He implementado:
- ✅ Filtro binario ultra-estricto (solo caracteres válidos)
- ✅ Triple estrategia de extracción (paréntesis, hex, patrones AFIP)
- ✅ Múltiples encodings (utf8, latin1, ascii, utf16le)
- ✅ Validación robusta de datos
- ✅ Manejo completo de errores

RESULTADO: **FALLA TOTAL** - 0 caracteres extraídos

CASOS DE PRUEBA REALES
- "1 Enero - 796.pdf" - 226693 bytes, completamente corrupto
- "3-Marzo 1019.pdf" - 87400 bytes, texto binario corrupto
- "5-Mayo 1121.pdf" - 87516 bytes, basura binaria
- "2- Febrero -814.pdf" - 87526 bytes, 10,396 chars de basura

FACTURA AFIP REAL (imagen adjunta)
Datos que DEBERÍAN extraerse:
- Punto de Venta: 00003
- Comp. Nro: 00000813  
- Importe Total: $ 28.100,00
- Fecha de Emisión: 12/02/2025
- CUIT: 20115999312
- Razón Social: CONSORCIO PROPIETARIOS ONCE DE SEPTIEMBRE DE MIL OCHOCIENTOS

CÓDIGO ACTUAL COMPLETO

=== src/ipc-ocr-handler.js (versión actual con múltiples encodings) ===
```javascript
// [Código completo actual con todas las estrategias implementadas]
```

HIPÓTESIS DEL PROBLEMA
1. **PDFs con encriptación o protección** - AFIP podría proteger sus PDFs
2. **Streams corruptos intencionalmente** - Anti-OCR measures
3. **Codificación propietaria AFIP** - Encoding personalizado no estándar
4. **PDFs como imágenes puras** - Texto como imágenes vectoriales
5. **Compresión personalizada** - No es FlateDecode estándar

SOLUCIONES REQUERIDAS
Necesito que Claude implemente:

1. **Análisis profundo de estructura PDF** - Examinar bytes del PDF para entender la estructura real
2. **Decodificación de streams corruptos** - Métodos avanzados para streams dañados
3. **OCR real con Tesseract** - Si todo lo demás falla, convertir PDF a imagen y hacer OCR
4. **Detección de protección/encryción** - Identificar si los PDFs están protegidos
5. **Parser de bajo nivel** - Extraer directamente de la estructura binaria del PDF

REQUERIMIENTOS URGENTES
1. **Analizar los bytes reales** del PDF para entender por qué no se puede extraer texto
2. **Implementar OCR con Tesseract.js** como fallback definitivo
3. **Crear herramienta de diagnóstico** que muestre la estructura exacta del PDF
4. **Probar con librerías externas** (pdf-parse, pdfjs-dist) con manejo robusto de errores
5. **Implementar extracción de imágenes** si el texto está como imágenes vectoriales

FORMATO DE SALIDA ESPERADO
```javascript
{
  success: true,
  datos: {
    numero: "00003-00000813",
    monto: 28100.00,
    fecha: "12/02/2025",
    razonSocial: "CONSORCIO PROPIETARIOS ONCE DE SEPTIEMBRE DE MIL OCHOCIENTOS",
    cuit: "20115999312"
  },
  metadata: {
    metodo: "tesseract_ocr_fallback",
    pdfType: "imagen_vectorial",
    encoding: "propietario_afip"
  }
}
```

DEPENDENCIAS DISPONIBLES
- zlib (built-in Node.js)
- fs (built-in Node.js)
- pdf-parse v2.4.5 (instalado)
- pdfjs-dist v5.6.205 (instalado)
- pdf2json v4.0.2 (instalado)
- **Tesseract.js** (puede instalar si es necesario)

RESTRICCIONES TÉCNICAS
- Debe funcionar en Electron main process
- No puede usar eval() (causa crashes)
- Debe manejar PDFs completamente corruptos
- Debe ser robusto contra cualquier encoding
- Debe tener fallbacks múltiples

URGENCIA: MÁXIMA ABSOLUTA
Esto es un problema crítico que impide completamente el uso de la aplicación. Los usuarios no pueden procesar facturas AFIP y la funcionalidad principal está rota.

ENTREGABLES REQUERIDOS
1. **Código completo** de src/ipc-ocr-handler.js que funcione con estos PDFs corruptos
2. **Análisis de estructura PDF** - Herramienta para entender qué hay dentro
3. **Implementación de Tesseract OCR** - Como fallback definitivo
4. **Diagnostics detallados** - Logs que muestren exactamente qué está pasando
5. **Múltiples fallbacks** - Si uno falla, usar el siguiente automáticamente

NOTA CRÍTICA
He agotado todas las soluciones estándar de extracción de texto de PDFs. Los PDFs de AFIP parecen usar una codificación o protección que está más allá de los métodos convencionales. Necesito una solución experta que pueda:

- Analizar la estructura binaria del PDF a nivel de bytes
- Implementar OCR real si el texto no puede extraerse
- Manejar cualquier tipo de codificación o protección
- Funcionar consistentemente con facturas AFIP reales

ESTO ES UN PROBLEMA QUE REQUIERE UNA SOLUCIÓN EXPERTA Y NO ESTÁNDAR.
