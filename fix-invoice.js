import fs from 'fs';

function updateFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Title
  content = content.replace(
    '<title>Invoice - Print To Frame</title>',
    '<title>${invoiceNo}</title>'
  );

  // Address
  content = content.replace(
    '<p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Premium Steel Framing & Gallery Canvas Wraps</p>',
    '<p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Premium Steel Framing & Gallery Canvas Wraps<br/>Kadawatha, Sri Lanka | +94 71 141 9027</p>'
  );

  // Bank
  content = content.replace(
    '<p><strong>Bank Details for Transfer:</strong> Print To Frame Pvt Ltd | Sampath Bank - Kadawatha | A/C: 1009 5543 2212</p>',
    '<p><strong>Bank Details for Transfer:</strong> Nation Trust Bank - Head Office (500) | A/C: 205001028941 | Madhuka Gamage | Swift: N T B E L K E L K</p>'
  );

  fs.writeFileSync(file, content, 'utf8');
}

updateFile('./src/components/crm/Invoices.jsx');
updateFile('./src/components/crm/LeadCardDetails.jsx');
console.log("Updated Invoices & LeadCardDetails PDF generation");
