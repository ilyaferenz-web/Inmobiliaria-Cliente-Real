#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const MONTHS = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.tif', '.tiff']);

const [,, sourceArg, dbArg, copyArg] = process.argv;
const SOURCE_ROOT = sourceArg
  ? path.resolve(sourceArg)
  : path.resolve('C:/Users/ilyaf/OneDrive/Desktop/2025 CERTIFICACIONES 15-10');
const DB_PATH = dbArg
  ? path.resolve(dbArg)
  : path.resolve(__dirname, 'edificios.db');
const COPY_ROOT = copyArg
  ? path.resolve(copyArg)
  : path.resolve(__dirname, 'facturas_guardadas');

function sanitizeSegment(segment) {
  return segment
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalize(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function parseYear(folderName) {
  const year = parseInt(folderName, 10);
  return Number.isFinite(year) ? year : null;
}

function parseMonth(fileName) {
  const lower = fileName.toLowerCase();
  for (const [name, code] of Object.entries(MONTHS)) {
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(lower)) {
      return { mes: capitalize(name), codigo: code };
    }
  }

  // No month name found, fallback to month number if first token is a number 1-12
  const candidate = fileName.trim().split(/[^0-9]+/).find((value) => value.length > 0);
  if (candidate) {
    const num = parseInt(candidate, 10);
    if (num >= 1 && num <= 12) {
      const monthName = Object.keys(MONTHS).find((key) => MONTHS[key] === num);
      return { mes: capitalize(monthName), codigo: num };
    }
  }

  return null;
}

function normalizeBuildingName(name) {
  return name.trim();
}

function collectFiles(dirPath, items = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, items);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;
    items.push(fullPath);
  }
  return items;
}

function relativeFromDb(destPath) {
  return path.relative(path.dirname(DB_PATH), destPath).split(path.sep).join('/');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function openDb() {
  return new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('❌ No se pudo abrir la base de datos:', DB_PATH, err.message);
      process.exit(1);
    }
  });
}

function query(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

async function loadBuildingMap(db) {
  const rows = await all(db, `SELECT id, nombre, direccion FROM buildings`);
  const map = new Map();

  for (const row of rows) {
    const nombreKey = normalizeBuildingName(row.nombre).toLowerCase();
    const direccionKey = normalizeBuildingName(row.direccion).toLowerCase();
    map.set(nombreKey, row.id);
    map.set(direccionKey, row.id);
  }

  return map;
}

async function findBuildingId(buildingMap, buildingName) {
  const key = normalizeBuildingName(buildingName).toLowerCase();
  return buildingMap.get(key) || null;
}

async function getOrCreateYear(db, buildingId, year) {
  const row = await query(db,
    `SELECT id FROM years WHERE building_id = ? AND year = ?`,
    [buildingId, year]
  );
  if (row) return row.id;

  return await run(db,
    `INSERT INTO years (building_id, year) VALUES (?, ?)` ,
    [buildingId, year]
  );
}

async function getOrCreateMonth(db, yearId, mes, codigo) {
  const row = await query(db,
    `SELECT id FROM months WHERE year_id = ? AND mes = ?`,
    [yearId, mes]
  );
  if (row) return row.id;

  return await run(db,
    `INSERT INTO months (year_id, mes, codigo) VALUES (?, ?, ?)` ,
    [yearId, mes, codigo || null]
  );
}

async function invoiceExists(db, monthId, filePath) {
  const row = await query(db,
    `SELECT id FROM invoices WHERE month_id = ? AND file_path = ?`,
    [monthId, filePath]
  );
  return !!row;
}

async function main() {
  console.log('Fuente:', SOURCE_ROOT);
  console.log('Destino DB:', DB_PATH);
  console.log('Copia archivos a:', COPY_ROOT);
  console.log('---\n');

  if (!fs.existsSync(SOURCE_ROOT)) {
    console.error('❌ No existe la carpeta de origen:', SOURCE_ROOT);
    process.exit(1);
  }

  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ No existe la base de datos destino:', DB_PATH);
    process.exit(1);
  }

  ensureDir(COPY_ROOT);

  const db = openDb();
  const buildingMap = await loadBuildingMap(db);

  const stats = {
    buildings: 0,
    years: 0,
    invoices: 0,
    skipped: 0,
    errors: 0,
    filesCopied: 0,
    skippedBuildings: 0,
  };

  const buildingDirs = fs.readdirSync(SOURCE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const buildingName of buildingDirs) {
    const buildingPath = path.join(SOURCE_ROOT, buildingName);
    const yearDirs = fs.readdirSync(buildingPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    if (yearDirs.length === 0) continue;

    const buildingId = await findBuildingId(buildingMap, buildingName);
    if (!buildingId) {
      stats.skippedBuildings++;
      console.log(`⚠️  Se omite carpeta no coincidiente con building: ${buildingName}`);
      continue;
    }

    stats.buildings++;
    console.log(`🏢 Edificio: ${buildingName} -> id ${buildingId}`);

    for (const yearDir of yearDirs) {
      const year = parseYear(yearDir);
      if (!year) {
        console.log(`  ⚠️  Ignorando carpeta año no válido: ${yearDir}`);
        continue;
      }

      const yearId = await getOrCreateYear(db, buildingId, year);
      stats.years++;
      console.log(`  📅 Año: ${year}`);

      const yearPath = path.join(buildingPath, yearDir);
      const invoiceFiles = collectFiles(yearPath);

      for (const filePath of invoiceFiles) {
        const fileName = path.basename(filePath);
        const fileBase = fileName.replace(path.extname(fileName), '');

        const parsed = parseMonth(fileBase);
        let mes;
        let codigo;

        if (parsed) {
          mes = parsed.mes;
          codigo = parsed.codigo;
        } else {
          // Use the full file name as month label if no Spanish month found
          mes = fileBase;
          codigo = null;
        }

        const monthId = await getOrCreateMonth(db, yearId, mes, codigo);

        const relativeCopyDir = path.join(
          COPY_ROOT,
          sanitizeSegment(buildingName),
          String(year)
        );
        ensureDir(relativeCopyDir);

        const destFileName = sanitizeSegment(fileName);
        const destPath = path.join(relativeCopyDir, destFileName);

        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(filePath, destPath);
          stats.filesCopied++;
        }

        const relativePathDb = relativeFromDb(destPath);
        const exists = await invoiceExists(db, monthId, relativePathDb);
        if (exists) {
          stats.skipped++;
          continue;
        }

        const fecha = codigo ? `${year}-${String(codigo).padStart(2, '0')}-01` : `${year}-01-01`;
        const descripcion = fileBase;

        await run(db,
          `INSERT INTO invoices (month_id, file_path, fecha, monto, descripcion)
           VALUES (?, ?, ?, ?, ?)`,
          [monthId, relativePathDb, fecha, null, descripcion]
        );

        stats.invoices++;
        console.log(`    ✅ Importado: ${fileName} -> mes ${mes} (${monthId})`);
      }
    }
  }

  db.close();

  console.log('\n---');
  console.log(`Edificios procesados: ${stats.buildings}`);
  if (stats.skippedBuildings > 0) {
    console.log(`Edificios omitidos por no coincidir en DB: ${stats.skippedBuildings}`);
  }
  console.log(`Años procesados: ${stats.years}`);
  console.log(`Invoices importadas: ${stats.invoices}`);
  console.log(`Invoices saltadas (duplicados): ${stats.skipped}`);
  console.log(`Archivos copiados: ${stats.filesCopied}`);
  console.log(`Errores: ${stats.errors}`);
}

main().catch((err) => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});
