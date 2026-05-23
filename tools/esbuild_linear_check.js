const fs = require('fs');
const esbuild = require('esbuild');
const path = 'src/GestionEdificios.jsx';
const s = fs.readFileSync(path,'utf8');
const lines = s.split(/\r?\n/);
for(let i=1;i<=lines.length;i++){
  const chunk = lines.slice(0,i).join('\n');
  try{
    esbuild.transformSync(chunk, { loader: 'jsx', sourcefile: path });
  } catch(e){
    console.log('First failing at line', i);
    const start = Math.max(1, i-6);
    const end = Math.min(lines.length, i+6);
    for(let j=start;j<=end;j++){
      const mark = j===i? '>>':'  ';
      console.log(mark, j, lines[j-1]);
    }
    process.exit(0);
  }
}
console.log('No failures found in linear scan');
