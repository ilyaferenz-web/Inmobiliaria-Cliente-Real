const esbuild = require('esbuild');
const fs = require('fs');
const lines = fs.readFileSync('src/GestionEdificios.jsx', 'utf8').split('\n');

for(let nlines = 1; nlines <= 10; nlines++){
  const chunk = lines.slice(0, nlines).join('\n');
  try {
    esbuild.transformSync(chunk, { loader: 'jsx', sourcefile: 'test.jsx' });
    console.log(`Lines 1-${nlines}: OK`);
  } catch (e) {
    console.log(`Lines 1-${nlines}: FAIL - ${e.message.split('\n')[0].split(':').slice(2).join(':')}`);
  }
}
