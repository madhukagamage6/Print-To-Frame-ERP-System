import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'className="lg:hidden fixed top-0 w-full bg-surface-container/60 backdrop-blur-md text-on-surface z-20',
  'className="lg:hidden fixed top-0 w-full bg-surface-container/60 backdrop-blur-md text-on-surface z-50'
);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated Header z-index");
