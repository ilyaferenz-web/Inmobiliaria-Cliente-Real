const fs = require('fs');
const esbuild = require('esbuild');
const s = fs.readFileSync('src/GestionEdificios.jsx','utf8');

// Find the styles object
const stylesStart = s.indexOf('const styles = {');
const stylesEndAdjust = s.indexOf('return (', stylesStart);
const beforeStyles = s.slice(0, stylesStart);
const stylesPart = s.slice(stylesStart, s.indexOf('\n',  stylesEndAdjust-100));
const afterStyles = s.slice(stylesStart + stylesPart.length);

console.log('Styles part length:', stylesPart.length);
console.log('Preview (first 300 chars):', stylesPart.slice(0, 300));
console.log('Preview (last 300 chars):', stylesPart.slice(-300));

// Try transform with styles included
try{
  esbuild.transformSync(beforeStyles + stylesPart + 'return null\n}', { loader: 'jsx' });
  console.log('Styles object alone: transforms OK');
} catch(e){
  console.error('Styles object error:', e.message);
}
