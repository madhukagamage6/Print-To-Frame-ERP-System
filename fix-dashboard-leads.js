import fs from 'fs';
const dashboardFile = './src/components/dashboard/Dashboard.jsx';
let dContent = fs.readFileSync(dashboardFile, 'utf8');

dContent = dContent.replace(
  'className="grid grid-cols-2 lg:grid-cols-4 gap-4"',
  'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"'
);
fs.writeFileSync(dashboardFile, dContent, 'utf8');

const leadsFile = './src/components/crm/Leads.jsx';
let lContent = fs.readFileSync(leadsFile, 'utf8');

lContent = lContent.replace(
  '<div className="flex justify-between items-end mb-8">',
  '<div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end mb-8 gap-4 sm:gap-0">'
);
fs.writeFileSync(leadsFile, lContent, 'utf8');

console.log("Updated Dashboard.jsx and Leads.jsx");
