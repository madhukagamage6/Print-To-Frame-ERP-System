import fs from 'fs';
import path from 'path';

const directory = './src/components';

const replacements = [
  // Slate -> Surface Variants
  { regex: /bg-slate-300\/50/g, replacement: 'bg-surface-variant/50' },
  { regex: /bg-slate-300/g, replacement: 'bg-surface-variant' },
  { regex: /hover:bg-slate-300/g, replacement: 'hover:bg-surface-variant' },
  { regex: /bg-slate-700/g, replacement: 'bg-surface-container-highest' },
  { regex: /hover:bg-slate-700/g, replacement: 'hover:bg-surface-container-highest' },
  { regex: /bg-slate-950/g, replacement: 'bg-surface-dim' },
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
