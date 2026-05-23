🚨 PROMPT PARA CLAUDE - OCR EXTRACTOR FALLANDO EN PROYECTO PALO

PROBLEMA CRÍTICO
El extractor de texto PDF manual está extrayendo solo caracteres binarios (:Qw) en lugar de texto legible de facturas AFIP. Antes funcionaba con pdf-parse/pdf2json pero causaba crashes.

CONTEXTO COMPLETO DEL PROYECTO
- Aplicación Electron + React para gestión de edificios
- Base de datos SQLite
- Sistema OCR para extraer datos de facturas AFIP desde PDFs
- Frontend: src/GestionEdificios.jsx
- Backend: main.js (proceso principal de Electron)
- Handler OCR: src/ipc-ocr-handler.js

ESTADO ACTUAL DEL SISTEMA OCR
✅ Handler OCR nativo creado y registrado
✅ Frontend actualizado para usar nueva estructura de datos
❌ Extractor manual solo extrae caracteres binarios

LOGS DEL ERROR ACTUAL:
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

PROBLEMA: El extractor manual devuelve solo 4 caracteres binarios en lugar del texto completo de la factura.

CÓDIGO ACTUAL DEL EXTRACTOR (src/ipc-ocr-handler.js)
```javascript
async function extraerTextoPDF(bufferPDF) {
  console.log('[OCR] Iniciando extracción manual robusta');

  // Método 1: Extracción manual mejorada (principal)
  try {
    const raw = bufferPDF.toString('latin1');
    const textos = [];

    // Buscar objetos de texto PDF (BT...ET blocks)
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let match;
    while ((match = btEtRegex.exec(raw)) !== null) {
      const block = match[1];
      // Extraer strings entre paréntesis: (texto)
      const strRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(block)) !== null) {
        const str = strMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\')
          .replace(/\\([0-7]{3})/g, (_, oct) => 
            String.fromCharCode(parseInt(oct, 8))
          );
        if (str.trim().length > 1 && esTextoLegible(str)) {
          textos.push(str);
        }
      }
    }

    // Fallback: buscar todos los strings entre paréntesis
    if (textos.length === 0) {
      const allStrRegex = /\(([^)]{3,100})\)/g;
      let allMatch;
      while ((allMatch = allStrRegex.exec(raw)) !== null) {
        const str = allMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\')
          .replace(/\\([0-7]{3})/g, (_, oct) => 
            String.fromCharCode(parseInt(oct, 8))
          );
        if (str.trim().length > 2 && esTextoLegible(str)) {
          textos.push(str);
        }
      }
    }

    if (textos.length > 0) {
      const resultado = textos.join(' ');
      console.log('[OCR-MANUAL] Texto extraído con método manual, largo:', resultado.length);
      console.log('[OCR-MANUAL] Preview:', resultado.substring(0, 300));
      return resultado;
    }
  } catch (e) {
    console.warn('[OCR-MANUAL] Error en extracción manual:', e.message);
  }

  console.error('[OCR] No se pudo extraer texto del PDF');
  return null;
}
```

FUNCIONAMIENTO ESPERADO ANTERIOR (con pdf-parse/pdf2json)
```
[OCR] pdf-parse falló, intentando pdf2json: pdf-parse no exporta función utilizable
[OCR] Texto extraído via pdf2json ✓
[OCR] Texto extraído (primeros 400 chars):
Fecha de Emisión: ORIGINAL ROLDAN RUBEN ALBERTO Pellegrini Carlos 173 Piso:02 Dpto:C - Ciudad de Buenos Aires Período Facturado Desde: Hasta: Fecha de Vto. para el pago: Condición de venta: Condición frente al IVA: Apellido y Nombre / Razón Social: Domicilio: 01/07/2025 01/07/2025 30/07/2025 02/07/2025 20115999312 CONSORCIO PROPIETARIOS ONCE DE SEPTIEMBRE DE MIL OCHOCIENTOS 11 De Sept. De 1888 396
[OCR] Campos detectados: 3/3
```

DEPENDENCIAS INSTALADAS
- ✅ pdf-parse@2.4.5
- ✅ pdfjs-dist@5.6.205
- ✅ pdf2json@4.0.2

PROBLEMAS CON LIBRERÍAS
- pdf-parse: causa pantalla negra en Electron (eval() bloqueado)
- pdfjs-dist: problemas de importación en Node.js (.mjs modules)
- pdf2json: causa URIError: URI malformed en decodeURIComponent

REQUERIMIENTOS
1. **SOLUCIÓN OCR DEFINITIVA**: Implementar un extractor que funcione consistentemente con facturas AFIP
2. **SIN CRASHES**: No debe causar pantalla negra ni errores fatales
3. **TEXTO LEGIBLE**: Debe extraer texto español legible como el ejemplo anterior
4. **COMPATIBLE ELECTRON**: Funcionar en main process sin eval() ni Workers problemáticos

SOLUCIONES A CONSIDERAR
1. **Mejorar extractor manual actual** - Corregir la extracción de strings
2. **Usar pdf2json con manejo de errores** - Solucionar el URIError
3. **Implementar parser PDF nativo completo** - Streams, objetos, compresión
4. **Usar otra librería compatible** - Buscar alternativa más estable

INFORMACIÓN ADICIONAL
- Los PDFs son facturas AFIP argentinas con texto embebido
- Formato esperado: "Fecha de Emisión: DD/MM/YYYY ... Importe Total: $ XXX,XX"
- El parser AFIP ya está implementado y funciona si recibe texto legible
- El frontend está actualizado y espera la estructura { success: true, datos: {...} }

ENTREGABLE ESPERADO
- Código corregido del extractor que funcione con facturas AFIP reales
- Explicación de qué causaba el problema con el extractor actual
- Instrucciones para probar con diferentes tipos de facturas
- Manejo robusto de errores para evitar crashes

URGENTE: El OCR es una funcionalidad crítica para la aplicación y actualmente no funciona.
