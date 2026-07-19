import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldLogoContainer = '<div className={`pt-20 md:pt-4 pb-2 md:pb-6 flex justify-center items-center mb-1 md:mb-2 relative ${effectivelyCollapsed ? "px-2" : "px-6"} [@media(max-height:500px)]:pt-4 [@media(max-height:500px)]:pb-2 [@media(max-height:500px)]:mb-0`}>';
const newLogoContainer = '<div className={`hidden md:flex pt-20 md:pt-4 pb-2 md:pb-6 justify-center items-center mb-1 md:mb-2 relative ${effectivelyCollapsed ? "px-2" : "px-6"} [@media(max-height:500px)]:pt-4 [@media(max-height:500px)]:pb-2 [@media(max-height:500px)]:mb-0`}>';

content = content.replace(oldLogoContainer, newLogoContainer);

const oldNav = '<nav className={`flex-1 space-y-1 overflow-y-auto sidebar-scroll overflow-x-hidden pb-20 md:pb-0 ${effectivelyCollapsed ? "px-2" : "px-4"}`}>';
const newNav = '<nav className={`flex-1 space-y-1 overflow-y-auto sidebar-scroll overflow-x-hidden pt-20 md:pt-0 pb-20 md:pb-0 ${effectivelyCollapsed ? "px-2" : "px-4"}`}>';

content = content.replace(oldNav, newNav);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated Sidebar Logo visibility for mobile");
