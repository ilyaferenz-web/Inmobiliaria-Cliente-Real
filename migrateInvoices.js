/**
 * Script para migrar facturas PDF a carpeta storage/
 * Ejecutar: node migrateInvoices.js
 * 
 * - Lee todas las facturas de la BD
 * - Copia los archivos PDF a ./storage/
 * - Actualiza las rutas en la BD (relativas)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Load config
let CONFIG = { dbPath: './edificios.db', storageDir: './storage' };
try {
  const cfgRaw = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
  const parsed = JSON.parse(cfgRaw);
  CONFIG = { ...CONFIG, ...parsed };
} catch (err) {
  console.warn('Could not load config.json, using defaults', err.message);
}

// Ensure storage dir exists
const storageDir = path.resolve(__dirname, CONFIG.storageDir);
try {
  fs.mkdirSync(storageDir, { recursive: true });
} catch (e) {}

// Open DB
const dbPathResolved = path.resolve(__dirname, CONFIG.dbPath);
const db = new sqlite3.Database(dbPathResolved, (err) => {
  if (err) {
    console.error('❌ Error conectando a BD:', err);
    process.exit(1);
  }
  console.log('✓ Conectado a BD:', dbPathResolved);
  console.log('✓ Storage dir:', storageDir);
  migrateInvoices();
});

function makeRelativeToStorage(absPath) {
  if (absPath.startsWith(storageDir)) {
    return path.relative(storageDir, absPath);
  }
  return absPath;
}

async function migrateInvoices() {
  try {
    // Get all invoices
    const invoices = await new Promise((res, rej) => {
      db.all('SELECT id, file_path FROM invoices', [], (err, rows) => {
        err ? rej(err) : res(rows || []);
      });
    });

    if (invoices.length === 0) {
      console.log('ℹ️  No hay facturas para migrar.');
      db.close();
      process.exit(0);
    }

    console.log(`\n📋 Se encontraron ${invoices.length} facturas.\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const invoice of invoices) {
      const { id, file_path } = invoice;
      
      // Skip if already in storage (starts with storageDir or is relative)
      if (!path.isAbsolute(file_path) || file_path.startsWith(storageDir)) {
        console.log(`⏭️  ID ${id}: Ya está en storage. Saltando.`);
        skipCount++;
        continue;
      }

      // Check if source file exists
      if (!fs.existsSync(file_path)) {
        console.log(`⚠️  ID ${id}: Archivo no encontrado: ${file_path}`);
        errorCount++;
        continue;
      }

      try {
        // Generate destination filename
        const ext = path.extname(file_path);
        const base = path.basename(file_path, ext);
        const timestamp = Date.now();
        const destName = `${base.replace(/[^a-zA-Z0-9-_\.]/g, '_')}_${timestamp}${ext}`;
        const destPath = path.join(storageDir, destName);

        // Copy file
        fs.copyFileSync(file_path, destPath);

        // Make relative path for DB
        const relPath = makeRelativeToStorage(destPath);

        // Update DB
        await new Promise((res, rej) => {
          db.run(
            'UPDATE invoices SET file_path = ? WHERE id = ?',
            [relPath, id],
            function(err) {
              err ? rej(err) : res();
            }
          );
        });

        console.log(`✓ ID ${id}: Copiado a storage/${destName}`);
        successCount++;
      } catch (err) {
        console.log(`❌ ID ${id}: Error - ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`  ✓ Migradas: ${successCount}`);
    console.log(`  ⏭️  Saltadas (ya en storage): ${skipCount}`);
    console.log(`  ❌ Errores: ${errorCount}`);

    db.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en migración:', err);
    db.close();
    process.exit(1);
  }
}
