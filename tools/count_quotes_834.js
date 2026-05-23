const fs = require('fs');
const s = fs.readFileSync('src/GestionEdificios.jsx','utf8');
const lines = s.split('\n');
const chunk = lines.slice(0, 834).join('\n');

let sq = 0, dq = 0, bt = 0;
for(let i=0;i<chunk.length;i++){
  const c = chunk[i];
  const p = i>0 ? chunk[i-1] : '';
  if(p !== '\\'){
    if(c === "'") sq++;
    else if(c === '"') dq++;
    else if(c === '`') bt++;
  }
}

console.log('Single quotes:', sq, 'Double quotes:', dq, 'Backticks:', bt);
console.log('Odd single?', sq % 2 === 1);
console.log('Odd double?', dq % 2 === 1);
console.log('Odd backtick?', bt % 2 === 1);
