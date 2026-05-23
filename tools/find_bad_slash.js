const fs = require('fs');
const esbuild = require('esbuild');

// Read the original file
const full = fs.readFileSync('src/GestionEdificios.jsx', 'utf8');

// Find all forward-slash positions
const slashes = [];
for (let i = 0; i < full.length; i++) {
  if (full[i] === '/') {
    const start = Math.max(0, i - 20);
    const end = Math.min(full.length, i + 20);
    const context = full.slice(start, end).replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    slashes.push({ pos: i, line: full.slice(0, i).split('\n').length, context });
  }
}

console.log('Forward slashes in file:', slashes.length);
console.log('First 5 slashes:');
slashes.slice(0, 5).forEach(s => {
  console.log(`  Line ${s.line}: ...${s.context}...`);
});

// Try to narrow down which slash causes the issue
console.log('\nTesting prefixes ending at each slash...');
for (let i = 0; i < slashes.length && i < 15; i++) {
  const prefix = full.slice(0, slashes[i].pos + 1);
  try {
    esbuild.transformSync(prefix, { loader: 'jsx', sourcefile: 'test.jsx' });
  } catch (e) {
    if (e.message.includes('Unterminated')) {
      console.log(`FAIL at slash ${i} (line ${slashes[i].line}): ...${slashes[i].context}...`);
      break;
    }
  }
}
