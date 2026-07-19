import fs from 'fs';
const file = './src/components/operations/Logistics.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300"',
  'className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300"'
);

fs.writeFileSync(file, content, 'utf8');
