const fs = require('fs');
const esbuild = require('esbuild');
const path = 'src/GestionEdificios.jsx';
const s = fs.readFileSync(path,'utf8');
const lines = s.split(/\r?\n/);
let lo = 1, hi = lines.length, bad = -1;
while(lo <= hi){
  const mid = Math.floor((lo+hi)/2);
  const chunk = lines.slice(0, mid).join('\n');
  try{
    esbuild.transformSync(chunk, { loader: 'jsx', sourcefile: path });
    // prefix ok
    lo = mid+1;
  } catch(e){
    bad = mid;
    hi = mid-1;
  }
}
if(bad === -1) console.log('No failure in any prefix');
else {
  console.log('First failing prefix at line', bad);
  // print surrounding lines
  const start = Math.max(1, bad-6);
  const end = Math.min(lines.length, bad+6);
  for(let i=start;i<=end;i++){
    const mark = i===bad? '>>':'  ';
    console.log(mark, i, lines[i-1]);
  }
}
