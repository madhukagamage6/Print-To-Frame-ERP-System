import fs from 'fs';
import path from 'path';

const directory = './src/components';

const replacements = [
  // Rose -> Error
  { regex: /bg-rose-500/g, replacement: 'bg-error text-on-error' },
  { regex: /bg-rose-600/g, replacement: 'bg-error text-on-error' },
  { regex: /bg-rose-700/g, replacement: 'bg-error/80 text-on-error' },
  { regex: /bg-rose-400/g, replacement: 'bg-error' },
  { regex: /bg-rose-300/g, replacement: 'bg-error/50' },
  { regex: /bg-rose-[0-9]+\/[0-9]+/g, replacement: 'bg-error/10' },
  { regex: /bg-rose-50/g, replacement: 'bg-error/10' },
  { regex: /text-rose-[0-9]+/g, replacement: 'text-error' },
  { regex: /border-rose-[0-9]+/g, replacement: 'border-error/30' },
  
  // Amber -> Yellow/Warning or Primary/Secondary
  { regex: /text-amber-[0-9]+/g, replacement: 'text-yellow-500' },
  { regex: /bg-amber-[0-9]+\/[0-9]+/g, replacement: 'bg-yellow-500/20' },
  { regex: /bg-amber-[0-9]+/g, replacement: 'bg-yellow-500/20 text-yellow-500' },
  { regex: /border-amber-[0-9]+\/[0-9]+/g, replacement: 'border-yellow-500/30' },
  { regex: /border-amber-[0-9]+/g, replacement: 'border-yellow-500/30' },
  { regex: /ring-amber-[0-9]+\/[0-9]+/g, replacement: 'ring-yellow-500/30' },
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
