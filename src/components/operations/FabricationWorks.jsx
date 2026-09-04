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
import FrameBlueprintPreview from '../common/FrameBlueprintPreview';
import FabricationCardDetails from './FabricationCardDetails';
import { PageHeader, FilterBar, StatusBadge, KanbanColumn, KanbanCard, ModalWrapper } from '../common/ui';
import { addDocument, updateDocument, deleteDocument, COLLECTIONS } from '../../services/firestoreSync';
import { stripEmojis, sanitizeTechnicalScope } from '../../utils/validation';

const STAGES = ["Pending", "Ongoing", "Ready For Inspection", "Revision", "Completed"];

const STAGE_COLORS = {
  "Pending": "amber",
  "Ongoing": "primary",
  "Ready For Inspection": "primary",
  "Revision": "rose",
  "Completed": "emerald"
};

const getFabricationTitle = (job) => {
  if (!job) return "Fabrication Work";

  // 1. Explicit short title / item name if provided
  if (job.title && job.title.trim()) {
    return stripEmojis(job.title).trim();
  }
  if (job.itemName && job.itemName.trim()) {
    return stripEmojis(job.itemName).trim();
  }

  const scope = job.scope || "";

  // 2. Extract dimensions if available in mm or ft/inches
  let dimensionStr = "";
  if (job.frameWidth && job.frameHeight) {
    // If mm, convert to ft/inches or display neatly
    if (job.frameWidth >= 100 && job.frameHeight >= 100) {
      const wFt = Math.round(job.frameWidth / 304.8 * 10) / 10;
      const hFt = Math.round(job.frameHeight / 304.8 * 10) / 10;
      dimensionStr = `${wFt}' × ${hFt}'`;
    } else {
      dimensionStr = `${job.frameWidth} × ${job.frameHeight}`;
    }
  } else if (job.totalSqFt && Number(job.totalSqFt) > 0) {
    dimensionStr = `${job.totalSqFt} sq.ft`;
  }

  // 3. Search for structural keywords in scope
  const cleanScope = stripEmojis(scope.replace(/[*#_`]/g, ' ')).trim();
  const lowerScope = cleanScope.toLowerCase();

  const structures = [
    { match: 'box iron', label: 'Box Iron Frame' },
    { match: 'steel frame', label: 'Steel Tube Frame' },
    { match: 'light box', label: 'Light Box Structure' },
    { match: 'lightbox', label: 'Light Box Structure' },
    { match: 'signboard', label: 'Signboard Frame' },
    { match: 'hoarding', label: 'Hoarding Structure' },
    { match: 'canvas wrap', label: 'Gallery Canvas Wrap' },
    { match: 'gallery wrap', label: 'Gallery Canvas Wrap' },
    { match: 'gi pipe', label: 'GI Pipe Frame' },
    { match: 'truss', label: 'Steel Truss Work' },
    { match: 'banner', label: 'Banner Frame' },
    { match: 'mural', label: 'Wall Mural Frame' }
  ];

  let detectedType = "";
  for (const s of structures) {
    if (lowerScope.includes(s.match)) {
      detectedType = s.label;
      break;
    }
  }

  // Check if explicit dimension pattern is inside scope text like 10x4ft, 3x2, 10' x 4'
  const dimRegex = /(\d+(?:\.\d+)?\s*(?:ft|'|m|mm|x|\*|by)\s*(?:x|\*|by)?\s*\d+(?:\.\d+)?\s*(?:ft|'|m|mm)?)/i;
  const matchDim = scope.match(dimRegex);
  if (!dimensionStr && matchDim) {
    dimensionStr = matchDim[1].replace(/\s+/g, ' ').trim();
  }

  if (detectedType && dimensionStr) {
    return `${detectedType} (${dimensionStr})`;
  }
  if (detectedType) {
    return detectedType;
  }
  if (dimensionStr) {
    return `Custom Frame (${dimensionStr})`;
  }

  // 4. Fallback: Parse first meaningful line/sentence without markdown or headers
  const lines = cleanScope.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      !lower.startsWith('client') &&
      !lower.startsWith('phone') &&
      !lower.startsWith('email') &&
      !lower.startsWith('name:') &&
      !lower.startsWith('project:') &&
      !lower.startsWith('date') &&
      line.length > 2
    ) {
      // Clean leading Item 1:, 1., -
      const cleanLine = line.replace(/^(item\s*\d*:|item:|\d+\.|-|\*)\s*/i, '').trim();
      if (cleanLine) {
        return cleanLine.length > 35 ? cleanLine.slice(0, 35) + '...' : cleanLine;
      }
    }
  }

  return "Custom Steel Frame";
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
    <KanbanColumn
      title={stage}
      count={items.length}
      stageColor={STAGE_COLORS[stage] || "primary"}
      onAddNew={isFirstStage ? onAddNew : null}
      addNewText="Add Job"
    >
      {items.map((job) => {
        const badges = (
          <>
            <span className="font-mono text-[10px] font-bold text-on-surface-variant tracking-wider">{job.jobNo}</span>
            {job.flexReceived ? (
              <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-md uppercase flex items-center border border-secondary/20">
                <Check size={10} className="mr-1" /> Canvas In
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md uppercase flex items-center border border-amber-400/20">
                <AlertCircle size={10} className="mr-1" /> Awaiting
              </span>
            )}
          </>
        );

        const subtitle = (
          <span className="flex items-center text-xs text-on-surface-variant">
            <User size={12} className="mr-1 opacity-60" />
            <span className="truncate max-w-[150px]">{job.customerName || 'Walk-in Client'}</span>
          </span>
        );

        const details = (
          <div className="space-y-1.5 mb-2">
            <div className="flex items-center text-[10px] text-on-surface-variant">
              <Hammer size={11} className="mr-1.5 text-on-surface-variant flex-shrink-0" />
              <span className="truncate">{job.materials || "Standard Steel Tube (1x1)"}</span>
            </div>
            {job.deadline && (
              <div className="flex items-center text-[10px] text-on-surface-variant">
                <Clock size={11} className="mr-1.5 text-primary/80 flex-shrink-0" />
                <span>
                  Target: <span className="font-bold text-on-surface">{job.deadline}</span>
                </span>
              </div>
            )}
          </div>
        );

        const customActions = (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClientUpdate(job);
            }}
            className={`p-1.5 rounded-lg transition-all border ${
              updatingJobId === job.jobNo 
                ? "bg-primary text-on-primary border-primary" 
                : "bg-surface-container-high text-on-surface-variant hover:text-primary hover:bg-surface-container border-outline-variant/60"
            }`}
            title="Generate AI WhatsApp Update"
          >
            {isGeneratingUpdate && updatingJobId === job.jobNo ? (
              <Loader size={13} className="animate-spin" />
            ) : (
              <MessageSquare size={13} />
            )}
          </button>
        );

        return (
          <KanbanCard
            key={job.jobNo}
            id={job.jobNo}
            title={getFabricationTitle(job)}
            subtitle={subtitle}
            badges={badges}
            details={details}
            customActions={customActions}
            onClick={() => onCardClick(job)}
            onMoveBack={() => onMoveBack(job.jobNo)}
            onMoveForward={() => onMove(job.jobNo)}
            onDelete={() => onDelete(job.jobNo)}
            isAdmin={isAdmin}
            isFirstStage={isFirstStage}
            isLastStage={isLastStage}
            moveForwardIcon={stage === "Ready For Inspection" ? <Check size={13} /> : <ArrowRight size={13} />}
            moveForwardTitle={stage === "Ready For Inspection" ? "Pass Inspection" : "Advance Stage"}
          />
        );
      })}
    </KanbanColumn>
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

export default function FabricationWorks({ 
  projects = [], 
  setProjects, 
  customers, 
  partners, 
  currentUser,
  onSaveInvoice 
}) {
  const isAdmin = currentUser?.role === "Admin";
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [form, setForm] = useState({
    title: "",
    clientNIC: "",
    scope: "",
    status: "Pending",
    deadline: "",
    address: "",
    materials: "",
    note: "",
    assignee: "",
    flexReceived: false,
    value: 0,
    totalSqFt: 0,
    frameWidth: 0,
    frameHeight: 0,
  });

  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [deletingJobId, setDeletingJobId] = useState(null);

  // Client WhatsApp Update message state
  const [isGeneratingUpdate, setIsGeneratingUpdate] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState(null);
  const [whatsappUpdate, setWhatsappUpdate] = useState("");
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const handleAddNew = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.scope.trim()) {
      toast.error("Please provide at least a brief scope for the fabrication job.");
      return;
    }
    const jobNo = `PTF-${String(Date.now()).slice(-4)}`;
    const now = new Date().toISOString();
    const newJob = {
      jobNo: jobNo,
      title: form.title,
      clientNIC: form.clientNIC || "Direct Customer",
      scope: sanitizeTechnicalScope(form.scope) || "Custom steel framing work",
      status: "Pending",
      stageEnteredAt: now,
      deadline: form.deadline || now.split("T")[0],
      address: stripEmojis(form.address) || "Pickup at Colombo Hub",
      materials: form.materials,
      note: form.note,
      assignee: form.assignee,
      flexReceived: form.flexReceived,
      value: Number(form.value) || 0,
      totalSqFt: Number(form.totalSqFt) || 0,
      frameWidth: Number(form.frameWidth) || 0,
      frameHeight: Number(form.frameHeight) || 0,
      createdAt: now,
    };
    setProjects([newJob, ...projects]);
    setShowAddForm(false);
    setForm({
      title: "",
      clientNIC: "",
      scope: "",
      status: "Pending",
      deadline: "",
      address: "",
      materials: "",
      note: "",
      assignee: "",
      flexReceived: false,
      value: 0,
      totalSqFt: 0,
      frameWidth: 0,
      frameHeight: 0,
    });
    
    try {
      await addDocument(COLLECTIONS.PROJECTS, newJob, jobNo);
      toast.success(`Job ${jobNo} queued to production floor`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to sync new fabrication job to DB");
    }
  };

  const handleMoveJob = async (jobNo) => {
    let updatedJobObj = null;
    let nextStatusStr = null;
    const now = new Date().toISOString();

    setProjects(
      projects.map((job) => {
        if (job.jobNo !== jobNo) return job;
        const currentIdx = STAGES.indexOf(job.status || "Pending");
        if (currentIdx < STAGES.length - 1) {
          nextStatusStr = STAGES[currentIdx + 1];
          updatedJobObj = { ...job, status: nextStatusStr, stageEnteredAt: now };

          // Item 17: Auto-linkage from Completed Job to Final 25% Invoice
          if (nextStatusStr === "Completed" && onSaveInvoice && (Number(job.value) || 0) > 0) {
            const invId = `FIN-${String(Date.now()).slice(-6)}`;
            const cust = customers?.find(c => c.nic === job.clientNIC);
            const custName = cust?.name || cust?.businessName || job.customerName || "Direct Customer";
            
            onSaveInvoice({
              id: invId,
              linkedJobNo: job.jobNo,
              customerName: custName,
              company: cust?.businessName || "",
              date: now.split("T")[0],
              amount: (Number(job.value) || 0) * 0.25,
              totalValue: Number(job.value) || 0,
              type: 'Final',
              status: 'Unpaid',
              aiDraft: `Final Settlement (25% Balance) upon completion of ${job.jobNo} — ${job.scope || 'Custom steel framing'}.`,
              dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
            });

            toast.success(`Job ${job.jobNo} Completed!`, {
              description: '25% Final Settlement Invoice generated & linked in Invoices.'
            });
          }

          return updatedJobObj;
        }
        return job;
      })
    );

    if (updatedJobObj) {
      try {
        await updateDocument(COLLECTIONS.PROJECTS, updatedJobObj._firestoreId || updatedJobObj.jobNo, updatedJobObj);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleMoveJobBack = async (jobNo) => {
    let updatedJobObj = null;

    setProjects(
      projects.map((job) => {
        if (job.jobNo !== jobNo) return job;
        const currentIdx = STAGES.indexOf(job.status || "Pending");
        if (currentIdx > 0) {
          updatedJobObj = { ...job, status: STAGES[currentIdx - 1] };
          return updatedJobObj;
        }
        return job;
      })
    );

    if (updatedJobObj) {
      try {
        await updateDocument(COLLECTIONS.PROJECTS, updatedJobObj._firestoreId || updatedJobObj.jobNo, updatedJobObj);
      } catch (err) {
        console.error(err);
      }
    }
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

  const handleSaveJobUpdates = async (updatedJob) => {
    setProjects(projects.map((p) => (p.jobNo === updatedJob.jobNo ? updatedJob : p)));
    setActiveJob(null);
    try {
      await updateDocument(COLLECTIONS.PROJECTS, updatedJob._firestoreId || updatedJob.jobNo, updatedJob);
    } catch (err) {
      console.error(err);
      toast.error("Failed to sync project updates");
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingJobId) {
      const targetJob = projects.find((p) => p.jobNo === deletingJobId);
      setProjects(projects.filter((p) => p.jobNo !== deletingJobId));
      setDeletingJobId(null);
      if (targetJob) {
        try {
          await deleteDocument(COLLECTIONS.PROJECTS, targetJob._firestoreId || targetJob.jobNo);
          toast.success("Fabrication job deleted successfully");
        } catch (err) {
          console.error(err);
          toast.error("Failed to delete fabrication job from DB");
        }
      }
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('ALL');

  const filteredProjects = projects.filter((job) => {
    const title = getFabricationTitle(job);
    const matchesSearch = !searchQuery ||
      (job.jobNo && job.jobNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.customerName && job.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.title && job.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (title && title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.materials && job.materials.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.scope && job.scope.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.deadline && job.deadline.toLowerCase().includes(searchQuery.toLowerCase()));
    const jobStage = job.status || "Pending";
    const matchesStage = filterStage === 'ALL' || jobStage === filterStage;
    return matchesSearch && matchesStage;
  });

  const filterOptions = [
    { id: 'ALL', label: 'All Jobs', count: projects.length },
    ...STAGES.map(stg => ({
      id: stg,
      label: stg,
      count: projects.filter(p => (p.status || "Pending") === stg).length
    }))
  ];

  const ongoingCount = projects.filter(p => p.status === "Ongoing").length;
  const readyCount = projects.filter(p => p.status === "Ready For Inspection").length;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Unified Page Header */}
      <PageHeader
        title="Fabrication Works"
        subtitle="Manage specialist manufacturing from raw steel fabrication to finished gallery-wraps."
        metrics={[
          { label: "Ongoing", value: ongoingCount, color: "primary" },
          { label: "Ready Inspection", value: readyCount, color: readyCount > 0 ? "secondary" : "default" },
          { label: "Total Active", value: projects.length, color: "default" }
        ]}
        actions={
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary text-on-primary hover:bg-primary/90 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 flex items-center space-x-1.5 shadow-[0_0_15px_rgba(0,218,243,0.2)]"
          >
            <Hammer size={16} />
            <span>New Job Request</span>
          </button>
        }
      />

      {/* AI WhatsApp Draft banner if active */}
      {whatsappUpdate && updatingJobId && (
        <div className="mb-4 p-4 bg-surface-container border border-primary/40 rounded-2xl shadow-[0_4px_20px_rgba(0,218,243,0.1)] relative max-w-2xl animate-in fade-in slide-in-from-top-1 duration-300 font-medium">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-bold text-primary tracking-widest flex items-center">
              <MessageSquare size={12} className="mr-1.5" /> AI WhatsApp Update Draft
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(whatsappUpdate);
                  toast.success("Update copied to clipboard!");
                }}
                className="p-1.5 bg-surface-container-high rounded-lg text-primary hover:bg-primary/10 border border-primary/20 transition-all active:scale-95"
                title="Copy to clipboard"
              >
                <Copy size={15} />
              </button>
              <button
                onClick={() => {
                  setUpdatingJobId(null);
                  setWhatsappUpdate("");
                }}
                className="p-1.5 bg-surface-container-high rounded-lg text-on-surface-variant hover:text-on-surface border border-outline-variant/50 transition-all"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>
          <p className="text-xs text-on-surface whitespace-pre-wrap leading-relaxed italic border-l-2 border-primary/40 pl-3 py-1 bg-surface-container-low/50 rounded-r-lg">
            {whatsappUpdate}
          </p>
        </div>
      )}

      {/* Unified Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search jobs by #ID, client, materials, scope..."
        activeFilter={filterStage}
        onFilterChange={setFilterStage}
        filterOptions={filterOptions}
        totalCount={projects.length}
        filteredCount={filteredProjects.length}
      />

      {/* Kanban Board Columns */}
      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
        <div className="flex space-x-3 sm:space-x-5 h-full min-w-max">
          {STAGES.filter(stage => filterStage === 'ALL' || filterStage === stage).map((stage, idx) => (
            <FabricationColumn
              key={stage}
              stage={stage}
              items={filteredProjects.filter((p) => (p.status || "Pending") === stage)}
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
        <FabricationCardDetails
          job={activeJob}
          onClose={() => setActiveJob(null)}
          onSave={handleSaveJobUpdates}
          customers={customers}
        />
      )}

      {showAddForm && (
        <ModalWrapper
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          maxWidth="max-w-2xl"
          height="h-[90vh] max-h-[820px]"
          ariaLabel="New Custom Framing Job"
        >
          <div className="px-6 py-5 border-b border-outline-variant bg-surface-container-low flex justify-between items-center flex-shrink-0">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-on-surface">New Custom Framing Job</h3>
              <p className="text-[10px] uppercase font-bold text-primary tracking-widest mt-0.5">
                Specialist Work Order
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-2 bg-surface-container-high text-on-surface-variant rounded-full hover:bg-surface-variant transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
            <div
              className="bg-primary/10 p-5 rounded-2xl border border-primary/20 flex items-center justify-between group cursor-pointer hover:bg-primary/15 transition-all shadow-inner"
              onClick={() => setForm({ ...form, flexReceived: !form.flexReceived })}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl transition-all ${form.flexReceived ? "bg-secondary text-on-secondary shadow-md" : "bg-surface-container text-on-surface-variant border border-outline-variant"}`}>
                  <Paperclip size={20} />
                </div>
                <div>
                  <span className="block text-sm font-extrabold text-on-surface">Printed Canvas In-Hand?</span>
                  <span className="block text-[10px] text-primary font-medium">
                    Auto-triggers material prep if already at hub
                  </span>
                </div>
              </div>
              {form.flexReceived && <Check className="text-secondary" size={24} />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                  Select Customer
                </label>
                <select
                  value={form.customerNic}
                  onChange={(e) => setForm({ ...form, customerNic: e.target.value })}
                  className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-surface-container font-medium text-on-surface"
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
                    className="w-full pl-9 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
                    placeholder="Saman / Kamal"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                Work Order Item Title (Short & Clear)
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-semibold text-on-surface"
                placeholder="e.g. Box Iron Frame (10' × 4') or Light Box Signboard"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                Detailed Scope & Job Notes
              </label>
              <textarea
                rows={2}
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
                placeholder="e.g. 1.5 inch Box Iron with corner brackets, anti-rust primer and black finish"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                  Deadline
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
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
                  className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
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
                  className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
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
                  className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
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
                className="w-full p-3 bg-error/10 border border-error/30 rounded-xl text-sm italic text-on-surface focus:outline-none focus:ring-2 focus:ring-error/50"
                placeholder="Important details for the maker..."
              />
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t border-outline-variant bg-surface-container-low flex justify-end space-x-3 flex-shrink-0">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-5 py-2.5 bg-surface-container-high text-on-surface rounded-xl font-bold text-xs hover:bg-surface-container-highest transition-colors border border-outline-variant/60"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNew}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(0,218,243,0.2)] active:scale-95"
            >
              Generate Work Order
            </button>
          </div>
        </ModalWrapper>
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
