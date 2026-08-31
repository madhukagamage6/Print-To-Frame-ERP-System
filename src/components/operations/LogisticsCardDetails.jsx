import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  User, 
  FileText, 
  Clock, 
  Calendar, 
  CheckCircle, 
  Bell, 
  Send, 
  Printer,
  Save, 
  Navigation,
  Package,
  ShieldCheck,
  Layers,
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
import { toast } from '../../utils/toast';
import { stripEmojis } from '../../utils/validation';

export default function LogisticsCardDetails({ job, onClose, onSave }) {
  const [formData, setFormData] = useState({
    subType: job.subType || '',
    location: job.location || '',
    customer: job.customer || '',
    manifest: job.manifest || '',
    driver: job.driver || '',
    vehicle: job.vehicle || '',
    notified: job.notified || false,
    lastNotifiedAt: job.lastNotifiedAt || null,
    priority: job.priority || 'Standard',
    specialNotes: job.specialNotes || 'Ensure moisture protection wrap during transit.'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotifyClient = () => {
    const now = new Date().toISOString();
    setFormData(prev => ({
      ...prev,
      notified: true,
      lastNotifiedAt: now
    }));
    toast.success(`Client ${formData.customer || 'Consignee'} notified!`, {
      description: `Dispatch alert sent for ${job.type} at ${formData.location || 'Hub'}.`
    });
  };

  const handleSave = () => {
    onSave({
      ...job,
      ...formData
    });
    onClose();
    toast.success(`Logistics Job ${job.id} updated!`);
  };

  // Printable Delivery Waybill / Gate Pass
  const printWaybill = () => {
    const dateStr = new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

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
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="margin:0; font-size: 22px; font-weight:800; color:#0f172a;">PRINT TO FRAME — LOGISTICS GATE PASS</h1>
              <p style="margin:4px 0 0 0; color:#64748b; font-size:12px;">Fleet Operations & Material Dispatch Division</p>
            </div>
            <div style="text-align:right;">
              <span class="badge">${job.type} Task</span>
              <p class="mono" style="font-size:16px; font-weight:800; margin:6px 0 0 0;">${job.id}</p>
              <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">Date: ${dateStr}</p>
            </div>
          </div>

          <div class="section">
            <h3 style="margin:0 0 8px 0; font-size:11px; text-transform:uppercase; color:#64748b;">Consignee & Route Destination</h3>
            <p style="font-size:16px; font-weight:700; margin:0 0 4px 0;">${stripEmojis(formData.customer) || 'Direct Request'}</p>
            <p style="font-size:13px; color:#64748b; margin:0;">Destination: ${stripEmojis(formData.location) || 'Hub pickup'}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Cargo Item & Specification</th>
                <th>Assigned Dispatch Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${stripEmojis(formData.subType) || 'Printed Canvas Frame'}</strong><br/><span style="font-size:11px; color:#64748b;">${stripEmojis(formData.manifest) || 'Standard gallery packaging'}</span></td>
                <td>
                  <strong>${formData.driver || 'Saman (Lead)'}</strong><br/>
                  <span class="mono" style="font-size:12px; color:#64748b;">${formData.vehicle || 'Lorry WP GE 1234'}</span>
                </td>
                <td><span class="badge">${job.status}</span></td>
              </tr>
            </tbody>
          </table>

          <div class="section" style="margin-top:20px;">
            <h3 style="margin:0 0 8px 0; font-size:11px; text-transform:uppercase; color:#64748b;">Security & Dispatch Authorization</h3>
            <div style="display:flex; justify-content:space-between; margin-top:30px; font-size:12px;">
              <div>____________________________<br/>Security Guard Sign-Off</div>
              <div>____________________________<br/>Driver Signature</div>
              <div>____________________________<br/>Consignee Acknowledgment</div>
            </div>
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    const printWin = window.open('', '', 'height=800,width=800');
    printWin.document.write(html);
    printWin.document.close();
  };

  const statusColorMap = {
    "Pending": "amber",
    "In Transit": "cyan",
    "Completed": "emerald"
  };

  return (
    <DetailModalLayout isOpen={true} onClose={onClose} ariaLabel="Logistics Dispatch Inspector">
      
      {/* Universal Header */}
      <DetailModalHeader
        title={formData.location || `${job.type} Task`}
        id={job.id}
        badge={
          <StatusBadge 
            label={job.status || "Pending"} 
            variant={statusColorMap[job.status] || "default"} 
            size="sm" 
          />
        }
        subtitle={
          <>
            <span className="flex items-center">
              <Truck size={11} className="mr-1 text-primary" /> {job.type} Mission
            </span>
            <span>•</span>
            <span>Consignee: <strong className="text-on-surface">{formData.customer || 'Direct Request'}</strong></span>
            {formData.notified && (
              <>
                <span>•</span>
                <span className="text-emerald-400 font-bold flex items-center">
                  <ShieldCheck size={11} className="mr-1" /> Notified
                </span>
              </>
            )}
          </>
        }
        onClose={onClose}
      />

      {/* Main 2-Column Responsive Body */}
      <div className="flex-1 overflow-y-auto lg:grid lg:grid-cols-[1fr_420px] custom-scrollbar">
        
        {/* Left Column: Shipment Specs, Route Map Visualizer, Manifest Details */}
        <DetailModalContent>
          
          {/* Cargo Classification & Destination */}
          <DetailFieldGroup label="Cargo Classification & Item Type" icon={Package}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-wider">
                  Material Category
                </label>
                <select 
                  name="subType"
                  value={formData.subType}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
                >
                  <option value="">-- Select Category --</option>
                  <option value="Printed Canvas">Printed Canvas Roll</option>
                  <option value="Steel Supply">Steel Box Bar Supply</option>
                  <option value="Packaging Materials">Protective Packaging</option>
                  <option value="Finished Steel Frame">Finished Gallery-Wrap Frame</option>
                  <option value="Client Sample">Steel Frame Sample</option>
                  <option value="Waste Return">Material Scrap Return</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-wider">
                  Priority Dispatch
                </label>
                <select 
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
                >
                  <option value="Standard">Standard Priority</option>
                  <option value="Express">Express Rush (Same Day)</option>
                  <option value="Scheduled">Scheduled Drop-off</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-wider">
                Route Destination / Delivery Site Address
              </label>
              <div className="relative">
                <MapPin size={13} className="absolute left-3.5 top-3 text-primary" />
                <input 
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full pl-9 pr-4 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
                  placeholder="Provide full destination or client address"
                />
              </div>
            </div>
          </DetailFieldGroup>

          {/* Interactive Route Waypoint Visualizer */}
          <DetailFieldGroup 
            label="Live Route Waypoint Map" 
            icon={Navigation}
            badge={
              <span className="text-[10px] font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded border border-primary/20 flex items-center">
                <Clock size={10} className="mr-1" /> Est. ETA: 45 mins
              </span>
            }
          >
            <div className="p-4 bg-surface-container-low rounded-2xl border border-outline relative overflow-hidden">
              <div className="w-full h-32 bg-surface-container rounded-xl relative flex items-center justify-between px-8 border border-outline overflow-hidden">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#00daf3_1px,transparent_1px)] [background-size:16px_16px]" />
                
                {/* Node 1: Kadawatha Central Hub */}
                <div className="flex flex-col items-center relative z-10">
                  <div className="w-9 h-9 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary shadow-[0_0_15px_rgba(0,218,243,0.3)]">
                    <Truck size={14} />
                  </div>
                  <span className="text-[10px] font-bold text-on-surface mt-1.5">Kadawatha Hub</span>
                  <span className="text-[8px] font-mono text-primary">0 km (Origin)</span>
                </div>

                {/* Animated Waypoint Connection Track */}
                <div className="flex-1 mx-4 h-1 bg-surface-container-high rounded-full relative overflow-hidden border border-outline-variant/30">
                  <div className="absolute inset-y-0 left-0 bg-primary/80 w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
                </div>

                {/* Node 2: Client Destination */}
                <div className="flex flex-col items-center relative z-10">
                  <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center ${
                    job.status === "Completed" 
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "bg-surface-container-high border-outline-variant text-on-surface-variant"
                  }`}>
                    <MapPin size={14} />
                  </div>
                  <span className="text-[10px] font-bold text-on-surface mt-1.5 truncate max-w-[110px]">
                    {formData.location || 'Destination'}
                  </span>
                  <span className="text-[8px] font-mono text-on-surface-variant">Client Site</span>
                </div>
              </div>
            </div>
          </DetailFieldGroup>

          {/* Delivery Manifest & Waybill Slip */}
          <DetailFieldGroup label="Waybill Slip & Packaging Manifest" icon={FileText}>
            <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20 shrink-0">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-on-surface block truncate">
                    {formData.manifest || "Standard Waybill Document Generated"}
                  </span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">
                    Attached Waybill • Gate Pass Serial #WP-{job.id}
                  </span>
                </div>
              </div>
            </div>
          </DetailFieldGroup>

          {/* Special Transit Instructions */}
          <DetailFieldGroup label="Special Transit Instructions" icon={ShieldCheck}>
            <textarea
              name="specialNotes"
              value={formData.specialNotes}
              onChange={handleInputChange}
              rows={2}
              className="w-full p-3 bg-surface-container-highest/60 border border-outline rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
              placeholder="e.g. Fragile glass/canvas wrap, keep upright in lorry bed..."
            />
          </DetailFieldGroup>

        </DetailModalContent>

        {/* Right Column: Consignee Profile, Driver Assignment, Status Log, SMS Alert */}
        <DetailModalSidebar>
          
          {/* Consignee Card */}
          <DetailFieldGroup label="Consignee Information" icon={User}>
            <DetailCustomerCard
              customerName={formData.customer || 'Direct Request'}
              address={formData.location || 'Kadawatha Hub'}
            />
          </DetailFieldGroup>

          {/* Fleet & Crew Assignment */}
          <DetailFieldGroup label="Fleet & Driver Assignment" icon={Truck}>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1 tracking-wider">
                  Assigned Driver
                </label>
                <select 
                  name="driver"
                  value={formData.driver}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-surface-container-highest/60 border border-outline rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
                >
                  <option value="">-- Select Driver --</option>
                  <option value="Saman (Master Welder)">Saman (Master Welder)</option>
                  <option value="Kamal (Assistant)">Kamal (Assistant)</option>
                  <option value="Sunil (Driver)">Sunil (Driver)</option>
                  <option value="Nimal (Driver)">Nimal (Driver)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1 tracking-wider">
                  Assigned Vehicle
                </label>
                <select 
                  name="vehicle"
                  value={formData.vehicle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-surface-container-highest/60 border border-outline rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
                >
                  <option value="">-- Select Vehicle --</option>
                  <option value="Lorry (WP GE 1234)">Lorry (WP GE 1234)</option>
                  <option value="Van (WP LH 5678)">Van (WP LH 5678)</option>
                  <option value="Motorbike (WP XZ 9012)">Motorbike (WP XZ 9012)</option>
                </select>
              </div>
            </div>
          </DetailFieldGroup>

          {/* Milestone & Timeline Log */}
          <DetailFieldGroup label="Milestone & Duration Log" icon={Clock}>
            <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 bg-surface-container rounded-xl border border-outline">
                  <span className="text-[9px] uppercase font-bold text-on-surface-variant flex items-center mb-1">
                    <Calendar size={10} className="mr-1" /> Dispatched At
                  </span>
                  <span className="font-mono text-on-surface text-[11px] font-bold">
                    {job.startTime ? new Date(job.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                  </span>
                </div>
                <div className="p-2.5 bg-surface-container rounded-xl border border-outline">
                  <span className="text-[9px] uppercase font-bold text-on-surface-variant flex items-center mb-1">
                    <CheckCircle size={10} className="mr-1 text-emerald-400" /> Duration
                  </span>
                  <span className="font-mono text-primary font-bold text-[11px]">
                    {job.duration || 'In Progress'}
                  </span>
                </div>
              </div>
            </div>
          </DetailFieldGroup>

          {/* Client SMS / Dispatch Trigger */}
          <DetailFieldGroup label="Client Dispatch Alert" icon={Bell}>
            <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface">Client Transmission</span>
                {formData.notified ? (
                  <span className="flex items-center text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/20">
                    <ShieldCheck size={11} className="mr-1" /> Alert Sent
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">
                    Awaiting Trigger
                  </span>
                )}
              </div>

              {formData.lastNotifiedAt && (
                <div className="text-[10px] text-on-surface-variant font-mono">
                  Last transmission: {new Date(formData.lastNotifiedAt).toLocaleTimeString()}
                </div>
              )}

              <button
                type="button"
                onClick={handleNotifyClient}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold text-xs border border-primary/30 transition-all active:scale-95 shadow-[0_0_15px_rgba(0,218,243,0.1)]"
              >
                <Send size={12} />
                <span>Send Real-Time Dispatch Alert</span>
              </button>
            </div>
          </DetailFieldGroup>

        </DetailModalSidebar>

      </div>

      {/* Universal Footer */}
      <DetailModalFooter
        secondaryActions={
          <button
            type="button"
            onClick={printWaybill}
            className="px-4 py-2 bg-surface-container-high border border-outline-variant rounded-xl text-on-surface font-bold text-xs hover:bg-surface-variant transition-all flex items-center space-x-1.5 active:scale-95"
          >
            <Printer size={13} />
            <span>Print Waybill</span>
          </button>
        }
        onClose={onClose}
        closeText="Cancel"
        primaryActions={
          <button 
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs sm:text-sm hover:bg-primary/90 transition-all flex items-center space-x-1.5 shadow-[0_0_15px_rgba(0,218,243,0.2)] active:scale-95"
          >
            <Save size={14} />
            <span>Save Logistics Updates</span>
          </button>
        }
      />

    </DetailModalLayout>
  );
}
