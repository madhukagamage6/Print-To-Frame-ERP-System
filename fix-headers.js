import fs from 'fs';
import glob from 'glob';

const files = glob.sync('src/components/**/*.jsx');

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

  // some files might have additional classes like mb-4 instead of mb-8
  const otherPatterns = [
    {
      old: '<div className="flex justify-between items-center mb-4">',
      new: '<div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">'
    },
  ];
  
  otherPatterns.forEach(pattern => {
    if (content.includes(pattern.old)) {
      // make sure it doesn't break small internal headers
      // Usually big page headers are at the top, maybe don't auto-replace all mb-4s. 
      // I'll skip this one to avoid breaking smaller cards.
    }
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated header in ${file}`);
  }
});
