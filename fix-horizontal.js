import fs from 'fs';
const file = './src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// Update Logo Section
content = content.replace(
  '<div className={`pt-20 md:pt-4 pb-6 flex justify-center items-center mb-2 relative ${effectivelyCollapsed ? "px-2" : "px-6"}`}>',
  '<div className={`pt-20 md:pt-4 pb-2 md:pb-6 flex justify-center items-center mb-1 md:mb-2 relative ${effectivelyCollapsed ? "px-2" : "px-6"} [@media(max-height:500px)]:pt-4 [@media(max-height:500px)]:pb-2 [@media(max-height:500px)]:mb-0`}>'
);

content = content.replace(
  '<img src="/logo-dark.png" alt="Print To Frame" className="w-48 h-auto object-contain" />',
  '<img src="/logo-dark.png" alt="Print To Frame" className="w-32 md:w-48 h-auto object-contain [@media(max-height:500px)]:w-24" />'
);

// Update Footer Section
content = content.replace(
  '<div className={`text-[10px] text-on-surface-variant border-t border-outline-variant/30 transition-all duration-300 ${effectivelyCollapsed ? "p-3 flex flex-col items-center space-y-4" : "p-6"}`}>',
  '<div className={`text-[10px] text-on-surface-variant border-t border-outline-variant/30 transition-all duration-300 ${effectivelyCollapsed ? "p-3 flex flex-col items-center space-y-4" : "p-4 md:p-6 [@media(max-height:500px)]:p-2"}`}>'
);

content = content.replace(
  '<div className="flex items-center space-x-3 mb-4 bg-surface-container p-3 rounded-xl ring-1 ring-outline-variant/50">',
  '<div className="flex items-center space-x-3 mb-2 md:mb-4 bg-surface-container p-2 md:p-3 rounded-xl ring-1 ring-outline-variant/50 [@media(max-height:500px)]:mb-1">'
);

content = content.replace(
  '<p className="font-bold mb-1">Print To Frame Pvt Ltd</p>\n              <p>Kadawatha, Sri Lanka</p>',
  '<div className="[@media(max-height:500px)]:hidden">\n                <p className="font-bold mb-1">Print To Frame Pvt Ltd</p>\n                <p>Kadawatha, Sri Lanka</p>\n              </div>'
);

content = content.replace(
  'className="w-full mt-4 bg-surface-container-high hover:bg-outline-variant text-on-surface font-bold py-2 px-4 rounded-xl transition-all duration-200 flex items-center justify-center text-xs"',
  'className="w-full mt-2 md:mt-4 bg-surface-container-high hover:bg-outline-variant text-on-surface font-bold py-2 px-4 rounded-xl transition-all duration-200 flex items-center justify-center text-xs [@media(max-height:500px)]:mt-1 [@media(max-height:500px)]:py-1"'
);

fs.writeFileSync(file, content, 'utf8');
