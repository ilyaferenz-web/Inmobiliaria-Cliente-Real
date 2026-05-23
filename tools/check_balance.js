const fs = require('fs');
const path = require('path');
const file = path.join('src','GestionEdificios.jsx');
const s = fs.readFileSync(file,'utf8');
const lines = s.split(/\r?\n/);

let single=false, double=false, back=false, inLineComment=false, inBlockComment=false;
let singleOpenLine = -1, doubleOpenLine = -1, backOpenLine = -1;
for(let i=0;i<lines.length;i++){
  const line = lines[i];
  for(let j=0;j<line.length;j++){
    const ch = line[j];
    const prev = j>0?line[j-1]:'\\0';
    if(inLineComment){ break; }
    if(inBlockComment){
      if(ch==='/' && line[j-1]==='*') inBlockComment=false;
      continue;
    }
    if(!single && !double && !back){
      if(ch==='/' && line[j+1]==='*'){ inBlockComment=true; j++; continue; }
      if(ch==='/' && line[j+1]==='/'){ inLineComment=true; break; }
    }
    if(ch==='`' && prev!=='\\'){
      back = !back;
      if(back) backOpenLine = i+1; else backOpenLine = -1;
      continue;
    }
    if(ch==="'" && prev!=='\\' && !back && !inBlockComment && !inLineComment){
      single = !single;
      if(single) { singleOpenLine = i+1; console.log('single opened at', singleOpenLine, 'col', j+1, 'line:', line.trim()); } else singleOpenLine = -1;
      continue;
    }
    if(ch==='"' && prev!=='\\' && !back && !inBlockComment && !inLineComment){
      double = !double;
      if(double) doubleOpenLine = i+1; else doubleOpenLine = -1;
      continue;
    }
    // detect regex-like start when not in string/comment
    if(ch==='/' && !single && !double && !back && !inBlockComment && !inLineComment){
      // try to find closing slash in remainder of file (naive)
      let found=false;
      for(let k=i;k<lines.length;k++){
        const startIdx = k===i?j+1:0;
        const rest = lines[k].slice(startIdx);
        for(let m=0;m<rest.length;m++){
          const c = rest[m];
          const prevc = m>0?rest[m-1]:(k===i?line[j]:'');
          if(c==='/' && rest[m-1]!=='\\') { found=true; break; }
        }
        if(found) break;
      }
      if(!found){
        console.error('Possible unterminated regex starting at', i+1, 'col', j+1);
        process.exit(2);
      }
    }
  }
  inLineComment=false;
}

// summary counts
const total = s.length;
console.log('Scanned', lines.length, 'lines; total chars', total);
console.log('Quote states at EOF: single=', single, 'double=', double, 'back=', back);
if(single) console.error('Unclosed single quote opened at line', singleOpenLine);
if(double) console.error('Unclosed double quote opened at line', doubleOpenLine);
if(back) console.error('Unclosed backtick opened at line', backOpenLine);
process.exit(0);
