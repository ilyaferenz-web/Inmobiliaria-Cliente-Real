const fs = require('fs');
const esbuild = require('esbuild');
const p='src/GestionEdificios.jsx';
const s=fs.readFileSync(p,'utf8');
try{
  esbuild.transformSync(s,{loader:'jsx', sourcefile:p});
  console.log('Full transform OK');
} catch(e){
  console.error(e && e.errors? JSON.stringify(e.errors,null,2): e.message);
}
