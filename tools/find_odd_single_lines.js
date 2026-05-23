const fs = require('fs');
const s = fs.readFileSync('src/GestionEdificios.jsx','utf8');
const lines = s.split(/\r?\n/);
function countUnescapedSingles(line){
  let count=0;
  for(let i=0;i<line.length;i++){
    if(line[i]==="'" && line[i-1] !== '\\') count++;
  }
  return count;
}
for(let i=0;i<lines.length;i++){
  const c = countUnescapedSingles(lines[i]);
  if(c%2===1){
    console.log('Line', i+1, 'has odd single quotes count:', c);
    console.log(lines[i]);
  }
}
console.log('done');
