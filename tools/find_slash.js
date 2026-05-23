const fs = require('fs');
const s = fs.readFileSync('src/GestionEdificios.jsx','utf8');
let inSingle=false,inDouble=false,inBack=false,inLine=false,inBlock=false;
for(let i=0;i<s.length;i++){
  const c=s[i];const nxt=s[i+1]||'';
  if(inLine){ if(c==='\n') inLine=false; continue; }
  if(inBlock){ if(c==='*'&&nxt==='/' ){ inBlock=false; i++; continue;} continue; }
  if(!inSingle && !inDouble && !inBack){ if(c==='/' && nxt==='/' ){ inLine=true; i++; continue;} if(c==='/' && nxt==='*'){ inBlock=true; i++; continue; } }
  if(!inDouble && !inBack && c==="'" && !inSingle){ inSingle=true; continue; } else if(inSingle && c==="'"){ inSingle=false; continue; }
  if(!inSingle && !inBack && c==='"' && !inDouble){ inDouble=true; continue; } else if(inDouble && c==='"'){ inDouble=false; continue; }
  if(!inSingle && !inDouble && c==='`' && !inBack){ inBack=true; continue; } else if(inBack && c==='`'){ inBack=false; continue; }
  // now if it's a slash and we're not inside a string/comment
  if(c==='/' && !inSingle && !inDouble && !inBack && !inLine && !inBlock){
    const line = s.substring(0,i).split(/\r?\n/).length;
    const col = i - s.lastIndexOf('\n', i-1);
    console.log('Slash at', line+':'+col, 'context:', s.substr(Math.max(0,i-10), 40).replace(/\n/g,'\\n'))
  }
}
console.log('done');
