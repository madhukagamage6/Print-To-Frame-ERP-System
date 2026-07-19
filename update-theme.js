import fs from 'fs';
import path from 'path';

const directory = './src/components';

const replacements = [
  { regex: /bg-white/g, replacement: 'bg-surface-container' },
  { regex: /text-slate-900/g, replacement: 'text-on-surface' },
  { regex: /text-slate-800/g, replacement: 'text-on-surface' },
  { regex: /text-slate-700/g, replacement: 'text-on-surface' },
  { regex: /text-slate-600/g, replacement: 'text-on-surface-variant' },
  { regex: /text-slate-500/g, replacement: 'text-on-surface-variant' },
  { regex: /text-slate-400/g, replacement: 'text-on-surface-variant' },
  { regex: /border-slate-200/g, replacement: 'border-outline-variant' },
  { regex: /border-slate-300/g, replacement: 'border-outline-variant' },
  { regex: /border-slate-100/g, replacement: 'border-outline-variant/50' },
  { regex: /bg-slate-50\/80/g, replacement: 'bg-surface-container-low/80' },
  { regex: /bg-slate-50/g, replacement: 'bg-surface-container-low' },
  { regex: /bg-slate-100/g, replacement: 'bg-surface-container' },
  { regex: /bg-slate-200/g, replacement: 'bg-surface-container-high' },
  { regex: /hover:bg-slate-50/g, replacement: 'hover:bg-surface-container-high' },
  { regex: /hover:bg-slate-100/g, replacement: 'hover:bg-surface-container-high' },
  { regex: /hover:bg-indigo-50/g, replacement: 'hover:bg-primary/10' },
  { regex: /hover:bg-indigo-600/g, replacement: 'hover:bg-primary/80 text-on-primary' },
  { regex: /text-indigo-700/g, replacement: 'text-primary' },
  { regex: /text-indigo-600/g, replacement: 'text-primary' },
  { regex: /text-indigo-500/g, replacement: 'text-primary' },
  { regex: /bg-indigo-600/g, replacement: 'bg-primary text-on-primary' },
  { regex: /bg-indigo-500/g, replacement: 'bg-primary text-on-primary' },
  { regex: /bg-indigo-50/g, replacement: 'bg-primary/10' },
  { regex: /bg-indigo-100/g, replacement: 'bg-primary/20' },
  { regex: /border-indigo-200/g, replacement: 'border-primary/30' },
  { regex: /border-indigo-500/g, replacement: 'border-primary' },
  { regex: /ring-indigo-500/g, replacement: 'ring-primary' },
  { regex: /text-emerald-700/g, replacement: 'text-secondary' },
  { regex: /text-emerald-600/g, replacement: 'text-secondary' },
  { regex: /text-emerald-500/g, replacement: 'text-secondary' },
  { regex: /bg-emerald-50/g, replacement: 'bg-secondary/10' },
  { regex: /border-emerald-200/g, replacement: 'border-secondary/30' },
  { regex: /bg-emerald-500/g, replacement: 'bg-secondary' },
  { regex: /bg-emerald-100/g, replacement: 'bg-secondary/20' },
  { regex: /text-blue-700/g, replacement: 'text-primary' },
  { regex: /text-blue-500/g, replacement: 'text-primary' },
  { regex: /bg-blue-50/g, replacement: 'bg-primary/10' },
  { regex: /bg-blue-600/g, replacement: 'bg-primary text-on-primary' },
  { regex: /text-blue-600/g, replacement: 'text-primary' },
  { regex: /divide-slate-200/g, replacement: 'divide-outline-variant' },
  { regex: /divide-slate-100/g, replacement: 'divide-outline-variant/50' },
  { regex: /bg-amber-50/g, replacement: 'bg-primary/10' },
  { regex: /text-amber-700/g, replacement: 'text-primary' },
  { regex: /border-amber-200/g, replacement: 'border-primary/30' },
  { regex: /bg-slate-800/g, replacement: 'bg-surface-container-high' },
  { regex: /text-slate-300/g, replacement: 'text-on-surface' },
  { regex: /text-slate-200/g, replacement: 'text-on-surface' },
  { regex: /text-white/g, replacement: 'text-on-surface' }, // dangerous but mostly ok in buttons since we are overriding text-on-primary
  { regex: /bg-slate-900/g, replacement: 'bg-surface-container-highest' }
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
