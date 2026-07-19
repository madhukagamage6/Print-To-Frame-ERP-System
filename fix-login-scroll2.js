import fs from 'fs';
const file = './src/components/auth/Login.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">',
  '<div className="min-h-full flex flex-col items-center p-4 sm:p-6 md:p-8">'
);

content = content.replace(
  '<div className="w-full max-w-[440px] relative z-10 text-center flex flex-col items-center my-auto py-8">',
  '<div className="w-full max-w-[440px] relative z-10 text-center flex flex-col items-center m-auto py-8">'
);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated Login.jsx scroll wrapper part 2");
