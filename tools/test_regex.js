const esbuild = require('esbuild');
const snippet = `const x = (f.file_path || '').replace(/.*[\\\\/]/, '');`;
try{
  const result = esbuild.transformSync(snippet, { loader: 'jsx' });
  console.log('Success');
  console.log(result.code);
} catch(e){
  console.error('Error:', e.message);
}
