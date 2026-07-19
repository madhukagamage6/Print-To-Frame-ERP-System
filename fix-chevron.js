import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '{sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}',
  '{window.innerWidth < 768 ? (mobileMenuOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />) : (sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)}'
);

fs.writeFileSync(file, content, 'utf8');
