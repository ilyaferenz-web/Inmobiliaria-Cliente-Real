const fs = require('fs');
const path = require('path');
const db1 = path.resolve(__dirname, '..', 'edificios.db');
console.log('cwd', process.cwd());
console.log('dirname', __dirname);
console.log('db1 path', db1);
console.log('db1 exists', fs.existsSync(db1));
console.log('db1 stat', fs.existsSync(db1) ? fs.statSync(db1) : 'missing');
