const sqlite3=require('sqlite3').verbose();
const db=new sqlite3.Database('c:/Users/ilyaf/OneDrive/Desktop/ProyectoPalo/edificios.db');
db.all('SELECT * FROM debts',[],(err,rows)=>{if(err)console.error(err);else console.log(rows);db.close();});
