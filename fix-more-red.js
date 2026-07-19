import fs from 'fs';
import path from 'path';

const directory = './src/components';

const replacements = [
  // Red -> Error
  { regex: /bg-red-500\/10/g, replacement: 'bg-error/10' },
  { regex: /bg-red-500\/20/g, replacement: 'bg-error/20' },
  { regex: /bg-red-600 text-white/g, replacement: 'bg-error text-on-error' },
  { regex: /hover:bg-red-500 hover:text-white/g, replacement: 'hover:bg-error hover:text-on-error' },
  { regex: /text-red-[0-9]+/g, replacement: 'text-error' },
  { regex: /bg-red-50/g, replacement: 'bg-error/10' },
  { regex: /hover:bg-red-100/g, replacement: 'hover:bg-error/20' },
  { regex: /bg-red-100/g, replacement: 'bg-error/20' },
  { regex: /border-red-[0-9]+\/30/g, replacement: 'border-error/30' },
  { regex: /border-red-[0-9]+/g, replacement: 'border-error/30' },
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
