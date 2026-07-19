import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<nav className={`flex-1 space-y-1 overflow-y-auto sidebar-scroll overflow-x-hidden pt-20 md:pt-0 pb-20 md:pb-0 ${effectivelyCollapsed ? "px-2" : "px-4"}`}>',
  '<nav className={`flex-1 space-y-1 overflow-y-auto sidebar-scroll overflow-x-hidden pt-6 md:pt-0 pb-20 md:pb-0 ${effectivelyCollapsed ? "px-2" : "px-4"}`}>'
);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated nav top padding for mobile");
