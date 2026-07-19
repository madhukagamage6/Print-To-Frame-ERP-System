import fs from 'fs';
const file = './src/components/auth/Login.jsx';
let content = fs.readFileSync(file, 'utf8');

// Remove text-left from main container
content = content.replace('overflow-hidden group text-left">', 'overflow-hidden group">');

// Add text-left to form
content = content.replace('<form className="space-y-4" onSubmit={handleSubmit}>', '<form className="space-y-4 text-left" onSubmit={handleSubmit}>');

// Remove text-center from toggle mode
content = content.replace('<div className="mt-8 font-sans text-sm text-center">', '<div className="mt-8 font-sans text-sm">');

fs.writeFileSync(file, content, 'utf8');
