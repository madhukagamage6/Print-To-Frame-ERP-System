import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// We want to replace sidebarCollapsed with effectivelyCollapsed in the sidebar's content block.
// First, find the sidebar block
const startMarker = '{/* Sidebar Navigation */}';
const endMarker = '{/* Main Content Area */}';
const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  let sidebarContent = content.substring(startIndex, endIndex);

  // Replace sidebarCollapsed with effectivelyCollapsed
  // Except for setSidebarCollapsed(!sidebarCollapsed); which needs to be kept
  sidebarContent = sidebarContent.replace(/sidebarCollapsed \? "w-20" : "w-64"/g, 'effectivelyCollapsed ? "w-20" : "w-64"');
  sidebarContent = sidebarContent.replace(/<div className=\{`fixed inset-y-0 left-0 transform \$\{/g, `<div\n        onMouseEnter={() => setIsHoveringSidebar(true)}\n        onMouseLeave={() => setIsHoveringSidebar(false)}\n        className={\`fixed inset-y-0 left-0 transform \${`);
  sidebarContent = sidebarContent.replace(/sidebarCollapsed \? "px-2" : "px-6"/g, 'effectivelyCollapsed ? "px-2" : "px-6"');
  
  // Replace the PTF logo div with favicon
  const logoDiv = `{sidebarCollapsed ? (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center font-black text-on-primary text-sm shadow-[0_0_15px_rgba(0,218,243,0.3)] select-none">
              PTF
            </div>
          ) : (`;
  
  const newLogo = `{effectivelyCollapsed ? (
            <img src="/favicon.png" alt="Print To Frame" className="w-10 h-10 object-contain" />
          ) : (`
          
  sidebarContent = sidebarContent.replace(logoDiv, newLogo);

  // Update NavGroups and NavLinks
  sidebarContent = sidebarContent.replace(/collapsed=\{sidebarCollapsed\}/g, 'collapsed={effectivelyCollapsed}');
  
  sidebarContent = sidebarContent.replace(/sidebarCollapsed \? "px-2" : "px-4"/g, 'effectivelyCollapsed ? "px-2" : "px-4"');
  sidebarContent = sidebarContent.replace(/sidebarCollapsed \? "p-3 flex flex-col items-center space-y-4" : "p-6"/g, 'effectivelyCollapsed ? "p-3 flex flex-col items-center space-y-4" : "p-6"');
  sidebarContent = sidebarContent.replace(/\{sidebarCollapsed \? \(/g, '{effectivelyCollapsed ? (');
  
  content = content.substring(0, startIndex) + sidebarContent + content.substring(endIndex);
  
  fs.writeFileSync(file, content, 'utf8');
  console.log("Updated App.jsx successfully!");
} else {
  console.log("Failed to find markers.");
}
