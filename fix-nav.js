import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('custom-scrollbar', 'sidebar-scroll overflow-x-hidden');
content = content.replace(
  '<img src="/favicon.png" alt="Print To Frame" className="w-10 h-10 object-contain" />',
  '<img src="/logo-dark.png" alt="Print To Frame" className="w-14 h-auto object-contain" />'
);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated App.jsx successfully!");
