import React, { useState } from 'react';
import { 
  Hammer, 
  User, 
  DollarSign, 
  Ruler, 
  Clock, 
  Check, 
  AlertCircle, 
  FileText, 
  Paperclip, 
  UploadCloud, 
  File, 
  Save, 
  Printer,
  ShieldCheck,
  X
} from 'lucide-react';
import FrameBlueprintPreview from '../common/FrameBlueprintPreview';
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
import { stripEmojis, sanitizeTechnicalScope } from '../../utils/validation';

export default function FabricationCardDetails({ 
  job, 
  onClose, 
  onSave, 
  customers = [] 
}) {
  const [form, setForm] = useState({
    title: job.title || '',
    materials: job.materials || '',
    note: job.note || '',
    assignee: job.assignee || '',
    flexReceived: job.flexReceived || false,
    blueprints: job.blueprints || [],
    frameWidth: job.frameWidth || (job.totalSqFt ? Math.round(Math.sqrt(job.totalSqFt * 144) * 25.4) : 900),
    frameHeight: job.frameHeight || (job.totalSqFt ? Math.round(Math.sqrt(job.totalSqFt * 144) * 25.4 * 0.67) : 600),
    frameDepth: job.frameDepth || 45,
  });

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const validFiles = files.filter(f => f.type.includes('image') || f.type.includes('pdf'));
    Promise.all(validFiles.map(f => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            name: f.name,
            type: f.type,
            size: f.size,
            data: e.target.result
          });
        };
        reader.readAsDataURL(f);
      });
    })).then(newFiles => {
      setForm(prev => ({
        ...prev,
        blueprints: [...prev.blueprints, ...newFiles]
      }));
      toast.success(`${newFiles.length} file(s) attached successfully!`);
    });
  };

  const removeBlueprint = (index) => {
    setForm(prev => ({
      ...prev,
      blueprints: prev.blueprints.filter((_, i) => i !== index)
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = () => {
    onSave({
      ...job,
      ...form,
      scope: sanitizeTechnicalScope(job.scope || "")
    });
    onClose();
  };

  const client = customers.find(c => c.nic === job.customerNic);
  const clientName = client?.name || job.customerName || "Direct Customer";
  const clientPhone = client?.phone || job.phone || "N/A";
  const clientNic = client?.nic || job.customerNic || "N/A";

  const printWorkOrder = () => {
    const dateStr = new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const html = `
      <html>
        <head>
          <title>Fabrication Work Order — ${job.jobNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=JetBrains+Mono:wght@400;700&display=swap');
            body { font-family: 'Outfit', sans-serif; color: #0f172a; padding: 40px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #00daf3; padding-bottom: 20px; }
            .badge { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
            .section { margin-top: 24px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
            .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 12px; letter-spacing: 0.05em; }
            .mono { font-family: 'JetBrains Mono', monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px; }
            th { background: #f1f5f9; font-weight: 800; font-size: 11px; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="margin:0; font-size: 22px; font-weight:800; color:#0f172a;">PRINT TO FRAME — WORKSHOP JOB TICKET</h1>
              <p style="margin:4px 0 0 0; color:#64748b; font-size:12px;">Steel Fabrication & Framing Assembly Division</p>
            </div>
            <div style="text-align:right;">
              <span class="badge">${job.status}</span>
              <p class="mono" style="font-size:16px; font-weight:800; margin:6px 0 0 0;">${job.jobNo}</p>
              <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">Date: ${dateStr}</p>
            </div>
          </div>

          <div class="grid" style="margin-top: 20px;">
            <div class="section">
              <div class="section-title">Client Details</div>
              <p style="margin:0; font-weight:800; font-size:15px;">${clientName}</p>
              <p style="margin:4px 0 0 0; font-size:13px; color:#475569;">NIC: <span class="mono">${clientNic}</span> | Phone: <span class="mono">${clientPhone}</span></p>
            </div>
            <div class="section">
              <div class="section-title">Production Targets</div>
              <p style="margin:0; font-size:13px; color:#475569;">Target Deadline: <strong style="color:#0f172a;">${job.deadline || 'TBA'}</strong></p>
              <p style="margin:4px 0 0 0; font-size:13px; color:#475569;">Assignee: <strong>${form.assignee || 'Unassigned'}</strong></p>
              <p style="margin:4px 0 0 0; font-size:13px; color:#475569;">Canvas Status: <strong>${form.flexReceived ? 'Physically Received' : 'Awaiting Component'}</strong></p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Technical Specifications & Scope</div>
            <p style="margin:0 0 8px 0; font-size: 14px; font-weight: bold;">${form.title || "Custom Framing Work"}</p>
            <div style="font-size:13px; line-height:1.6; color:#1e293b; white-space:pre-wrap; font-family: monospace;">
              ${stripEmojis(job.scope) || 'Standard custom gallery wrap frame.'}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Bill of Raw Materials</div>
            <p style="margin:0; font-size:13px; color:#334155; font-weight:600;">${form.materials || 'Standard Box Iron (1.5" x 1.5"), Corner Gussets, Anti-Rust Primer'}</p>
          </div>

          ${form.note ? `
          <div class="section" style="border-left: 4px solid #f59e0b;">
            <div class="section-title" style="color:#b45309;">Quality & Workshop Notes</div>
            <p style="margin:0; font-size:13px; color:#451a03; line-height:1.5;">${form.note}</p>
          </div>
          ` : ''}

          <div style="margin-top: 40px; display:flex; justify-content:space-between; border-top: 1px dashed #cbd5e1; padding-top: 20px;">
            <div>
              <p style="font-size:11px; color:#64748b; margin:0;">Fabricator Signature</p>
              <div style="margin-top:30px; border-bottom:1px solid #94a3b8; width:200px;"></div>
            </div>
            <div>
              <p style="font-size:11px; color:#64748b; margin:0;">Quality Inspector Sign-off</p>
              <div style="margin-top:30px; border-bottom:1px solid #94a3b8; width:200px;"></div>
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

  return (
    <DetailModalLayout isOpen={true} onClose={onClose} ariaLabel="Fabrication Work Order">
      
      {/* Universal Header */}
      <DetailModalHeader
        title={form.title || `Fabrication: ${job.jobNo}`}
        id={job.jobNo}
        badge={
          <StatusBadge status={job.status || "Pending"} size="sm" />
        }
        subtitle={
          <>
            <span>Client: <strong className="text-on-surface">{clientName}</strong></span>
            <span>•</span>
            <span className={form.flexReceived ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {form.flexReceived ? "✓ Canvas Received" : "⏳ Awaiting Canvas"}
            </span>
          </>
        }
        onClose={onClose}
      />

      {/* Main 2-Column Responsive Body */}
      <div className="flex-1 overflow-y-auto lg:grid lg:grid-cols-[1fr_420px] custom-scrollbar">
        
        {/* Left Column: Scope, CAD Blueprint, Steel Specs, Attachments */}
        <DetailModalContent>
          
          {/* Work Order Title & Scope */}
          <DetailFieldGroup label="Work Order Title & Scope" icon={FileText}>
            <div>
              <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">
                Item Title (Kanban Display Heading)
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Box Iron Frame (10' × 4')"
                className="w-full p-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">
                Scope & Requirements
              </label>
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline text-xs text-on-surface leading-relaxed font-medium whitespace-pre-wrap font-mono max-h-36 overflow-y-auto custom-scrollbar">
                {stripEmojis(job.scope) || "Custom steel framing and gallery canvas wrap fabrication."}
              </div>
            </div>
          </DetailFieldGroup>

          {/* Interactive CAD Structural Blueprint */}
          <DetailFieldGroup label="Interactive CAD Structural Blueprint" icon={Ruler}>
            <div className="p-4 bg-surface-container-low rounded-2xl border border-outline">
              <FrameBlueprintPreview
                width={Number(form.frameWidth) || 900}
                height={Number(form.frameHeight) || 600}
                depth={Number(form.frameDepth) || 45}
                material={form.materials || 'Box Iron'}
                unit="mm"
                showDimensions={true}
              />
              <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-outline">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1">Width (mm)</label>
                  <input
                    type="number"
                    name="frameWidth"
                    value={form.frameWidth}
                    onChange={handleChange}
                    className="w-full p-2 bg-surface-container-highest/60 border border-outline rounded-lg text-xs font-mono text-on-surface font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1">Height (mm)</label>
                  <input
                    type="number"
                    name="frameHeight"
                    value={form.frameHeight}
                    onChange={handleChange}
                    className="w-full p-2 bg-surface-container-highest/60 border border-outline rounded-lg text-xs font-mono text-on-surface font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1">Depth (mm)</label>
                  <input
                    type="number"
                    name="frameDepth"
                    value={form.frameDepth}
                    onChange={handleChange}
                    className="w-full p-2 bg-surface-container-highest/60 border border-outline rounded-lg text-xs font-mono text-on-surface font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </DetailFieldGroup>

          {/* Raw Materials Specification */}
          <DetailFieldGroup label="Raw Materials Specification" icon={ShieldCheck}>
            <input
              type="text"
              name="materials"
              value={form.materials}
              onChange={handleChange}
              placeholder="e.g. 1.5 inch Box Iron, Corner Brackets, Anti-Rust Primer"
              className="w-full p-3 bg-surface-container-highest/60 border border-outline rounded-xl text-sm text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </DetailFieldGroup>

          {/* File Attachments & CAD Blueprints */}
          <DetailFieldGroup label="Technical Blueprints & Attachments" icon={Paperclip}>
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer relative group ${
                isDragging 
                  ? 'border-primary bg-primary/10' 
                  : 'border-outline hover:bg-surface-container-low hover:border-primary/50'
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud size={24} className="mx-auto text-primary mb-1.5 opacity-80 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-on-surface block">
                Upload CAD Drawing, Sketch, or Cut Sheet
              </span>
              <span className="text-[10px] text-on-surface-variant mt-0.5 block">
                Drag and drop PDF / PNG / JPEG up to 10MB
              </span>
            </div>

            {form.blueprints.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {form.blueprints.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg border border-outline">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <File size={14} className="text-primary shrink-0" />
                      <span className="text-xs font-medium text-on-surface truncate" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlueprint(idx)}
                      className="p-1 text-on-surface-variant hover:text-error transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </DetailFieldGroup>

        </DetailModalContent>

        {/* Right Column: Customer Profile, Financials, Canvas Toggle, Assignee, Notes */}
        <DetailModalSidebar>
          
          {/* Customer Profile Widget */}
          <DetailFieldGroup label="Ordered By (Client Profile)" icon={User}>
            <DetailCustomerCard
              customerName={clientName}
              phone={clientPhone}
              company={client?.company}
              photoURL={client?.photoURL || client?.avatar}
              address={job.address || client?.address || "Pickup at Kadawatha Hub"}
            />
          </DetailFieldGroup>

          {/* Execution & Financial Summary */}
          <DetailFieldGroup label="Execution & Financial Summary" icon={DollarSign}>
            <div className="p-4 bg-surface-container-low rounded-2xl border border-outline space-y-3">
              <div>
                <span className="text-[9px] uppercase font-bold text-on-surface-variant block tracking-wider mb-0.5">Contract Value</span>
                <p className="text-xl font-mono font-black text-primary">
                  LKR {Number(job.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-outline">
                <div className="p-2.5 bg-surface-container rounded-xl border border-outline">
                  <span className="text-[9px] uppercase font-bold text-on-surface-variant block tracking-wider">Total Area</span>
                  <p className="text-xs font-mono font-bold text-on-surface flex items-center mt-0.5">
                    <Ruler size={11} className="mr-1 text-primary" /> {job.totalSqFt || 0} SqFt
                  </p>
                </div>
                <div className="p-2.5 bg-surface-container rounded-xl border border-outline">
                  <span className="text-[9px] uppercase font-bold text-on-surface-variant block tracking-wider">Deadline</span>
                  <p className="text-xs font-mono font-bold text-amber-400 flex items-center mt-0.5">
                    <Clock size={11} className="mr-1" /> {job.deadline || "TBA"}
                  </p>
                </div>
              </div>
            </div>
          </DetailFieldGroup>

          {/* Canvas Component Status Toggle */}
          <DetailFieldGroup label="Component Readiness" icon={Check}>
            <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-on-surface block">Printed Canvas Received</span>
                <span className="text-[10px] text-on-surface-variant block mt-0.5">Ready for gallery wrapping</span>
              </div>
              <input
                type="checkbox"
                name="flexReceived"
                checked={form.flexReceived}
                onChange={handleChange}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>
          </DetailFieldGroup>

          {/* Quality & Factory Notes */}
          <DetailFieldGroup label="Quality Assurance Notes" icon={AlertCircle}>
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              rows={2}
              className="w-full p-3 bg-surface-container-highest/60 border border-outline rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
              placeholder="Critical notes, weld inspection criteria, or special instructions..."
            />
          </DetailFieldGroup>

          {/* Work Order Assignee */}
          <DetailFieldGroup label="Factory Lead Assignee" icon={User}>
            <div className="flex bg-surface-container-highest/60 border border-outline rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/50">
              <div className="flex items-center px-3 bg-surface-container-high border-r border-outline-variant text-xs text-on-surface-variant">
                <User size={13} />
              </div>
              <input 
                type="text"
                name="assignee"
                value={form.assignee}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-transparent text-xs font-bold text-on-surface focus:outline-none"
                placeholder="e.g. Saman (Master Welder)"
              />
            </div>
          </DetailFieldGroup>

        </DetailModalSidebar>

      </div>

      {/* Universal Footer */}
      <DetailModalFooter
        secondaryActions={
          <button
            type="button"
            onClick={printWorkOrder}
            className="px-4 py-2 bg-surface-container-high border border-outline-variant rounded-xl text-on-surface font-bold text-xs hover:bg-surface-variant transition-all flex items-center space-x-1.5 active:scale-95"
          >
            <Printer size={13} />
            <span>Print Work Order</span>
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
            <span>Save Production Updates</span>
          </button>
        }
      />

    </DetailModalLayout>
  );
}
