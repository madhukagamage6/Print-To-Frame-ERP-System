import fs from 'fs';
const file = './src/components/dashboard/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<div className="flex items-center space-x-3">',
  '<div className="flex flex-wrap items-center gap-2 sm:gap-3">'
);

fs.writeFileSync(file, content, 'utf8');
