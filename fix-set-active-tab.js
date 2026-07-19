import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldFn = `  const setActiveTab = (tabId) => {
    setActiveTabRaw(tabId);
    setSidebarCollapsed(true);
  };`;

const newFn = `  const setActiveTab = (tabId) => {
    setActiveTabRaw(tabId);
    setSidebarCollapsed(true);
    setMobileMenuOpen(false);
  };`;

content = content.replace(oldFn, newFn);
fs.writeFileSync(file, content, 'utf8');
console.log("Updated setActiveTab");
