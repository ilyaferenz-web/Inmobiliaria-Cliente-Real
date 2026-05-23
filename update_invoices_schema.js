const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'edificios.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("PRAGMA table_info(invoices)", [], (err, cols) => {
    if (err) {
      console.error('Error reading invoices schema:', err);
      db.close();
      return;
    }
    console.log('current invoice columns', cols.map(c=>c.name));
    const has = name => cols.some(c => c.name === name);
    if (!has('monto')) {
      db.run('ALTER TABLE invoices ADD COLUMN monto REAL', e => {
        if (e) console.error('add monto error', e.message);
        else console.log('added monto');
      });
    }
    if (!has('fecha')) {
      db.run('ALTER TABLE invoices ADD COLUMN fecha TEXT', e => {
        if (e) console.error('add fecha error', e.message);
        else console.log('added fecha');
      });
    }
    if (!has('descripcion')) {
      db.run('ALTER TABLE invoices ADD COLUMN descripcion TEXT', e => {
        if (e) console.error('add descripcion error', e.message);
        else console.log('added descripcion');
      });
    }
    db.all("PRAGMA table_info(invoices)", [], (err2, newcols) => {
      console.log('new invoice columns', newcols.map(c=>c.name));
      db.close();
    });
  });
});