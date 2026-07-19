import fs from 'fs';
const file = './src/components/common/DeleteModal.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/bg-red-500\/10 text-red-500/g, 'bg-error/20 text-error');
content = content.replace(/bg-red-600 text-white/g, 'bg-error text-on-error');
content = content.replace(/hover:bg-red-700/g, 'hover:opacity-80');

fs.writeFileSync(file, content, 'utf8');
console.log("Updated DeleteModal.jsx");
