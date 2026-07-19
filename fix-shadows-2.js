import fs from 'fs';
import path from 'path';

const directory = './src/components';

// Fix leftover issues from previous run
const replacements = [
  { regex: /shadow-lg \/30/g, replacement: '' },
  { regex: /shadow-lg  /g, replacement: ' ' },
  { regex: /shadow-xl  /g, replacement: ' ' },
  { regex: /shadow-md  /g, replacement: ' ' },
  { regex: /shadow-sm  /g, replacement: ' ' },
  { regex: /text-on-primary text-on-surface/g, replacement: 'text-on-primary' },
  { regex: /text-on-secondary text-on-surface/g, replacement: 'text-on-secondary' },
  { regex: /text-on-error text-on-surface/g, replacement: 'text-on-error' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      if (fullPath.includes('/auth/')) continue;
      
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
