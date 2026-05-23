# PROMPT URGENTE PARA CLAUDE - SOLUCIÓN DEFINITIVA OCR AFIP

## 🚨 PROBLEMA CRÍTICO A RESOLVER

El extractor OCR de facturas AFIP no funciona correctamente. Necesita extraer 3 campos específicos:
- **Número de factura** (formato: 00003-00000813)
- **Monto** (formato: 28100.00)
- **Fecha** (formato: 12/02/2025)

## 📋 ESTADO ACTUAL DEL PROBLEMA

### 1. Extractor actual falla:
```
[OCR-PDFPARSE] Error: pdfParse is not a function
[OCR-MANUAL] Texto extraído con método manual, largo: 2000
[OCR-PARSER] Texto legible recibido, largo: 2000
[OCR-PARSER] Preview: ±DV6íföíobúoHØQS±UDb£îlZHkTGÝõ9ËïÅ8ºá¬»·BH=+Ñº¿6×;!Íùþñ]Z
[OCR] N=null | $=7 | fecha=null | campos=1/3
```

### 2. PDFs de prueba:
- `4-Abril 1118.pdf` (85.5 KB)
- `1 Enero - 796.pdf` (226693 bytes, 3 páginas, texto seleccionable)

### 3. Paquetes instalados:
- `pdf-parse@1.1.1` (instalado)
- `pdfjs-dist` (disponible)

## 🎯 OBJETIVO CLARO

Crear un extractor OCR que:
1. Lea PDFs AFIP con texto seleccionable (no escaneados)
2. Extraiga número, monto y fecha específicamente
3. No cause pantalla azul en el frontend
4. Funcione en entorno Electron (main process)

## 📁 ARCHIVOS CLAVE

### src/ipc-ocr-handler.js (actual - FALLANDO)
```javascript
// Código actual que falla con pdfParse is not a function
let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (e) { ... }

// Error en esta línea:
const data = await pdfParse(bufferPDF, { max: 0 });
```

### src/GestionEdificios.jsx (frontend)
```javascript
async function procesarPDF() {
  // Función que llama al extractor y se pone azul
  const resultado = await window.api.extraerDatosFactura(pdfPath)
  // ... manejo de respuesta
}
```

## 🔧 DATOS DE FACTURA DE REFERENCIA

### Factura 4-Abril 1118.pdf:
- **Número:** 00003-00000813
- **Monto:** 28100.00
- **Fecha:** 12/02/2025

### Patrones en el texto:
- "Punto de Venta: 00003"
- "Comp. Nro: 00000813"
- "Importe Total: $ 28100,00"
- "Fecha de Emisión: 12/02/2025"

## 🚀 REQUERIMIENTOS TÉCNICOS

### 1. Solución OCR:
- Usar pdf-parse O pdfjs-dist correctamente
- Manejar streams comprimidos de PDF
- Extraer texto legible (no binario)
- Funcionar en main process de Electron

### 2. Parser AFIP:
- Encontrar Punto de Venta + Comp. Nro
- Unirlos como "00003-00000813"
- Extraer Importe Total (ignorar otros montos)
- Encontrar Fecha de Emisión específica

### 3. Integración:
- IPC handlers funcionando
- Frontend sin pantalla azul
- Manejo de errores robusto

## 📊 ESTRUCTURA DE RESPUESTA ESPERADA

```javascript
// Formato que debe retornar el extractor:
{
  success: true,
  datos: {
    numero: "00003-00000813",
    monto: 28100.00,
    fecha: "12/02/2025"
  },
  metadata: {
    metodo: 'pdf-parse',
    camposEncontrados: 3
  }
}
```

## 🛠️ PASOS A SEGUIR

### Paso 1: Corregir importación pdf-parse
```javascript
// Fix para pdfParse is not a function
const { default: pdfParse } = require('pdf-parse');
// O usar pdfjs-dist como alternativa
```

### Paso 2: Implementar extractor robusto
```javascript
async function extraerTextoPDF(bufferPDF) {
  // Usar pdf-parse correctamente
  // O implementar con pdfjs-dist
  // Fallback a método manual si falla
}
```

### Paso 3: Parser AFIP específico
```javascript
function parsearDatosAFIP(texto) {
  // Patrones específicos para factura AFIP
  // Validar y formatear número, monto, fecha
}
```

### Paso 4: Frontend seguro
```javascript
async function procesarPDF() {
  // Evitar pantalla azul
  // Manejar errores correctamente
  // Mostrar datos al usuario
}
```

## 🎯 RESULTADO FINAL ESPERADO

1. **Extractor funcional** - Lee PDFs sin error
2. **Datos correctos** - Extrae número, monto, fecha
3. **Frontend estable** - No se pone azul
4. **Integración completa** - Funciona end-to-end

## 📝 NOTAS ADICIONALES

- Los PDFs permiten seleccionar texto (no son imágenes)
- El extractor debe funcionar con pdf-parse@1.1.1
- El frontend usa React en Electron renderer
- Los datos van al formulario de "deudas"
- El monto puede venir como "28100,00" o "$ 28100,00"

## 🚀 ACCIÓN INMEDIATA

Por favor:
1. Analiza el código actual en src/ipc-ocr-handler.js
2. Identifica el problema exacto con pdfParse
3. Implementa la solución correcta
4. Prueba con los PDFs mencionados
5. Asegura que el frontend no se ponga azul

El usuario necesita esto funcionando URGENTEMENTE para procesar facturas AFIP.
