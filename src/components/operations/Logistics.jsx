import React, { useState } from 'react';
import { Truck, MapPin, Download, Loader, Trash2, ArrowLeft, ArrowRight, Check, X, FileText, Plus, Upload, Bell, User, Clock } from 'lucide-react';
import { toast } from '../../utils/toast';
import Card from '../common/Card';
import DeleteModal from '../common/DeleteModal';
import LogisticsCardDetails from './LogisticsCardDetails';
import { PageHeader, FilterBar, StatusBadge, KanbanColumn, KanbanCard, ModalWrapper } from '../common/ui';
import { addDocument, updateDocument, deleteDocument, COLLECTIONS } from '../../services/firestoreSync';

const STAGES = ["Pending", "In Transit", "Completed"];

const STAGE_COLORS = {
  "Pending": "amber",
  "In Transit": "primary",
  "Completed": "emerald"
};

const getDriverShort = (name) => {
  if (!name) return "";
  return name.split(' ')[0];
};

const getVehicleShort = (v) => {
  if (!v) return "";
  if (v.includes('(')) {
    return v.split('(')[1].replace(')', '');
  }
  return v;
};

function LogisticsColumn({
  stage,
  items,
  onMove,
  onMoveBack,
  isFirstStage,
  isLastStage,
  onAddNew,
  isAdmin,
  onDelete,
  onCardClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggedJobId
}) {
  return (
    <KanbanColumn
      title={stage}
      count={items.length}
      stageColor={STAGE_COLORS[stage] || "primary"}
      onAddNew={isFirstStage ? onAddNew : null}
      addNewText="Add Task"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, null, stage)}
    >
      {items.map((job) => {
        const badges = (
          <>
            <div className="flex items-center space-x-1.5">
              {job.status === "In Transit" && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
              <span className="font-mono text-[10px] font-bold text-on-surface-variant">{job.id}</span>
              {job.notified && (
                <span className="text-secondary flex items-center" title="Client Notified">
                  <Bell size={11} className="fill-emerald-500 animate-bounce" />
                </span>
              )}
            </div>
            {job.customer && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase max-w-[120px] truncate border border-primary/20">
                {job.customer}
              </span>
            )}
          </>
        );

        const subtitle = (
          <span className="flex items-center text-xs text-on-surface-variant">
            <Truck size={12} className="mr-1.5 opacity-60" />
            {job.subType || 'General Freight'}
          </span>
        );

        const details = (
          <>
            {(job.driver || job.vehicle) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {job.driver && (
                  <span className="inline-flex items-center text-[9px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant/50 font-bold uppercase tracking-tight">
                    <User size={10} className="mr-1 text-on-surface-variant" />
                    {getDriverShort(job.driver)}
                  </span>
                )}
                {job.vehicle && (
                  <span className="inline-flex items-center text-[9px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant/50 font-bold uppercase tracking-tight">
                    <Truck size={10} className="mr-1 text-on-surface-variant" />
                    {getVehicleShort(job.vehicle)}
                  </span>
                )}
              </div>
            )}
            {job.manifest && (
              <div className="p-1.5 bg-surface-container-high rounded border border-outline-variant flex items-center text-[10px] text-on-surface-variant">
                <FileText size={12} className="mr-1.5 text-on-surface-variant flex-shrink-0" />
                <span className="truncate font-medium">{job.manifest}</span>
              </div>
            )}
          </>
        );

        const metrics = (
          <div className="flex items-center text-[10px] uppercase font-bold tracking-wide">
            {job.status === "Completed" && (
              <span className="flex items-center bg-secondary/10 text-secondary px-2 py-0.5 rounded border border-secondary/30">
                <Clock size={11} className="mr-1 text-secondary" />
                {job.duration || "Delivered"}
              </span>
            )}
            {job.status === "In Transit" && job.startTime && (
              <span className="flex items-center text-on-surface-variant font-mono">
                Started: {new Date(job.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {job.status === "Pending" && (
              <span className="text-amber-400 text-[10px] font-bold">Awaiting Dispatch</span>
            )}
          </div>
        );

        return (
          <KanbanCard
            key={job.id}
            id={job.id}
            title={job.location || 'Site Location TBD'}
            subtitle={subtitle}
            badges={badges}
            details={details}
            metrics={metrics}
            draggable
            isDragging={draggedJobId === job.id}
            onDragStart={(e) => onDragStart(e, job.id)}
            onDragEnd={onDragEnd}
            onClick={() => onCardClick(job)}
            onMoveBack={() => onMoveBack(job.id)}
            onMoveForward={() => onMove(job.id)}
            onDelete={() => onDelete(job.id)}
            isAdmin={isAdmin}
            isFirstStage={isFirstStage}
            isLastStage={isLastStage}
            moveForwardIcon={stage === "In Transit" ? <Check size={13} /> : <ArrowRight size={13} />}
            moveForwardTitle={stage === "Pending" ? "Dispatch Driver" : "Complete Task"}
          />
        );
      })}
    </KanbanColumn>
  );
}

// Simple clock icon for duration display
function ClockIcon({ size = 14, className = "" }) {
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function Logistics({ jobs = [], setJobs, currentUser }) {
  const isAdmin = currentUser?.role === "Admin";
  const [activeSubTab, setActiveSubTab] = useState("pickup");
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [aiSequence, setAiSequence] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [form, setForm] = useState({
    subType: "",
    location: "",
    manifest: null,
    customer: "",
    driver: "",
    vehicle: ""
  });
  const [deletingJobId, setDeletingJobId] = useState(null);
  const [draggedJobId, setDraggedJobId] = useState(null);

  // Drag & Drop handlers
  const handleDragStart = (e, id) => {
    setDraggedJobId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedJobId(null);
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetJobId, targetStage) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData("text/plain") || draggedJobId;
    if (!jobId || jobId === targetJobId) return;

    const draggedJobIndex = jobs.findIndex((j) => j.id === jobId);
    if (draggedJobIndex === -1) return;

    const draggedJob = jobs[draggedJobIndex];
    let updatedJob = { ...draggedJob };

    if (draggedJob.status !== targetStage) {
      updatedJob.status = targetStage;
      if (targetStage === "In Transit") {
        updatedJob.startTime = new Date().toISOString();
      } else if (targetStage === "Completed") {
        const endTime = new Date();
        const startTime = draggedJob.startTime ? new Date(draggedJob.startTime) : endTime;
        const diffMs = endTime - startTime;
        const hours = Math.floor(diffMs / 3600000);
        const mins = Math.round((diffMs % 3600000) / 60000);
        updatedJob.endTime = endTime.toISOString();
        updatedJob.duration = `${hours}h ${mins}m`;
        toast.success(`${updatedJob.type} Job ${updatedJob.id} completed!`, {
          description: `Duration: ${hours}h ${mins}m`,
        });
      } else if (targetStage === "Pending") {
        updatedJob.startTime = null;
        updatedJob.endTime = null;
        updatedJob.duration = null;
      }
    }

    let updatedJobObj = null;
    let nextStageStr = null;
    
    setJobs(prev => {
      const updatedJobsList = prev.filter((j) => j.id !== jobId);
      if (targetJobId) {
        const targetIndex = updatedJobsList.findIndex((j) => j.id === targetJobId);
        updatedJobsList.splice(targetIndex, 0, updatedJob);
      } else {
        updatedJobsList.push(updatedJob);
      }
      return updatedJobsList;
    });

    try {
      updateDocument(COLLECTIONS.LOGISTICS, updatedJob._firestoreId || updatedJob.id, updatedJob);
    } catch(err) {
      console.error(err);
    }
    
    setDraggedJobId(null);
  };

  // Mock function to simulate the Mo AI route suggestion
  const callAIInsights = async (prompt) => {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.text;
      }
    } catch (err) {
      console.error(err);
    }
    return "Optimize route manually. Direct Route: Kadawatha -> Peliyagoda -> Colombo.";
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setForm({ ...form, manifest: e.target.files[0].name });
    }
  };

  const handleAddJob = async () => {
    if (!form.location) return;
    const jobId = `${activeSubTab === "pickup" ? "L-PK" : "L-DL"}-${String(jobs.length + 1).padStart(3, "0")}`;
    const newJob = {
      id: jobId,
      type: activeSubTab === "pickup" ? "Pickup" : "Delivery",
      subType: form.subType || (activeSubTab === "pickup" ? "Printed Canvas" : "Finished Steel Frame"),
      location: form.location,
      customer: form.customer || "Direct Request",
      status: "Pending",
      startTime: null,
      endTime: null,
      duration: null,
      manifest: form.manifest,
      driver: form.driver || "",
      vehicle: form.vehicle || "",
      notified: false,
      lastNotifiedAt: null
    };
    setJobs([newJob, ...jobs]);
    setForm({ subType: "", location: "", manifest: null, customer: "", driver: "", vehicle: "" });
    setShowAddForm(false);
    
    try {
      await addDocument(COLLECTIONS.LOGISTICS, newJob, jobId);
    } catch (err) {
      console.error(err);
      toast.error("Failed to sync new job to DB");
    }
  };

  const handleMoveJob = async (id) => {
    let updatedJobObj = null;

    setJobs(prev => prev.map((job) => {
        if (job.id !== id) return job;
        const currentIdx = STAGES.indexOf(job.status);
        if (currentIdx === STAGES.length - 1) return job;
        const nextStatus = STAGES[currentIdx + 1];
        let updates = { status: nextStatus };
        if (nextStatus === "In Transit") {
          updates.startTime = new Date().toISOString();
        } else if (nextStatus === "Completed") {
          const endTime = new Date();
          const startTime = job.startTime ? new Date(job.startTime) : endTime;
          const diffMs = endTime - startTime;
          const hours = Math.floor(diffMs / 3600000);
          const mins = Math.round((diffMs % 3600000) / 60000);
          updates.endTime = endTime.toISOString();
          updates.duration = `${hours}h ${mins}m`;
          toast.success(`${job.type} Job ${job.id} completed!`, {
            description: `Duration: ${hours}h ${mins}m`,
          });
        }
        updatedJobObj = { ...job, ...updates };
        return updatedJobObj;
    }));

    if (updatedJobObj) {
      try {
        await updateDocument(COLLECTIONS.LOGISTICS, updatedJobObj._firestoreId || updatedJobObj.id, updatedJobObj);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleMoveJobBack = async (id) => {
    let updatedJobObj = null;

    setJobs(prev => prev.map((job) => {
        if (job.id !== id) return job;
        const currentIdx = STAGES.indexOf(job.status);
        if (currentIdx === 0) return job;
        const prevStatus = STAGES[currentIdx - 1];
        let updates = { status: prevStatus };
        if (prevStatus === "Pending") {
          updates.startTime = null;
        } else if (prevStatus === "In Transit") {
          updates.endTime = null;
          updates.duration = null;
        }
        updatedJobObj = { ...job, ...updates };
        return updatedJobObj;
    }));

    if (updatedJobObj) {
      try {
        await updateDocument(COLLECTIONS.LOGISTICS, updatedJobObj._firestoreId || updatedJobObj.id, updatedJobObj);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingJobId) {
      const targetJob = jobs.find(j => j.id === deletingJobId);
      setJobs(prev => prev.filter((j) => j.id !== deletingJobId));
      setDeletingJobId(null);
      if (targetJob) {
        try {
          await deleteDocument(COLLECTIONS.LOGISTICS, targetJob._firestoreId || targetJob.id);
          toast.success("Job deleted successfully");
        } catch (err) {
          console.error(err);
          toast.error("Failed to delete job from DB");
        }
      }
    }
  };

  const handleOptimizeRoute = async () => {
    const locations = jobs
      .filter((j) => j.status === "Pending" && j.type.toLowerCase() === activeSubTab)
      .map((j) => j.location)
      .join(", ");
    if (!locations) {
      setAiSequence(`No pending ${activeSubTab}s to optimize.`);
      return;
    }
    setIsOptimizing(true);
    setAiSequence("");
    try {
      const prompt = `Hub Location: Kadawatha. Locations to visit for ${activeSubTab}: ${locations}. Suggest an efficient route and list them in order.`;
      const result = await callAIInsights(prompt);
      setAiSequence(result);
    } catch {
      setAiSequence("Failed to optimize routes. Please try again.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('ALL');

  const baseJobs = jobs.filter((job) =>
    activeSubTab === "pickup" ? job.type === "Pickup" : job.type === "Delivery"
  );

  const filteredJobs = baseJobs.filter((job) => {
    const matchesSearch = !searchQuery ||
      (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.customer && job.customer.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.id && job.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.driver && job.driver.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.subType && job.subType.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStage = filterStage === 'ALL' || job.status === filterStage;
    return matchesSearch && matchesStage;
  });

  const filterOptions = [
    { id: 'ALL', label: 'All Statuses', count: baseJobs.length },
    ...STAGES.map(stg => ({
      id: stg,
      label: stg,
      count: baseJobs.filter(j => j.status === stg).length
    }))
  ];

  const inTransitCount = baseJobs.filter(j => j.status === "In Transit").length;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Unified Page Header */}
      <PageHeader
        title="Logistics"
        subtitle="Manage dispatch schedules, driver allocations, material pickups, and customer deliveries."
        metrics={[
          { label: "Active Mode", value: activeSubTab === "pickup" ? "Pickups" : "Deliveries", color: activeSubTab === "pickup" ? "primary" : "secondary" },
          { label: "In Transit", value: inTransitCount, color: inTransitCount > 0 ? "secondary" : "default" },
          { label: "Total Tasks", value: baseJobs.length, color: "default" }
        ]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleOptimizeRoute}
              disabled={isOptimizing}
              className="flex items-center text-xs bg-primary/10 text-primary px-3.5 py-2 rounded-xl border border-primary/30 hover:bg-primary/20 disabled:opacity-50 transition-all font-bold active:scale-95"
            >
              {isOptimizing ? (
                <Loader size={13} className="animate-spin mr-1.5" />
              ) : (
                <MapPin size={13} className="mr-1.5" />
              )}
              {isOptimizing ? "AI Optimizing..." : "Optimize Routes"}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className={`px-4 py-2 rounded-xl text-on-primary font-bold text-xs sm:text-sm transition-all flex items-center space-x-1.5 active:scale-95 shadow-[0_0_15px_rgba(0,218,243,0.2)] ${
                activeSubTab === "pickup"
                  ? "bg-primary text-on-primary hover:bg-primary/90"
                  : "bg-secondary text-on-secondary hover:bg-secondary/90"
              }`}
            >
              <Plus size={16} />
              <span>New {activeSubTab === "pickup" ? "Pickup" : "Delivery"}</span>
            </button>
          </div>
        }
      />

      {/* AI Sequence banner if generated */}
      {aiSequence && (
        <div className="mb-4 p-4 bg-surface-container border border-primary/40 rounded-xl text-xs text-on-surface shadow-[0_4px_20px_rgba(0,218,243,0.1)] relative font-medium">
          <div className="font-extrabold text-[10px] uppercase tracking-widest text-primary mb-1.5 flex items-center gap-1.5">
            <MapPin size={12} /> AI Recommended Sequence (From Kadawatha Hub):
          </div>
          <p className="text-on-surface-variant leading-relaxed">{aiSequence}</p>
          <button
            onClick={() => setAiSequence("")}
            className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface bg-surface-container-high rounded-full p-1 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Unified Filter Bar with Sub-Tab switcher */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search tasks by address, client, driver, ticket..."
        activeFilter={filterStage}
        onFilterChange={setFilterStage}
        filterOptions={filterOptions}
        totalCount={baseJobs.length}
        filteredCount={filteredJobs.length}
      >
        <div className="flex bg-surface-container-high p-1 rounded-lg border border-outline-variant/60 mr-2">
          <button
            onClick={() => { setActiveSubTab("pickup"); setFilterStage("ALL"); }}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              activeSubTab === "pickup"
                ? "bg-primary text-on-primary shadow-[0_2px_8px_rgba(0,218,243,0.3)]"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Pickups ({jobs.filter(j => j.type === "Pickup").length})
          </button>
          <button
            onClick={() => { setActiveSubTab("delivery"); setFilterStage("ALL"); }}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              activeSubTab === "delivery"
                ? "bg-secondary text-on-secondary shadow-[0_2px_8px_rgba(52,211,153,0.3)]"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Deliveries ({jobs.filter(j => j.type === "Delivery").length})
          </button>
        </div>
      </FilterBar>

      {/* Board Layout */}
      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex space-x-5 h-full min-w-max">
          {STAGES.filter(stage => filterStage === 'ALL' || filterStage === stage).map((stage, idx) => (
            <LogisticsColumn
              key={stage}
              stage={stage}
              items={filteredJobs.filter((job) => job.status === stage)}
              onMove={handleMoveJob}
              onMoveBack={handleMoveJobBack}
              isFirstStage={idx === 0}
              isLastStage={idx === STAGES.length - 1}
              onAddNew={() => setShowAddForm(true)}
              isAdmin={isAdmin}
              onDelete={setDeletingJobId}
              onCardClick={setActiveJob}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              draggedJobId={draggedJobId}
            />
          ))}
        </div>
      </div>

      {showAddForm && (
        <ModalWrapper
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          maxWidth="max-w-lg"
          height="h-auto max-h-[85vh]"
          ariaLabel={activeSubTab === "pickup" ? "New Pickup Task" : "New Delivery Task"}
        >
          <div className="px-6 py-5 border-b border-outline-variant bg-surface-container-low flex justify-between items-center flex-shrink-0">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-on-surface">
                New {activeSubTab === "pickup" ? "Pickup Task" : "Delivery Task"}
              </h3>
              <p className="text-[10px] uppercase font-bold text-primary tracking-widest mt-0.5">
                Logistics Dispatch
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-2 bg-surface-container-high text-on-surface-variant rounded-full hover:bg-surface-variant transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                Client Name (Optional)
              </label>
              <input
                type="text"
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
                placeholder="e.g. Gallery Wall"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                Item Category
              </label>
              <select
                value={form.subType}
                onChange={(e) => setForm({ ...form, subType: e.target.value })}
                className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-surface-container font-medium text-on-surface"
              >
                <option value="">-- Select Category --</option>
                {activeSubTab === "pickup" ? (
                  <>
                    <option value="Printed Canvas">Printed Canvas</option>
                    <option value="Steel Supply">Steel Supply</option>
                    <option value="Packaging Materials">Packaging Materials</option>
                  </>
                ) : (
                  <>
                    <option value="Finished Steel Frame">Finished Gallery-Wrap Frame</option>
                    <option value="Client Sample">Steel Frame Sample</option>
                    <option value="Waste Return">Material Scrap Return</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                Client / Site Address
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
                placeholder="e.g. Art Gallery, Colombo 07"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Assign Driver (Opt)
                </label>
                <select
                  value={form.driver || ''}
                  onChange={(e) => setForm({ ...form, driver: e.target.value })}
                  className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-surface-container font-medium text-on-surface"
                >
                  <option value="">-- Select --</option>
                  <option value="Saman (Master Welder)">Saman (Master Welder)</option>
                  <option value="Kamal (Assistant)">Kamal (Assistant)</option>
                  <option value="Sunil (Driver)">Sunil (Driver)</option>
                  <option value="Nimal (Driver)">Nimal (Driver)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Assign Vehicle (Opt)
                </label>
                <select
                  value={form.vehicle || ''}
                  onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                  className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-surface-container font-medium text-on-surface"
                >
                  <option value="">-- Select --</option>
                  <option value="Lorry (WP GE 1234)">Lorry (WP GE 1234)</option>
                  <option value="Van (WP LH 5678)">Van (WP LH 5678)</option>
                  <option value="Motorbike (WP XZ 9012)">Motorbike (WP XZ 9012)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                Job Ticket Photo
              </label>
              <div className="border-2 border-dashed border-outline-variant rounded-xl p-5 text-center hover:bg-surface-container-low hover:border-primary/50 transition-colors cursor-pointer relative group">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept="image/*"
                />
                <Upload
                  size={22}
                  className="mx-auto text-on-surface-variant mb-2 group-hover:text-primary transition-colors"
                />
                <span className="text-xs font-bold text-on-surface-variant block">
                  {form.manifest ? form.manifest : "Attach Delivery Slip / Photo"}
                </span>
                {!form.manifest && (
                  <span className="text-[10px] text-on-surface-variant mt-1 block">
                    Click or drag a file to upload
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 border-t border-outline-variant bg-surface-container-low flex justify-end space-x-3 flex-shrink-0">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-5 py-2.5 bg-surface-container-high text-on-surface rounded-xl font-bold text-xs hover:bg-surface-container-highest transition-colors border border-outline-variant/60"
            >
              Cancel
            </button>
            <button
              onClick={handleAddJob}
              disabled={!form.location}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(0,218,243,0.2)] active:scale-95 disabled:opacity-50"
            >
              Schedule Task
            </button>
          </div>
        </ModalWrapper>
      )}

      <DeleteModal
        isOpen={!!deletingJobId}
        onClose={() => setDeletingJobId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Logistics Task?"
        message={`Are you sure you want to permanently delete task "${deletingJobId}"? This will remove the route manifest and all tracking data.`}
      />

      {activeJob && (
        <LogisticsCardDetails
          job={activeJob}
          onClose={() => setActiveJob(null)}
          onSave={async (updatedJob) => {
            setJobs(jobs.map((j) => j.id === updatedJob.id ? updatedJob : j));
            setActiveJob(null);
            try {
              await updateDocument(COLLECTIONS.LOGISTICS, updatedJob._firestoreId || updatedJob.id, updatedJob);
            } catch (err) {
              console.error(err);
              toast.error("Failed to update job in database");
            }
          }}
        />
      )}
    </div>
  );
}
