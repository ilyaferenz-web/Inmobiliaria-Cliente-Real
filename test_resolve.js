const path = require('path');
const fs = require('fs');

// Simular la configuración
const CONFIG = { storageDir: './facturas_guardadas' };

// Simular la función resolveInvoicePath
function resolveInvoicePath(stored) {
  if (!stored) return stored;
  if (path.isAbsolute(stored)) return stored;
  
  // If stored path starts with storageDir name, strip it
  const storageDirName = path.basename(CONFIG.storageDir || './storage')
  if (stored.startsWith(storageDirName + '/')) {
    stored = stored.substring(storageDirName.length + 1)
  }
  
  return path.join(path.resolve(__dirname, CONFIG.storageDir || './storage'), stored);
}

// Probar con una ruta de la DB
const testPath = 'facturas_guardadas/11 de Septiembre 3966/2024/1-Enero 496.pdf';
const resolved = resolveInvoicePath(testPath);

console.log('Ruta original:', testPath);
console.log('Ruta resuelta:', resolved);
console.log('Existe:', fs.existsSync(resolved));
console.log('__dirname:', __dirname);
console.log('storageDir absoluto:', path.resolve(__dirname, CONFIG.storageDir));
