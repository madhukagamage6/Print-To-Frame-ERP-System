import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/bg-slate-100 flex items-center justify-center font-bold text-slate-500/g, 'bg-surface flex items-center justify-center font-bold text-on-surface-variant font-mono tracking-widest uppercase');

fs.writeFileSync(file, content, 'utf8');
console.log("Updated App.jsx");
