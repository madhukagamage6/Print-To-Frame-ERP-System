import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<div className="mt-3">',
  '<div className="mt-3 [@media(max-height:500px)]:hidden">'
);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated footer reset button visibility");
