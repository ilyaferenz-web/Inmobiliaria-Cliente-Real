# Migración de Invoices entre Bases de Datos

## Problema
Tienes dos bases de datos de edificios:
- **DB1** (`Desktop/edificios.db`): Contiene facturas con estructura edificio → año → mes → invoice
- **DB2** (`ProyectoPalo/edificios.db`): La misma estructura + tablas extras (fichas, maintenance_notes, building_photos)

**Objetivo**: Migrar todos los invoices de DB1 → DB2 preservando las relaciones.

---

## Soluciones Disponibles

### ✅ Opción 1: Node.js (RECOMENDADO para tu proyecto)
Ya tienes Node.js instalado y el proyecto usa electron + Node.

**Ejecutar:**
```bash
cd ProyectoPalo
node migrate_invoices_db.js <ruta_DB1_origen> <ruta_DB2_destino>
```

**Ejemplos:**
```bash
node migrate_invoices_db.js "C:/Users/ilyaf/OneDrive/Desktop/backup/edificios.db" "C:/Users/ilyaf/OneDrive/Desktop/ProyectoPalo/edificios.db"
```

### 🟡 Nueva opción: importar desde carpeta de facturas
Para leer la carpeta `2025 CERTIFICACIONES 15-10` y copiar los archivos a `ProyectoPalo/facturas_guardadas`:
```bash
cd ProyectoPalo
node import_invoices_from_folder.js "C:/Users/ilyaf/OneDrive/Desktop/2025 CERTIFICACIONES 15-10" "C:/Users/ilyaf/OneDrive/Desktop/ProyectoPalo/edificios.db" "C:/Users/ilyaf/OneDrive/Desktop/ProyectoPalo/facturas_guardadas"
```

**Ventajas:**
- Lee directamente el árbol edificio → año → mes desde la carpeta fuente
- Mapea los edificios con los registros existentes en DB
- No crea nuevos edificios para carpetas no coincidentes
- Copia archivos en `facturas_guardadas`

**Ventajas:**
- Usa las mismas herramientas del proyecto
- Salida de errores más clara y detallada
- Puedes especificar cualquier DB de origen y destino

### ✅ Opción 2: Python
Alternativa si prefieres Python.

**Requisitos:**
```bash
pip install sqlite3  # Generalmente ya está incluido en Python
```

**Ejecutar:**
```bash
cd ProyectoPalo
python migrate_invoices_db.py
```

**Ventajas:**
- Mejor para análisis de datos
- Script más legible

---

## ¿Qué hace cada script?

### 1. **Conexión a ambas bases de datos**
   - Verifica que DB1 y DB2 existan
   - Comprueba que tengan las tablas necesarias

### 2. **Migración inteligente**
   - Lee cada edificio de DB1
   - Para cada edificio:
     - Obtiene o crea el mismo edificio en DB2
     - Lee todos los años de ese edificio
     - Para cada año:
       - Obtiene o crea el año en DB2
       - Lee todos los meses
       - Para cada mes:
         - Obtiene o crea el mes en DB2
         - **Inserta todos los invoices** manteniendo relaciones

### 3. **Evita duplicados**
   - Antes de insertar, verifica que no exista ya en DB2
   - Si existe: **SALTA** (no duplica)

### 4. **Reporte final**
   ```
   ✓ Edificios procesados: 172
   ✓ Años procesados: 450
   ✓ Meses procesados: 5400
   ✓ Invoices migradas: 85230
   ⏭️  Invoices saltadas (duplicados): 12
   ```

---

## Estructura de datos preservada

```
🏢 Edificio (buildings)
  └─ 📅 Año (years)
      └─ 📆 Mes (months)
          └─ 📄 Invoice (invoices)
              - file_path
              - fecha
              - monto
              - descripcion
```

---

## Opciones de DB2

### Si DB2 ya tiene datos:
El script **no borrará nada**, solo añadirá nuevos registros.

### Si quieres hacer un backup antes:
```bash
# Hacer copia de DB2 por si acaso
cp ProyectoPalo/edificios.db ProyectoPalo/edificios.db.backup
```

---

## Troubleshooting

### ❌ "No se encontró DB1"
```
Verifica que exista: C:\Users\ilyaf\OneDrive\Desktop\edificios.db
```

### ❌ "No se encontró DB2"
```
Verifica que exista: c:\Users\ilyaf\OneDrive\Desktop\ProyectoPalo\edificios.db
```

### ❌ Errores de rutas en Node.js
```javascript
// Si sale error de rutas, edita en migrate_invoices_db.js:
const DB1_PATH = require('path').resolve(__dirname, '..', 'edificios.db');
// Cambia a ruta absoluta:
const DB1_PATH = 'C:\\Users\\ilyaf\\OneDrive\\Desktop\\edificios.db';
```

### ❌ Errores de rutas en Python
```python
# Si sale error, edita en migrate_invoices_db.py:
DB1_PATH = Path(__file__).parent.parent / "edificios.db"
# Cambia a ruta absoluta:
DB1_PATH = Path(r"C:\Users\ilyaf\OneDrive\Desktop\edificios.db")
```

---

## Después de la migración

### Verificar integridad:
```sql
-- En DB2, ejecutar queries para validar:
SELECT COUNT(*) as total_invoices FROM invoices;
SELECT COUNT(*) as total_months FROM months;
SELECT COUNT(*) FROM invoices WHERE month_id IS NULL; -- Debe ser 0
```

### Usar los datos en tu app:
Los invoices ahora están en `fichas_db` bajo la misma estructura, listos para usar en GestionEdificios.jsx.

---

## Notas importantes

✅ **Los scripts son seguros:**
- No borran datos
- No sobrescriben nada
- Usan transacciones para evitar corrupción

✅ **Es rápido:**
- Procesa miles de registros en segundos

✅ **Es inteligente:**
- Detecta duplicados
- Preserva relaciones automáticamente
- Crea edificios/años/meses si no existen

---

¿Preguntas? Revisa el script que elegiste (`.js` o `.py`) tiene comentarios en cada sección.
