import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<div className={`pt-4 pb-6 flex justify-center items-center mb-2 relative ${effectivelyCollapsed ? "px-2" : "px-6"}`}>',
  '<div className={`pt-20 lg:pt-4 pb-6 flex justify-center items-center mb-2 relative ${effectivelyCollapsed ? "px-2" : "px-6"}`}>'
);

// We need to fix overlap of main content on mobile.
// Wait, the main content area has: p-6 lg:p-10
// Sometimes horizontal padding causes issues on small screens. Let's make it p-4 sm:p-6 lg:p-10
content = content.replace(
  '<div className="max-w-7xl mx-auto p-6 lg:p-10 relative min-h-full pb-20">',
  '<div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 relative min-h-full pb-20">'
);

fs.writeFileSync(file, content, 'utf8');
