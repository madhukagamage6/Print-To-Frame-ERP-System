import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('src/components/**/*.jsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const replacePatterns = [
    {
      old: '<div className="flex justify-between items-end mb-8">',
      new: '<div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end mb-8 gap-4 sm:gap-0">'
    },
    {
      old: '<div className="flex justify-between items-center mb-8">',
      new: '<div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">'
    },
    {
      old: '<div className="flex justify-between items-center mb-6">',
      new: '<div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">'
    },
    {
      old: '<div className="flex justify-between items-end mb-6">',
      new: '<div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end mb-6 gap-4 sm:gap-0">'
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
    console.log(`Updated header in ${file}`);
  }
});
