import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const sidebarEnd = `        {/* User Session profile and Reset button */}`;
const btnHtml = `        {/* Vertical Center Collapse Button (Desktop) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSidebarCollapsed(!sidebarCollapsed);
          }}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 rounded-r-md rounded-l-none bg-surface-container-highest border border-l-0 border-outline-variant items-center justify-center text-on-surface hover:text-primary hover:border-primary/50 shadow-lg transition-all duration-200 z-50 cursor-pointer"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        
        {/* User Session profile and Reset button */}`;

content = content.replace(sidebarEnd, btnHtml);

fs.writeFileSync(file, content, 'utf8');
console.log("Added vertical collapse button");
