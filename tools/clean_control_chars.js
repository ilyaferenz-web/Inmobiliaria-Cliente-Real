const fs = require('fs');
const p = 'src/GestionEdificios.jsx';
const backup = p + '.bak';
const s = fs.readFileSync(p,'utf8');
fs.writeFileSync(backup, s, 'utf8');
console.log('Backup written to', backup);
let cleaned = '';
for(let i=0;i<s.length;i++){
  const c = s.charCodeAt(i);
  if(c===9 || c===10 || c===13) { cleaned += s[i]; continue; }
  if(c>=32) { cleaned += s[i]; continue; }
  // skip control char
}
fs.writeFileSync(p, cleaned, 'utf8');
console.log('File cleaned and written:', p);
