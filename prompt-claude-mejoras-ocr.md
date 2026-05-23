📋 PROMPT PARA CLAUDE - MEJORAS SISTEMA OCR Y UI

CONTEXTO
Una vez que el OCR esté funcionando correctamente extrayendo texto de facturas AFIP, necesito implementar estas mejoras en el sistema de Proyecto Palo.

MEJORAS REQUERIDAS

1. 📊 **MEJORAS EN EXTRACCIÓN DE DATOS**
   - Verificar que el monto detectado sea el Importe Total real (no otros números)
   - Aumentar textoPreview de 500 a 1000+ caracteres para mejor visualización
   - Agregar más patrones de regex para diferentes formatos de factura

2. 🎨 **MEJORAS VISUALES EN UI**
   - Indicadores visuales de qué campos fueron autodetectados (✓ verde)
   - Botón para "Recargar desde PDF" si el usuario edita algo mal
   - Preview del PDF thumbnail si es posible
   - Estados visuales: campo detectado vs campo editado manualmente

3. 🔄 **MEJORAS EN FLUJO DE TRABAJO**
   - Opción de "Corregir extracción" si los datos no son correctos
   - Historial de PDFs procesados por edificio/pago
   - Validación de que el número de factura no exista previamente

4. 💾 **GUARDADO DE PDFs**
   - Opcionalmente guardar el PDF cargado en la base de datos
   - Vincular el archivo PDF al registro de pago/deuda
   - Botón para "Ver PDF original" desde el historial

5. 🛡️ **MEJORAS EN ROBUSTEZ**
   - Manejo de diferentes formatos de fecha (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
   - Detección de facturas escaneadas vs facturas con texto
   - Fallback a ingreso manual si OCR falla completamente

ESTRUCTURA ACTUAL
- Frontend: src/GestionEdificios.jsx (función procesarPDF)
- Backend: src/ipc-ocr-handler.js (extractor y parser)
- Base de datos: SQLite con tablas payments, debts

IMPLEMENTACIÓN ESPERADA
1. Actualizar el parser AFIP con más patrones
2. Mejorar la UI en GestionEdificios.jsx con indicadores visuales
3. Agregar tabla para almacenar PDFs si se implementa guardado
4. Implementar validaciones y controles de calidad

PRIORIDADES
1. Alta: Mejorar exactitud de extracción de monto y fecha
2. Media: Indicadores visuales y botón de recarga
3. Baja: Guardado de PDFs y thumbnails

ENTREGABLE ESPERADO
- Código actualizado con todas las mejoras implementadas
- Instrucciones para probar cada nueva funcionalidad
- Documentación de los nuevos patrones de regex agregados
- Guía de uso para las nuevas características visuales

OBJETIVO FINAL
Crear un sistema OCR robusto y amigable que extraiga datos de facturas AFIP con alta precisión y ofrezca una excelente experiencia de usuario para corregir y validar los datos extraídos.
