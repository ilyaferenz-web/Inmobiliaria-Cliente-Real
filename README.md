# BuildHub — Proyecto de Gestión de Edificios

Resumen rápido
- Aplicación de escritorio con Electron + Vite + React para gestionar edificios y facturas (PDFs).
- Base de datos SQLite: `edificios.db` (contiene `buildings`, `years`, `months`, `invoices`, etc.).
- Script Python `edificioprime.py` para escanear carpetas locales y sembrar facturas en la DB.

Qué pasarle a tu amigo
- La carpeta del proyecto completa (todo el repo). No es necesario enviar `node_modules` — que instale dependencias con `npm install`.
- El archivo de base de datos `edificios.db` (si quieres que tenga los mismos datos). Si no, indica que cree una base vacía o modifique el schema.
- El contenido de `config.json` (incluido) — sirve para indicar la ruta de la DB y la carpeta `storage`.

Archivos importantes
- `main.js` — proceso principal de Electron (abre ventana, expone handlers IPC y conecta a la BD). Edita `config.json` para cambiar la ruta de la BD.
- `preload.js` — puente seguro entre renderer y main (exposición de `window.api`).
- `src/GestionEdificios.jsx` — UI principal en React (gestión de edificios y facturas).
- `edificioprime.py` — script para detectar PDFs en carpetas por año y crear entradas en `invoices`.
- `config.json` — configuración portable (ruta a DB y carpeta `storage`).

Prerequisitos (Windows)
1. Node.js (16+ recomendado) — https://nodejs.org/
2. npm (viene con Node.js)
3. Python 3.8+ (opcional, para `edificioprime.py`)

Instalación y primer arranque
1. Poner `edificios.db` en la raíz del proyecto o ajustar `config.json` `dbPath` al lugar donde esté la BD.
2. Desde la raíz del proyecto ejecutar:
```powershell
npm install
```
3. Para arrancar en modo desarrollo (Vite + Electron):
```powershell
npm run dev:electron
```
4. Para construir la app y ejecutar la versión empaquetada:
```powershell
npm run build
npm start
```

Configurar la base de datos para tu amigo
- Si le vas a pasar la BD: copia `edificios.db` junto al proyecto (o indicá la ruta absoluta en `config.json`).
- Si no le pasás la BD: puede crear una DB vacía con el schema necesario (puedo exportarte un SQL para crear las tablas si querés).

Script de importación (`edificioprime.py`)
- Edita `ROOT_PATH` dentro del script (o mueve los archivos de facturas a una estructura con la misma ruta) para que el script encuentre las carpetas de años/edificios.
- Ejecutar (desde la raíz del proyecto):
```powershell
# (opcional) crear venv
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python edificioprime.py
```
- El script ahora lee la ruta de la BD desde `config.json` (clave `dbPath`).

Consejos para continuar el desarrollo
- Implementar copia de PDFs a `storage/` al agregarlos desde la UI (`agregarFactura`) para evitar enlaces rotos.
- Añadir validaciones y manejo de errores en el frontend (mensajes claros, loaders al copiar archivos grandes).
- Añadir pruebas básicas y un script para inicializar la BD (`schema.sql`).

Empaquetado para enviar
- Comprimir la carpeta del proyecto (sin `node_modules`) y adjuntar `edificios.db` si corresponde.
- Incluir las instrucciones anteriores (README) y confirmar que `config.json` apunta a la BD correcta.

Si quieres, puedo:
- Generar el `schema.sql` con las tablas actuales.
- Implementar la copia automática de PDFs a `storage/` y cambiar `agregarFactura` para usar la copia.
- Crear un ZIP listo para enviar (si me das permiso para run esos comandos aquí).
