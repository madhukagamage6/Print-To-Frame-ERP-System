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

  // Compute COD and linked invoices
  const { hasUnpaid, totalBalanceDue, matchedInvoices } = useMemo(() => {
    return calculateCODFromInvoices(invoices, job.linkedJobNo, job.customer);
  }, [invoices, job.linkedJobNo, job.customer]);

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

  // View & Print Assigned Job Invoice
  const printOfficialInvoice = () => {
    const inv = matchedInvoices.length > 0 ? matchedInvoices[0] : null;
    const invNo = inv?.id || inv?._firestoreId || `INV-${job.id}`;
    const invDate = inv?.date || new Date().toISOString().split('T')[0];
    const totalAmount = inv ? Number(inv.amount || inv.totalValue || 0) : (totalBalanceDue || 0);
    const isPaid = inv ? inv.status === 'Paid' : !hasUnpaid;

    const html = `
      <html>
        <head>
          <title>${invNo} — Print To Frame</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
            body { font-family: 'Outfit', sans-serif; color: #0f172a; padding: 40px; margin: 0; background: #ffffff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #00daf3; padding-bottom: 20px; }
            .brand { font-size: 24px; font-weight: 800; color: #0f172a; }
            .badge { display: inline-block; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 11px; text-transform: uppercase; }
            .badge-unpaid { background: #fee2e2; color: #b91c1c; border: 1px solid #f87171; }
            .badge-paid { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
            .section { margin-top: 24px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .mono { font-family: 'JetBrains Mono', monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px; }
            th { background: #f1f5f9; font-weight: 800; font-size: 11px; text-transform: uppercase; color: #475569; }
            .total-row { font-size: 16px; font-weight: 800; border-top: 2px solid #0f172a; }
            .bank-box { margin-top: 25px; padding: 15px; border-radius: 8px; background: #eff6ff; border: 1px solid #bfdbfe; font-size: 12px; }
            @media print { body { padding: 15px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">PRINT TO FRAME</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Custom Framing & Fabrication Specialists • Kadawatha Hub</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Hotline: +94 77 123 4567 • Email: orders@printtoframe.lk</div>
            </div>
            <div style="text-align: right;">
              <span class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}">
                ${isPaid ? 'PAID & SETTLED' : 'PAYMENT DUE / COD'}
              </span>
              <div class="mono" style="font-size: 18px; font-weight: 800; margin-top: 8px;">${invNo}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Date: ${invDate}</div>
              ${job.linkedJobNo ? `<div class="mono" style="font-size: 11px; color: #0284c7; margin-top: 2px;">Job Ref: ${job.linkedJobNo}</div>` : ''}
            </div>
          </div>

          <div class="section">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Billed To / Delivery Client</div>
            <div style="font-size: 16px; font-weight: 700;">${stripEmojis(formData.customer) || 'Valued Client'}</div>
            <div style="font-size: 13px; color: #475569; margin-top: 4px;">Destination: ${stripEmojis(formData.location) || 'Kadawatha Hub'}</div>
            ${formData.customerPhone ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">Phone: ${formData.customerPhone}</div>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Order Ref</th>
                <th style="text-align: right;">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${stripEmojis(formData.subType) || 'Custom Steel Frame'}</strong><br/>
                  <span style="font-size: 11px; color: #64748b;">${stripEmojis(formData.manifest) || 'Specialist fabrication with gallery finish'}</span>
                </td>
                <td class="mono">${job.linkedJobNo || job.id}</td>
                <td style="text-align: right;" class="mono"><strong>${totalAmount.toLocaleString()}</strong></td>
              </tr>
              <tr class="total-row">
                <td colspan="2">TOTAL AMOUNT DUE</td>
                <td style="text-align: right;" class="mono">LKR ${totalAmount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="bank-box">
            <strong>Payment Method:</strong> Cash on Delivery (COD), Company Cheque, or Direct Bank Transfer.<br/>
            <strong>Commercial Bank:</strong> Print To Frame (Pvt) Ltd • Account No: 1000-2345-6789 • Kadawatha Branch
          </div>

          <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #475569;">
            <div>________________________________<br/>Authorized Dispatcher</div>
            <div>________________________________<br/>Customer Confirmation & Stamp</div>
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'height=800,width=850');
    printWin.document.write(html);
    printWin.document.close();
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
                        : "ALL INVOICES SETTLED — NO CASH TO COLLECT"}
                    </span>
                    {matchedInvoices.length > 0 && (
                      <span className="text-xs opacity-80 block mt-0.5">
                        Matched {matchedInvoices.length} billing document(s) for this job
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={printOfficialInvoice}
                  className="px-4 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-highest transition-all flex items-center justify-center space-x-2 shrink-0 min-h-[44px] shadow-sm"
                >
                  <Receipt size={14} className="text-primary" />
                  <span>View / Print Invoice</span>
                </button>
              </div>
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
              onClick={printOfficialInvoice}
              className="px-4 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-on-surface font-bold text-xs hover:bg-surface-variant transition-all flex items-center space-x-1.5 active:scale-95 min-h-[44px]"
            >
              <Receipt size={14} className="text-secondary" />
              <span>Print Invoice</span>
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
