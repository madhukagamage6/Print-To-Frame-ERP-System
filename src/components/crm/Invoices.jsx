import React, { useState } from 'react';
import { 
  Search, FileText, Check, DollarSign, Calendar, Printer, Edit2, 
  Trash2, X, ChevronRight, AlertCircle, Building2, User, Layers, Download, MessageSquare, Clock 
} from 'lucide-react';
import { updateDocument, deleteDocument, COLLECTIONS } from '../../services/firestoreSync';
import { toast } from '../../utils/toast';
import { logActivity } from '../../services/auditLog';
import DeleteModal from '../common/DeleteModal';
import { PageHeader, FilterBar, StatusBadge, ModalWrapper } from '../common/ui';
import { exportToCsv } from '../../utils/csvExport';

export default function Invoices({ invoices = [], setInvoices, onMarkPaid, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Summary Metrics & Overdue Tracking (Item 7)
  const todayStr = new Date().toISOString().split('T')[0];
  const totalAmount = invoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
  const paidAmount = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
  const unpaidAmount = invoices
    .filter(inv => inv.status !== 'Paid')
    .reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);

  const overdueInvoices = invoices.filter(inv => inv.status !== 'Paid' && inv.dueDate && inv.dueDate < todayStr);
  const overdueAmount = overdueInvoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);

  const paidCount = invoices.filter(inv => inv.status === 'Paid').length;
  const unpaidCount = invoices.filter(inv => inv.status !== 'Paid').length;
  const advanceCount = invoices.filter(inv => inv.type === 'Advance').length;
  const finalCount = invoices.filter(inv => inv.type === 'Final').length;

  const filteredInvoices = invoices.filter((inv) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      inv.customerName?.toLowerCase().includes(query) ||
      inv.company?.toLowerCase().includes(query) ||
      inv.id?.toLowerCase().includes(query)
    );

    if (!matchesSearch) return false;

    if (activeFilter === 'paid') return inv.status === 'Paid';
    if (activeFilter === 'unpaid') return inv.status !== 'Paid';
    if (activeFilter === 'overdue') return inv.status !== 'Paid' && inv.dueDate && inv.dueDate < todayStr;
    if (activeFilter === 'advance') return inv.type === 'Advance';
    if (activeFilter === 'final') return inv.type === 'Final';
    return true;
  });

  const handleExportCsv = () => {
    const exportColumns = [
      { key: 'id', label: 'Invoice ID' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'company', label: 'Company' },
      { key: 'type', label: 'Invoice Type' },
      { key: 'amount', label: 'Amount Due (LKR)' },
      { key: 'totalValue', label: 'Contract Value (LKR)' },
      { key: 'status', label: 'Payment Status' },
      { key: 'date', label: 'Issued Date' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'paidAt', label: 'Settled At' },
    ];
    exportToCsv(filteredInvoices, exportColumns, 'Invoices_Export');
    toast.success(`Exported ${filteredInvoices.length} invoices to CSV`);
  };

  const handleSendReminder = (inv) => {
    const custName = inv.customerName || 'Valued Client';
    const amount = Number(inv.amount || 0).toLocaleString();
    const dueDate = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB') : 'Immediate';
    const msg = encodeURIComponent(
      `Dear ${custName},\n\nThis is a friendly reminder from Print To Frame regarding Invoice ${inv.id} for LKR ${amount} (${inv.type === 'Advance' ? '75% Advance' : '25% Final Settlement'}).\nDue Date: ${dueDate}\n\nBank Transfer Details:\nNation Trust Bank - Head Office (500)\nA/C: 205001028941\nAccount Name: Madhuka Gamage\n\nPlease send us the payment confirmation slip at your earliest convenience. Thank you!`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
    toast.success('Payment reminder message opened in WhatsApp');
  };

  const handleEditClick = () => {
    setEditForm({ ...selectedInvoice });
    setIsEditing(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const docId = editForm._firestoreId || editForm.id;
    if (!docId) {
      toast.error('Cannot edit invoice: missing document ID.');
      return;
    }
    try {
      const updatedFields = {
        amount: Number(editForm.amount) || 0,
        customerName: editForm.customerName || '',
        company: editForm.company || '',
        type: editForm.type || 'Advance'
      };
      await updateDocument(COLLECTIONS.INVOICES, docId, updatedFields);
      if (setInvoices) {
        setInvoices(prev => prev.map(inv => (inv.id === docId || inv._firestoreId === docId) ? { ...inv, ...updatedFields } : inv));
      }
      toast.success('Invoice updated successfully');
      await logActivity(
        currentUser?.email || 'unknown',
        currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown',
        'INVOICE_EDITED',
        'Invoices',
        `Invoice ${docId} updated — Amount: LKR ${editForm.amount}, Type: ${editForm.type}`
      );
      setIsEditing(false);
      setSelectedInvoice(prev => ({ ...prev, ...updatedFields }));
    } catch (error) {
      toast.error('Error updating invoice: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDocument(COLLECTIONS.INVOICES, deleteId);
      if (setInvoices) {
        setInvoices(prev => prev.filter(inv => inv.id !== deleteId && inv._firestoreId !== deleteId));
      }
      toast.success('Invoice deleted successfully');
      await logActivity(
        currentUser?.email || 'unknown',
        currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown',
        'INVOICE_DELETED',
        'Invoices',
        `Invoice ${deleteId} permanently deleted`
      );
      if (selectedInvoice?.id === deleteId || selectedInvoice?._firestoreId === deleteId) {
        setSelectedInvoice(null);
      }
      setDeleteId(null);
    } catch (error) {
      toast.error('Error deleting invoice: ' + error.message);
    }
  };

  const handleMarkAsPaid = async (invId) => {
    const invToUpdate = invoices.find(inv => inv.id === invId || inv._firestoreId === invId);
    const docId = invToUpdate?._firestoreId || invToUpdate?.id || invId;
    if (!docId) {
      toast.error('Cannot update invoice: missing document ID.');
      return;
    }
    try {
      const paidAt = new Date().toISOString();
      await updateDocument(COLLECTIONS.INVOICES, docId, { status: 'Paid', paidAt });
      if (setInvoices) {
        setInvoices(prev => prev.map(inv => (inv.id === docId || inv._firestoreId === docId || inv.id === invId) ? { ...inv, status: 'Paid', paidAt } : inv));
      }
      toast.success('Invoice marked as Paid');
      await logActivity(
        currentUser?.email || 'unknown',
        currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown',
        'INVOICE_PAID',
        'Invoices',
        `Invoice ${docId} marked as Paid — Amount: LKR ${invToUpdate?.amount}, Customer: ${invToUpdate?.customerName}`
      );
      if (selectedInvoice && (selectedInvoice.id === invId || selectedInvoice._firestoreId === invId || selectedInvoice.id === docId)) {
        setSelectedInvoice(prev => ({ ...prev, status: 'Paid', paidAt }));
      }
      if (invToUpdate && invToUpdate.leadId && onMarkPaid) {
        onMarkPaid(invToUpdate.leadId);
      }
    } catch (error) {
      toast.error('Error updating status: ' + error.message);
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
            @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Poppins:wght@400;500;600&display=swap');
            body {
              font-family: 'Poppins', sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 40px;
              background-color: #ffffff;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #00daf3;
              padding-bottom: 24px;
              margin-bottom: 32px;
            }
            .logo {
              font-family: 'Hanken Grotesk', sans-serif;
              font-size: 24px;
              font-weight: 800;
              color: #0b0e14;
              letter-spacing: -0.03em;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .meta-box {
              text-align: right;
            }
            .meta-box p {
              margin: 4px 0;
              font-size: 13px;
              color: #475569;
            }
            .meta-box .invoice-id {
              font-family: 'JetBrains Mono', monospace;
              font-size: 18px;
              font-weight: 700;
              color: #0b0e14;
            }
            .bill-to-section {
              margin-bottom: 32px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-left: 4px solid #00daf3;
              border-radius: 8px;
              padding: 20px 24px;
            }
            .section-title {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: #64748b;
              margin-top: 0;
              margin-bottom: 8px;
            }
            .bill-to-content {
              font-size: 14px;
              line-height: 1.6;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 32px;
            }
            th {
              background-color: #0b0e14;
              padding: 14px 16px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #ffffff;
              text-align: left;
            }
            td {
              padding: 14px 16px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 13px;
              line-height: 1.5;
            }
            .mono-text {
              font-family: 'JetBrains Mono', monospace;
            }
            .totals-container {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 40px;
            }
            .totals-table {
              width: 380px;
              margin-bottom: 0;
            }
            .totals-table td {
              padding: 8px 16px;
              border: none;
            }
            .totals-table tr.grand-total td {
              border-top: 2px solid #00daf3;
              font-size: 16px;
              font-weight: 800;
              color: #0b0e14;
              padding-top: 14px;
            }
            .payment-terms {
              border-top: 1px solid #e2e8f0;
              padding-top: 24px;
              font-size: 11px;
              color: #64748b;
              text-align: center;
              line-height: 1.6;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              background-color: #ecfeff;
              color: #0891b2;
              border: 1px solid #a5f3fc;
              border-radius: 6px;
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
              ${selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 ? selectedInvoice.lineItems.map(item => `
                <tr>
                  <td>
                    <strong>${item.description || 'Fabrication Item'}</strong>
                    ${item.unit ? `<span style="font-size:11px; color:#64748b; margin-left:6px;">(${item.unit})</span>` : ''}
                  </td>
                  <td style="text-align: center;" class="mono-text">${item.qty || 1}</td>
                  <td style="text-align: right; font-weight: 600;" class="mono-text">LKR ${(Number(item.qty || 1) * Number(item.unitPrice || 0) * (isFinal ? 0.25 : 0.75)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join('') : `
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
              `}
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
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col pb-6">
      {/* Standardized Header */}
      <PageHeader
        title="Invoices"
        subtitle="Central billing repository for advance receipts, balance settlements, and financial audits."
        metrics={[
          { label: "Total Invoiced", value: `LKR ${totalAmount.toLocaleString()}`, color: "cyan" },
          { label: "Settled Revenue", value: `LKR ${paidAmount.toLocaleString()}`, color: "emerald" },
          { label: "Outstanding Receivables", value: `LKR ${unpaidAmount.toLocaleString()}`, color: unpaidAmount > 0 ? "warning" : "neutral" },
          { label: "Overdue Exposure", value: `LKR ${overdueAmount.toLocaleString()}`, color: overdueAmount > 0 ? "rose" : "neutral" },
          { label: "Total Invoices", value: invoices.length, color: "neutral" }
        ]}
        actions={
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-surface-container border border-outline-variant hover:border-primary/40 text-on-surface rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0"
            title="Export filtered invoices to CSV"
          >
            <Download size={15} className="text-primary" />
            <span>Export CSV</span>
          </button>
        }
      />

      {/* Standardized Filter & Search Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search by invoice ID, client name, company..."
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        filterOptions={[
          { id: 'all', label: 'All Invoices', count: invoices.length },
          { id: 'paid', label: 'Paid', count: paidCount },
          { id: 'unpaid', label: 'Unpaid', count: unpaidCount },
          { id: 'overdue', label: 'Overdue', count: overdueInvoices.length },
          { id: 'advance', label: '75% Advance', count: advanceCount },
          { id: 'final', label: '25% Final', count: finalCount }
        ]}
        totalCount={invoices.length}
        filteredCount={filteredInvoices.length}
      />

      {/* Main Grid split */}
      <div className="flex-1 flex lg:flex-row flex-col gap-6 overflow-hidden min-h-0">
        {/* Left Side: Invoice List */}
        <div className="w-full lg:w-1/3 flex flex-col border border-outline-variant/60 bg-surface-container/60 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)] h-full">
          <div className="bg-surface-container-low/80 p-3.5 px-4 border-b border-outline-variant/60 flex justify-between items-center text-xs font-bold text-on-surface-variant uppercase tracking-wider flex-shrink-0">
            <span className="flex items-center gap-2">
              <FileText size={14} className="text-primary" />
              Invoice Archive ({filteredInvoices.length})
            </span>
            <span className="text-[10px] text-on-surface-variant/70 lowercase font-medium">
              click to view draft
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-outline-variant/30">
            {filteredInvoices.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant text-sm font-medium">
                <FileText size={36} className="mx-auto mb-3 opacity-25 text-on-surface-variant" />
                <p className="font-bold text-on-surface">No invoices found</p>
                <p className="text-xs text-on-surface-variant mt-1">Try adjusting your search query or filter status.</p>
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const isSelected = selectedInvoice?.id === inv.id;
                const isPaid = inv.status === 'Paid';
                const isOverdue = !isPaid && inv.dueDate && inv.dueDate < todayStr;

                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`p-4 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-primary/10 border-l-4 border-primary shadow-inner' 
                        : 'hover:bg-surface-container-high/40 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-xs text-on-surface font-mono tracking-tight">{inv.id}</span>
                        <StatusBadge status={inv.status} size="xs" />
                        <span className="text-[9px] font-bold text-primary/90 bg-primary/10 px-1.5 py-0.5 rounded uppercase">
                          {inv.type === 'Final' ? '25% Final' : '75% Advance'}
                        </span>
                        {isOverdue && (
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase">
                            <Clock size={9} /> Overdue
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs font-bold text-on-surface truncate mb-0.5">
                        {inv.customerName || 'Direct Client'}
                        {inv.company && (
                          <span className="text-on-surface-variant font-normal"> • {inv.company}</span>
                        )}
                      </p>

                      <div className="text-[10px] text-on-surface-variant font-medium flex items-center gap-3 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="opacity-70" />
                          {inv.date}
                        </span>
                        {inv.dueDate && (
                          <span className={isOverdue ? "text-rose-400 font-bold" : ""}>
                            Due: {inv.dueDate}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        <p className="font-black text-xs sm:text-sm text-on-surface font-mono">
                          LKR {Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${isPaid ? 'text-emerald-400' : isOverdue ? 'text-rose-400' : 'text-amber-400'}`}>
                          {isPaid ? 'Settled' : isOverdue ? 'Overdue' : 'Pending'}
                        </p>
                      </div>
                      <ChevronRight size={14} className={`text-on-surface-variant/40 transition-transform ${isSelected ? 'text-primary translate-x-0.5' : ''}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Invoice Detail & Draft Inspector */}
        <div className="w-full lg:w-2/3 h-full">
          {selectedInvoice ? (
            <div className="bg-surface-container/70 h-full border border-outline-variant/60 rounded-3xl p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden">
              
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 pb-5 border-b border-outline-variant/60 flex-shrink-0">
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 bg-primary/15 text-primary rounded-2xl border border-primary/30 shadow-sm">
                    <FileText size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h3 className="font-black text-lg sm:text-xl text-on-surface font-mono tracking-tight">
                        {selectedInvoice.id}
                      </h3>
                      <StatusBadge status={selectedInvoice.status} size="xs" />
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 uppercase">
                        {selectedInvoice.type === 'Final' ? '25% Settlement' : '75% Advance'}
                      </span>
                      {selectedInvoice.status !== 'Paid' && selectedInvoice.dueDate && selectedInvoice.dueDate < todayStr && (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-md uppercase">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant font-medium">
                      Billed to: <span className="font-bold text-on-surface">{selectedInvoice.customerName}</span>
                      {selectedInvoice.company && <span> ({selectedInvoice.company})</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <button
                    onClick={handleEditClick}
                    className="p-2.5 bg-surface-container-high text-on-surface hover:bg-surface-variant hover:text-primary rounded-xl transition-all border border-outline-variant/60"
                    title="Edit Invoice"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(selectedInvoice._firestoreId || selectedInvoice.id)}
                    className="p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20"
                    title="Delete Invoice"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Summary Stats Pill Group */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 flex-shrink-0">
                <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/50">
                  <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Invoice Amount</p>
                  <p className="text-sm font-black text-on-surface font-mono mt-0.5">
                    LKR {Number(selectedInvoice.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/50">
                  <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Total Value</p>
                  <p className="text-sm font-black text-on-surface font-mono mt-0.5">
                    LKR {Number(selectedInvoice.totalValue || selectedInvoice.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/50">
                  <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Date Issued</p>
                  <p className="text-sm font-black text-on-surface font-mono mt-0.5">
                    {selectedInvoice.date || 'Today'}
                  </p>
                </div>
                <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/50">
                  <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Due Date</p>
                  <p className={`text-sm font-black font-mono mt-0.5 ${selectedInvoice.status !== 'Paid' && selectedInvoice.dueDate && selectedInvoice.dueDate < todayStr ? 'text-rose-400' : 'text-primary'}`}>
                    {selectedInvoice.dueDate || '—'}
                  </p>
                </div>
              </div>

              {/* Invoice Draft Render */}
              <div className="flex-1 bg-surface-container-low/90 rounded-2xl border border-outline-variant/60 p-5 overflow-y-auto font-mono text-xs text-on-surface whitespace-pre-wrap custom-scrollbar shadow-inner leading-relaxed min-h-[160px]">
                {selectedInvoice.aiDraft || 'No formal draft generated for this invoice.'}
              </div>

              {/* Footer Controls */}
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-outline-variant/60 pt-4 flex-shrink-0">
                <div className="text-[10px] text-on-surface-variant font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>Reference:</span>
                  <span className="font-bold text-on-surface">{selectedInvoice.leadId || selectedInvoice.linkedJobNo || 'Direct'}</span>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-wrap">
                  {selectedInvoice.status !== 'Paid' && (
                    <button
                      onClick={() => handleSendReminder(selectedInvoice)}
                      className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all"
                      title="Send payment reminder to client via WhatsApp"
                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp Reminder</span>
                    </button>
                  )}
                  <button
                    onClick={printInvoice}
                    className="flex-1 sm:flex-initial bg-surface-container-high text-on-surface hover:bg-surface-variant px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all active:scale-95 border border-outline-variant/60"
                  >
                    <Printer size={15} />
                    <span>Print PDF Invoice</span>
                  </button>
                  {selectedInvoice.status !== 'Paid' && (
                    <button
                      onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                      className="flex-1 sm:flex-initial bg-emerald-500 text-white hover:bg-emerald-600 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                    >
                      <Check size={15} />
                      <span>Mark as Paid</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/60 rounded-3xl text-on-surface-variant bg-surface-container/40 p-8 text-center">
              <FileText size={56} className="mb-3 opacity-20 text-on-surface" />
              <h3 className="font-bold text-base text-on-surface">No Invoice Selected</h3>
              <p className="text-xs max-w-sm text-on-surface-variant mt-1.5 leading-relaxed">
                Select an advance receipt or final settlement invoice from the archive on the left to inspect its billing specifications, print formal PDFs, or mark payments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Invoice Modal */}
      {isEditing && editForm && (
        <ModalWrapper
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          maxWidth="max-w-md"
          height="h-auto max-h-[85vh]"
          ariaLabel="Edit Invoice Details"
        >
          <div className="px-6 py-5 border-b border-outline-variant bg-surface-container-low flex justify-between items-center flex-shrink-0">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-on-surface">
                Edit Invoice {editForm.id}
              </h3>
              <p className="text-[10px] uppercase font-bold text-primary tracking-widest mt-0.5">
                Financial Record Adjustment
              </p>
            </div>
            <button 
              onClick={() => setIsEditing(false)} 
              className="p-2 bg-surface-container-high text-on-surface-variant rounded-full hover:bg-surface-variant transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                Customer Name *
              </label>
              <input 
                type="text" 
                value={editForm.customerName || ''} 
                onChange={e => setEditForm({...editForm, customerName: e.target.value})} 
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface" 
                required 
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                Company / Organization
              </label>
              <input 
                type="text" 
                value={editForm.company || ''} 
                onChange={e => setEditForm({...editForm, company: e.target.value})} 
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface" 
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                Amount (LKR) *
              </label>
              <input 
                type="number" 
                min="0" 
                step="0.01" 
                value={editForm.amount || 0} 
                onChange={e => setEditForm({...editForm, amount: e.target.value})} 
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-primary/50 text-on-surface" 
                required 
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                Invoice Stage / Ratio
              </label>
              <select 
                value={editForm.type || 'Advance'} 
                onChange={e => setEditForm({...editForm, type: e.target.value})} 
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
              >
                <option value="Advance">Advance (75%)</option>
                <option value="Final">Final Settlement (25%)</option>
              </select>
            </div>

            <div className="pt-4 border-t border-outline-variant flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setIsEditing(false)} 
                className="px-5 py-2.5 bg-surface-container-high text-on-surface rounded-xl font-bold text-xs hover:bg-surface-container-highest transition-colors border border-outline-variant/60"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(0,218,243,0.2)] active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Invoice Record?"
        message="Are you sure you want to permanently delete this invoice? This action cannot be undone."
      />
    </div>
  );
}

