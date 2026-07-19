import fs from 'fs';
import path from 'path';

const directory = './src/components';

// Regex patterns to add glows to buttons
const replacements = [
  // Primary buttons glowing shadow
  { regex: /bg-primary text-on-primary (hover:bg-primary\/80|hover:bg-indigo-700)[^"]*rounded-[a-z]+([^"]*)/g, 
    replacement: (match) => {
      // remove old shadows
      let cleaned = match.replace(/shadow-[a-z]+(-[a-z]+-[0-9]+)?/g, '');
      return cleaned + " shadow-[0_0_15px_rgba(0,218,243,0.15)] hover:shadow-[0_0_20px_rgba(0,218,243,0.3)]";
    }
  },
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
