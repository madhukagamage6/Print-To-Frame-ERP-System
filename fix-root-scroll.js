import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<div className="flex h-screen bg-surface font-sans text-on-surface overflow-hidden relative">',
  '<div className="flex h-[100dvh] bg-surface font-sans text-on-surface overflow-hidden relative">'
);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated root height");
