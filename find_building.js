const sqlite3=require('sqlite3').verbose();
const db=new sqlite3.Database('c:/Users/ilyaf/OneDrive/Desktop/ProyectoPalo/edificios.db');
const addr='Av.Francisco Beiro 3665';
db.get('SELECT id,direccion FROM buildings WHERE direccion=?',[addr],(err,row)=>{console.log(row);db.close();});
