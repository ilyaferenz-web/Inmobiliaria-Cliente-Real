const fs = require('fs');
const s = fs.readFileSync('src/GestionEdificios.jsx','utf8');
const normalized = s.replace(/\r\n/g, '\n');
fs.writeFileSync('src/GestionEdificios.jsx', normalized, 'utf8');
console.log('Normalized line endings (CRLF → LF)');
