const fs = require('fs');
const esbuild = require('esbuild');
const path = 'src/GestionEdificios.jsx';
const s = fs.readFileSync(path,'utf8');
const lines = s.split(/\r?\n/);

let lo = 5, hi = lines.length;
while(lo < hi){
  const mid = Math.floor((lo + hi) / 2);
  const chunk = lines.slice(0, mid).join('\n');
  try{
    esbuild.transformSync(chunk, { loader: 'jsx', sourcefile: path });
    lo = mid + 1;
  } catch(e){
    hi = mid;
  }
}

console.log('Last successful line:', lo - 1);
console.log('First failing line:', lo);
if(lo <= lines.length){
  console.log('Content at line', lo, ':', lines[lo-1]);
  const start = Math.max(0, lo - 5);
  const end = Math.min(lines.length, lo + 5);
  console.log('Context:');
  for(let j=start;j<end;j++){
    const mark = j === lo-1 ? '>> ' : '   ';
    console.log(mark + (j+1) + ':', lines[j]);
  }
}
