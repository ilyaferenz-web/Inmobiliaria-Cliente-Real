const fs = require('fs');
const s = fs.readFileSync('src/GestionEdificios.jsx','utf8');
const lines = s.split(/\r?\n/);
for(let i=0;i<20 && i<lines.length;i++){
  const line = lines[i];
  const codes = [];
  for(let j=0;j<line.length;j++) codes.push(line.charCodeAt(j));
  console.log(i+1, line);
  console.log('codes:', codes.join(' '));
}
