const sqlite3=require('sqlite3').verbose();
const db=new sqlite3.Database('c:/Users/ilyaf/OneDrive/Desktop/ProyectoPalo/edificios.db');
const buildingId=351;
db.get('SELECT COALESCE(SUM(monto),0) as totalDebts FROM debts WHERE building_id = ?', [buildingId], (err,row)=>{
  console.log('debt sum',row);
  db.get('SELECT COALESCE(SUM(monto),0) as total FROM invoices WHERE month_id IN (SELECT id FROM months WHERE year_id IN (SELECT id FROM years WHERE building_id = ?))',[buildingId],(e,r)=>{
    console.log('invoices',r);
    db.get('SELECT COALESCE(SUM(monto),0) as total FROM payments WHERE building_id = ?',[buildingId],(e2,r2)=>{
      console.log('payments',r2);
      const totalDeuda=(r? r.total:0)+(row? row.totalDebts:0);
      console.log('calculated estado', totalDeuda, r2.total);
      db.close();
    });
  });
});
