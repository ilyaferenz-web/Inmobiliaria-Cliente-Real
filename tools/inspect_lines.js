const fs = require('fs');
const path = process.argv[2] || 'src/GestionEdificios.jsx';
const start = parseInt(process.argv[3] || '980', 10);
const end = parseInt(process.argv[4] || '1015', 10);
const s = fs.readFileSync(path, 'utf8');
const lines = s.split(/\r?\n/);
for (let i = start; i <= end && i <= lines.length; i++) {
  const line = lines[i-1];
  const chars = [...line].map(c => c.charCodeAt(0));
  console.log(String(i).padStart(4)+": "+line);
  console.log('     chars:', chars.join(' '));
}
// show total counts
console.log('Total lines:', lines.length);
