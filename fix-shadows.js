import fs from 'fs';
import path from 'path';

const directory = './src/components';

// Regex patterns to clean up standard Tailwind shadows that we don't want
const replacements = [
  { regex: /shadow-indigo-[0-9]+/g, replacement: '' },
  { regex: /shadow-emerald-[0-9]+/g, replacement: '' },
  { regex: /shadow-slate-[0-9]+/g, replacement: '' },
  { regex: /shadow-red-[0-9]+/g, replacement: '' },
  { regex: /shadow-indigo-[0-9]+\/[0-9]+/g, replacement: '' },
  
  // also clean up hardcoded hover colors that don't match theme
  { regex: /hover:bg-indigo-700/g, replacement: 'hover:bg-primary/80 text-on-primary' },
  { regex: /hover:bg-emerald-600/g, replacement: 'hover:bg-secondary/80 text-on-primary' },
  { regex: /hover:bg-emerald-700/g, replacement: 'hover:bg-secondary/80 text-on-primary' },
  
  // also bg-emerald-600
  { regex: /bg-emerald-600/g, replacement: 'bg-secondary text-on-secondary' },
  
  // and some weird text-on-surface text-on-primary combos
  { regex: /text-on-primary text-on-surface/g, replacement: 'text-on-primary' },
  
  // bg-red-500
  { regex: /bg-red-500/g, replacement: 'bg-error text-on-error' },
  { regex: /hover:bg-red-600/g, replacement: 'hover:bg-error/80' },
  
  // secondary buttons
  { regex: /bg-secondary\/100/g, replacement: 'bg-secondary text-on-secondary' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      if (fullPath.includes('/auth/')) continue; // Skip auth as it was already themed
      
      let content = fs.readFileSync(fullPath, 'utf8');
      let newContent = content;
      for (const rep of replacements) {
        newContent = newContent.replace(rep.regex, rep.replacement);
      }
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(directory);
