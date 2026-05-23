const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./edificios.db');
db.all("SELECT id, file_path FROM invoices LIMIT 5", [], (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Sample invoice paths:');
    rows.forEach(row => {
      console.log(`${row.id}: ${row.file_path}`);
    });
  }
  db.close();
});