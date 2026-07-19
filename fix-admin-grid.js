import fs from 'fs';
const file = './src/components/admin/AdminPanel.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'className="grid grid-cols-2 lg:grid-cols-4 gap-6"',
  'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"'
);

fs.writeFileSync(file, content, 'utf8');
