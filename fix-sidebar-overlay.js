import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const sidebarStart = `{/* Sidebar Navigation */}
      <div`;

const sidebarOverlay = `{/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-surface-container-highest/80 backdrop-blur-sm z-30" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div`;

content = content.replace(sidebarStart, sidebarOverlay);

const sidebarClassStart = `        className={\`fixed inset-y-0 left-0 transform \${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:translate-x-0 transition-all duration-300 ease-in-out z-10 \${`;

const newSidebarClassStart = `        className={\`fixed inset-y-0 left-0 transform \${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:translate-x-0 transition-all duration-300 ease-in-out z-40 lg:z-10 \${`;

content = content.replace(sidebarClassStart, newSidebarClassStart);

fs.writeFileSync(file, content, 'utf8');
console.log("Added sidebar overlay and increased z-index");
