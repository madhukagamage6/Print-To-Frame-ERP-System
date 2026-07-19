import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 rounded-r-md rounded-l-none bg-surface-container-highest border border-l-0 border-outline-variant items-center justify-center text-on-surface hover:text-primary hover:border-primary/50 shadow-lg transition-all duration-200 z-50 cursor-pointer"',
  'className="flex md:hidden absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 rounded-r-md rounded-l-none bg-surface-container-highest border border-l-0 border-outline-variant items-center justify-center text-on-surface hover:text-primary hover:border-primary/50 shadow-lg transition-all duration-200 z-50 cursor-pointer"'
);
content = content.replace(
  '        {/* Vertical Center Collapse Button (Desktop) */}',
  '        {/* Vertical Center Collapse Button (Mobile) */}'
);
content = content.replace(
  '            setSidebarCollapsed(!sidebarCollapsed);',
  '            if (window.innerWidth < 768) { setMobileMenuOpen(!mobileMenuOpen); } else { setSidebarCollapsed(!sidebarCollapsed); }'
);

fs.writeFileSync(file, content, 'utf8');
