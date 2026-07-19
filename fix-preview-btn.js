import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const hookInsert = `
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const isIframePreview = typeof window !== 'undefined' && window.self !== window.top;
`;

content = content.replace(
  /const \[isMobile, setIsMobile\] = useState\(typeof window !== 'undefined' \? window\.innerWidth < 768 : false\);/s,
  hookInsert
);

const btnOld = `{/* Vertical Center Collapse Button (Mobile) */}
        <button`;

const btnNew = `{/* Vertical Center Collapse Button (Mobile) */}
        {!isIframePreview && (
          <button`;

const btnOldClose = `          {isMobile ? (mobileMenuOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />) : (sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)}
        </button>`;

const btnNewClose = `          {isMobile ? (mobileMenuOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />) : (sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)}
        </button>
        )}`;

content = content.replace(btnOld, btnNew);
content = content.replace(btnOldClose, btnNewClose);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated button for iframe preview");
