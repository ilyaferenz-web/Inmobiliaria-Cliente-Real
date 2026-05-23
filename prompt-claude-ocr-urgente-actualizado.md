🚨 PROMPT URGENTE ACTUALIZADO - PDF OCR CRÍTICO CON DATOS REALES

PROBLEMA CRÍTICO ACTUALIZADO
El extractor OCR está extrayendo 10,396 caracteres pero la mayoría es basura binaria corrupta. El filtro `esTextoRelevante` no está funcionando y deja pasar caracteres no imprimibles como `¾`, `¥`, `Æ`, etc.

DATOS ACTUALES DEL ERROR
```bash
[OCR-DEBUG] Iniciando extracción directa de objetos PDF
[OCR-DEBUG] PDF length: 87526
[OCR-DEBUG] Texto encontrado en objetos: 10396 chars
[OCR-NATIVO] Texto total combinado: 10396 chars
[OCR] Texto extraído exitosamente ✓
[OCR-PARSER] Texto recibido, largo: 9660
[OCR-PARSER] Preview (primeros 500 chars):
¾ FG[i,/ -T ¥Æ »çb² ðßt^Ï ³ZO= ¼Z ü![íg]×ªT¦£Z `Ål 6 Ã¢¤ !ö;*( ¼ ª£»Sÿ8 å5P«ú
Z ÇÖZ¹@3 d Å y hLö:¥ Eã { É È V `¤ú Ô¹q4Üj àbÆø <m ¸úXd X©g º _  SÇ ´Ø 4æ77¯½ ÷ }k v5 E ¢ÄEnÑðZ}ÿ µØÎº¸!" 0£-y
[OCR-PARSER] Monto encontrado: 8 (raw: "8")
[OCR] N=null | $=8 | fecha=null | campos=1/3
```

PROBLEMAS IDENTIFICADOS:
1. **Filtro roto** - `esTextoRelevante` deja pasar caracteres binarios
2. **Texto corrupto** - 10,396 chars pero 90% es basura como `¾ FG[i,/ -T ¥Æ`
3. **Parser encuentra números falsos** - Encuentra "8" en lugar de datos reales
4. **Sin datos reales** - No encuentra "Punto de Venta", "Comp. Nro", etc.

FACTURA AFIP REAL (imagen adjunta)
Datos exactos a extraer:
- Punto de Venta: 00003
- Comp. Nro: 00000813  
- Importe Total: $ 28.100,00
- Fecha de Emisión: 12/02/2025
- CUIT: 20115999312
- Razón Social: CONSORCIO PROPIETARIOS ONCE DE SEPTIEMBRE DE MIL OCHOCIENTOS

CÓDIGO ACTUAL COMPLETO

=== src/ipc-ocr-handler.js (versión actual) ===
```javascript
// [Código completo actual con el filtro roto]
```

PROBLEMAS ESPECÍFICOS DEL CÓDIGO:

1. **Filtro `esTextoRelevante` defectuoso:**
   ```javascript
   const caracteresBinarios = /[^\x20-\x7E\xA0-\xFF\n\r\t\s]/;
   if (caracteresBinarios.test(texto)) {
     return false; // ESTO NO ESTÁ FUNCIONANDO
   }
   ```

2. **Búsqueda de objetos encuentra basura:**
   ```javascript
   const stringRegex = /\(([^)]{5,200})\)/g;
   // Esto está encontrando strings binarios corruptos
   ```

3. **Parser encuentra números falsos:**
   ```javascript
   const patronesMonto = [
     /Importe\s+Total[:\s$]*\s*\$?\s*([\d.,]+)/i,
     // Encuentra "8" en lugar de "28.100,00"
   ];
   ```

REQUERIMIENTOS URGENTES:
1. **Filtro de texto legible REAL** - Que detecte y rechace caracteres binarios
2. **Extracción específica AFIP** - Buscar solo los datos de la factura
3. **Validación de resultados** - No aceptar números sueltos como montos
4. **Múltiples métodos de fallback** - Si uno falla, usar otros

DEPENDENCIAS DISPONIBLES:
- zlib (built-in Node.js) - actualmente falla con streams corruptos
- fs (built-in Node.js)
- pdf-parse v2.4.5 (instalado pero causa crashes)
- pdfjs-dist v5.6.205 (instalado pero problemas de importación)
- pdf2json v4.0.2 (instalado pero URIError)

RESTRICCIONES TÉCNICAS:
- Debe funcionar en Electron main process
- No puede usar eval() (causa crashes)
- Debe manejar PDFs con streams corruptos
- Debe ser robusto contra caracteres binarios

CASOS DE PRUEBA REALES:
- "2- Febrero -814.pdf" - 85.5 KB, 10,396 chars de basura
- "5-Mayo 1121.pdf" - mismo problema
- "8-Agosto 1424.pdf" - mismo patrón

SOLUCIONES REQUERIDAS:
1. **Filtro de texto infalible** - Detecte 100% de caracteres binarios
2. **Extracción por patrones puros** - Buscar directamente "Punto de Venta:", etc.
3. **Validación cruzada** - Verificar que los datos sean coherentes
4. **Fallback a OCR real** - Si todo falla, usar Tesseract o similar

FORMATO DE SALIDA ESPERADO:
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

ANÁLISIS DEL PROBLEMA:
El PDF parece tener texto pero está codificado de forma no estándar o los streams están corruptos. El filtro actual no detecta correctamente los caracteres binarios y deja pasar basura que confunde al parser.

ENTREGABLES REQUERIDOS:
1. **Código completo corregido** de src/ipc-ocr-handler.js
2. **Filtro de texto 100% efectivo** contra caracteres binarios
3. **Extracción por patrones específicos** que funcione con texto corrupto
4. **Validación de datos extraídos** para evitar falsos positivos
5. **Múltiples fallbacks robustos**

URGENCIA: MÁXIMA - El OCR está completamente roto y extrayendo basura en lugar de datos reales. Los usuarios no pueden usar la funcionalidad.

OBJETIVO FINAL:
Extraer consistentemente de facturas AFIP los datos correctos, filtrando toda la basura binaria y validando que los resultados sean coherentes.

NOTA CRÍTICA: El filtro actual está completamente roto. Necesito una solución que detecte y rechaze CARACTERES BINARIOS como `¾`, `¥`, `Æ`, `»`, `ç`, `²`, etc., y solo acepte texto legible en español con números y palabras reales de facturas.
