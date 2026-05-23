const esbuild = require('esbuild');
const fs = require('fs');
const lines = fs.readFileSync('src/GestionEdificios.jsx', 'utf8').split('\n');

const chunk = lines.slice(0, 5).join('\n');
console.log('Parsing chunk (lines 1-5):');
console.log(JSON.stringify(chunk));
console.log('\n---Trying transform---');

try {
  const result = esbuild.transformSync(chunk, { loader: 'jsx', sourcefile: 'test.jsx' });
  console.log('OK');
  console.log('Output:', result.code.slice(0, 200));
} catch (e) {
  console.error('Error:', e.message);
  const lines_out = e.message.split('\n');
  for (let i = 0; i < Math.min(10, lines_out.length); i++) {
    console.error(lines_out[i]);
  }
}
