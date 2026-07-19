import fs from 'fs';
import path from 'path';

const file = './src/components/dashboard/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  { regex: /bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border-rose-100\/30 focus:ring-rose-500/g, replacement: 'bg-error/10 text-error hover:bg-error/20 hover:text-error border-error/30 focus:ring-error' },
  { regex: /bg-rose-50/g, replacement: 'bg-error/10 text-error' },
  { regex: /group-hover:bg-rose-100/g, replacement: 'group-hover:bg-error/20' },
  { regex: /hover:bg-rose-100/g, replacement: 'hover:bg-error/20' },
  { regex: /hover:border-rose-200/g, replacement: 'hover:border-error/30' },
];

for (const rep of replacements) {
  content = content.replace(rep.regex, rep.replacement);
}

fs.writeFileSync(file, content, 'utf8');
console.log("Updated Dashboard.jsx rose colors");
