const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/ilyaf/OneDrive/Desktop/ProyectoPalo/edificios.db');
db.all("PRAGMA table_info(invoices)", [], (err, rows) => {
  console.log('invoices schema', rows);
  db.all("PRAGMA table_info(debts)", [], (err2, rows2) => {
    console.log('debts schema', rows2);
    db.close();
  });
});
