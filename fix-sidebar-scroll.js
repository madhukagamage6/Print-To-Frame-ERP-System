import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /} bg-surface-container lg:bg-surface-container\/60 backdrop-blur-md text-on-surface flex flex-col h-full border-r border-outline-variant\/30\`/g,
  '} bg-surface-container lg:bg-surface-container/60 backdrop-blur-md text-on-surface flex flex-col h-[100dvh] lg:h-full border-r border-outline-variant/30`'
);

// add padding bottom to the nav content
content = content.replace(
  /<nav className={\`flex-1 space-y-1 overflow-y-auto sidebar-scroll overflow-x-hidden \${effectivelyCollapsed \? "px-2" : "px-4"}\`}>/g,
  '<nav className={`flex-1 space-y-1 overflow-y-auto sidebar-scroll overflow-x-hidden pb-20 lg:pb-0 ${effectivelyCollapsed ? "px-2" : "px-4"}`}>'
);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated Sidebar scrolling");
