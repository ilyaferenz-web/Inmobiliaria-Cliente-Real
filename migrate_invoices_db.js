/**
 * Script para migrar invoices de DB1 → DB2
 * Preserva: edificio → año → mes → invoice
 * 
 * Uso: node migrate_invoices_db.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Rutas
const DEFAULT_DB1_PATH = path.resolve(__dirname, '..', 'edificios.db');  // fuente por defecto
const DEFAULT_DB2_PATH = path.resolve(__dirname, 'edificios.db');       // destino por defecto

const [,, db1Arg, db2Arg] = process.argv;
const DB1_PATH = db1Arg ? path.resolve(db1Arg) : DEFAULT_DB1_PATH;
const DB2_PATH = db2Arg ? path.resolve(db2Arg) : DEFAULT_DB2_PATH;

class InvoiceMigrator {
  constructor(db1Path, db2Path) {
    this.db1Path = db1Path;
    this.db2Path = db2Path;
    this.db1 = null;
    this.db2 = null;
    this.stats = {
      buildingsChecked: 0,
      yearsChecked: 0,
      monthsChecked: 0,
      invoicesMigrated: 0,
      invoicesSkipped: 0,
      errors: []
    };
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db1 = new sqlite3.Database(this.db1Path, (err) => {
        if (err) {
          console.error(`❌ Error conectando DB1: ${err.message}`);
          reject(err);
          return;
        }
        console.log(`✓ Conectado a DB1: ${this.db1Path}`);

        this.db2 = new sqlite3.Database(this.db2Path, (err) => {
          if (err) {
            console.error(`❌ Error conectando DB2: ${err.message}`);
            reject(err);
            return;
          }
          console.log(`✓ Conectado a DB2: ${this.db2Path}`);
          resolve();
        });
      });
    });
  }

  verifySchemas() {
    return new Promise((resolve, reject) => {
      const requiredTables = ['buildings', 'years', 'months', 'invoices'];
      let checked = 0;

      requiredTables.forEach((table) => {
        this.db1.get(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          [table],
          (err, row) => {
            if (err || !row) {
              reject(new Error(`DB1 no tiene tabla '${table}'`));
              return;
            }

            this.db2.get(
              `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
              [table],
              (err, row) => {
                if (err || !row) {
                  reject(new Error(`DB2 no tiene tabla '${table}'`));
                  return;
                }

                checked++;
                if (checked === requiredTables.length) {
                  console.log('✓ Esquemas verificados correctamente\n');
                  resolve();
                }
              }
            );
          }
        );
      });
    });
  }

  getOrCreateBuilding(buildingName, buildingAddress) {
    return new Promise((resolve, reject) => {
      this.db2.get(
        'SELECT id FROM buildings WHERE nombre = ? AND direccion = ?',
        [buildingName, buildingAddress],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            resolve(row.id);
            return;
          }

          // Crear nuevo
          this.db2.run(
            'INSERT INTO buildings (nombre, direccion) VALUES (?, ?)',
            [buildingName, buildingAddress],
            function (err) {
              if (err) {
                reject(err);
              } else {
                resolve(this.lastID);
              }
            }
          );
        }
      );
    });
  }

  getOrCreateYear(buildingId, year) {
    return new Promise((resolve, reject) => {
      this.db2.get(
        'SELECT id FROM years WHERE building_id = ? AND year = ?',
        [buildingId, year],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            resolve(row.id);
            return;
          }

          this.db2.run(
            'INSERT INTO years (building_id, year) VALUES (?, ?)',
            [buildingId, year],
            function (err) {
              if (err) {
                reject(err);
              } else {
                resolve(this.lastID);
              }
            }
          );
        }
      );
    });
  }

  getOrCreateMonth(yearId, monthName, monthCode) {
    return new Promise((resolve, reject) => {
      this.db2.get(
        'SELECT id FROM months WHERE year_id = ? AND mes = ?',
        [yearId, monthName],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            resolve(row.id);
            return;
          }

          this.db2.run(
            'INSERT INTO months (year_id, mes, codigo) VALUES (?, ?, ?)',
            [yearId, monthName, monthCode],
            function (err) {
              if (err) {
                reject(err);
              } else {
                resolve(this.lastID);
              }
            }
          );
        }
      );
    });
  }

  invoiceExistsInDb2(monthId, filePath) {
    return new Promise((resolve, reject) => {
      this.db2.get(
        'SELECT id FROM invoices WHERE month_id = ? AND file_path = ?',
        [monthId, filePath],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  }

  getAllBuildings() {
    return new Promise((resolve, reject) => {
      this.db1.all('SELECT * FROM buildings', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getYearsByBuilding(buildingId) {
    return new Promise((resolve, reject) => {
      this.db1.all('SELECT * FROM years WHERE building_id = ?', [buildingId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getMonthsByYear(yearId) {
    return new Promise((resolve, reject) => {
      this.db1.all('SELECT * FROM months WHERE year_id = ?', [yearId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getInvoicesByMonth(monthId) {
    return new Promise((resolve, reject) => {
      this.db1.all('SELECT * FROM invoices WHERE month_id = ?', [monthId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  insertInvoice(monthId, filePath, fecha, monto, descripcion) {
    return new Promise((resolve, reject) => {
      this.db2.run(
        `INSERT INTO invoices (month_id, file_path, fecha, monto, descripcion)
         VALUES (?, ?, ?, ?, ?)`,
        [monthId, filePath, fecha, monto, descripcion],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async migrate() {
    console.log('\n' + '='.repeat(60));
    console.log('INICIANDO MIGRACIÓN DE INVOICES');
    console.log('='.repeat(60) + '\n');

    try {
      const buildings = await this.getAllBuildings();
      console.log(`📦 ${buildings.length} edificios encontrados en DB1\n`);

      for (const building of buildings) {
        console.log(`🏢 Procesando: ${building.nombre}`);
        this.stats.buildingsChecked++;

        const newBuildingId = await this.getOrCreateBuilding(building.nombre, building.direccion);
        const years = await this.getYearsByBuilding(building.id);

        for (const year of years) {
          console.log(`  📅 Año: ${year.year}`);
          this.stats.yearsChecked++;

          const newYearId = await this.getOrCreateYear(newBuildingId, year.year);
          const months = await this.getMonthsByYear(year.id);

          for (const month of months) {
            console.log(`     📆 Mes: ${month.mes}`);
            this.stats.monthsChecked++;

            const newMonthId = await this.getOrCreateMonth(newYearId, month.mes, month.codigo);
            const invoices = await this.getInvoicesByMonth(month.id);

            for (const invoice of invoices) {
              try {
                const exists = await this.invoiceExistsInDb2(newMonthId, invoice.file_path);

                if (exists) {
                  this.stats.invoicesSkipped++;
                  continue;
                }

                await this.insertInvoice(
                  newMonthId,
                  invoice.file_path,
                  invoice.fecha,
                  invoice.monto,
                  invoice.descripcion
                );
                this.stats.invoicesMigrated++;
              } catch (err) {
                this.stats.errors.push(`Invoice ${invoice.id}: ${err.message}`);
                console.log(`        ❌ Error: ${err.message}`);
              }
            }
          }
        }
      }

      this.printSummary();
    } catch (err) {
      console.error(`\n❌ Error durante la migración: ${err.message}`);
      throw err;
    }
  }

  async verifyResults() {
    console.log('\n📊 VERIFICACIÓN DE RESULTADOS\n');

    for (const table of ['buildings', 'years', 'months', 'invoices']) {
      const db1Count = await new Promise((resolve, reject) => {
        this.db1.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      const db2Count = await new Promise((resolve, reject) => {
        this.db2.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      console.log(`${table}:`);
      console.log(`  DB1: ${db1Count} registros`);
      console.log(`  DB2: ${db2Count} registros (puede haber más si ya existían)\n`);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✓ Edificios procesados: ${this.stats.buildingsChecked}`);
    console.log(`✓ Años procesados: ${this.stats.yearsChecked}`);
    console.log(`✓ Meses procesados: ${this.stats.monthsChecked}`);
    console.log(`✓ Invoices migradas: ${this.stats.invoicesMigrated}`);
    console.log(`⏭️  Invoices saltadas (duplicados): ${this.stats.invoicesSkipped}`);

    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  Errores encontrados: ${this.stats.errors.length}`);
      this.stats.errors.forEach((err) => {
        console.log(`   - ${err}`);
      });
    }

    console.log('='.repeat(60) + '\n');
  }

  close() {
    return new Promise((resolve) => {
      let closed = 0;

      if (this.db1) {
        this.db1.close((err) => {
          closed++;
          if (closed === 2) {
            console.log('✓ Conexiones cerradas');
            resolve();
          }
        });
      } else {
        closed++;
      }

      if (this.db2) {
        this.db2.close((err) => {
          closed++;
          if (closed === 2) {
            console.log('✓ Conexiones cerradas');
            resolve();
          }
        });
      } else {
        closed++;
      }
    });
  }
}

async function main() {
  console.log('Usando DB1 origen:', DB1_PATH);
  console.log('Usando DB2 destino:', DB2_PATH);
  console.log('  (Uso: node migrate_invoices_db.js <db1_path> <db2_path>)\n');

  if (!fs.existsSync(DB1_PATH)) {
    console.error(`❌ No se encontró DB1 en: ${DB1_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(DB2_PATH)) {
    console.error(`❌ No se encontró DB2 en: ${DB2_PATH}`);
    process.exit(1);
  }

  const migrator = new InvoiceMigrator(DB1_PATH, DB2_PATH);

  try {
    await migrator.connect();
    await migrator.verifySchemas();
    await migrator.migrate();
    await migrator.verifyResults();
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  } finally {
    await migrator.close();
  }
}

main();
