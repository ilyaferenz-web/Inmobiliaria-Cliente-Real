const fs = require('fs');
const esbuild = require('esbuild');
const s = fs.readFileSync('src/GestionEdificios.jsx','utf8');
const lines = s.split('\n');

// Test up to line 834
const upTo834 = lines.slice(0, 834).join('\n');
try{
  esbuild.transformSync(upTo834, { loader: 'jsx', sourcefile: 'src/GestionEdificios.jsx' });
  console.log('Up to line 834: OK');
} catch(e){
  console.error('Up to line 834: Failed');
  console.error('Error:', e.message);
}

// Test just the full file
try{
  esbuild.transformSync(s, { loader: 'jsx', sourcefile: 'src/GestionEdificios.jsx' });
  console.log('Full file: OK');
} catch(e){
  console.error('Full file: Failed');
  console.error('Error:', e.message);
}
