import fs from 'fs';
const file = './src/components/crm/LeadCardDetails.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<div className="grid grid-cols-2 gap-4">',
  '<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">'
);

fs.writeFileSync(file, content, 'utf8');
