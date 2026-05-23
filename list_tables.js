const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:/Users/ilyaf/OneDrive/Desktop/ProyectoPalo/edificios.db');
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
  if (err) { console.error('error', err); }
  else { console.log(rows); }
  db.close();
});
