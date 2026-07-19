import fs from 'fs';
import path from 'path';

const file = './src/components/dashboard/Dashboard.jsx';

let content = fs.readFileSync(file, 'utf8');

const replacements = [
  // Leads
  { regex: /bg-blue-100 text-blue-800/g, replacement: 'bg-primary/20 text-primary' },
  { regex: /bg-primary\/20 text-indigo-800/g, replacement: 'bg-tertiary/20 text-tertiary' },
  { regex: /bg-amber-100 text-amber-800/g, replacement: 'bg-yellow-500/20 text-yellow-500' },
  { regex: /bg-secondary\/20 text-emerald-800/g, replacement: 'bg-secondary/20 text-secondary' },

  // Deals
  { regex: /bg-purple-100 text-purple-800/g, replacement: 'bg-purple-500/20 text-purple-400' },
  
  // Fab
  { regex: /bg-yellow-100 text-yellow-800/g, replacement: 'bg-yellow-500/20 text-yellow-500' },
  { regex: /bg-red-100 text-red-800/g, replacement: 'bg-error/20 text-error' },
  
  // Quick Actions
  { regex: /bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-700/g, replacement: 'bg-error/20 hover:bg-error/30 rounded-xl text-error' },
];

for (const rep of replacements) {
  content = content.replace(rep.regex, rep.replacement);
}

fs.writeFileSync(file, content, 'utf8');
console.log("Updated Dashboard.jsx");
