import fs from 'fs';
import path from 'path';

const directory = './src/components';

// Fix red/error colors to be more vibrant and contrast properly for dark theme
const replacements = [
  // Delete modal icon
  { regex: /bg-red-50 text-red-500/g, replacement: 'bg-red-500/10 text-red-500' },
  
  // Destructive hover icons (trash cans etc)
  { regex: /bg-red-50 text-red-400 hover:bg-error text-on-error hover:text-on-surface/g, replacement: 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white' },
  { regex: /hover:bg-error text-on-error/g, replacement: 'hover:bg-red-600 text-white' },
  { regex: /bg-error text-on-error\/20 text-red-400 border-red-500\/30/g, replacement: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  { regex: /bg-error text-on-error/g, replacement: 'bg-red-600 text-white' },
  { regex: /hover:bg-error\/80/g, replacement: 'hover:bg-red-700' },
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
