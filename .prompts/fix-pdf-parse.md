# Prompt para resolver error de pdf-parse en Electron

## Problema
La librería `pdf-parse` en el proyecto Electron no se está importando correctamente. El error actual es:
```
Error al leer PDF: Error al parsear PDF: No se pudo encontrar una función válida en pdf-parse
```

El código actual en `main.js` intenta varias formas de importar pero ninguna funciona:
- `require('pdf-parse')` retorna un objeto, no una función
- `pdfParseLib.default` es undefined
- `pdfParseLib.parse` no existe

## Solución requerida

1. **Verificar qué exporta realmente `pdf-parse`**:
   - Agregar `console.log(Object.keys(pdfParseLib))` para ver las propiedades
   - Verificar si hay una propiedad `__esModule` o similar

2. **Implementar la forma correcta de llamar a pdf-parse**:
   - La librería `pdf-parse` típicamente se usa así: `const pdf = require('pdf-parse'); pdf(dataBuffer)`
   - PERO en Electron con webpack/bundlers a veces la exportación cambia
   - Necesitamos detectar automáticamente la forma correcta y usarla

3. **Código objetivo - reemplazar la función `pdfParse` en main.js**:

```javascript
const pdfParseLib = require('pdf-parse');

// Función robusta que detecta automáticamente cómo usar pdf-parse
async function pdfParse(dataBuffer) {
  // Debug: descomentar para ver qué exporta
  // console.log('pdf-parse exports:', typeof pdfParseLib, Object.keys(pdfParseLib));
  
  // Caso 1: Exportación directa como función (CommonJS estándar)
  if (typeof pdfParseLib === 'function') {
    return await pdfParseLib(dataBuffer);
  }
  
  // Caso 2: Exportación como objeto con función parse
  if (pdfParseLib && typeof pdfParseLib.parse === 'function') {
    return await pdfParseLib.parse(dataBuffer);
  }
  
  // Caso 3: Exportación ES Module con default
  if (pdfParseLib && pdfParseLib.__esModule && pdfParseLib.default) {
    return await pdfParseLib.default(dataBuffer);
  }
  
  // Caso 4: Buscar cualquier función en el objeto exportado
  const values = Object.values(pdfParseLib);
  const fn = values.find(v => typeof v === 'function');
  if (fn) {
    try {
      return await fn(dataBuffer);
    } catch (e) {
      // Si falla, puede ser que necesite 'new'
      if (e.message && e.message.includes("cannot be invoked without 'new'")) {
        const instance = new fn(dataBuffer);
        return await (instance.then ? instance : Promise.resolve(instance));
      }
      throw e;
    }
  }
  
  // Caso 5: Si todo falla, mostrar diagnóstico
  throw new Error(
    `pdf-parse no exporta función válida. ` +
    `Tipo: ${typeof pdfParseLib}, ` +
    `Keys: ${JSON.stringify(Object.keys(pdfParseLib))}, ` +
    `Valores: ${JSON.stringify(Object.entries(pdfParseLib).map(([k,v]) => [k, typeof v]))}`
  );
}
```

4. **En el handler IPC**, asegurarse de llamar correctamente:

```javascript
ipcMain.handle('extraer-datos-factura', async (event, pdfPath) => {
  try {
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      return { success: false, error: 'Archivo no encontrado: ' + pdfPath };
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);  // Usa nuestra función wrapper
    const texto = pdfData.text || '';
    
    // ... resto del código
  } catch (err) {
    return { success: false, error: err.message };
  }
});
```

## Verificación
Después de implementar, probar cargando un PDF AFIP y verificar que:
1. Se extrae el texto correctamente
2. Se parsea el número de comprobante
3. Se extrae el monto y fecha
4. Los campos se autocompletan en el formulario

## Nota adicional
Si `pdf-parse` sigue sin funcionar, considerar alternativas:
- Usar `pdf2json` en su lugar
- O usar el módulo `pdf.js` de Mozilla que es más robusto
