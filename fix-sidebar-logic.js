import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const hookInsert = `
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectivelyCollapsed = !isMobile && sidebarCollapsed && !isHoveringSidebar;
`;

content = content.replace(
  /const \[sidebarCollapsed, setSidebarCollapsed\] = useState\(true\);\s*const \[isHoveringSidebar, setIsHoveringSidebar\] = useState\(false\);\s*const effectivelyCollapsed = sidebarCollapsed && !isHoveringSidebar;/s,
  hookInsert
);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated effectivelyCollapsed logic in App.jsx");
