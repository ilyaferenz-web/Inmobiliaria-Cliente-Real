const fs = require('fs');
const esbuild = require('esbuild');
const path = 'src/GestionEdificios.jsx';
const src = fs.readFileSync(path, 'utf8');
try {
  const res = esbuild.transformSync(src, { loader: 'jsx', sourcemap: false, sourcefile: path });
  console.log('esbuild transform ok, output length:', res.code.length);
} catch (e) {
  console.error('esbuild transform error:');
  console.error(e.message);
  if (e.errors) console.error(JSON.stringify(e.errors, null, 2));
  process.exit(1);
}
