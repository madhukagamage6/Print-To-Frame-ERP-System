import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('src/components/**/*.jsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const replacePatterns = [
    {
      old: 'className="grid grid-cols-2 gap-4"',
      new: 'className="grid grid-cols-1 sm:grid-cols-2 gap-4"'
    },
    {
      old: 'className="grid grid-cols-2 gap-x-8 gap-y-2"',
      new: 'className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2"'
    }
  ];

  replacePatterns.forEach(pattern => {
    if (content.includes(pattern.old)) {
      content = content.replace(pattern.old, pattern.new);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated grid in ${file}`);
  }
});
