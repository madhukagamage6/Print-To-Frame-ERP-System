import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  MapPin, 
  User, 
  FileText, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Bell, 
  Send, 
  Printer,
  Save, 
  Navigation,
  Package,
  ShieldCheck,
  Phone,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  Receipt,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { 
  DetailModalLayout, 
  DetailModalHeader, 
  DetailModalContent, 
  DetailModalSidebar, 
  DetailFieldGroup, 
  DetailCustomerCard, 
  DetailModalFooter,
  StatusBadge 
} from '../common/ui';
import TwoToneIcon from '../common/ui/TwoToneIcon';
import { toast } from '../../utils/toast';
import { stripEmojis } from '../../utils/validation';
import { 
  getGoogleMapsUrl, 
  getWhatsAppUrl, 
  formatDispatchMessage, 
  calculateCODFromInvoices,
  FLEET_VEHICLES,
  DRIVER_DIRECTORY 
} from '../../utils/logisticsEngine';

export default function LogisticsCardDetails({ 
  job, 
  onClose, 
  onSave,
  invoices = [],
  customers = [],
  projects = []
}) {
  // Find linked customer record
  const matchedCustomer = useMemo(() => {
    if (!customers || customers.length === 0) return null;
    return customers.find(c => 
      (job.clientNIC && c.nic === job.clientNIC) ||
      (job.customer && (c.name?.toLowerCase() === job.customer?.toLowerCase() || c.businessName?.toLowerCase() === job.customer?.toLowerCase()))
    );
  }, [customers, job.clientNIC, job.customer]);

  const customerPhone = job.customerPhone || matchedCustomer?.phone || '';

  // Find linked fabrication order
  const linkedProject = useMemo(() => {
    if (!projects || projects.length === 0 || !job.linkedJobNo) return null;
    return projects.find(p => p.jobNo === job.linkedJobNo);
  }, [projects, job.linkedJobNo]);

  // Compute COD and linked invoices. Passing both the job and its linked
  // fabrication project as entities covers whichever one actually carries
  // the lead/deal id lineage (leadId/dealId/originalLeadId/convertedDealId) —
  // a job dispatched from a converted deal may only have it on one of them.
  const { hasUnpaid, totalBalanceDue, matchedInvoices, advanceInvoice, finalInvoice, primaryInvoice } = useMemo(() => {
    return calculateCODFromInvoices(invoices, job.linkedJobNo, job.customer, {
      entities: [job, linkedProject].filter(Boolean),
      invoiceId: job.invoiceId
    });
    // job/linkedProject are listed below by their identifying fields (what
    // matchesEntity actually reads) rather than by object reference, since
    // both are freshly-mapped on every Firestore snapshot and would defeat
    // this memo every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    invoices, job.linkedJobNo, job.customer, job.invoiceId,
    job.leadId, job.dealId, job.originalLeadId, job.convertedDealId,
    linkedProject?.leadId, linkedProject?.dealId, linkedProject?.originalLeadId, linkedProject?.convertedDealId,
  ]);

  const [formData, setFormData] = useState({
    subType: job.subType || '',
    location: job.location || '',
    customer: job.customer || '',
    customerPhone: customerPhone,
    manifest: job.manifest || '',
    driver: job.driver || '',
    vehicle: job.vehicle || '',
    linkedJobNo: job.linkedJobNo || '',
    notified: job.notified || false,
    lastNotifiedAt: job.lastNotifiedAt || null,
    priority: job.priority || 'Standard',
    specialNotes: job.specialNotes || 'Ensure rainproof wrapping and secure tie-downs during transit.',
    receivedBy: job.receivedBy || ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 1-Tap Google Maps Navigation
  const handleOpenNavigation = () => {
    const mapsUrl = getGoogleMapsUrl(formData.location);
    if (!mapsUrl) {
      toast.error('Please specify a delivery location first.');
      return;
    }
    window.open(mapsUrl, '_blank');
  };

  // 1-Tap WhatsApp Alert
  const handleSendWhatsAppAlert = () => {
    const matchedDriver = DRIVER_DIRECTORY.find(d => d.name === formData.driver);
    const msg = formatDispatchMessage({
      customerName: formData.customer,
      location: formData.location,
      subType: formData.subType,
      driverName: formData.driver,
      driverPhone: matchedDriver?.phone || '',
      vehiclePlate: formData.vehicle,
      id: job.id,
      balanceDue: totalBalanceDue
    });

    const url = getWhatsAppUrl(formData.customerPhone, msg);
    window.open(url, '_blank');

    const now = new Date().toISOString();
    setFormData(prev => ({
      ...prev,
      notified: true,
      lastNotifiedAt: now
    }));
    toast.success('WhatsApp dispatch alert opened!');
  };

  const handleSave = () => {
    onSave({
      ...job,
      ...formData
    });
    onClose();
    toast.success(`Logistics Task ${job.id} updated!`);
  };

  // View & Print Assigned Job Invoice from Database
  const printOfficialInvoice = (targetInvoice = null) => {
    const inv = targetInvoice || primaryInvoice || (matchedInvoices.length > 0 ? matchedInvoices[0] : null);

    if (!inv) {
      toast.error(`No invoice allocated in database for job #${job.linkedJobNo || job.id} yet.`, {
        description: 'Please allocate or create the advance / final settlement invoice in Quotations, Deals, or Fabrication first.'
      });
      return;
    }

    const invoiceNo = inv.id || inv._firestoreId;
    if (!invoiceNo) {
      toast.error('Allocated invoice does not have a valid invoice reference.');
      return;
    }

    const isFinal = inv.type === 'Final';
    const isPaid = inv.status === 'Paid';
    const dateStr = inv.date || new Date().toISOString().split('T')[0];
    const invoiceAmount = Number(inv.amount || 0);
    const totalContractValue = Number(inv.totalValue) || (isFinal ? (invoiceAmount > 0 ? invoiceAmount / 0.25 : 0) : (invoiceAmount > 0 ? invoiceAmount / 0.75 : 0));
    const advanceAmount = isFinal ? totalContractValue * 0.75 : invoiceAmount;
    const balanceAmount = isFinal ? invoiceAmount : totalContractValue * 0.25;
    const badgeText = isFinal ? "25% Final Settlement Invoice" : "75% Advance Invoice";
    const lineItemTitle = isFinal ? "Final Settlement Payment (25%)" : "Custom Framing Advance Payment (75%)";

    const clientHeader = inv.company 
      ? `<strong>${inv.company}</strong><br/><span style="color:#64748b;">Attn: ${inv.customerName || formData.customer || 'Valued Client'}</span>`
      : `<strong>${inv.customerName || formData.customer || 'Valued Client'}</strong>`;

    const html = `
      <html>
        <head>
          <title>${invoiceNo} — Print To Frame</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
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
              margin-bottom: 28px;
            }
            .logo {
              font-size: 22px;
              font-weight: 800;
              color: #0b0e14;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .meta-box {
              text-align: right;
            }
            .meta-box p {
              margin: 3px 0;
              font-size: 13px;
              color: #475569;
            }
            .meta-box .invoice-id {
              font-family: 'JetBrains Mono', monospace;
              font-size: 18px;
              font-weight: 700;
              color: #0b0e14;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              margin-bottom: 6px;
            }
            .badge-unpaid { background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; }
            .badge-paid { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
            .bill-to-section {
              margin-bottom: 28px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-left: 4px solid #00daf3;
              border-radius: 8px;
              padding: 16px 20px;
            }
            .section-title {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: #64748b;
              margin-top: 0;
              margin-bottom: 6px;
            }
            .bill-to-content {
              font-size: 14px;
              line-height: 1.5;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 28px;
            }
            th {
              background-color: #0b0e14;
              padding: 12px 16px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #ffffff;
              text-align: left;
            }
            td {
              padding: 12px 16px;
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
              margin-bottom: 30px;
            }
            .totals-table {
              width: 380px;
              margin-bottom: 0;
            }
            .totals-table td {
              padding: 6px 16px;
              border: none;
            }
            .totals-table tr.grand-total td {
              border-top: 2px solid #00daf3;
              font-size: 15px;
              font-weight: 800;
              color: #0b0e14;
              padding-top: 12px;
            }
            .bank-box {
              margin-top: 20px;
              padding: 14px 18px;
              border-radius: 8px;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              font-size: 12px;
              color: #1e3a8a;
              line-height: 1.6;
            }
            .signatures {
              margin-top: 35px;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #475569;
              border-top: 1px dashed #cbd5e1;
              padding-top: 20px;
            }
            @media print {
              body { padding: 15px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <div class="logo">
                <img src="${window.location.origin}/logo-light.png" alt="Print To Frame" style="height: 30px; width: auto; margin-right: 8px;" />
                Print To Frame Pvt Ltd
              </div>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">
                Premium Steel Framing & Gallery Canvas Wraps<br/>
                Kadawatha Hub, Sri Lanka • Hotline: +94 71 141 9027 • Email: orders@printtoframe.lk
              </p>
            </div>
            <div class="meta-box">
              <span class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}">
                ${badgeText} • ${isPaid ? 'PAID & SETTLED' : 'PAYMENT DUE / COD'}
              </span>
              <div class="invoice-id" style="margin-top: 6px;">${invoiceNo}</div>
              <p>Date: ${dateStr}${inv.dueDate ? ` | Due: ${inv.dueDate}` : ''}</p>
              ${(inv.linkedJobNo || job.linkedJobNo) ? `<p class="mono-text" style="font-size: 11px; color: #0284c7; font-weight: 700; margin-top: 2px;">Job Ref: #${inv.linkedJobNo || job.linkedJobNo}</p>` : ''}
            </div>
          </div>

          <div class="bill-to-section">
            <h4 class="section-title">Invoiced Client & Delivery Destination</h4>
            <div class="bill-to-content">${clientHeader}</div>
            <div style="font-size: 12px; color: #475569; margin-top: 4px;">
              <strong>Delivery Location:</strong> ${stripEmojis(formData.location) || 'Colombo Hub'}
              ${formData.customerPhone ? `<br/><strong>Contact Phone:</strong> ${formData.customerPhone}` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description / Order Specification</th>
                <th style="text-align: center; width: 80px;">Qty</th>
                <th style="text-align: right; width: 160px;">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              ${inv.lineItems && inv.lineItems.length > 0 ? inv.lineItems.map(item => `
                <tr>
                  <td>
                    <strong>${item.description || 'Fabrication Item'}</strong>
                    ${item.unit ? `<span style="font-size:11px; color:#64748b; margin-left:6px;">(${item.unit})</span>` : ''}
                  </td>
                  <td style="text-align: center;" class="mono-text">${item.qty || 1}</td>
                  <td style="text-align: right; font-weight: 600;" class="mono-text">${(Number(item.qty || 1) * Number(item.unitPrice || 0) * (isFinal ? 0.25 : 0.75)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td>
                    <strong>${lineItemTitle}</strong><br/>
                    <span style="font-size: 12px; color: #64748b; margin-top: 4px; display: block;">
                      ${inv.aiDraft ? inv.aiDraft.replace(/#\s*Invoice\n+/i, '').replace(/- /g, '• ') : (stripEmojis(formData.manifest) || 'Custom steel framing fabrication')}
                    </span>
                  </td>
                  <td style="text-align: center;" class="mono-text">1</td>
                  <td style="text-align: right; font-weight: 600;" class="mono-text">${invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                <td>${isFinal ? 'Final Settlement Due:' : 'Advance Amount Due:'}</td>
                <td style="text-align: right;" class="mono-text">LKR ${invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>

          <div class="bank-box">
            <strong>Payment Terms & Bank Details:</strong><br/>
            • <strong>Cash on Delivery (COD):</strong> Collect exact amount upon handover.<br/>
            • <strong>Bank Transfer:</strong> Nation Trust Bank - Head Office (500) | A/C: 205001028941 | Name: Madhuka Gamage | Swift: N T B E L K E L K<br/>
            • <strong>Commercial Bank:</strong> Print To Frame (Pvt) Ltd | A/C: 1000-2345-6789 | Kadawatha Branch
          </div>

          <div class="signatures">
            <div>________________________________<br/>Authorized Dispatcher / Fleet Driver</div>
            <div>________________________________<br/>Client Confirmation & Stamp</div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'height=850,width=850');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    }
  };


  // Printable Delivery Waybill / Gate Pass
  const printWaybill = () => {
    const dateStr = new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=PTF-${job.id}`;

    const html = `
      <html>
        <head>
          <title>Logistics Waybill — ${job.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=JetBrains+Mono:wght@400;700&display=swap');
            body { font-family: 'Outfit', sans-serif; color: #0f172a; padding: 40px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #00daf3; padding-bottom: 20px; }
            .badge { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
            .section { margin-top: 24px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .mono { font-family: 'JetBrains Mono', monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px; }
            th { background: #f1f5f9; font-weight: 800; font-size: 11px; text-transform: uppercase; }
            .qr-code { width: 80px; height: 80px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="margin:0; font-size: 22px; font-weight:800; color:#0f172a;">PRINT TO FRAME — DELIVERY GATE PASS</h1>
              <p style="margin:4px 0 0 0; color:#64748b; font-size:12px;">Fleet Operations & Dispatch Division • Kadawatha Central Hub</p>
            </div>
            <div style="display:flex; align-items:center; gap:15px;">
              <img src="${qrUrl}" class="qr-code" alt="QR Gate Pass" />
              <div style="text-align:right;">
                <span class="badge">${job.type} Run</span>
                <p class="mono" style="font-size:16px; font-weight:800; margin:6px 0 0 0;">${job.id}</p>
                <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">Date: ${dateStr}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <h3 style="margin:0 0 8px 0; font-size:11px; text-transform:uppercase; color:#64748b;">Customer & Delivery Destination</h3>
            <p style="font-size:16px; font-weight:700; margin:0 0 4px 0;">${stripEmojis(formData.customer) || 'Direct Request'}</p>
            <p style="font-size:13px; color:#475569; margin:0 0 2px 0;">Address: ${stripEmojis(formData.location) || 'Hub pickup'}</p>
            ${formData.customerPhone ? `<p style="font-size:12px; color:#0284c7; margin:0;">Phone: ${formData.customerPhone}</p>` : ''}
            ${job.linkedJobNo ? `<p class="mono" style="font-size:11px; color:#64748b; margin:4px 0 0 0;">Linked Work Order: ${job.linkedJobNo}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Cargo Item & Specification</th>
                <th>Assigned Fleet Unit</th>
                <th>COD Collection Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${stripEmojis(formData.subType) || 'Printed Canvas Frame'}</strong><br/>
                  <span style="font-size:11px; color:#64748b;">${stripEmojis(formData.manifest) || 'Standard protective gallery wrapping'}</span>
                </td>
                <td>
                  <strong>${formData.driver || 'Saman (Driver)'}</strong><br/>
                  <span class="mono" style="font-size:12px; color:#64748b;">${formData.vehicle || 'Lorry WP GE 1234'}</span>
                </td>
                <td>
                  ${hasUnpaid 
                    ? `<strong style="color:#b91c1c;">COLLECT LKR ${totalBalanceDue.toLocaleString()}</strong>` 
                    : '<strong style="color:#15803d;">PAID / NO COLLECTION</strong>'}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="section" style="margin-top:20px;">
            <h3 style="margin:0 0 8px 0; font-size:11px; text-transform:uppercase; color:#64748b;">Dispatch Clearance & Handover Authorization</h3>
            <div style="display:flex; justify-content:space-between; margin-top:35px; font-size:12px;">
              <div>____________________________<br/>Hub Security Gate Sign-Off</div>
              <div>____________________________<br/>Driver Signature</div>
              <div>____________________________<br/>Customer Received Signature</div>
            </div>
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'height=800,width=850');
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <DetailModalLayout isOpen={true} onClose={onClose} ariaLabel="Logistics Dispatch Inspector">
      
      {/* Universal Header */}
      <DetailModalHeader
        title={formData.location || `${job.type} Task`}
        id={job.id}
        badge={
          <StatusBadge status={job.status || "Pending"} size="sm" />
        }
        subtitle={
          <>
            <span className="flex items-center">
              <Truck size={12} className="mr-1 text-primary" /> {job.type} Mission
            </span>
            <span>•</span>
            <span>Customer: <strong className="text-on-surface">{formData.customer || 'Direct Request'}</strong></span>
            {formData.linkedJobNo && (
              <>
                <span>•</span>
                <span className="font-mono text-primary font-bold">Job #{formData.linkedJobNo}</span>
              </>
            )}
            {formData.notified && (
              <>
                <span>•</span>
                <span className="text-emerald-400 font-bold flex items-center">
                  <ShieldCheck size={12} className="mr-1" /> Alert Sent
                </span>
              </>
            )}
          </>
        }
        onClose={onClose}
      />

      {/* Main 2-Column Responsive Body (Single-column on mobile, dual on desktop) */}
      <div className="flex-1 overflow-y-auto lg:grid lg:grid-cols-[1fr_400px] custom-scrollbar">
        
        {/* Left Column: Road Tools, Navigation, Invoice & Cargo Specs */}
        <DetailModalContent>
          
          {/* Quick Road Actions (Ultra-accessible on mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            <button
              type="button"
              onClick={handleOpenNavigation}
              className="w-full flex items-center justify-center space-x-2.5 py-3 px-4 bg-primary text-on-primary rounded-xl font-bold text-xs sm:text-sm hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(0,218,243,0.25)] active:scale-95 min-h-[48px]"
            >
              <Navigation size={16} />
              <span>Open in Google Maps</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsAppAlert}
              className="w-full flex items-center justify-center space-x-2.5 py-3 px-4 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs sm:text-sm hover:bg-emerald-500/25 transition-all shadow-sm active:scale-95 min-h-[48px]"
            >
              <MessageSquare size={16} />
              <span>WhatsApp Customer</span>
            </button>
          </div>

          {/* Assigned Job Invoices & Cash On Delivery (COD) Section */}
          <DetailFieldGroup label="Assigned Job Invoices & Payment Due" icon={DollarSign}>
            <div className={`p-4 rounded-2xl border transition-all ${
              hasUnpaid 
                ? "bg-amber-500/10 border-amber-500/30 text-on-surface" 
                : "bg-emerald-500/10 border-emerald-500/30 text-on-surface"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className={`p-2.5 rounded-xl ${hasUnpaid ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                    {hasUnpaid ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest block opacity-70">
                      {hasUnpaid ? "Cash / Payment Collection Required" : "Invoice Settlement Status"}
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono block">
                      {hasUnpaid 
                        ? `COLLECT LKR ${totalBalanceDue.toLocaleString()}` 
                        : (matchedInvoices.length > 0 ? "ALL INVOICES SETTLED — NO CASH TO COLLECT" : "NO INVOICE ALLOCATED IN DATABASE")}
                    </span>
                    {matchedInvoices.length > 0 ? (
                      <span className="text-xs opacity-80 block mt-0.5">
                        Matched {matchedInvoices.length} allocated database invoice(s) for this job
                      </span>
                    ) : (
                      <span className="text-xs opacity-80 block mt-0.5 text-status-warning-on">
                        No billing document generated in DB yet for #{job.linkedJobNo || job.id}
                      </span>
                    )}
                  </div>
                </div>

                {primaryInvoice ? (
                  <button
                    type="button"
                    onClick={() => printOfficialInvoice(primaryInvoice)}
                    className="px-4 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-highest transition-all flex items-center justify-center space-x-2 shrink-0 min-h-[44px] shadow-sm"
                    title={`Print allocated invoice ${primaryInvoice.id}`}
                  >
                    <Receipt size={14} className="text-primary" />
                    <span>Print Invoice ({primaryInvoice.id})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => printOfficialInvoice(null)}
                    className="px-4 py-2.5 bg-surface-container-high/60 border border-outline-variant/60 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-highest transition-all flex items-center justify-center space-x-2 shrink-0 min-h-[44px]"
                    title="No invoice allocated in database"
                  >
                    <Receipt size={14} className="opacity-50" />
                    <span>No Invoice Allocated</span>
                  </button>
                )}
              </div>

              {/* Allocated Invoices List from Database */}
              {matchedInvoices.length > 0 && (
                <div className="mt-4 pt-3 border-t border-outline-variant/40 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center justify-between">
                    <span>Allocated Database Invoices ({matchedInvoices.length})</span>
                    <span className="font-mono text-[9px] opacity-75">Linked Job #{job.linkedJobNo || job.id}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {matchedInvoices.map(inv => {
                      const isInvPaid = inv.status === 'Paid';
                      const isInvFinal = inv.type === 'Final';
                      const invAmount = Number(inv.amount || inv.totalValue || 0);
                      return (
                        <div 
                          key={inv.id || inv._firestoreId}
                          className="p-3 bg-surface-container rounded-xl border border-outline-variant/60 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <span className="font-mono font-bold text-on-surface text-[11px]">{inv.id}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                isInvFinal ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              }`}>
                                {isInvFinal ? '25% Final' : '75% Advance'}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                isInvPaid ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                              }`}>
                                {isInvPaid ? 'Paid' : 'Unpaid'}
                              </span>
                            </div>
                            <div className="font-mono text-[11px] text-on-surface font-semibold">
                              LKR {invAmount.toLocaleString()}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => printOfficialInvoice(inv)}
                            className="px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-variant text-primary border border-outline-variant rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
                            title={`Print invoice ${inv.id}`}
                          >
                            <Printer size={12} />
                            <span>Print</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </DetailFieldGroup>

          {/* Destination & Contact */}
          <DetailFieldGroup label="Delivery Location & Contact" icon={MapPin}>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1 tracking-wider">
                  Site / Delivery Address
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-3.5 text-primary" />
                  <input 
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
                    placeholder="Provide full delivery address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1 tracking-wider">
                    Customer Phone Number
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-3.5 text-secondary" />
                    <input 
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface font-mono"
                      placeholder="e.g. 0771234567"
                    />
                  </div>
                </div>

                {formData.customerPhone && (
                  <div className="flex items-end">
                    <a
                      href={`tel:${formData.customerPhone}`}
                      className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-surface-container-high border border-outline-variant rounded-xl text-xs font-bold text-secondary hover:bg-surface-container-highest transition-all min-h-[48px]"
                    >
                      <Phone size={14} />
                      <span>Call Customer Directly</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </DetailFieldGroup>

          {/* Cargo Classification & Priority */}
          <DetailFieldGroup label="Cargo Specification" icon={Package}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1 tracking-wider">
                  Material Category
                </label>
                <select 
                  name="subType"
                  value={formData.subType}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/50 text-on-surface"
                >
                  <option value="">-- Select Category --</option>
                  <option value="Finished Steel Frame">Finished Gallery-Wrap Frame</option>
                  <option value="Printed Canvas">Printed Canvas Roll</option>
                  <option value="Steel Supply">Steel Box Bar Supply</option>
                  <option value="Packaging Materials">Protective Packaging</option>
                  <option value="Client Sample">Steel Frame Sample</option>
                  <option value="Waste Return">Material Scrap Return</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1 tracking-wider">
                  Priority Dispatch
                </label>
                <select 
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/50 text-on-surface"
                >
                  <option value="Standard">Standard Priority</option>
                  <option value="Express">Express Rush (Same Day)</option>
                  <option value="Scheduled">Scheduled Drop-off</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1 tracking-wider">
                Manifest Description
              </label>
              <input
                type="text"
                name="manifest"
                value={formData.manifest}
                onChange={handleInputChange}
                className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Cargo description, dimensions or package count"
              />
            </div>
          </DetailFieldGroup>

          {/* Special Transit Instructions */}
          <DetailFieldGroup label="Transit & Handling Precautions" icon={ShieldCheck}>
            <textarea
              name="specialNotes"
              value={formData.specialNotes}
              onChange={handleInputChange}
              rows={2}
              className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
              placeholder="e.g. Ensure rainproof wrap and secure tie-downs..."
            />
          </DetailFieldGroup>

        </DetailModalContent>

        {/* Right Column: Fleet Crew, Client Profile, Quick Handover Note */}
        <DetailModalSidebar>
          
          {/* Customer Summary Card */}
          <DetailFieldGroup label="Consignee Information" icon={User}>
            <DetailCustomerCard
              customerName={formData.customer || 'Direct Customer'}
              address={formData.location || 'Kadawatha Hub'}
            />
          </DetailFieldGroup>

          {/* Driver & Vehicle Assignment */}
          <DetailFieldGroup label="Assigned Fleet Unit" icon={Truck}>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1 tracking-wider">
                  Assigned Driver
                </label>
                <select 
                  name="driver"
                  value={formData.driver}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/50 text-on-surface"
                >
                  <option value="">-- Select Driver --</option>
                  {DRIVER_DIRECTORY.map(d => (
                    <option key={d.name} value={d.name}>{d.name} ({d.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1 tracking-wider">
                  Assigned Vehicle
                </label>
                <select 
                  name="vehicle"
                  value={formData.vehicle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/50 text-on-surface"
                >
                  <option value="">-- Select Vehicle --</option>
                  {FLEET_VEHICLES.map(v => (
                    <option key={v.id} value={v.name}>{v.name} - {v.capacity}</option>
                  ))}
                </select>
              </div>
            </div>
          </DetailFieldGroup>

          {/* Quick Handover Note */}
          <DetailFieldGroup label="Proof of Delivery Sign-Off" icon={CheckCircle2}>
            <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant space-y-2.5">
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                Received By (Person Name / Contact)
              </label>
              <input
                type="text"
                name="receivedBy"
                value={formData.receivedBy}
                onChange={handleInputChange}
                className="w-full p-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Kasun / Security Officer"
              />
              <p className="text-[10px] text-on-surface-variant">
                Quickly record who accepted the delivery upon handover at the site.
              </p>
            </div>
          </DetailFieldGroup>

          {/* Dispatch Timeline */}
          <DetailFieldGroup label="Trip Timeline" icon={Clock}>
            <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-surface-container rounded-xl border border-outline-variant">
                  <span className="text-[9px] uppercase font-bold text-on-surface-variant block mb-1">
                    Dispatched
                  </span>
                  <span className="font-mono text-on-surface text-[11px] font-bold">
                    {job.startTime ? new Date(job.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Awaiting'}
                  </span>
                </div>
                <div className="p-2.5 bg-surface-container rounded-xl border border-outline-variant">
                  <span className="text-[9px] uppercase font-bold text-on-surface-variant block mb-1">
                    Duration
                  </span>
                  <span className="font-mono text-primary font-bold text-[11px]">
                    {job.duration || 'In Progress'}
                  </span>
                </div>
              </div>
            </div>
          </DetailFieldGroup>

        </DetailModalSidebar>

      </div>

      {/* Universal Footer with Generous Touch Targets */}
      <DetailModalFooter
        secondaryActions={
          <div className="flex items-center space-x-2 flex-wrap">
            <button
              type="button"
              onClick={printWaybill}
              className="px-4 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-on-surface font-bold text-xs hover:bg-surface-variant transition-all flex items-center space-x-1.5 active:scale-95 min-h-[44px]"
            >
              <Printer size={14} className="text-primary" />
              <span>Print Waybill</span>
            </button>
            <button
              type="button"
              onClick={() => printOfficialInvoice(primaryInvoice)}
              className="px-4 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-on-surface font-bold text-xs hover:bg-surface-variant transition-all flex items-center space-x-1.5 active:scale-95 min-h-[44px]"
            >
              <Receipt size={14} className="text-secondary" />
              <span>{primaryInvoice ? `Print Invoice (${primaryInvoice.id})` : 'Print Invoice'}</span>
            </button>
          </div>
        }
        onClose={onClose}
        closeText="Cancel"
        primaryActions={
          <button 
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs sm:text-sm hover:bg-primary/90 transition-all flex items-center space-x-1.5 shadow-[0_0_15px_rgba(0,218,243,0.2)] active:scale-95 min-h-[44px]"
          >
            <Save size={14} />
            <span>Save Updates</span>
          </button>
        }
      />

    </DetailModalLayout>
  );
}
