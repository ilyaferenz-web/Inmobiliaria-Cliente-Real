const esbuild = require('esbuild');
const fs = require('fs');
const lines = fs.readFileSync('src/GestionEdificios.jsx', 'utf8').split('\n');

for(let nlines = 1; nlines <= 50; nlines += 1){
  const chunk = lines.slice(0, nlines).join('\n');
  try {
    esbuild.transformSync(chunk, { loader: 'jsx', sourcefile: 'test.jsx' });
    console.log(`Lines 1-${nlines}: OK`);
    if(nlines > 10) break; // Stop at first success after line 10
  } catch (e) {
    const msg = e.message.split('\n')[0];
    const type = msg.includes('Unterminated') ? 'UNTERMINATED' : msg.includes('Unexpected') ? 'UNEXPECTED' : 'OTHER';
    if(nlines <= 15 || nlines % 5 === 0) {
      console.log(`Lines 1-${nlines}: FAIL - ${type}`);
    }
  }
}
