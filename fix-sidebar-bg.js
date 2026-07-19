import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const bgClassOld = '} bg-surface-container/60 backdrop-blur-md text-on-surface flex flex-col h-full border-r border-outline-variant/30`';
const bgClassNew = '} bg-surface-container lg:bg-surface-container/60 backdrop-blur-md text-on-surface flex flex-col h-full border-r border-outline-variant/30`';

content = content.replace(bgClassOld, bgClassNew);
fs.writeFileSync(file, content, 'utf8');
console.log("Updated Sidebar BG");
