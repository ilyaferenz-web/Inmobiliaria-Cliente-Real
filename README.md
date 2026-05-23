BuildHub — Gestión de Edificios

App de escritorio hecha con Electron + React para administrar edificios y facturas PDF.

Qué necesita instalar
Node.js 16 o superior
npm
Python 3.8+ (solo si va a usar el script de importación)

Node.js

Qué tenés que pasarle
La carpeta completa del proyecto
edificios.db (si querés que tenga todos los datos)
config.json

No hace falta mandar node_modules.

Archivos importantes
main.js → proceso principal de Electron y conexión SQLite
preload.js → comunicación segura entre frontend y backend
src/GestionEdificios.jsx → interfaz principal
edificioprime.py → importa PDFs automáticamente
config.json → rutas de base de datos y storage
Instalación

Desde la raíz del proyecto:

npm install
Ejecutar en desarrollo
npm run dev:electron
Build de producción
npm run build
npm start
Base de datos

Si le pasás edificios.db, dejarlo en la raíz del proyecto.

Si no, hay que crear una base nueva con el schema correspondiente.

La ruta de la DB se configura en:

config.json
Script de importación (edificioprime.py)

Escanea carpetas con PDFs y crea registros en SQLite.

Antes de usarlo:

configurar ROOT_PATH
verificar dbPath en config.json

Ejecutar:

python -m venv .venv
.\.venv\Scripts\Activate.ps1
python edificioprime.py
Cosas pendientes / mejoras
copiar PDFs automáticamente a storage/
validaciones y manejo de errores
script schema.sql
loaders y mensajes más claros
Para enviarlo

Comprimir el proyecto SIN:

node_modules

y mandar junto con:

edificios.db
