import React, { useState } from 'react';
import { Search, FileText, Check, DollarSign, Calendar, Printer } from 'lucide-react';

export default function Invoices({ invoices = [], setInvoices, onMarkPaid }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const filteredInvoices = invoices.filter((inv) => {
    return (
      inv.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleMarkAsPaid = (invId) => {
    const invToUpdate = invoices.find(inv => inv.id === invId);
    setInvoices(prev => prev.map(inv => inv.id === invId ? { ...inv, status: 'Paid' } : inv));
    if (selectedInvoice && selectedInvoice.id === invId) {
      setSelectedInvoice(prev => ({ ...prev, status: 'Paid' }));
    }
    if (invToUpdate && invToUpdate.leadId && onMarkPaid) {
      onMarkPaid(invToUpdate.leadId);
    }
  };

  const printInvoice = () => {
    if (!selectedInvoice) return;
    const clientHeader = selectedInvoice.company 
      ? `<strong>${selectedInvoice.company}</strong><br/><span style="color:#64748b;">Attn: ${selectedInvoice.customerName}</span>`
      : `<strong>${selectedInvoice.customerName}</strong>`;
    
    const dateStr = selectedInvoice.date;
    const invoiceNo = selectedInvoice.id;
    const isFinal = selectedInvoice.type === 'Final';
    const badgeText = isFinal ? "25% Final Settlement Invoice" : "75% Advance Invoice";
    const lineItemTitle = isFinal ? "Final Settlement Payment (25%)" : "Custom Framing Advance Payment (75%)";
    const invoiceAmount = Number(selectedInvoice.amount);
    const totalContractValue = selectedInvoice.totalValue || (isFinal ? invoiceAmount / 0.25 : invoiceAmount / 0.75);
    const advanceAmount = isFinal ? totalContractValue * 0.75 : invoiceAmount;
    const balanceAmount = isFinal ? invoiceAmount : totalContractValue * 0.25;

    const html = `
      <html>
        <head>
          <title>${invoiceNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background-color: #ffffff;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 30px;
              margin-bottom: 40px;
            }
            .logo {
              font-size: 24px;
              font-weight: 800;
              color: #4f46e5;
              letter-spacing: -0.05em;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .logo-icon {
              background-color: #4f46e5;
              color: white;
              width: 32px;
              height: 32px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
            }
            .meta-box {
              text-align: right;
            }
            .meta-box p {
              margin: 4px 0;
              font-size: 13px;
              color: #64748b;
            }
            .meta-box .invoice-id {
              font-family: 'JetBrains Mono', monospace;
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
            }
            .bill-to-section {
              margin-bottom: 40px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 24px;
            }
            .section-title {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #94a3b8;
              margin-top: 0;
              margin-bottom: 12px;
            }
            .bill-to-content {
              font-size: 15px;
              line-height: 1.6;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            th {
              background-color: #f1f5f9;
              padding: 16px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #475569;
              text-align: left;
            }
            td {
              padding: 16px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 14px;
              line-height: 1.5;
            }
            .mono-text {
              font-family: 'JetBrains Mono', monospace;
            }
            .totals-container {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 60px;
            }
            .totals-table {
              width: 350px;
              margin-bottom: 0;
            }
            .totals-table td {
              padding: 10px 16px;
              border: none;
            }
            .totals-table tr.grand-total td {
              border-top: 2px solid #f1f5f9;
              font-size: 18px;
              font-weight: 800;
              color: #4f46e5;
              padding-top: 16px;
            }
            .payment-terms {
              border-top: 1px solid #f1f5f9;
              padding-top: 30px;
              font-size: 11px;
              color: #64748b;
              text-align: center;
              line-height: 1.6;
            }
            .badge {
              display: inline-block;
              padding: 4px 10px;
              background-color: #e0f2fe;
              color: #0369a1;
              border-radius: 99px;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              margin-top: 8px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <div class="logo">
                <img src="${window.location.origin}/logo-light.png" alt="Print To Frame" style="height: 32px; width: auto; margin-right: 8px;" />
                Print To Frame Pvt Ltd
              </div>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Premium Steel Framing & Gallery Canvas Wraps<br/>Kadawatha, Sri Lanka | +94 71 141 9027</p>
            </div>
            <div class="meta-box">
              <span class="badge">${badgeText}</span>
              <p class="invoice-id" style="margin-top:12px;">${invoiceNo}</p>
              <p>Date: ${dateStr}</p>
            </div>
          </div>

          <div class="bill-to-section">
            <h4 class="section-title">Invoiced Client</h4>
            <div class="bill-to-content">${clientHeader}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description / Specification</th>
                <th style="text-align: center; width: 80px;">Qty</th>
                <th style="text-align: right; width: 150px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${lineItemTitle}</strong><br/>
                  <span style="font-size: 12px; color: #64748b; margin-top:4px; display:block;">
                    ${selectedInvoice.aiDraft ? selectedInvoice.aiDraft.replace(/#\s*Invoice\n+/i, '').replace(/- /g, '• ') : 'Custom metal framing work'}
                  </span>
                </td>
                <td style="text-align: center;" class="mono-text">1</td>
                <td style="text-align: right; font-weight: 600;" class="mono-text">LKR ${invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals-container">
            <table class="totals-table">
              <tr>
                <td style="color:#64748b;">Contract Value:</td>
                <td style="text-align: right;" class="mono-text">LKR ${totalContractValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style="color:#64748b;">${isFinal ? 'Advance Paid (75%):' : 'Balance Due on Delivery:'}</td>
                <td style="text-align: right;" class="mono-text">LKR ${isFinal ? advanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="grand-total">
                <td>${isFinal ? 'Final Amount Due:' : 'Advance Amount Due:'}</td>
                <td style="text-align: right;" class="mono-text">LKR ${invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>

          <div class="payment-terms">
            <p><strong>Bank Details for Transfer:</strong> Nation Trust Bank - Head Office (500) | A/C: 205001028941 | Madhuka Gamage | Swift: N T B E L K E L K</p>
            <p>Please email payment confirmation slips to billing@print2frame.xyz quoting the Invoice Reference above.</p>
            <p style="margin-top: 15px; font-size: 9px; color: #94a3b8;">Generated automatically on behalf of Print To Frame ERP. Subject to terms of contract.</p>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const printWin = window.open('', '', 'height=800,width=800');
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end mb-8 gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Consolidated Invoices</h1>
          <p className="text-on-surface-variant text-sm">
            Central repository for all advance and final payment invoices.
          </p>
        </div>
        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-3.5 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search by ID or Client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
          />
        </div>
      </div>

      {/* Main Grid split */}
      <div className="flex-1 flex lg:flex-row flex-col gap-6 overflow-hidden">
        {/* Left Side: List */}
        <div className="w-full lg:w-1/3 flex flex-col border border-outline-variant bg-surface-container rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,218,243,0.05)] h-full">
          <div className="bg-surface-container-low p-4 border-b border-outline-variant flex justify-between text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            <span>Invoice Details</span>
            <span>Amount</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredInvoices.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant text-sm font-medium">
                No invoices found.
              </div>
            ) : (
              filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-4 border-b border-outline-variant/50 cursor-pointer transition-colors flex justify-between items-center ${
                    selectedInvoice?.id === inv.id ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-surface-container-low border-l-4 border-transparent'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-bold text-sm text-on-surface">{inv.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        inv.status === 'Paid' ? 'bg-secondary/20 text-secondary' : 'bg-yellow-500/20 text-primary'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-on-surface-variant mb-0.5">
                      {inv.customerName}{' '}
                      <span className="text-on-surface-variant font-normal">| {inv.company || 'Individual'}</span>
                    </p>
                    <p className="text-[10px] font-bold text-primary mt-1 mb-1">
                      {inv.type === 'Final' ? '25% Final Invoice' : '75% Advance Invoice'}
                    </p>
                    <p className="text-[10px] text-on-surface-variant font-medium flex items-center">
                      <Calendar size={10} className="mr-1" />
                      {inv.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-on-surface text-sm">
                      LKR {Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Preview */}
        <div className="w-full lg:w-2/3 h-full">
          {selectedInvoice ? (
            <div className="bg-surface-container h-full border border-outline-variant rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,218,243,0.05)] flex flex-col">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-variant/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-primary/20 text-primary rounded-xl">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">Invoice File: {selectedInvoice.id}</h3>
                    <p className="text-xs text-on-surface-variant font-medium">Generated draft & status management</p>
                  </div>
                </div>
              </div>

              {/* Invoice Draft Render */}
              <div className="flex-1 bg-surface-container-low rounded-xl border border-outline-variant p-6 overflow-y-auto font-mono text-xs text-on-surface whitespace-pre-wrap custom-scrollbar">
                {selectedInvoice.aiDraft || 'No draft description.'}
              </div>

              <div className="mt-4 flex justify-between items-center border-t border-outline-variant/50 pt-4">
                <p className="text-[10px] text-on-surface-variant font-bold uppercase">
                  Associated Lead: <span className="text-on-surface-variant">{selectedInvoice.leadId}</span>
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={printInvoice}
                    className="bg-surface-container-high text-on-surface px-4 py-2.5 rounded-xl text-xs font-bold  hover:bg-surface-container-highest flex items-center space-x-2 transition-all active:scale-95"
                  >
                    <Printer size={14} />
                    <span>Print PDF</span>
                  </button>
                  {selectedInvoice.status === 'Unpaid' && (
                    <button
                      onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                      className="bg-secondary text-on-secondary px-5 py-2.5 rounded-xl text-xs font-bold  hover:bg-secondary/80 text-on-primary flex items-center space-x-2 transition-all active:scale-95 animate-pulse"
                    >
                      <Check size={14} />
                      <span>Mark as Paid</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-outline-variant rounded-2xl text-on-surface-variant bg-surface-container-low/50">
              <FileText size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-bold">Select an invoice to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
