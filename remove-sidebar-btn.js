import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\{\/\* Manual Expand\/Collapse Button \(Mobile Only\) \*\/\}.*?<\/button>/s;
if (regex.test(content)) {
  content = content.replace(regex, '');
  fs.writeFileSync(file, content, 'utf8');
  console.log("Removed the sidebar button completely.");
} else {
  console.log("Button not found");
}
