const esbuild = require('esbuild');
const fs = require('fs');
const s = fs.readFileSync('src/GestionEdificios.jsx', 'utf8');

// Test adding more and more of the file
const lines = s.split('\n');
for(let i = 1; i <= Math.min(10, lines.length); i++){
  const chunk = lines.slice(0, i).join('\n');
  try{
    esbuild.transformSync(chunk, { loader: 'jsx', sourcefile: 'test.jsx' });
    console.log(`Line ${i}: OK`);
  } catch(e){
    console.log(`Line ${i}: FAIL - ${e.message.split('\n')[0]}`);
    break;
  }
}
