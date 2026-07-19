import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '{window.innerWidth < 768 ? (mobileMenuOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />) : (sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)}',
  '{isMobile ? (mobileMenuOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />) : (sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)}'
);

// Also fix the click handler
content = content.replace(
  'if (window.innerWidth < 768) { setMobileMenuOpen(!mobileMenuOpen); } else { setSidebarCollapsed(!sidebarCollapsed); }',
  'if (isMobile) { setMobileMenuOpen(!mobileMenuOpen); } else { setSidebarCollapsed(!sidebarCollapsed); }'
);

fs.writeFileSync(file, content, 'utf8');
