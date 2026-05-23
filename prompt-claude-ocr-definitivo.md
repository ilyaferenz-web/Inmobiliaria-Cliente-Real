🚨 PROMPT URGENTE PARA CLAUDE - PDF OCR CRÍTICO

PROBLEMA CRÍTICO
El extractor OCR de PDFs AFIP está fallando completamente. Los streams FlateDecode están corruptos y no se pueden descomprimir con zlib. Necesito una solución robusta que funcione con facturas AFIP reales.

CONTEXTO COMPLETO DEL PROYECTO
- Aplicación Electron + React para gestión de edificios
- OCR para extraer datos de facturas AFIP desde PDFs
- Handler actual: src/ipc-ocr-handler.js
- Base de datos SQLite con tablas payments/debts

PROBLEMA ACTUAL - LOGS DEL ERROR
```
[OCR-DEBUG] Stream 4:
[OCR-DEBUG] Dict: /Filter/FlateDecode/Length 2257
[OCR-DEBUG] Es FlateDecode: true Length declarado: 2257 Real: 2257
[OCR-DEBUG] Intentando inflateSync con 2257 bytes
[OCR-DEBUG] ✗ FlateDecode falló, intentando inflateRawSync: incorrect header check
[OCR-DEBUG] ✗ inflateRawSync también falló: invalid distance too far back
[OCR-NATIVO] Total streams: 12, content streams: 3, descomprimidos: 0, directos: 3
[OCR-NATIVO] Texto total: 0 chars
[OCR-DEBUG] Buscando texto directamente en el PDF...
[OCR-DEBUG] Último recurso: buscando cualquier texto entre paréntesis...
[OCR-DEBUG] Texto básico encontrado: 1848 chars
```

PROBLEMAS:
1. **Streams corruptos** - zlib.inflateSync() y zlib.inflateRawSync() fallan
2. **Páginas no detectadas** - "Páginas encontradas: 0 Content streams: []"
3. **Solo encuentra números aleatorios** - No extrae los datos reales de la factura

FACTURA AFIP DE REFERENCIA (imagen adjunta)
- Punto de Venta: 00003
- Comp. Nro: 00000813  
- Importe Total: $ 28.100,00
- Fecha de Emisión: 12/02/2025
- CUIT: 20115999312
- Razón Social: CONSORCIO PROPIETARIOS ONCE DE SEPTIEMBRE DE MIL OCHOCIENTOS

CÓDIGO ACTUAL COMPLETO

=== src/ipc-ocr-handler.js (extractor actual) ===
```javascript
// [Código completo del handler actual con todas las funciones]
```

DEPENDENCIAS DISPONIBLES
- zlib (built-in Node.js)
- fs (built-in Node.js)
- pdf-parse v2.4.5 (instalado pero causa crashes)
- pdfjs-dist v5.6.205 (instalado pero problemas de importación)
- pdf2json v4.0.2 (instalado pero URIError)

RESTRICCIONES
- Debe funcionar en Electron main process
- No puede usar eval() (causa crashes)
- No puede usar Workers (problemas con SQLite)
- Debe ser robusto contra PDFs corruptos
- Debe manejar diferentes formatos de facturas AFIP

SOLUCIONES A CONSIDERAR
1. **Parser PDF mejorado** - Implementar parser PDF completo desde cero
2. **Detección de objetos indirectos** - Los streams pueden estar referenciados indirectamente
3. **Múltiples métodos de descompresión** - Probar diferentes algoritmos
4. **OCR híbrido** - Combinar extracción de texto con reconocimiento de patrones
5. **Fallback a librerías externas** - Usar pdf-parse/pdfjs-dist con manejo robusto de errores

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
  }
}
```

CASOS DE PRUEBA REALES
- "5-Mayo 1121.pdf" - 85.5 KB, streams corruptos
- "7-Julio 1318.pdf" - 85.3 KB, mismo problema
- "8-Agosto 1424.pdf" - 85.3 KB, mismo patrón

ENTREGABLES REQUERIDOS
1. **Código completo** de src/ipc-ocr-handler.js que funcione
2. **Explicación técnica** de por qué fallaba el método anterior
3. **Manejo de errores robusto** para diferentes tipos de PDFs
4. **Tests de validación** con las facturas reales
5. **Fallbacks múltiples** si el método principal falla

URGENCIA: CRÍTICA - Esta funcionalidad es esencial para la aplicación y actualmente está completamente rota. Los usuarios no pueden procesar facturas AFIP.

OBJETIVO FINAL
Extraer consistentemente de facturas AFIP:
- Número de comprobante (ej: 00003-00000813)
- Monto total (ej: 28100.00)  
- Fecha de emisión (ej: 12/02/2025)
- Datos adicionales (CUIT, Razón Social) si están disponibles

NOTA ADICIONAL
El PDF parece tener texto visible pero los streams están corruptos. Puede ser un problema de:
- Codificación incorrecta de los streams
- Referencias a objetos indirectos no resueltas
- Compresión personalizada de AFIP
- Estructura PDF no estándar

NECESITO UNA SOLUCIÓN DEFINITIVA QUE FUNCIONE CON ESTAS FACTURAS REALES.
