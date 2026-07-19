import React, { useState } from 'react';
import { 
  Hammer, 
  X, 
  Shield, 
  Check, 
  Clock, 
  Flag, 
  LayoutDashboard, 
  User, 
  Phone, 
  DollarSign, 
  Ruler, 
  MessageSquare, 
  Copy, 
  Loader, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight,
  Save,
  AlertCircle,
  Truck,
  UploadCloud,
  Paperclip,
  File
} from 'lucide-react';
import { toast } from '../../utils/toast';
import Card from '../common/Card';
import DeleteModal from '../common/DeleteModal';

const STAGES = ["Pending", "Ongoing", "Ready For Inspection", "Revision", "Completed"];

const getCleanScopePreview = (scope) => {
  if (!scope) return "Custom steel framing work";
  
  // Clean up inline markdown formatting
  const cleanStr = (str) => str.replace(/[*#_`]/g, '').trim();

  // Check if it's a multi-line document or has markdown headings
  if (scope.includes('\n') || scope.includes('#')) {
    const lines = scope.split('\n').map(l => l.trim()).filter(Boolean);
    
    // 1. Look for specific items
    const itemLine = lines.find(l => {
      const lower = l.toLowerCase();
      return lower.includes('item 1:') || lower.includes('item:') || lower.includes('project:');
    });
    if (itemLine) {
      const clean = cleanStr(itemLine);
      return clean.length > 60 ? clean.slice(0, 60) + '...' : clean;
    }
    
    // 2. Look for any content line that is not a generic header or metadata
    const contentLine = lines.find(l => {
      const lower = l.toLowerCase();
      return !l.startsWith('#') && 
             !lower.includes('client information') && 
             !lower.startsWith('name:') && 
             !lower.startsWith('company:') && 
             !lower.startsWith('phone:') && 
             !lower.startsWith('email:') && 
             !lower.startsWith('project requirements:');
    });
    if (contentLine) {
      const clean = cleanStr(contentLine);
      return clean.length > 60 ? clean.slice(0, 60) + '...' : clean;
    }
    
    // 3. Fallback to first line
    const clean = cleanStr(lines[0]);
    return clean.length > 60 ? clean.slice(0, 60) + '...' : clean;
  }
  
  // Truncate if single line is too long
  if (scope.length > 60) {
    return cleanStr(scope.slice(0, 60)) + '...';
  }
  return cleanStr(scope);
};

function FabricationColumn({
  stage,
  items,
  onMove,
  onMoveBack,
  isFirstStage,
  isLastStage,
  onClientUpdate,
  updatingJobId,
  isGeneratingUpdate,
  onCardClick,
  onAddNew,
  isAdmin,
  onDelete,
}) {
  return (
    <div className="flex flex-col min-w-[320px] w-80 bg-surface-container-low/50 rounded-2xl border border-outline-variant/60 p-4 h-full">
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${
            stage === "Pending" ? "bg-yellow-500" : 
            stage === "Ongoing" ? "bg-primary text-on-primary" : 
            stage === "Ready For Inspection" ? "bg-primary/100" : 
            stage === "Revision" ? "bg-error text-on-error" : "bg-secondary text-on-secondary"
          }`} />
          <h3 className="font-bold text-on-surface uppercase tracking-wider text-xs">{stage}</h3>
          <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full text-[10px] font-bold">
            {items.length}
          </span>
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar">
        {items.map((job) => (
          <div
            key={job.jobNo}
            onClick={() => onCardClick(job)}
            className="bg-surface-container p-5 rounded-xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] transition-all group relative hover:shadow-[0_4px_25px_rgba(0,218,243,0.1)] hover:border-primary/30 cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="font-mono text-[10px] font-bold text-on-surface-variant">{job.jobNo}</span>
              {job.flexReceived ? (
                <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-md uppercase flex items-center">
                  <Check size={10} className="mr-1" /> Canvas In
                </span>
              ) : (
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md uppercase flex items-center">
                  <AlertCircle size={10} className="mr-1" /> Awaiting
                </span>
              )}
            </div>
            <h4 className="font-bold text-on-surface text-sm mb-1 group-hover:text-primary transition-colors">
              {getCleanScopePreview(job.scope)}
            </h4>
            <div className="flex items-center text-[10px] text-on-surface-variant mb-4">
              <User size={12} className="mr-1 opacity-50" />
              <span className="truncate max-w-[150px]">{job.customerName}</span>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-[10px] text-on-surface-variant">
                <Hammer size={12} className="mr-2 text-on-surface-variant" />
                <span className="truncate">{job.materials || "No materials specified"}</span>
              </div>
              <div className="flex items-center text-[10px] text-on-surface-variant">
                <Clock size={12} className="mr-2 text-indigo-400" />
                <span>
                  Target: <span className="font-bold text-on-surface">{job.deadline}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-4 h-9">
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClientUpdate(job);
                  }}
                  className={`p-1.5 rounded-lg transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)] ${
                    updatingJobId === job.jobNo 
                      ? "bg-primary text-on-primary" 
                      : "bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container border border-outline-variant/50"
                  }`}
                  title="Generate Client Update"
                >
                  {isGeneratingUpdate && updatingJobId === job.jobNo ? (
                    <Loader size={14} className="animate-spin" />
                  ) : (
                    <MessageSquare size={14} />
                  )}
                </button>
              </div>
              <div className="flex items-center space-x-2">
                {!isFirstStage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveBack(job.jobNo);
                    }}
                    className="p-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-primary/80 text-on-primary hover:text-on-surface transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                    title="Move back"
                  >
                    <ArrowLeft size={14} />
                  </button>
                )}
                {!isLastStage ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(job.jobNo);
                    }}
                    className={`p-1.5 rounded-lg text-on-surface transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)] flex items-center ${
                      stage === "Ready For Inspection"
                        ? "bg-secondary text-on-secondary hover:bg-secondary/80 text-on-primary"
                        : "bg-slate-300 text-slate-900 hover:bg-primary hover:text-on-primary"
                    }`}
                    title="Move to next stage"
                  >
                    {stage === "Ready For Inspection" ? <Check size={14} /> : <ArrowRight size={14} />}
                  </button>
                ) : (
                  <span className="bg-secondary/10 text-secondary p-1.5 rounded-lg border border-emerald-100">
                    <Check size={14} />
                  </span>
                )}
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(job.jobNo);
                    }}
                    className="p-1.5 rounded-lg bg-error/10 text-error hover:bg-error hover:text-on-error transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                    title="Delete Job (Admin Only)"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {isFirstStage && (
          <button
            onClick={onAddNew}
            className="w-full py-3 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant hover:text-primary hover:border-primary/30 hover:bg-primary/10/30 transition-all flex items-center justify-center space-x-2 group"
          >
            <Plus size={16} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-tight">Add New</span>
          </button>
        )}
      </div>
    </div>
  );
}

function WorkOrderModal({ job, onClose, onSave, customers }) {
  const [form, setForm] = useState({
    materials: job.materials || "",
    note: job.note || "",
    assignee: job.assignee || "",
    flexReceived: job.flexReceived || false,
    blueprints: job.blueprints || [],
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
            data: e.target.result // Base64 data
          });
        };
        reader.readAsDataURL(f);
      });
    })).then(results => {
      setForm(prev => ({
        ...prev,
        blueprints: [...prev.blueprints, ...results]
      }));
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
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = () => {
    onSave({ ...job, ...form });
  };

  const clientNic = job.clientNIC || job.customerNic;
  const client = customers?.find((c) => c.nic === clientNic);
  const clientName = client ? client.businessName || client.name : "Direct Order / Unknown";
  const clientPhone = client?.phone || "No contact found";

  return (
    <div className="fixed inset-0 bg-surface-container-highest/70 backdrop-blur-md flex items-center justify-center z-50 p-4 leading-relaxed overflow-hidden">
      <div className="bg-surface-container rounded-[40px] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] border border-outline-variant/60 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center px-10 py-8 border-b border-outline-variant/50 bg-surface-dim text-on-surface relative flex-shrink-0">
          <div className="flex items-center space-x-6 relative z-10">
            <div className="w-16 h-16 bg-primary text-on-primary rounded-2xl flex items-center justify-center ">
              <Hammer size={32} className="text-on-surface" />
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h2 className="text-3xl font-black font-mono tracking-tighter text-indigo-400 leading-none">
                  {job.jobNo}
                </h2>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  job.status === "Pending" ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" : 
                  job.status === "Ongoing" ? "bg-primary text-on-primary/20 text-indigo-400 border-primary/30" : 
                  job.status === "Ready For Inspection" ? "bg-primary/100/20 text-yellow-500 border-yellow-500/30" : 
                  job.status === "Revision" ? "bg-error/20 text-error border border-error/30" : 
                  "bg-secondary text-on-secondary/20 text-emerald-400 border-emerald-500/30"
                }`}>
                  {job.status || "Draft"}
                </span>
              </div>
              <div className="flex items-center space-x-4 mt-2">
                <p className="text-xs font-bold text-on-surface-variant flex items-center uppercase tracking-widest">
                  <LayoutDashboard size={14} className="mr-2" />
                  Active Fabrication Work Order
                </p>
                <span className="w-1.5 h-1.5 bg-surface-container-highest rounded-full" />
                <p className="text-xs font-bold text-indigo-300/80 uppercase tracking-widest leading-none">
                  Priority Production
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-surface-container/5 text-on-surface/50 rounded-2xl hover:bg-surface-container/10 hover:text-on-surface transition-all active:scale-90 relative z-10"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-surface-container-low relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-surface-container p-8 rounded-[32px] border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-12 h-12 bg-surface-container-low flex items-center justify-center rounded-bl-3xl border-l border-b border-outline-variant/50 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <User size={18} />
                </div>
                <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4">
                  Ordered By
                </h3>
                <p className="text-on-surface font-black text-xl leading-tight mb-2">
                  {clientName}
                </p>
                <div className="flex items-center space-x-2 text-primary font-bold text-xs bg-primary/10/50 w-fit px-3 py-1.5 rounded-lg border border-indigo-100/50">
                  <Phone size={12} />
                  <span>{clientPhone}</span>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant font-bold uppercase tracking-wider">Client NIC</span>
                    <span className="text-on-surface font-mono font-black">{clientNic || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant font-bold uppercase tracking-wider">Type</span>
                    <span className="text-on-surface font-black">{client?.type || "Standard"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-highest p-8 rounded-[32px] text-on-surface shadow-[0_10px_40px_rgba(0,218,243,0.2)] relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-primary/20 rotate-12 pointer-events-none">
                  <DollarSign size={100} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-6">
                    Execution Summary
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
                        Contract Value
                      </p>
                      <p className="text-3xl font-black">
                        LKR {job.value?.toLocaleString() || "0.00"}
                      </p>
                    </div>
                    <div className="flex space-x-6 pt-2">
                      <div>
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">
                          Total SqFt
                        </p>
                        <p className="text-lg font-bold flex items-center">
                          <Ruler size={14} className="mr-2 text-indigo-400" />
                          {job.totalSqFt || 0}
                        </p>
                      </div>
                      <div className="w-px h-10 bg-surface-container-high" />
                      <div>
                        <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">
                          Deadline
                        </p>
                        <p className="text-lg font-bold flex items-center">
                          <Clock size={14} className="mr-2 text-yellow-500" />
                          {job.deadline || "TBA"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary/10 border border-indigo-100 p-8 rounded-[32px] shadow-[0_4px_20px_rgba(0,218,243,0.05)]">
                <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 flex items-center">
                  <Truck size={14} className="mr-2 text-primary" />
                  Delivery Target
                </h3>
                <p className="text-on-surface font-bold text-sm leading-relaxed italic">
                  "{job.address || "Pickup at Hub"}"
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="bg-surface-container p-10 rounded-[40px] border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] relative">
                <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-6 flex items-center">
                  <Flag size={14} className="mr-2 text-primary" />
                  Detailed Job Scope
                </h3>
                <h2 className="text-3xl font-black text-on-surface leading-[1.1] mb-6">
                  {getCleanScopePreview(job.scope)}
                </h2>
                {job.scope && (job.scope.includes('\n') || job.scope.length > 60) && (
                  <div className="mb-6 p-6 bg-surface-container-low rounded-2xl border border-outline-variant/50 max-h-60 overflow-y-auto text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed custom-scrollbar font-medium">
                    {job.scope}
                  </div>
                )}
                <div className="h-0.5 w-20 bg-primary text-on-primary rounded-full mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 bg-surface-container-low rounded-[28px] border border-outline-variant/50">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-black text-on-surface flex items-center">
                        <Hammer size={16} className="mr-2 text-primary" />
                        Steel Specs
                      </h4>
                      <span className="text-[8px] font-black text-primary bg-primary/10 px-2 py-1 rounded-md uppercase tracking-widest border border-indigo-100">
                        Fabricator Input
                      </span>
                    </div>
                    <textarea
                      name="materials"
                      value={form.materials}
                      onChange={handleChange}
                      className="w-full p-4 bg-surface-container border border-outline-variant rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 h-32 resize-none text-on-surface transition-all shadow-inner"
                      placeholder="e.g. 1.2mm Box Bars, Zinc-Alum Priming, cut list..."
                    />
                  </div>

                  <div className="p-6 bg-primary/10/40 rounded-[28px] border border-yellow-500/30">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-black text-on-surface flex items-center">
                        <AlertCircle size={16} className="mr-2 text-yellow-500" />
                        Quality Notes
                      </h4>
                      <span className="text-[8px] font-black text-yellow-500 bg-primary/10 px-2 py-1 rounded-md uppercase tracking-widest border border-yellow-500/30">
                        Executive Note
                      </span>
                    </div>
                    <textarea
                      name="note"
                      value={form.note}
                      onChange={handleChange}
                      className="w-full p-4 bg-surface-container border border-primary/30/40 rounded-2xl text-sm italic focus:outline-none focus:ring-2 focus:ring-yellow-500/30 h-32 resize-none text-on-surface font-medium transition-all shadow-inner"
                      placeholder="Add critical manufacturing notes or client specific details..."
                    />
                  </div>
                </div>

                <div className={`mt-8 p-6 rounded-[32px] border transition-all flex items-center justify-between ${
                  form.flexReceived ? "bg-secondary/10 border-emerald-100" : "bg-surface-container-low border-outline-variant/50"
                }`}>
                  <div className="flex items-center space-x-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_4px_20px_rgba(0,218,243,0.05)] ${
                      form.flexReceived ? "bg-secondary text-on-secondary" : "bg-surface-container-high text-on-surface-variant"
                    }`}>
                      <FileTextIcon size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-on-surface leading-none mb-1">
                        Printed Material Status
                      </p>
                      <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">
                        {form.flexReceived ? "Material Physically Received" : "Awaiting Client Component"}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="flexReceived"
                      checked={form.flexReceived}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-secondary text-on-secondary shadow-inner" />
                  </label>
                </div>

                {/* Blueprints Drag and Drop Zone */}
                <div className="bg-surface-container p-8 rounded-[32px] border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] mt-8">
                  <h3 className="text-xs font-black text-on-surface flex items-center mb-4">
                    <Paperclip size={16} className="mr-2 text-primary" />
                    Material Blueprints & Drawings
                  </h3>
                  
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('blueprint-upload').click()}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isDragging ? 'border-primary bg-primary/10' : 'border-outline-variant hover:bg-surface-container-low hover:border-indigo-300'
                    }`}
                  >
                    <input
                      type="file"
                      id="blueprint-upload"
                      multiple
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                    <UploadCloud size={32} className={`mb-3 ${isDragging ? 'text-primary' : 'text-on-surface-variant'}`} />
                    <p className="text-sm font-bold text-on-surface">Drop blueprint files here or click to upload</p>
                    <p className="text-xs text-on-surface-variant mt-1">Supports PDF, JPG, PNG (Max 15MB)</p>
                  </div>

                  {form.blueprints && form.blueprints.length > 0 && (
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {form.blueprints.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/50 group">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="p-2 bg-surface-container rounded-lg text-primary shadow-[0_4px_20px_rgba(0,218,243,0.05)] shrink-0">
                              <File size={16} />
                            </div>
                            <span className="text-xs font-bold text-on-surface truncate" title={file.name}>
                              {file.name}
                            </span>
                          </div>
                          <div className="flex space-x-2 shrink-0">
                            <a
                              href={file.data}
                              download={file.name}
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                              title="Download"
                            >
                              <Check size={14} />
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeBlueprint(idx);
                              }}
                              className="p-1.5 text-on-surface-variant hover:text-error transition-colors"
                              title="Remove"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-surface-container p-8 rounded-[40px] border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <div className="flex items-center space-x-5">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center font-black">
                    <Check size={24} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest">
                      Work Order Assignee
                    </h3>
                    <p className="text-on-surface font-black text-lg">
                      {form.assignee || "Unassigned Factory Member"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/50">
                  <input
                    type="text"
                    name="assignee"
                    value={form.assignee}
                    onChange={handleChange}
                    className="bg-transparent border-none text-sm font-bold text-primary focus:outline-none placeholder:text-on-surface-variant px-2"
                    placeholder="Change Assignee..."
                  />
                  <div className="p-2 bg-surface-container rounded-xl shadow-[0_4px_20px_rgba(0,218,243,0.05)] text-primary">
                    <User size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-10 py-8 border-t border-outline-variant/50 bg-surface-container flex justify-between items-center flex-shrink-0">
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest leading-none">
            Confidential Internal Work Order — PTF / 2024
          </p>
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="px-8 py-4 border border-outline-variant rounded-2xl text-on-surface-variant font-black text-xs hover:bg-surface-container-low transition-all uppercase tracking-widest active:scale-95"
            >
              Close Without Saving
            </button>
            <button
              onClick={handleSave}
              className="px-10 py-4 bg-primary text-on-primary rounded-2xl font-black text-xs  hover:bg-primary/80 text-on-primary transition-all flex items-center space-x-3 uppercase tracking-widest active:scale-95"
            >
              <Save size={18} />
              <span>Save Production Updates</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple FileText icon component
function FileTextIcon({ size = 24, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

export default function FabricationWorks({ projects = [], setProjects, customers, partners, currentUser }) {
  const isAdmin = currentUser?.role === "Admin";
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [form, setForm] = useState({
    customerNic: "",
    partnerId: "",
    deadline: "",
    scope: "",
    materials: "",
    note: "",
    address: "",
    assignee: "",
    flexReceived: false,
    value: 0,
    totalSqFt: 0,
  });

  const [whatsappUpdate, setWhatsappUpdate] = useState("");
  const [updatingJobId, setUpdatingJobId] = useState(null);
  const [isGeneratingUpdate, setIsGeneratingUpdate] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState(null);

  const getClientDisplayName = (nic) => {
    const client = customers?.find((c) => c.nic === nic);
    return client ? (client.type === "Business" && client.businessName) || client.name : nic;
  };

  const handleCreateJob = () => {
    if (!form.customerNic || !form.scope) {
      toast.error("Please select a customer and specify basic details.");
      return;
    }
    const jobNo = `J-25-${String(projects.length + 1).padStart(3, "0")}`;
    const newJob = {
      ...form,
      jobNo,
      status: "Pending",
      customerName: getClientDisplayName(form.customerNic),
    };
    setProjects([newJob, ...projects]);
    setShowAddForm(false);
    setForm({
      customerNic: "",
      partnerId: "",
      deadline: "",
      scope: "",
      materials: "",
      note: "",
      address: "",
      assignee: "",
      flexReceived: false,
      value: 0,
      totalSqFt: 0,
    });
  };

  const handleMoveJob = (jobNo) => {
    setProjects(
      projects.map((job) => {
        if (job.jobNo !== jobNo) return job;
        const currentIdx = STAGES.indexOf(job.status);
        return currentIdx < STAGES.length - 1 ? { ...job, status: STAGES[currentIdx + 1] } : job;
      })
    );
  };

  const handleMoveJobBack = (jobNo) => {
    setProjects(
      projects.map((job) => {
        if (job.jobNo !== jobNo) return job;
        const currentIdx = STAGES.indexOf(job.status);
        return currentIdx > 0 ? { ...job, status: STAGES[currentIdx - 1] } : job;
      })
    );
  };

  const handleGenerateUpdate = async (job) => {
    if (updatingJobId === job.jobNo && whatsappUpdate) {
      setUpdatingJobId(null);
      setWhatsappUpdate("");
      return;
    }
    setUpdatingJobId(job.jobNo);
    setWhatsappUpdate("");
    setIsGeneratingUpdate(true);
    try {
      const prompt = `Draft a highly professional, polite WhatsApp update for "Print To Frame". Customer: ${job.customerName}, Job: ${job.jobNo} (${job.scope}), Status: ${job.status}. Deadline: ${job.deadline}. Make it friendly.`;
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (response.ok) {
        const data = await response.json();
        setWhatsappUpdate(data.text);
      } else {
        setWhatsappUpdate("Failed to generate update. Check API connection.");
      }
    } catch {
      setWhatsappUpdate("Failed to generate update. Please try again.");
    } finally {
      setIsGeneratingUpdate(false);
    }
  };

  const handleSaveJobUpdates = (updatedJob) => {
    setProjects(projects.map((p) => (p.jobNo === updatedJob.jobNo ? updatedJob : p)));
    setActiveJob(null);
  };

  const handleDeleteConfirm = () => {
    if (deletingJobId) {
      setProjects(projects.filter((p) => p.jobNo !== deletingJobId));
      setDeletingJobId(null);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Fabrication Works</h1>
          <p className="text-on-surface-variant text-sm">
            Managing specialist manufacturing from raw steel to finished gallery-wraps.
          </p>
          {whatsappUpdate && updatingJobId && (
            <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-2xl shadow-[0_8px_30px_rgba(0,218,243,0.15)] relative max-w-xl animate-in fade-in slide-in-from-top-1 duration-300 font-medium">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] uppercase font-bold text-primary tracking-widest flex items-center">
                  <MessageSquare size={12} className="mr-1.5" /> WhatsApp Update Draft
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(whatsappUpdate);
                      toast.success("Update copied!");
                    }}
                    className="p-1.5 bg-surface-container rounded-lg text-primary hover:bg-surface-container-low border border-indigo-100 shadow-[0_4px_20px_rgba(0,218,243,0.05)] transition-all active:scale-95"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setUpdatingJobId(null);
                      setWhatsappUpdate("");
                    }}
                    className="p-1.5 bg-surface-container rounded-lg text-on-surface-variant hover:text-on-surface-variant border border-outline-variant/50 transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-indigo-900 whitespace-pre-wrap leading-relaxed italic border-l-2 border-indigo-300 pl-4 py-1">
                {whatsappUpdate}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary text-on-primary hover:bg-primary/80 text-on-primary px-6 py-2.5 rounded-xl  font-bold text-sm transition-all active:scale-95 flex items-center space-x-2 shrink-0 shadow-[0_0_15px_rgba(0,218,243,0.15)] hover:shadow-[0_0_20px_rgba(0,218,243,0.3)]"
        >
          <Hammer size={18} />
          <span>New Job Request</span>
        </button>
      </div>

      <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar">
        <div className="flex space-x-6 h-full min-w-max">
          {STAGES.map((stage, idx) => (
            <FabricationColumn
              key={stage}
              stage={stage}
              items={projects.filter((p) => (p.status || "Pending") === stage)}
              onMove={handleMoveJob}
              onMoveBack={handleMoveJobBack}
              isFirstStage={idx === 0}
              isLastStage={idx === STAGES.length - 1}
              onClientUpdate={handleGenerateUpdate}
              updatingJobId={updatingJobId}
              isGeneratingUpdate={isGeneratingUpdate}
              onCardClick={setActiveJob}
              onAddNew={() => setShowAddForm(true)}
              isAdmin={isAdmin}
              onDelete={setDeletingJobId}
            />
          ))}
        </div>
      </div>

      {activeJob && (
        <WorkOrderModal
          job={activeJob}
          onClose={() => setActiveJob(null)}
          onSave={handleSaveJobUpdates}
          customers={customers}
        />
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-surface-container-highest/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 leading-relaxed">
          <div className="bg-surface-container rounded-3xl shadow-[0_0_50px_rgba(0,218,243,0.25)] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-outline-variant/50">
            <div className="px-8 py-6 border-b border-outline-variant/50 bg-surface-container-low/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-on-surface">New Custom Framing Job</h3>
                <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mt-1">
                  Specialist Work Order
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 bg-surface-container-high text-on-surface-variant rounded-full hover:bg-surface-variant transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <div
                  className="bg-primary/10 p-5 rounded-2xl border border-indigo-100 flex items-center justify-between group cursor-pointer hover:bg-primary/20 transition-all shadow-inner"
                  onClick={() => setForm({ ...form, flexReceived: !form.flexReceived })}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl transition-all ${form.flexReceived ? "bg-secondary text-on-secondary shadow-[0_8px_30px_rgba(0,218,243,0.15)]" : "bg-surface-container text-on-surface-variant border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)]"}`}>
                      <FileTextIcon size={20} />
                    </div>
                    <div>
                      <span className="block text-sm font-extrabold text-indigo-900">Printed Canvas In-Hand?</span>
                      <span className="block text-[10px] text-primary font-medium">
                        Auto-triggers material prep if already at hub
                      </span>
                    </div>
                  </div>
                  {form.flexReceived && <Check className="text-secondary" size={24} />}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                      Select Customer
                    </label>
                    <select
                      value={form.customerNic}
                      onChange={(e) => setForm({ ...form, customerNic: e.target.value })}
                      className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-surface-container font-medium"
                    >
                      <option value="">-- Choose Client --</option>
                      {customers?.map((c) => (
                        <option key={c.nic} value={c.nic}>
                          {c.type === "Business" ? String(c.businessName).toUpperCase() : c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                      Assignee
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-3.5 text-on-surface-variant" />
                      <input
                        type="text"
                        value={form.assignee}
                        onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                        className="w-full pl-9 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Saman / Kamal"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                    Canvas Dimensions & Title
                  </label>
                  <input
                    type="text"
                    value={form.scope}
                    onChange={(e) => setForm({ ...form, scope: e.target.value })}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. 3x4ft Mural Reproduction"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                      Installation Address
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. Colombo 07"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                      Total Job Value (LKR)
                    </label>
                    <input
                      type="number"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                      className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. 150000"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                      Total Area (SqFt)
                    </label>
                    <input
                      type="number"
                      value={form.totalSqFt}
                      onChange={(e) => setForm({ ...form, totalSqFt: parseFloat(e.target.value) || 0 })}
                      className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. 45"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                    Quality Assurance Instructions
                  </label>
                  <input
                    type="text"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="w-full p-4 bg-error/10 border border-error/30 rounded-xl text-sm italic text-on-surface"
                    placeholder="Important details for the maker..."
                  />
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-outline-variant/50 bg-surface-container-highest flex justify-end space-x-4">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-6 py-3 bg-surface-container-high text-on-surface rounded-2xl font-bold hover:bg-surface-container-highest transition-colors shadow-[0_8px_30px_rgba(0,218,243,0.15)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateJob}
                className="px-8 py-3 bg-surface-container text-on-surface rounded-2xl font-bold hover:bg-surface-container-high transition-all shadow-[0_10px_40px_rgba(0,218,243,0.2)] active:scale-95"
              >
                Generate Work Order
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal
        isOpen={!!deletingJobId}
        onClose={() => setDeletingJobId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Work Order?"
        message={`Are you sure you want to permanently delete job "${deletingJobId}"? This will stop all manufacturing and logistics tracking for this specific order.`}
      />
    </div>
  );
}
