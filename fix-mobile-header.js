import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldHeader = `{/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full bg-surface-container/60 backdrop-blur-md text-on-surface z-20 flex justify-between items-center p-4 border-b border-outline-variant/30">
        <div className="font-bold text-lg flex items-center">
          <img src="/logo-dark.png" alt="Print To Frame" className="h-8 w-auto mr-2" />
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>`;

const newHeader = `{/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full bg-surface-container/60 backdrop-blur-md text-on-surface z-20 flex justify-between items-center p-4 border-b border-outline-variant/30">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1 -ml-1">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="font-bold text-lg flex items-center">
          <img src="/logo-dark.png" alt="Print To Frame" className="h-8 w-auto" />
        </div>
      </div>`;

content = content.replace(oldHeader, newHeader);
fs.writeFileSync(file, content, 'utf8');
console.log("Updated Mobile Header");
