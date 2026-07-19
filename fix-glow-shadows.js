import fs from 'fs';
import path from 'path';

const directory = './src/components';

const replacements = [
  { regex: /shadow-sm/g, replacement: 'shadow-[0_4px_20px_rgba(0,218,243,0.05)]' },
  { regex: /shadow-md/g, replacement: 'shadow-[0_4px_25px_rgba(0,218,243,0.1)]' },
  { regex: /shadow-lg/g, replacement: 'shadow-[0_8px_30px_rgba(0,218,243,0.15)]' },
  { regex: /shadow-xl/g, replacement: 'shadow-[0_10px_40px_rgba(0,218,243,0.2)]' },
  { regex: /shadow-2xl/g, replacement: 'shadow-[0_0_50px_rgba(0,218,243,0.25)]' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      if (fullPath.includes('/auth/')) continue; // Skip auth
      
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
