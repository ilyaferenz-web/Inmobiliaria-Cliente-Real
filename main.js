const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const { shell } = require('electron');
const { PDFDocument } = require('pdf-lib');
const { registrarHandlersOCR } = require('./src/ipc-ocr-handler');
const { execSync } = require('child_process');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');

const { createCanvas } = require('canvas');

// ============================================================
// MANEJO DE ERRORES GLOBAL
// ============================================================
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled rejection at:', promise, 'reason:', reason);
});

// ============================================================
// CONFIGURACION
// ============================================================

const uploadsDir = path.join(__dirname, 'uploads')

// Load configuration (db path, storage)
let CONFIG = { dbPath: './edificios.db', storageDir: './facturas_guardadas' }
try {
  const cfgRaw = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')
  const parsed = JSON.parse(cfgRaw)
  CONFIG = { ...CONFIG, ...parsed }
} catch (err) {
  console.warn('Could not load config.json, using defaults', err.message)
}

// Ensure storage dir exists
try { fs.mkdirSync(path.resolve(__dirname, CONFIG.storageDir), { recursive: true }) } catch (e) {}

// helpers for handling invoice file paths stored in DB
// stored value is kept relative to storageDir when possible
function resolveInvoicePath(stored) {
  if (!stored) return stored
  if (path.isAbsolute(stored)) return stored
  
  const storageDirResolved = path.resolve(__dirname, CONFIG.storageDir || './storage')
  const storageDirName = path.basename(storageDirResolved)

  // Quitar cualquier cantidad de prefijos duplicados del storageDirName
  let cleaned = stored
  while (cleaned.startsWith(storageDirName + path.sep) || cleaned.startsWith(storageDirName + '/')) {
    cleaned = cleaned.substring(storageDirName.length + 1)
  }
  
  return path.join(storageDirResolved, cleaned)
}

function makeRelativeToStorage(absPath) {
  const base = path.resolve(__dirname, CONFIG.storageDir || './storage')
  if (absPath.startsWith(base)) {
    return path.relative(base, absPath)
  }
  return absPath
}

// Initialize SQLite database connection
const dbPathResolved = path.resolve(__dirname, CONFIG.dbPath)
const db = new sqlite3.Database(dbPathResolved, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database at', dbPathResolved);
    
    // Create only missing tables without running full SQL that has conflicts
    // Check which tables exist
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
      if (err) {
        console.error('Error checking tables:', err);
        return;
      }
      
      const existingTables = tables.map(t => t.name);
      console.log('Existing tables:', existingTables.join(', '));
      
      // Create maintenance_notes if missing
      if (!existingTables.includes('maintenance_notes')) {
        console.log('Creating maintenance_notes table...');
        db.run(`CREATE TABLE IF NOT EXISTS "maintenance_notes" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "building_id" INTEGER NOT NULL,
          "titulo" TEXT,
          "nota" TEXT,
          "updated_at" TEXT,
          FOREIGN KEY("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating maintenance_notes:', err);
          else console.log('✓ maintenance_notes table created successfully');
        });
      }
      
      // Create building_photos if missing
      if (!existingTables.includes('building_photos')) {
        console.log('Creating building_photos table...');
        db.run(`CREATE TABLE IF NOT EXISTS "building_photos" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "building_id" INTEGER NOT NULL,
          "nombre" TEXT NOT NULL,
          "file_path" TEXT NOT NULL,
          "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating building_photos:', err);
          else console.log('✓ building_photos table created successfully');
        });
      }

      if (!existingTables.includes('receipts')) {
        db.run(`CREATE TABLE IF NOT EXISTS "receipts" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "month_id" INTEGER NOT NULL,
          "file_path" TEXT NOT NULL,
          "fecha" TEXT,
          "monto" REAL,
          "descripcion" TEXT,
          FOREIGN KEY("month_id") REFERENCES "months"("id") ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating receipts:', err)
          else console.log('✓ receipts table created')
        })
      }

      // Create invoices table if missing (needed for billing)
      if (!existingTables.includes('invoices')) {
        console.log('Creating invoices table...');
        db.run(`CREATE TABLE IF NOT EXISTS "invoices" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "month_id" INTEGER NOT NULL,
          "file_path" TEXT NOT NULL,
          "fecha" TEXT,
          "monto" REAL,
          "descripcion" TEXT,
          FOREIGN KEY("month_id") REFERENCES "months"("id") ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating invoices:', err);
          else console.log('✓ invoices table created successfully');
        });
      }

      // Agregar columna descripcion a maintenance_sections si no existe
      if (existingTables.includes('maintenance_sections')) {
        db.all("PRAGMA table_info(maintenance_sections)", [], (err, cols) => {
          if (err) return
          const colNames = cols.map(c => c.name)
          if (!colNames.includes('descripcion')) {
            db.run('ALTER TABLE maintenance_sections ADD COLUMN descripcion TEXT', (err) => {
              if (err) console.error('Error adding descripcion to maintenance_sections:', err)
              else console.log('✓ added descripcion column to maintenance_sections')
            })
          }
        })
      }

      // Create payments if missing
      if (!existingTables.includes('payments')) {
        console.log('Creating payments table...');
        db.run(`CREATE TABLE IF NOT EXISTS "payments" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "building_id" INTEGER NOT NULL,
          "monto" REAL NOT NULL,
          "fecha" TEXT DEFAULT CURRENT_TIMESTAMP,
          "concepto" TEXT,
          "estado" TEXT DEFAULT 'completado',
          "numero_factura" TEXT,
          FOREIGN KEY("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating payments:', err);
          else console.log('✓ payments table created successfully');
        });
      }

      // ensure invoices table has required columns
      if (existingTables.includes('invoices')) {
        db.all("PRAGMA table_info(invoices)", [], (err, cols) => {
          if (err) {
            console.error('Error introspecting invoices table:', err);
            return;
          }
          const colNames = cols.map(c => c.name);
          if (!colNames.includes('monto')) {
            console.log('Adding monto column to invoices table...');
            db.run('ALTER TABLE invoices ADD COLUMN monto REAL', (err) => {
              if (err) console.error('Failed to add monto column to invoices:', err);
              else console.log('✓ added monto column to invoices');
            });
          }
          if (!colNames.includes('fecha')) {
            console.log('Adding fecha column to invoices table...');
            db.run("ALTER TABLE invoices ADD COLUMN fecha TEXT", (err) => {
              if (err) console.error('Failed to add fecha column to invoices:', err);
              else console.log('✓ added fecha column to invoices');
            });
          }
          // descripcion should already exist but check anyway
          if (!colNames.includes('descripcion')) {
            console.log('Adding descripcion column to invoices table...');
            db.run("ALTER TABLE invoices ADD COLUMN descripcion TEXT", (err) => {
              if (err) console.error('Failed to add descripcion column to invoices:', err);
              else console.log('✓ added descripcion column to invoices');
            });
          }
        });
      }

      // ensure payments table has numero_factura column
      if (existingTables.includes('payments')) {
        db.all("PRAGMA table_info(payments)", [], (err, cols) => {
          if (err) {
            console.error('Error introspecting payments table:', err);
            return;
          }
          const colNames = cols.map(c => c.name);
          if (!colNames.includes('numero_factura')) {
            console.log('Adding numero_factura column to payments table...');
            db.run('ALTER TABLE payments ADD COLUMN numero_factura TEXT', (err) => {
              if (err) console.error('Failed to add numero_factura column to payments:', err);
              else console.log('✓ added numero_factura column to payments');
            });
          }
        });
      }

      // ensure debts table has numero_factura column
      if (existingTables.includes('debts')) {
        db.all("PRAGMA table_info(debts)", [], (err, cols) => {
          if (err) {
            console.error('Error introspecting debts table:', err);
            return;
          }
          const colNames = cols.map(c => c.name);
          if (!colNames.includes('numero_factura')) {
            console.log('Adding numero_factura column to debts table...');
            db.run('ALTER TABLE debts ADD COLUMN numero_factura TEXT', (err) => {
              if (err) console.error('Failed to add numero_factura column to debts:', err);
              else console.log('✓ added numero_factura column to debts');
            });
          }
        });
      }

      // Create debts table if missing (manual debt entries)
      if (!existingTables.includes('debts')) {
        console.log('Creating debts table...');
        db.run(`CREATE TABLE IF NOT EXISTS "debts" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "building_id" INTEGER NOT NULL,
          "monto" REAL NOT NULL,
          "fecha" TEXT DEFAULT CURRENT_TIMESTAMP,
          "descripcion" TEXT,
          "numero_factura" TEXT,
          FOREIGN KEY("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating debts:', err);
          else console.log('✓ debts table created successfully');
        });
      }

      // Create maintenance_sections if missing
      if (!existingTables.includes('maintenance_sections')) {
        console.log('Creating maintenance_sections table...');

        db.run(`
          CREATE TABLE IF NOT EXISTS maintenance_sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            building_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(building_id)
              REFERENCES buildings(id)
              ON DELETE CASCADE
          )
        `, (err) => {
          if (err)
            console.error('Error creating maintenance_sections:', err);
          else
            console.log('✓ maintenance_sections created');
        });
      }

      // Create maintenance_items if missing
      if (!existingTables.includes('maintenance_items')) {
        console.log('Creating maintenance_items table...');

        db.run(`
          CREATE TABLE IF NOT EXISTS maintenance_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER NOT NULL,
            texto TEXT NOT NULL,
            estado TEXT DEFAULT 'pendiente',
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(section_id)
              REFERENCES maintenance_sections(id)
              ON DELETE CASCADE
          )
        `, (err) => {
          if (err)
            console.error('Error creating maintenance_items:', err);
          else
            console.log('✓ maintenance_items created');
        });
}
      
      console.log('Database initialized successfully');
    });
  }
});

// Register the native OCR handler
registrarHandlersOCR();

// IPC Handlers for database operations
ipcMain.handle('obtenerEdificios', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, direccion FROM buildings', [], (err, rows) => {
      if (err) return reject(err);
      // Map DB column `direccion` to renderer field `direccion`
      const mapped = (rows || []).map(r => ({ id: r.id, direccion: r.direccion }));
      resolve(mapped);
    });
  });
});

ipcMain.handle('agregarEdificio', (event, direccion) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO buildings (nombre, direccion) VALUES (?, ?)', [direccion, direccion], function(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, direccion });
    });
  });
});

ipcMain.handle('buscarEdificio', (event, direccion) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, direccion FROM buildings WHERE direccion = ?', [direccion], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      resolve({ id: row.id, direccion: row.direccion });
    });
  });
});

ipcMain.handle('eliminarEdificio', (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM buildings WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else resolve({ deletedId: id });
    });
  });
});

ipcMain.handle('obtenerFicha', (event, buildingId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT contenido FROM fichas WHERE building_id = ?',
      [buildingId],
      (err, row) => {
        if (err) return reject(err)
        resolve(row ? row.contenido : '')
      }
    )
  })
})

ipcMain.handle('guardarFicha', (event, { id, ficha }) => {
  return new Promise((resolve, reject) => {

    // Primero vemos si ya existe ficha
    db.get(
      'SELECT id FROM fichas WHERE building_id = ?',
      [id],
      (err, row) => {
        if (err) return reject(err)

        if (row) {
          // UPDATE
          db.run(
            'UPDATE fichas SET contenido = ?, updated_at = CURRENT_TIMESTAMP WHERE building_id = ?',
            [ficha, id],
            function(err2) {
              if (err2) return reject(err2)
              resolve({ updated: true })
            }
          )
        } else {
          // INSERT
          db.run(
            'INSERT INTO fichas (building_id, contenido) VALUES (?, ?)',
            [id, ficha],
            function(err3) {
              if (err3) return reject(err3)
              resolve({ created: true })
            }
          )
        }
      }
    )

  })
})

// Suggestions for live search (partial match on nombre or direccion)
// buscarSugerencias handler removed (live-search by direccion not used anymore)

// Modify building
ipcMain.handle('modificarEdificio', (event, { id, direccion }) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE buildings SET direccion = ? WHERE id = ?', [direccion, id], function(err) {
      if (err) return reject(err)
      resolve({ id, direccion })
    })
  })
})

// Facturas (Invoices) handlers
ipcMain.handle('obtenerFacturas', (event, monthId) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, month_id, file_path, fecha, monto, descripcion FROM invoices WHERE month_id = ?', [monthId], (err, rows) => {
      if (err) return reject(err)
      const converted = (rows || []).map(r => ({ ...r, file_path: resolveInvoicePath(r.file_path) }))
      resolve(converted)
    })
  })
})

ipcMain.handle('obtenerFacturasAll', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT i.id, i.month_id, i.file_path, i.fecha, i.monto, i.descripcion, m.mes, y.year FROM invoices i JOIN months m ON i.month_id = m.id JOIN years y ON m.year_id = y.id ORDER BY y.year DESC, m.id DESC', [], (err, rows) => {
      if (err) return reject(err)
      const converted = (rows || []).map(r => ({ ...r, file_path: resolveInvoicePath(r.file_path) }))
      resolve(converted)
    })
  })
})

ipcMain.handle('seleccionarPDF', async (event) => {
  try {
    let win = BrowserWindow.getFocusedWindow() || (BrowserWindow.getAllWindows().length ? BrowserWindow.getAllWindows()[0] : null)
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    })
    if (!result || result.canceled) return null
    return (result.filePaths && result.filePaths.length > 0) ? result.filePaths[0] : null
  } catch (err) {
    console.error('Error in seleccionarPDF handler:', err)
    return null
  }
})

ipcMain.handle('agregarFactura', (event, { monthId, filePath, fecha, monto, descripcion, numero_factura }) => {
  return new Promise((resolve, reject) => {
    try {
      // Copy the selected file into storage to keep a local copy
      if (!filePath || !fs.existsSync(filePath)) return reject(new Error('Archivo no encontrado'))
      const ext = path.extname(filePath)
      const base = path.basename(filePath, ext)
      const timestamp = Date.now()
      const destDir = path.resolve(__dirname, CONFIG.storageDir || './storage')
      const destName = `${base.replace(/[^a-zA-Z0-9-_\.]/g,'_')}_${timestamp}${ext}`
      const destPath = path.join(destDir, destName)
      fs.copyFileSync(filePath, destPath)

      const relPath = makeRelativeToStorage(destPath)
      const desc = descripcion || path.basename(destPath)
      db.run('INSERT INTO invoices (month_id, file_path, fecha, monto, descripcion) VALUES (?, ?, ?, ?, ?)',
        [monthId, relPath, fecha, monto || null, desc || null],
        function(err) {
          if (err) return reject(err)
          resolve({ id: this.lastID, monthId, filePath: resolveInvoicePath(relPath), fecha, monto, descripcion: desc })
        }
      )
    } catch (err) { reject(err) }
  })
})

ipcMain.handle('abrirPDF', (event, filePath) => {
  const abs = resolveInvoicePath(filePath)
  if (fs.existsSync(abs)) {
    shell.openPath(abs)
    return { success: true }
  }
  return { success: false, error: 'Archivo no encontrado' }
})

ipcMain.handle('eliminarFactura', (event, facturaid) => {
  return new Promise((resolve, reject) => {
    // First get the file path to delete the physical file
    db.get('SELECT file_path FROM invoices WHERE id = ?', [facturaid], (err, row) => {
      if (err) return reject(err)
      if (!row) return reject(new Error('Factura no encontrada'))
      
      // Delete the physical file
      try {
        const fullPath = resolveInvoicePath(row.file_path)
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath)
          console.log('Archivo físico eliminado:', fullPath)
        }
      } catch (fileErr) {
        console.warn('No se pudo eliminar el archivo físico:', fileErr.message)
        // Continue even if file deletion fails
      }
      
      // Delete from database
      db.run('DELETE FROM invoices WHERE id = ?', [facturaid], function(err) {
        if (err) return reject(err)
        resolve({ deletedId: facturaid })
      })
    })
  })
})

// Obtener años para un edificio
ipcMain.handle('obtenerYears', (event, buildingId) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, year FROM years WHERE building_id = ? ORDER BY year DESC', [buildingId], (err, rows) => {
      if (err) return reject(err)
      resolve(rows || [])
    })
  })
})

// Obtener months para un year
ipcMain.handle('obtenerMonths', (event, yearId) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT id, mes FROM months WHERE year_id = ? ORDER BY 
      CASE mes
        WHEN 'Enero' THEN 1
        WHEN 'Febrero' THEN 2
        WHEN 'Marzo' THEN 3
        WHEN 'Abril' THEN 4
        WHEN 'Mayo' THEN 5
        WHEN 'Junio' THEN 6
        WHEN 'Julio' THEN 7
        WHEN 'Agosto' THEN 8
        WHEN 'Septiembre' THEN 9
        WHEN 'Octubre' THEN 10
        WHEN 'Noviembre' THEN 11
        WHEN 'Diciembre' THEN 12
      END ASC`, [yearId], (err, rows) => {
      if (err) return reject(err)
      resolve(rows || [])
    })
  })
})

// Agregar un año para un edificio
ipcMain.handle('agregarYear', (event, { buildingId, year }) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO years (building_id, year) VALUES (?, ?)', [buildingId, year], function(err) {
      if (err) return reject(err)
      resolve({ id: this.lastID, buildingId, year })
    })
  })
})

// Agregar un mes para un año
ipcMain.handle('agregarMonth', (event, { yearId, mes }) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO months (year_id, mes) VALUES (?, ?)', [yearId, mes], function(err) {
      if (err) return reject(err)
      resolve({ id: this.lastID, yearId, mes })
    })
  })
})

// Eliminar un año (y sus months e invoices asociados)
ipcMain.handle('eliminarYear', (event, yearId) => {
  return new Promise((resolve, reject) => {
    if (!yearId) return reject(new Error('yearId requerido'))
    
    // First get all invoices to delete physical files
    db.all('SELECT file_path FROM invoices WHERE month_id IN (SELECT id FROM months WHERE year_id = ?)', [yearId], (err, invoices) => {
      if (err) {
        console.error('Error getting invoices for deletion:', err)
        return reject(err)
      }
      
      // Delete physical files
      for (const invoice of invoices || []) {
        try {
          const fullPath = resolveInvoicePath(invoice.file_path)
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath)
            console.log('Archivo físico eliminado (year deletion):', fullPath)
          }
        } catch (fileErr) {
          console.warn('No se pudo eliminar archivo físico:', fileErr.message)
        }
      }
      
      // First delete invoices from database
      db.run('DELETE FROM invoices WHERE month_id IN (SELECT id FROM months WHERE year_id = ?)', [yearId], function(err) {
        if (err) {
          console.error('Error deleting invoices:', err)
          return reject(err)
        }
        // Then delete months
        db.run('DELETE FROM months WHERE year_id = ?', [yearId], function(err2) {
          if (err2) {
            console.error('Error deleting months:', err2)
            return reject(err2)
          }
          // Finally delete year
          db.run('DELETE FROM years WHERE id = ?', [yearId], function(err3) {
            if (err3) {
              console.error('Error deleting year:', err3)
              return reject(err3)
            }
            console.log('Year', yearId, 'deleted successfully')
            resolve({ deletedId: yearId })
          })
        })
      })
    })
  })
})

// Eliminar un mes (y sus invoices asociados)
ipcMain.handle('eliminarMonth', (event, monthId) => {
  return new Promise((resolve, reject) => {
    if (!monthId) return reject(new Error('monthId requerido'))
    
    // First get all invoices to delete physical files
    db.all('SELECT file_path FROM invoices WHERE month_id = ?', [monthId], (err, invoices) => {
      if (err) {
        console.error('Error getting invoices for month deletion:', err)
        return reject(err)
      }
      
      // Delete physical files
      for (const invoice of invoices || []) {
        try {
          const fullPath = resolveInvoicePath(invoice.file_path)
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath)
            console.log('Archivo físico eliminado (month deletion):', fullPath)
          }
        } catch (fileErr) {
          console.warn('No se pudo eliminar archivo físico:', fileErr.message)
        }
      }
      
      // Delete invoices from database
      db.run('DELETE FROM invoices WHERE month_id = ?', [monthId], function(err) {
        if (err) {
          console.error('Error deleting invoices:', err)
          return reject(err)
        }
        // Then delete month
        db.run('DELETE FROM months WHERE id = ?', [monthId], function(err2) {
          if (err2) {
            console.error('Error deleting month:', err2)
            return reject(err2)
          }
          console.log('Month', monthId, 'deleted successfully')
          resolve({ deletedId: monthId })
        })
      })
    })
  })
})

// Reemplazar archivo PDF de una factura: copia al storage y actualiza invoices.file_path
ipcMain.handle('reemplazarFactura', async (event, { facturaId, sourcePath }) => {
  try {
    if (!sourcePath || !fs.existsSync(sourcePath)) return { success: false, error: 'Archivo fuente no existe' }
    const ext = path.extname(sourcePath)
    const base = path.basename(sourcePath, ext)
    const timestamp = Date.now()
    const destDir = path.resolve(__dirname, CONFIG.storageDir || './storage')
    const destName = `${base.replace(/[^a-zA-Z0-9-_\.]/g,'_')}_${timestamp}${ext}`
    const destPath = path.join(destDir, destName)

    // Copy file
    fs.copyFileSync(sourcePath, destPath)

    // Get current file path to optionally delete if it's inside storage
    const cur = await new Promise((res, rej) => db.get('SELECT file_path FROM invoices WHERE id = ?', [facturaId], (err, row) => err ? rej(err) : res(row)))
    let oldPath = cur && cur.file_path

    // Store relative path
    const relPath = makeRelativeToStorage(destPath)

    // Update DB
    await new Promise((res, rej) => db.run('UPDATE invoices SET file_path = ? WHERE id = ?', [relPath, facturaId], function(err) { if (err) rej(err); else res({ id: facturaId }) }))

    // If old file was inside our storage folder, try to delete it
    try {
      const oldAbsPath = resolveInvoicePath(oldPath)
      if (oldPath && oldAbsPath.startsWith(destDir) && fs.existsSync(oldAbsPath)) {
        fs.unlinkSync(oldAbsPath)
      }
    } catch (e) { /* ignore deletion errors */ }

    return { success: true, filePath: destPath }
  } catch (err) {
    console.error('Error reemplazando factura:', err)
    return { success: false, error: err.message }
  }
})

// Modificar factura (metadata y/o ruta)
ipcMain.handle('modificarFactura', (event, { id, file_path, fecha, monto, descripcion }) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE invoices SET file_path = COALESCE(?, file_path), fecha = COALESCE(?, fecha), monto = COALESCE(?, monto), descripcion = COALESCE(?, descripcion) WHERE id = ?', [file_path, fecha, monto, descripcion, id], function(err) {
      if (err) return reject(err)
      resolve({ id, file_path, fecha, monto, descripcion })
    })
  })
})

ipcMain.handle('combinarFacturasYear', async (event, yearId) => {
  try {

    const facturas = await new Promise((resolve, reject) => {
      db.all(
        `SELECT i.file_path
         FROM invoices i
         JOIN months m ON i.month_id = m.id
         JOIN years y ON m.year_id = y.id
         WHERE y.id = ?
         ORDER BY m.id ASC`,
        [yearId],
        (err, rows) => {
          if (err) reject(err)
          else resolve(rows || [])
        }
      )
    })

    console.log("Facturas encontradas:", facturas.length)

    if (facturas.length === 0)
      return { success: false, error: 'No hay facturas para este año' }

    const mergedPdf = await PDFDocument.create()

    let totalPaginas = 0

    for (const factura of facturas) {
      const storageDir = path.resolve(__dirname, CONFIG.storageDir || './storage')
      const fullPath = path.isAbsolute(factura.file_path)
        ? factura.file_path
        : path.join(storageDir, factura.file_path)

      if (!fs.existsSync(fullPath)) {
        console.log("Archivo no existe:", fullPath)
        continue
      }

      try {
        const pdfBytes = fs.readFileSync(fullPath)
        const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })

        const pageIndices = pdf.getPageIndices()
        console.log("Páginas en este PDF:", pageIndices.length)

        const copiedPages = await mergedPdf.copyPages(pdf, pageIndices)

        copiedPages.forEach(page => mergedPdf.addPage(page))

        totalPaginas += copiedPages.length

      } catch (err) {
        console.log("Error cargando PDF:", factura.file_path)
        console.log(err.message)
      }
    }

    console.log("Total páginas finales:", totalPaginas)

    if (totalPaginas === 0)
      return { success: false, error: 'No se pudieron copiar páginas' }

    const finalPdfBytes = await mergedPdf.save()

    const destDir = path.resolve(__dirname, CONFIG.storageDir || './storage')
    const finalPath = path.join(destDir, `Facturas_Año_${yearId}_${Date.now()}.pdf`)

    fs.writeFileSync(finalPath, finalPdfBytes)

    await shell.openPath(finalPath)

    return { success: true, filePath: finalPath }

  } catch (err) {
    console.error("ERROR GENERAL:", err)
    return { success: false, error: err.message }
  }
})

// Mantenimiento
ipcMain.handle('obtenerNotasMantenimiento', (event, buildingId) => {
  return new Promise((resolve, reject) => {
    console.log('Obteniendo notas para edificio:', buildingId);
    db.all(
      `SELECT id, titulo, nota, estado, updated_at, completed_at
      FROM maintenance_notes
      WHERE building_id = ?
      ORDER BY updated_at DESC`,
      [buildingId],
      (err, rows) => {
        if (err) {
          console.error('Error obteniendo notas:', err);
          return reject(err);
        }
        console.log('Notas encontradas:', rows ? rows.length : 0);
        resolve(rows || []);
      }
    );
  });
});

ipcMain.handle('obtenerItemsMantenimiento', (_, sectionId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM maintenance_items
       WHERE section_id = ?
       ORDER BY sort_order ASC, created_at ASC`,  // orden fijo, nunca cambia
      [sectionId],
      (err, rows) => {
        if (err) return reject(err)
        resolve(rows || [])
      }
    )
  })
})

ipcMain.handle('cambiarEstadoItemMantenimiento', (_, { id, nuevoEstado }) => {
  return new Promise((resolve, reject) => {
    // Solo toca estado y updated_at — sort_order nunca cambia
    db.run(
      `UPDATE maintenance_items
       SET estado = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nuevoEstado, id],
      err => { if (err) reject(err); else resolve(true) }
    )
  })
})

ipcMain.handle('eliminarItemMantenimiento', (_, id) => {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM maintenance_items WHERE id = ?`,
      [id],
      err => { if (err) reject(err); else resolve(true) }
    )
  })
})

ipcMain.handle('agregarItemMantenimiento', (_, { sectionId, texto }) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COALESCE(MAX(sort_order), -1) AS ultimo FROM maintenance_items WHERE section_id = ?`,
      [sectionId],
      (err, row) => {
        if (err) return reject(err)
        const nuevoOrden = (row?.ultimo ?? -1) + 1
        db.run(
          `INSERT INTO maintenance_items (section_id, texto, sort_order)
           VALUES (?, ?, ?)`,
          [sectionId, texto, nuevoOrden],
          function(err2) {
            if (err2) return reject(err2)
            resolve({ id: this.lastID })
          }
        )
      }
    )
  })
})

ipcMain.handle('agregarNotaMantenimiento', (event, { buildingId, titulo, nota }) => {
  return new Promise((resolve, reject) => {
    if (!buildingId || !titulo || !nota) {
      return reject(new Error('Datos incompletos'));
    }

    db.run(
      `INSERT INTO maintenance_notes (building_id, titulo, nota, updated_at)
       VALUES (?, ?, ?, datetime('now', 'localtime'))`,
      [buildingId, titulo, nota],
      function (err) {
        if (err) return reject(err);

        resolve({
          id: this.lastID,
          buildingId,
          titulo,
          nota,
          updated_at: new Date().toISOString()
        });
      }
    );
  });
});

ipcMain.handle('eliminarNotaMantenimiento', (event, noteId) => {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM maintenance_notes WHERE id = ?',
      [noteId],
      function (err) {
        if (err) reject(err)
        else resolve({ deletedId: noteId })
      }
    )
  })
})

ipcMain.handle('cambiarEstadoMantenimiento', (event, { id, nuevoEstado }) => {
  return new Promise((resolve, reject) => {

    let query;
    let params;

    if (nuevoEstado === 'completado') {
      query = `
        UPDATE maintenance_notes 
        SET estado = ?, 
            completed_at = datetime('now', 'localtime'),
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `;
      params = [nuevoEstado, id];
    } else {
      query = `
        UPDATE maintenance_notes 
        SET estado = ?, 
            completed_at = NULL,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `;
      params = [nuevoEstado, id];
    }

    db.run(query, params, function (err) {
      if (err) return reject(err);
      resolve({ id, nuevoEstado });
    });
  });
});

// Fotos
ipcMain.handle(
  'guardarFotoEdificio',
  async (event, { buildingId, yearId, monthId, file }) => {
    return new Promise((resolve, reject) => {
      try {
        const uploadsDir = path.join(__dirname, 'uploads')

        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true })
        }

        const fileName = Date.now() + '_' + file.name
        const filePath = path.join(uploadsDir, fileName)

        const buffer = Buffer.from(file.data)

        fs.writeFileSync(filePath, buffer)

        db.run(
          `
          INSERT INTO building_photos
          (
            building_id,
            year_id,
            month_id,
            nombre,
            file_path,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
          `,
          [
            buildingId,
            yearId || null,
            monthId || null,
            file.name,
            filePath
          ],
          function(err) {
            if (err) return reject(err)

            resolve({
              id: this.lastID,
              buildingId,
              yearId,
              monthId,
              nombre: file.name,
              file_path: filePath
            })
          }
        )
      } catch (err) {
        reject(err)
      }
    })
  }
)

ipcMain.handle(
  'obtenerFotosEdificio',
  (event, { buildingId, yearId, monthId }) => {
    return new Promise((resolve, reject) => {

      let query = `
        SELECT *
        FROM building_photos
        WHERE building_id = ?
      `

      const params = [buildingId]

      if (yearId) {
        query += ` AND year_id = ?`
        params.push(yearId)
      }

      if (monthId) {
        query += ` AND month_id = ?`
        params.push(monthId)
      }

      query += ` ORDER BY id DESC`

      db.all(query, params, (err, rows) => {
        if (err) return reject(err)
        resolve(rows || [])
      })
    })
  }
)

ipcMain.handle('eliminarFoto', (event, id) => {

  return new Promise((resolve, reject) => {

    const photoId = Number(id)

    if (!Number.isFinite(photoId)) {
      return reject(
        new Error('ID inválido')
      )
    }

    db.get(
      `
      SELECT file_path
      FROM building_photos
      WHERE id = ?
      `,
      [photoId],
      (err, row) => {

        if (err)
          return reject(err)

        if (!row) {
          return reject(
            new Error('Foto no encontrada')
          )
        }

        try {

          if (
            row.file_path &&
            fs.existsSync(row.file_path)
          ) {
            fs.unlinkSync(row.file_path)
          }

        } catch (fileErr) {

          console.warn(
            'No se pudo borrar archivo:',
            fileErr
          )

        }

        db.run(
          `
          DELETE FROM building_photos
          WHERE id = ?
          `,
          [photoId],
          function (err) {

            if (err)
              return reject(err)

            resolve({
              success: true,
              deletedId: photoId
            })

          }
        )

      }
    )

  })

})

ipcMain.handle('obtenerImagenBase64', async (event, filePath) => {
  const fs = require('fs')

  if (!fs.existsSync(filePath)) {
    return null
  }

  const file = fs.readFileSync(filePath)
  const base64 = file.toString('base64')

  const ext = filePath.split('.').pop()

  return `data:image/${ext};base64,${base64}`
})

// ===== PAYMENTS HANDLERS =====

// Obtener total facturado (deuda) de un edificio
ipcMain.handle('obtenerTotalFacturado', (event, buildingId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COALESCE(SUM(monto), 0) as total FROM invoices WHERE month_id IN (SELECT id FROM months WHERE year_id IN (SELECT id FROM years WHERE building_id = ?))',
      [buildingId],
      (err, row) => {
        if (err) return reject(err)
        resolve(row ? row.total : 0)
      }
    )
  })
})

// Obtener total pagado de un edificio
ipcMain.handle('obtenerTotalPagado', (event, buildingId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COALESCE(SUM(monto), 0) as total FROM payments WHERE building_id = ?',
      [buildingId],
      (err, row) => {
        if (err) return reject(err)
        resolve(row ? row.total : 0)
      }
    )
  })
})

// Obtener estado de pagos (deuda, pagado, pendiente)
ipcMain.handle('obtenerEstadoPagos', (event, buildingId) => {
  return new Promise((resolve, reject) => {
    // sum invoices
    db.get(
      'SELECT COALESCE(SUM(monto), 0) as total FROM invoices WHERE month_id IN (SELECT id FROM months WHERE year_id IN (SELECT id FROM years WHERE building_id = ?))',
      [buildingId],
      (err, facturas) => {
        if (err) return reject(err)
        const totalFacturas = facturas ? facturas.total : 0

        // sum manual debts
        db.get(
          'SELECT COALESCE(SUM(monto), 0) as total FROM debts WHERE building_id = ?',
          [buildingId],
          (err3, debtsRow) => {
            if (err3) return reject(err3)
            const totalDebts = debtsRow ? debtsRow.total : 0
            const totalDeuda = totalFacturas + totalDebts

            db.get(
              'SELECT COALESCE(SUM(monto), 0) as total FROM payments WHERE building_id = ?',
              [buildingId],
              (err2, pagos) => {
                if (err2) return reject(err2)
                const totalPagado = pagos ? pagos.total : 0
                const pendiente = totalDeuda - totalPagado

                let estado = 'No pagado'
                if (pendiente <= 0) estado = 'Pagado completo'
                else if (totalPagado > 0) estado = 'Pagado parcial'

                resolve({
                  totalDeuda,
                  totalPagado,
                  pendiente: Math.max(0, pendiente),
                  estado
                })
              }
            )
          }
        )
      }
    )
  })
})

// Devuelve lista de edificios que aún deben dinero (deuda > pagado) junto con totales
ipcMain.handle('obtenerEdificiosConDeuda', (event) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM (
        SELECT b.id, b.direccion,
          COALESCE((SELECT SUM(i.monto) FROM invoices i
                    JOIN months m ON i.month_id = m.id
                    JOIN years y ON m.year_id = y.id
                    WHERE y.building_id = b.id),0)
             + COALESCE((SELECT SUM(d.monto) FROM debts d WHERE d.building_id = b.id),0) AS totalDeuda,
          COALESCE((SELECT SUM(p.monto) FROM payments p WHERE p.building_id = b.id),0) AS totalPagado
        FROM buildings b
      )
      WHERE totalDeuda > totalPagado`,
      [],
      (err, rows) => {
        if (err) return reject(err)
        resolve(rows || [])
      }
    )
  })
})

// Agregar pago
ipcMain.handle('agregarPago', (event, { buildingId, monto, concepto, fecha, numero_factura }) => {
  return new Promise((resolve, reject) => {
    if (!buildingId || !monto || monto <= 0) {
      return reject(new Error('Datos incompletos o monto inválido'))
    }

    const fechaValue = fecha || new Date().toISOString().split('T')[0]

    db.run(
      'INSERT INTO payments (building_id, monto, fecha, concepto, estado, numero_factura) VALUES (?, ?, ?, ?, ?, ?)',
      [buildingId, monto, fechaValue, concepto || 'Pago general', 'completado', numero_factura || null],
      function(err) {
        if (err) return reject(err)
        resolve({ id: this.lastID, buildingId, monto, concepto, fecha: fechaValue, numero_factura })
      }
    )
  })
})

// Agregar deuda manual (no requiere archivo)
ipcMain.handle('agregarDeuda', (event, { buildingId, monto, descripcion, fecha, numero_factura }) => {
  return new Promise((resolve, reject) => {
    if (!buildingId || !monto || monto <= 0) {
      return reject(new Error('Faltan datos o monto inválido'))
    }
    const fechaValue = fecha || new Date().toISOString().split('T')[0]
    db.run(
      'INSERT INTO debts (building_id, monto, fecha, descripcion, numero_factura) VALUES (?, ?, ?, ?, ?)',
      [buildingId, monto, fechaValue, descripcion || null, numero_factura || null],
      function(err) {
        if (err) return reject(err)
        resolve({ id: this.lastID, buildingId, monto, descripcion, fecha: fechaValue, numero_factura })
      }
    )
  })
})

// Obtener historial de pagos
ipcMain.handle('obtenerPagos', (event, buildingId) => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, building_id, monto, fecha, concepto, estado, numero_factura FROM payments WHERE building_id = ? ORDER BY fecha DESC',
      [buildingId],
      (err, rows) => {
        if (err) return reject(err)
        resolve(rows || [])
      }
    )
  })
})

// Eliminar pago
ipcMain.handle('eliminarPago', (event, pagoId) => {
  const id = Number(pagoId)
  if (!Number.isFinite(id)) return Promise.reject(new Error('ID de pago inválido'))
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM payments WHERE id = ?', [id], function(err) {
      if (err) return reject(err)
      resolve({ deletedId: id, changes: this.changes })
    })
  })
})

// Obtener historial de deudas (manuales)
ipcMain.handle('obtenerDeudas', (event, buildingId) => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, building_id, monto, fecha, descripcion, numero_factura FROM debts WHERE building_id = ? ORDER BY fecha DESC',
      [buildingId],
      (err, rows) => {
        if (err) return reject(err)
        resolve(rows || [])
      }
    )
  })
})

// Eliminar deuda manual
ipcMain.handle('eliminarDeuda', (event, deudaId) => {
  const id = Number(deudaId)
  if (!Number.isFinite(id)) return Promise.reject(new Error('ID de deuda inválido'))
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM debts WHERE id = ?', [id], function(err) {
      if (err) return reject(err)
      resolve({ deletedId: id, changes: this.changes })
    })
  })
})

function getBackupRoot() {
  const backupsRoot = path.resolve(__dirname, 'Backups')
  if (!fs.existsSync(backupsRoot)) {
    fs.mkdirSync(backupsRoot, { recursive: true })
  }
  return backupsRoot
}

ipcMain.handle('obtenerRutaCarpetaBackups', async (event) => {
  const backupsRoot = getBackupRoot()
  return {
    success: true,
    backupsRoot,
    dbPath: dbPathResolved,
    storageDir: path.resolve(__dirname, CONFIG.storageDir || './facturas_guardadas'),
    appDataRoot: __dirname
  }
})

ipcMain.handle('obtenerBackups', async (event) => {
  const backupsRoot = getBackupRoot()
  const backups = []

  const entries = fs.readdirSync(backupsRoot, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const backupFolder = path.join(backupsRoot, entry.name)
    const backupFile = path.join(backupFolder, path.basename(dbPathResolved))
    if (!fs.existsSync(backupFile)) continue
    const stats = fs.statSync(backupFile)
    backups.push({
      name: entry.name,
      path: backupFile,
      size: stats.size,
      createdAt: stats.birthtime
    })
  }

  backups.sort((a, b) => b.createdAt - a.createdAt)
  return { success: true, backups }
})

ipcMain.handle('crearBackupDefault', async (event) => {
  const backupsRoot = getBackupRoot()
  const folderName = new Date().toISOString().slice(0, 10)
  const backupFolder = path.join(backupsRoot, folderName)
  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true })
  }
  const targetPath = path.join(backupFolder, path.basename(dbPathResolved))
  fs.copyFileSync(dbPathResolved, targetPath)
  return { success: true, path: targetPath, date: folderName }
})

ipcMain.handle('seleccionarUbicacionBackup', async (event) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar copia de seguridad de la base de datos',
    defaultPath: `edificios-${new Date().toISOString().slice(0, 10)}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  })

  return { canceled, filePath }
})

ipcMain.handle('crearBackupCustom', async (event, destino) => {
  if (!destino) {
    return { success: false, error: 'Ruta de destino inválida' }
  }
  const resolvedDestino = path.resolve(destino)
  const destinoDir = path.dirname(resolvedDestino)
  if (!fs.existsSync(destinoDir)) {
    fs.mkdirSync(destinoDir, { recursive: true })
  }

  fs.copyFileSync(dbPathResolved, resolvedDestino)
  return { success: true, path: resolvedDestino }
})

ipcMain.handle('abrirCarpetaBackups', async (event) => {
  const backupsRoot = getBackupRoot()
  await shell.openPath(backupsRoot)
  return { success: true, path: backupsRoot }
})

ipcMain.handle('abrirUbicacionArchivo', async (event, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return { success: false, error: 'Archivo no encontrado' }
  }
  await shell.showItemInFolder(path.resolve(filePath))
  return { success: true }
})

// 🔓 Desencriptar PDF
function desencriptarPDF(inputPath) {
  const outputPath = inputPath.replace('.pdf', '_decrypted.pdf');

  try {
    execSync(`qpdf --decrypt "${inputPath}" "${outputPath}"`);
    return outputPath;
  } catch (err) {
    console.error('Error desencriptando PDF:', err);
    return null;
  }
}

ipcMain.handle('combinarFacturasYearImagenes', async (event, params) => {
  try {
    // Compatibilidad: acepta yearId directo (viejo) o { yearId, fromMonthId, toMonthId, buildingId } (rango)
    const esRango = params && typeof params === 'object' && params.fromMonthId
    const yearId = esRango ? null : (typeof params === 'object' ? params.yearId : params)

    console.log('[COMBINAR] Modo:', esRango ? 'rango' : 'año completo', params)

    let facturas

    if (esRango) {
      const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

      // Traer todos los meses del edificio ordenados
      const meses = await new Promise((resolve, reject) => {
        db.all(
          `SELECT m.id, m.mes, y.year
           FROM months m
           JOIN years y ON m.year_id = y.id
           WHERE y.building_id = ?
           ORDER BY y.year ASC,
             CASE m.mes
               WHEN 'Enero' THEN 1 WHEN 'Febrero' THEN 2 WHEN 'Marzo' THEN 3
               WHEN 'Abril' THEN 4 WHEN 'Mayo' THEN 5 WHEN 'Junio' THEN 6
               WHEN 'Julio' THEN 7 WHEN 'Agosto' THEN 8 WHEN 'Septiembre' THEN 9
               WHEN 'Octubre' THEN 10 WHEN 'Noviembre' THEN 11 WHEN 'Diciembre' THEN 12
             END ASC`,
          [params.buildingId],
          (err, rows) => { if (err) reject(err); else resolve(rows || []) }
        )
      })

      const fromIdx = meses.findIndex(m => m.id === params.fromMonthId)
      const toIdx   = meses.findIndex(m => m.id === params.toMonthId)

      if (fromIdx === -1 || toIdx === -1 || fromIdx > toIdx)
        return { success: false, error: 'Rango inválido' }

      const mesesRango = meses.slice(fromIdx, toIdx + 1)
      const placeholders = mesesRango.map(() => '?').join(',')

      facturas = await new Promise((resolve, reject) => {
        db.all(
          `SELECT i.file_path, m.mes, y.year
           FROM invoices i
           JOIN months m ON i.month_id = m.id
           JOIN years y ON m.year_id = y.id
           WHERE i.month_id IN (${placeholders})
           ORDER BY y.year ASC,
             CASE m.mes
               WHEN 'Enero' THEN 1 WHEN 'Febrero' THEN 2 WHEN 'Marzo' THEN 3
               WHEN 'Abril' THEN 4 WHEN 'Mayo' THEN 5 WHEN 'Junio' THEN 6
               WHEN 'Julio' THEN 7 WHEN 'Agosto' THEN 8 WHEN 'Septiembre' THEN 9
               WHEN 'Octubre' THEN 10 WHEN 'Noviembre' THEN 11 WHEN 'Diciembre' THEN 12
             END ASC`,
          mesesRango.map(m => m.id),
          (err, rows) => { if (err) reject(err); else resolve(rows || []) }
        )
      })

      // Nombre del archivo de salida con el rango
      var outputLabel = `${meses[fromIdx].mes}_${meses[fromIdx].year}_a_${meses[toIdx].mes}_${meses[toIdx].year}`

    } else {
      facturas = await new Promise((resolve, reject) => {
        db.all(`
          SELECT i.file_path
          FROM invoices i
          JOIN months m ON i.month_id = m.id
          WHERE m.year_id = ?
          ORDER BY m.id ASC
        `, [yearId], (err, rows) => {
          if (err) return reject(err)
          resolve(rows || [])
        })
      })

      var outputLabel = `año_${yearId}`
    }

    if (!facturas.length)
      return { success: false, error: 'No hay facturas para este rango' }

    const mergedPdf = await PDFDocument.create()

    for (const factura of facturas) {
      const originalPath = resolveInvoicePath(factura.file_path)
      if (!fs.existsSync(originalPath)) {
        console.warn('[COMBINAR] Archivo no encontrado:', originalPath)
        continue
      }
      console.log('[COMBINAR] Renderizando:', originalPath)
      try {
        const data = new Uint8Array(fs.readFileSync(originalPath))
        const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true, disableFontFace: false }).promise

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 2 })
          const canvas = createCanvas(viewport.width, viewport.height)
          const context = canvas.getContext('2d')
          await page.render({ canvasContext: context, viewport }).promise
          const imgBuffer = canvas.toBuffer('image/png')
          const img = await mergedPdf.embedPng(imgBuffer)
          const pagePdf = mergedPdf.addPage([img.width, img.height])
          pagePdf.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
        }
      } catch (err) {
        console.error('[COMBINAR] Error renderizando PDF:', err)
      }
    }

    const finalBytes = await mergedPdf.save()
    const outputPath = path.join(
      path.resolve(__dirname, CONFIG.storageDir),
      `facturas_${outputLabel}_${Date.now()}.pdf`
    )
    fs.writeFileSync(outputPath, finalBytes)
    console.log('[COMBINAR] PDF final creado en:', outputPath)
    shell.openPath(outputPath)
    return { success: true, path: outputPath }

  } catch (err) {
    console.error('[COMBINAR] Error general:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('combinarFacturasRango', async (event, { fromMonthId, toMonthId, buildingId }) => {
  try {
    // Traer todos los meses del edificio ordenados cronológicamente
    const meses = await new Promise((resolve, reject) => {
      db.all(
        `SELECT m.id, m.mes, y.year
         FROM months m
         JOIN years y ON m.year_id = y.id
         WHERE y.building_id = ?
         ORDER BY y.year ASC,
           CASE m.mes
             WHEN 'Enero' THEN 1 WHEN 'Febrero' THEN 2 WHEN 'Marzo' THEN 3
             WHEN 'Abril' THEN 4 WHEN 'Mayo' THEN 5 WHEN 'Junio' THEN 6
             WHEN 'Julio' THEN 7 WHEN 'Agosto' THEN 8 WHEN 'Septiembre' THEN 9
             WHEN 'Octubre' THEN 10 WHEN 'Noviembre' THEN 11 WHEN 'Diciembre' THEN 12
           END ASC`,
        [buildingId],
        (err, rows) => { if (err) reject(err); else resolve(rows || []) }
      )
    })

    // Filtrar rango
    const fromIdx = meses.findIndex(m => m.id === fromMonthId)
    const toIdx   = meses.findIndex(m => m.id === toMonthId)

    if (fromIdx === -1 || toIdx === -1 || fromIdx > toIdx) {
      return { success: false, error: 'Rango inválido' }
    }

    const mesesRango = meses.slice(fromIdx, toIdx + 1)

    // Traer facturas de esos meses
    const placeholders = mesesRango.map(() => '?').join(',')
    const facturas = await new Promise((resolve, reject) => {
      db.all(
        `SELECT i.file_path, m.mes, y.year
         FROM invoices i
         JOIN months m ON i.month_id = m.id
         JOIN years y ON m.year_id = y.id
         WHERE i.month_id IN (${placeholders})
         ORDER BY y.year ASC,
           CASE m.mes
             WHEN 'Enero' THEN 1 WHEN 'Febrero' THEN 2 WHEN 'Marzo' THEN 3
             WHEN 'Abril' THEN 4 WHEN 'Mayo' THEN 5 WHEN 'Junio' THEN 6
             WHEN 'Julio' THEN 7 WHEN 'Agosto' THEN 8 WHEN 'Septiembre' THEN 9
             WHEN 'Octubre' THEN 10 WHEN 'Noviembre' THEN 11 WHEN 'Diciembre' THEN 12
           END ASC`,
        mesesRango.map(m => m.id),
        (err, rows) => { if (err) reject(err); else resolve(rows || []) }
      )
    })

    if (!facturas.length) return { success: false, error: 'No hay facturas en ese rango' }

    const mergedPdf = await PDFDocument.create()

    for (const factura of facturas) {
      const originalPath = resolveInvoicePath(factura.file_path)
      if (!fs.existsSync(originalPath)) continue

      try {
        const data = new Uint8Array(fs.readFileSync(originalPath))
        const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 2 })
          const canvas = createCanvas(viewport.width, viewport.height)
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
          const img = await mergedPdf.embedPng(canvas.toBuffer('image/png'))
          const p = mergedPdf.addPage([img.width, img.height])
          p.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
        }
      } catch (err) {
        console.error('[RANGO] Error renderizando:', factura.file_path, err.message)
      }
    }

    const finalBytes = await mergedPdf.save()
    const desde = `${meses[fromIdx].mes}_${meses[fromIdx].year}`
    const hasta  = `${meses[toIdx].mes}_${meses[toIdx].year}`
    const outputPath = path.join(
      path.resolve(__dirname, CONFIG.storageDir),
      `facturas_${desde}_a_${hasta}_${Date.now()}.pdf`
    )
    fs.writeFileSync(outputPath, finalBytes)
    shell.openPath(outputPath)

    return { success: true, path: outputPath }
  } catch (err) {
    console.error('[RANGO] Error general:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle(
  'editar-nota-mantenimiento',
  async (_, data) => {
    const { id, titulo } = data
    
    return new Promise((resolve, reject) => {

      db.run(
        `
        UPDATE maintenance_notes
        SET titulo = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [titulo, id],

        err => {

          if (err) reject(err)
          else resolve(true)

        }
      )

    })

  }
)

ipcMain.handle('obtenerSeccionesMantenimiento', (_, buildingId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM maintenance_sections
       WHERE building_id = ?
       ORDER BY sort_order ASC, created_at ASC`,
      [buildingId],
      (err, rows) => {
        if (err) return reject(err)
        resolve(rows || [])
      }
    )
  })
})

ipcMain.handle('agregarSeccionMantenimiento', (_, { buildingId, titulo, descripcion }) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COALESCE(MAX(sort_order), -1) AS ultimo FROM maintenance_sections WHERE building_id = ?`,
      [buildingId],
      (err, row) => {
        if (err) return reject(err)
        const nuevoOrden = (row?.ultimo ?? -1) + 1
        db.run(
          `INSERT INTO maintenance_sections (building_id, titulo, descripcion, sort_order)
           VALUES (?, ?, ?, ?)`,
          [buildingId, titulo, descripcion || null, nuevoOrden],
          function(err2) {
            if (err2) return reject(err2)
            resolve({ id: this.lastID, buildingId, titulo, descripcion, sort_order: nuevoOrden })
          }
        )
      }
    )
  })
})

ipcMain.handle('editarSeccionMantenimiento', (_, { id, titulo, descripcion }) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE maintenance_sections SET titulo = ?, descripcion = ? WHERE id = ?`,
      [titulo, descripcion ?? null, id],
      err => { if (err) reject(err); else resolve(true) }
    )
  })
})

ipcMain.handle('eliminarSeccionMantenimiento', (_, id) => {
  return new Promise((resolve, reject) => {
    // Los items se borran en cascada por FK
    db.run(
      `DELETE FROM maintenance_sections WHERE id = ?`,
      [id],
      err => { if (err) reject(err); else resolve({ deletedId: id }) }
    )
  })
})

ipcMain.handle('obtenerComprobantes', (event, monthId) => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, month_id, file_path, fecha, monto, descripcion FROM receipts WHERE month_id = ?',
      [monthId],
      (err, rows) => {
        if (err) return reject(err)
        const converted = (rows || []).map(r => ({ ...r, file_path: resolveInvoicePath(r.file_path) }))
        resolve(converted)
      }
    )
  })
})

ipcMain.handle('agregarComprobante', (event, { monthId, filePath, fecha, monto, descripcion }) => {
  return new Promise((resolve, reject) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) return reject(new Error('Archivo no encontrado'))
      const ext = path.extname(filePath)
      const base = path.basename(filePath, ext)
      const timestamp = Date.now()
      const destDir = path.resolve(__dirname, CONFIG.storageDir || './storage')
      const destName = `comp_${base.replace(/[^a-zA-Z0-9-_\.]/g, '_')}_${timestamp}${ext}`
      const destPath = path.join(destDir, destName)
      fs.copyFileSync(filePath, destPath)
      const relPath = makeRelativeToStorage(destPath)
      const desc = descripcion || path.basename(destPath)
      db.run(
        'INSERT INTO receipts (month_id, file_path, fecha, monto, descripcion) VALUES (?, ?, ?, ?, ?)',
        [monthId, relPath, fecha || null, monto || null, desc],
        function(err) {
          if (err) return reject(err)
          resolve({ id: this.lastID, monthId, filePath: resolveInvoicePath(relPath), fecha, monto, descripcion: desc })
        }
      )
    } catch (err) { reject(err) }
  })
})

ipcMain.handle('eliminarComprobante', (event, id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT file_path FROM receipts WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err)
      if (!row) return reject(new Error('Comprobante no encontrado'))
      try {
        const fullPath = resolveInvoicePath(row.file_path)
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
      } catch (e) { console.warn('No se pudo eliminar archivo:', e.message) }
      db.run('DELETE FROM receipts WHERE id = ?', [id], function(err) {
        if (err) return reject(err)
        resolve({ deletedId: id })
      })
    })
  })
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Hide the default menu bar and remove application menu (removes File/Edit)
  win.setMenuBarVisibility(false);
  win.setAutoHideMenuBar(true);
  Menu.setApplicationMenu(null);

  const isDev = process.argv.includes('--dev');
  if (isDev) {
    // Load Vite dev server
    win.loadURL('http://localhost:5173');
  } else {
    // Load built file
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  win.maximize();

  win.webContents.on('context-menu', (event, params) => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Cortar',
        role: 'cut',
        enabled: params.isEditable
      },
      {
        label: 'Copiar',
        role: 'copy',
        enabled: params.selectionText.trim().length > 0
      },
      {
        label: 'Pegar',
        role: 'paste',
        enabled: params.isEditable
      },
      {
        label: 'Seleccionar Todo',
        role: 'selectAll'
      }
    ])

    menu.popup()
  })
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});



