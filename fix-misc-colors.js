import fs from 'fs';
import path from 'path';

const directory = './src/components';

const replacements = [
  // Dashboard
  { regex: /hover:bg-blue-100 hover:text-primary/g, replacement: 'hover:bg-primary/20 hover:text-primary' },
  { regex: /group-hover:bg-blue-100/g, replacement: 'group-hover:bg-primary/20' },
  { regex: /hover:bg-blue-100/g, replacement: 'hover:bg-primary/20' },
  { regex: /bg-blue-100 text-primary/g, replacement: 'bg-primary/10 text-primary' },
  
  // Deals
  { regex: /bg-purple-100 text-purple-800/g, replacement: 'bg-purple-500/20 text-purple-400' },
  { regex: /text-amber-800/g, replacement: 'text-amber-500' },
  { regex: /bg-amber-100/g, replacement: 'bg-amber-500/20' },
  
  // General text fixes
  { regex: /text-indigo-800/g, replacement: 'text-indigo-400' },
  { regex: /text-emerald-800/g, replacement: 'text-emerald-400' },
  { regex: /bg-emerald-100/g, replacement: 'bg-emerald-500/20' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
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
