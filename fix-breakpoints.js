import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/innerWidth < 1024/g, 'innerWidth < 768');

content = content.replace(/lg:hidden/g, 'md:hidden');
content = content.replace(/lg:relative/g, 'md:relative');
content = content.replace(/lg:translate-x-0/g, 'md:translate-x-0');
content = content.replace(/lg:z-10/g, 'md:z-10');
content = content.replace(/lg:bg-surface-container\/60/g, 'md:bg-surface-container/60');
content = content.replace(/lg:h-full/g, 'md:h-full');
content = content.replace(/lg:pt-4/g, 'md:pt-4');
content = content.replace(/lg:pb-0/g, 'md:pb-0');
content = content.replace(/hidden lg:flex/g, 'hidden md:flex');
content = content.replace(/lg:pt-0/g, 'md:pt-0');
content = content.replace(/lg:p-10/g, 'md:p-10');

fs.writeFileSync(file, content, 'utf8');
console.log("Updated breakpoints to md (768px)");
