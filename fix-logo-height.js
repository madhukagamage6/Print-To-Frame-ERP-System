import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldLogoContainer = '<div className={`hidden md:flex pt-20 md:pt-4 pb-2 md:pb-6 justify-center items-center mb-1 md:mb-2 relative ${effectivelyCollapsed ? "px-2" : "px-6"} [@media(max-height:500px)]:pt-4 [@media(max-height:500px)]:pb-2 [@media(max-height:500px)]:mb-0`}>';
const newLogoContainer = '<div className={`hidden md:flex h-20 md:h-28 shrink-0 justify-center items-center relative ${effectivelyCollapsed ? "px-2" : "px-6"} [@media(max-height:500px)]:h-16`}>';

content = content.replace(oldLogoContainer, newLogoContainer);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated logo container to have fixed height");
