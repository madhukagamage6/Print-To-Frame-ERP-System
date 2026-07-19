import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldBtn = `          {/* Manual Expand/Collapse Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSidebarCollapsed(!sidebarCollapsed);
            }}
            className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center text-on-surface hover:text-primary hover:border-primary/50 shadow-lg hover:shadow-primary/20 transition-all duration-200 z-50 cursor-pointer"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>`;

const newBtn = `          {/* Manual Expand/Collapse Button (Mobile Only) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSidebarCollapsed(!sidebarCollapsed);
            }}
            className="lg:hidden absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center text-on-surface hover:text-primary hover:border-primary/50 shadow-lg hover:shadow-primary/20 transition-all duration-200 z-50 cursor-pointer"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>`;

if (content.includes(oldBtn)) {
  content = content.replace(oldBtn, newBtn);
  fs.writeFileSync(file, content, 'utf8');
  console.log("Updated button in App.jsx");
} else {
  console.log("Button not found. Trying flexible replace...");
  const oldBtnRegex = /\{\/\* Manual Expand\/Collapse Button \*\/\}.*?<\/button>/s;
  if (oldBtnRegex.test(content)) {
    content = content.replace(oldBtnRegex, newBtn);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Updated button with regex.");
  } else {
    console.log("Still not found.");
  }
}
