import fs from 'fs';
const file = './src/components/auth/Login.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldWrapper = `  return (
    <div className="font-sans antialiased relative min-h-screen flex flex-col items-center justify-center p-4 overflow-x-hidden bg-surface text-on-surface w-full h-full absolute inset-0 z-50">
      {/* Grid background */}
      <div className="fixed inset-0 technical-grid opacity-15 pointer-events-none z-0"></div>

      <div className="w-full max-w-[440px] relative z-10 text-center flex flex-col items-center">`;

const newWrapper = `  return (
    <div className="font-sans antialiased fixed inset-0 overflow-y-auto overflow-x-hidden bg-surface text-on-surface z-50">
      {/* Grid background */}
      <div className="fixed inset-0 technical-grid opacity-15 pointer-events-none z-0"></div>
      
      <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-[440px] relative z-10 text-center flex flex-col items-center my-auto py-8">`;

content = content.replace(oldWrapper, newWrapper);

// We need to add a closing div for the extra wrapper at the end
const oldEnd = `      </div>
    </div>
  );
}`;

const newEnd = `        </div>
      </div>
    </div>
  );
}`;

content = content.replace(oldEnd, newEnd);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated Login.jsx scroll wrapper");
