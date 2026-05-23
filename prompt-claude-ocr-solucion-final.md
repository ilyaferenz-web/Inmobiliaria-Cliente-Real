# 🚨 PROMPT URGENTE PARA CLAUDE - SOLUCIÓN DEFINITIVA OCR AFIP

## 📋 PROBLEMA CRÍTICO

El extractor OCR de facturas AFIP no funciona correctamente. A pesar de que pdf-parse se carga bien, los patrones del parser no encuentran los datos correctos y el frontend sigue poniéndose azul.

## 🎯 OBJETIVO CLARO

Extraer 3 campos específicos de facturas AFIP:
- **Número de factura** (ej: 00003-00000813)
- **Monto** (ej: 28100.00)
- **Fecha** (ej: 29/12/2024)

## 📊 ESTADO ACTUAL DEL PROBLEMA

### ✅ Lo que SÍ funciona:
```
[OCR] pdf-parse cargado correctamente, tipo: function
[OCR-PDFPARSE] ✅ Texto extraído, largo: 4011
[OCR-PARSER] Preview:
Fecha de Emisión:
ORIGINAL
ROLDAN RUBEN ALBERTO
Pellegrini Carlos 173 Piso:02 Dpto:C -
Ciudad de Buenos Aires
Período Facturado Desde:Hasta:Fecha de Vto. para el pago:
Condición de venta:
Condición
```

### ❌ Lo que NO funciona:
```
[OCR] N=null | $=null | fecha=29/12/2024 | campos=1/3
```

- ✅ **Fecha encontrada** - `fecha=29/12/2024`
- ❌ **Número no encontrado** - `N=null`
- ❌ **Monto no encontrado** - `$=null`
- ❌ **Frontend azul** - Se pone azul después del alert

## 🔍 ANÁLISIS DEL PROBLEMA

### 1. Parser no encuentra patrones:
El texto extraído contiene los datos pero los patrones regex no los detectan.

### 2. Frontend se pone azul:
Aunque el extractor funciona, el frontend falla al procesar la respuesta.

## 📁 ARCHIVOS CLAVE

### src/ipc-ocr-handler.js (PARSER ACTUAL)
```javascript
// Patrones que NO están funcionando:
const matchCompuesto = texto.match(
  /Punto\s+de\s+Venta[:\s]*([\d]{1,5})[\s\S]{0,100}?Comp\.?\s*Nro[:\s]*([\d]{4,8})/i
);

const matchMonto = texto.match(
  /Importe\s+Total[:\s$]*\s*([\d.,]+)/i
);
```

### src/GestionEdificios.jsx (FRONTEND ACTUAL)
```javascript
// Función que causa pantalla azul:
async function procesarPDF() {
  const resultado = await window.api.extraerDatosFactura(pdfPath)
  // Después de esto se pone azul
}
```

## 📄 TEXTO REAL EXTRAÍDO DEL PDF

Basado en el preview, el texto contiene:
```
Fecha de Emisión:
ORIGINAL
ROLDAN RUBEN ALBERTO
Pellegrini Carlos 173 Piso:02 Dpto:C -
Ciudad de Buenos Aires
Período Facturado Desde:Hasta:Fecha de Vto. para el pago:
Condición de venta:
Condición
29/12/202429/12/202429/12/2024
29/12/2024
20115999312
DIMAK DESARROLLOS INMOBILIARIOS S.R.L.
Santa Fe Av. 1970 Piso:24 - Capital Federal, Ciudad de
Buenos Aires
Contado
CUIT:
Ingresos Brutos:
Fecha de Inicio de Actividades:
Punto de Venta:
```

## 🎯 DATOS ESPERADOS

### Factura 1 Enero - 796.pdf:
- **Número:** 00003-00000813 (Punto de Venta: 00003 + Comp. Nro: 00000813)
- **Monto:** 28100.00 (Importe Total)
- **Fecha:** 29/12/2024

## 🔧 REQUERIMIENTOS ESPECÍFICOS

### 1. Corregir Patrones Regex:
- Buscar "Punto de Venta:" y "Comp. Nro:" por separado si no están juntos
- Buscar "Importe Total:" con múltiples formatos
- Buscar "Fecha de Emisión:" y fechas sueltas DD/MM/YYYY

### 2. Debug de Patrones:
- Agregar logs para mostrar qué texto está buscando cada patrón
- Mostrar fragmentos de texto donde deberían coincidir

### 3. Frontend Seguro:
- Evitar cualquier operación que cause pantalla azul
- Mostrar datos en alert sin intentar setear estados
- Manejo robusto de errores

## 📋 ESTRUCTURA DE RESPUESTA ESPERADA

```javascript
// Formato que debe retornar el extractor:
{
  success: true,
  datos: {
    numero: "00003-00000813",
    monto: 28100.00,
    fecha: "29/12/2024"
  },
  metadata: {
    archivo: "1 Enero - 796.pdf",
    camposEncontrados: 3
  }
}
```

## 🚀 PLAN DE ACCIÓN

### Paso 1: Debug del Parser
- Agregar console.log para mostrar texto completo
- Probar cada patrón individualmente
- Identificar por qué no coinciden

### Paso 2: Corregir Patrones
- Ajustar regex basados en el texto real
- Agregar más fallbacks
- Probar con el texto exacto del PDF

### Paso 3: Frontend Seguro
- Simplificar para evitar pantalla azul
- Solo mostrar datos en alert
- Sin setear estados de React

### Paso 4: Prueba Final
- Probar con PDF real
- Verificar que todos los campos se encuentren
- Confirmar que no se pone azul

## 🎯 RESULTADO FINAL

1. **Parser funcional** - Encuentra número, monto, fecha
2. **Frontend estable** - No se pone azul
3. **Datos correctos** - Extrae los 3 campos principales
4. **Logs claros** - Muestra qué encontró cada patrón

## 📝 NOTAS IMPORTANTES

- El PDF tiene texto seleccionable (no es imagen)
- pdf-parse funciona correctamente (extrae 4011 caracteres)
- Los datos están en el texto pero los patrones no los encuentran
- El frontend falla al procesar la respuesta exitosa
- Necesita solución URGENTE para producción

## 🚀 ACCIÓN INMEDIATA

Por favor:
1. Analiza el texto real extraído del PDF
2. Identifica por qué los patrones no coinciden
3. Corrige los regex para que funcionen con ese texto
4. Simplifica el frontend para evitar pantalla azul
5. Prueba y confirma que funciona

El usuario necesita esto funcionando AHORA para procesar facturas AFIP en producción.
