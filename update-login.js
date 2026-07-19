import fs from 'fs';
const file = './src/components/auth/Login.jsx';
let content = fs.readFileSync(file, 'utf8');

const logoHeaderOld = `{/* Logo Header */}
        <div className="mb-12 inline-block">
          <img src="/logo-dark.png" alt="Print To Frame Logo" className="w-32 mx-auto mb-4" />
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Print<span className="text-primary text-glow">2</span>Frame</h1>
          <p className="font-mono text-xs text-primary tracking-[0.2em] uppercase mt-1">Fabrication Portal</p>
        </div>`;

const logoHeaderNew = `{/* Logo Header */}
        <div className="mb-12 inline-block text-center">
            <div className="flex justify-center mb-6">
                <img src="/logo-dark.png" alt="Print To Frame Logo" className="h-20 sm:h-24 w-auto object-contain transition-transform duration-300 hover:scale-105" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Print To Frame</h1>
            <p className="font-mono text-xs text-primary tracking-[0.2em] uppercase mt-1">Fabrication Portal</p>
        </div>`;

content = content.replace(logoHeaderOld, logoHeaderNew);

const formTitleOld = `<h2 className="text-xl font-display font-semibold text-on-surface mb-2">
            {isLoginView ? "Sign in to the Fabrication Hub" : "Request Access"}
          </h2>`;
const formTitleNew = `<h2 className="text-xl font-display font-semibold text-on-surface mb-2">
            {isLoginView ? "Print To Frame" : "Request Access"}
          </h2>`;
content = content.replace(formTitleOld, formTitleNew);

const formSubtitleOld = `<p className="text-on-surface-variant text-sm mb-8">
            {isLoginView ? "Secure access to your dashboard" : "Request access to specialized framing services"}
          </p>`;
const formSubtitleNew = `<p className="text-on-surface-variant text-sm mb-8">
            {isLoginView ? "Sign in to the portal" : "Request access to specialized framing services"}
          </p>`;
content = content.replace(formSubtitleOld, formSubtitleNew);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated Login.jsx header successfully!");
