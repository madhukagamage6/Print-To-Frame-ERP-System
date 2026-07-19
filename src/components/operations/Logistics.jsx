import React, { useState } from 'react';
import { Truck, MapPin, Download, Loader, Trash2, ArrowLeft, ArrowRight, Check, X, FileText, Plus, Upload, Bell, User } from 'lucide-react';
import { toast } from '../../utils/toast';
import Card from '../common/Card';
import DeleteModal from '../common/DeleteModal';
import LogisticsCardDetails from './LogisticsCardDetails';

const STAGES = ["Pending", "In Transit", "Completed"];

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
    <div 
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        onDrop(e, null, stage);
      }}
      className="flex flex-col min-w-[320px] w-80 bg-surface-container-low/50 rounded-2xl border border-outline-variant/60 p-4 h-full"
    >
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${stage === "Pending" ? "bg-primary/100" : stage === "In Transit" ? "bg-primary text-on-primary" : "bg-secondary text-on-secondary"}`} />
          <h3 className="font-bold text-on-surface uppercase tracking-wider text-xs">{stage}</h3>
          <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full text-[10px] font-bold">
            {items.length}
          </span>
        </div>
      </div>

      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          if (e.target === e.currentTarget) {
            onDrop(e, null, stage);
          }
        }}
        className="space-y-4 overflow-y-auto pr-1 custom-scrollbar flex-1"
      >
        {items.map((job) => (
          <div
            key={job.id}
            onClick={() => onCardClick(job)}
            draggable
            onDragStart={(e) => onDragStart(e, job.id)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOver(e, job.id);
            }}
            onDrop={(e) => {
              e.stopPropagation();
              onDrop(e, job.id, stage);
            }}
            className={`bg-surface-container p-5 rounded-xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] transition-all group relative hover:shadow-[0_4px_25px_rgba(0,218,243,0.1)] hover:border-primary/30 cursor-grab active:cursor-grabbing ${
              draggedJobId === job.id ? "opacity-30 border-dashed border-indigo-400 scale-95" : ""
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                {job.status === "In Transit" && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
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
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase max-w-[120px] truncate">
                  {job.customer}
                </span>
              )}
            </div>
            <h4 className="font-bold text-on-surface text-sm mb-1">{job.location}</h4>
            <p className="text-xs text-on-surface-variant mb-3 flex items-center">
              <Truck size={12} className="mr-1.5 opacity-50" />
              {job.subType}
            </p>
            {(job.driver || job.vehicle) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                {job.driver && (
                  <span className="inline-flex items-center text-[9px] bg-surface-container-low text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant/50 font-bold uppercase tracking-tight">
                    <User size={10} className="mr-1 text-on-surface-variant" />
                    {getDriverShort(job.driver)}
                  </span>
                )}
                {job.vehicle && (
                  <span className="inline-flex items-center text-[9px] bg-surface-container-low text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant/50 font-bold uppercase tracking-tight">
                    <Truck size={10} className="mr-1 text-on-surface-variant" />
                    {getVehicleShort(job.vehicle)}
                  </span>
                )}
              </div>
            )}
            {job.manifest && (
              <div className="mb-4 p-2 bg-surface-container-low rounded border border-outline-variant flex items-center text-[10px] text-on-surface-variant">
                <FileText size={12} className="mr-2 text-on-surface-variant" />
                <span className="truncate font-medium">{job.manifest}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-4 min-h-[36px]">
              <div className="flex items-center text-on-surface text-[10px] uppercase font-bold tracking-wide">
                {job.status === "Completed" && (
                  <span className="flex items-center bg-secondary/10 text-secondary px-2 py-1 rounded-md border border-emerald-100">
                    <ClockIcon size={12} className="mr-1 text-secondary" />
                    {job.duration || "N/A"}
                  </span>
                )}
                {job.status === "In Transit" && job.startTime && (
                  <span className="flex items-center text-on-surface-variant">
                    Started:{" "}
                    <span className="text-on-surface-variant ml-1">
                      {new Date(job.startTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {!isFirstStage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveBack(job.id);
                    }}
                    className="p-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-primary/80 text-on-primary hover:text-on-surface transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                    title="Move back"
                  >
                    <ArrowLeft size={14} />
                  </button>
                )}
                {!isLastStage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(job.id);
                    }}
                    className={`p-1.5 rounded-lg text-on-surface transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)] flex items-center ${
                      stage === "In Transit"
                        ? "bg-secondary text-on-secondary hover:bg-secondary/80 text-on-primary"
                        : "bg-slate-300 text-slate-900 hover:bg-primary hover:text-on-primary"
                    }`}
                    title={stage === "Pending" ? "Dispatch Driver" : "Complete Task"}
                  >
                    {stage === "In Transit" ? <Check size={14} /> : <ArrowRight size={14} />}
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(job.id);
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

    const updatedJobsList = jobs.filter((j) => j.id !== jobId);

    if (targetJobId) {
      const targetIndex = updatedJobsList.findIndex((j) => j.id === targetJobId);
      updatedJobsList.splice(targetIndex, 0, updatedJob);
    } else {
      updatedJobsList.push(updatedJob);
    }

    setJobs(updatedJobsList);
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

  const handleAddJob = () => {
    if (!form.location) return;
    const newJob = {
      id: `${activeSubTab === "pickup" ? "L-PK" : "L-DL"}-${String(jobs.length + 1).padStart(3, "0")}`,
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
  };

  const handleMoveJob = (id) => {
    setJobs(
      jobs.map((job) => {
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
        return { ...job, ...updates };
      })
    );
  };

  const handleMoveJobBack = (id) => {
    setJobs(
      jobs.map((job) => {
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
        return { ...job, ...updates };
      })
    );
  };

  const handleDeleteConfirm = () => {
    if (deletingJobId) {
      setJobs(jobs.filter((j) => j.id !== deletingJobId));
      setDeletingJobId(null);
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

  const filteredJobs = jobs.filter((job) =>
    activeSubTab === "pickup" ? job.type === "Pickup" : job.type === "Delivery"
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Logistics Hub</h1>
          <p className="text-on-surface-variant text-sm">
            Managing execution, material pickups and customer deliveries.
          </p>
          <button
            onClick={handleOptimizeRoute}
            disabled={isOptimizing}
            className="mt-3 flex items-center text-xs bg-primary/10 text-primary px-3 py-1.5 rounded border border-primary/30 hover:bg-primary/20 disabled:opacity-50 transition-colors shadow-[0_4px_20px_rgba(0,218,243,0.05)] font-bold"
          >
            {isOptimizing ? (
              <Loader size={12} className="animate-spin mr-2" />
            ) : (
              <MapPin size={12} className="mr-2" />
            )}
            {isOptimizing
              ? "AI Calculating..."
              : `Optimize ${activeSubTab === "pickup" ? "Pickup" : "Delivery"} Route`}
          </button>
          {aiSequence && (
            <div className="mt-3 p-4 bg-surface-container border border-primary/30 rounded-xl text-xs text-on-surface shadow-[0_8px_30px_rgba(0,218,243,0.15)] /50 max-w-lg whitespace-pre-wrap relative font-medium">
              <div className="font-extrabold text-[10px] uppercase tracking-widest text-primary mb-2">
                AI Recommended Sequence:
              </div>
              {aiSequence}
              <button
                onClick={() => setAiSequence("")}
                className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface-variant bg-surface-container rounded-full p-1"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 z-10 w-full md:w-auto">
          <div className="flex bg-surface-container-high p-1.5 rounded-xl shadow-inner w-full md:w-auto">
            <button
              onClick={() => setActiveSubTab("pickup")}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeSubTab === "pickup" ? "bg-surface-container text-primary shadow-[0_4px_25px_rgba(0,218,243,0.1)]" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Pickups
            </button>
            <button
              onClick={() => setActiveSubTab("delivery")}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeSubTab === "delivery" ? "bg-surface-container text-secondary shadow-[0_4px_25px_rgba(0,218,243,0.1)]" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Deliveries
            </button>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className={`w-full md:w-auto px-5 py-2.5 rounded-xl text-on-surface font-bold text-sm shadow-[0_4px_25px_rgba(0,218,243,0.1)] transition-all active:scale-95 ${
              activeSubTab === "pickup"
                ? "bg-primary text-on-primary hover:bg-primary/80 text-on-primary "
                : "bg-secondary text-on-secondary hover:bg-secondary/80 text-on-primary "
            }`}
          >
            + New {activeSubTab === "pickup" ? "Pickup" : "Delivery"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar">
        <div className="flex space-x-6 h-full min-w-max">
          {STAGES.map((stage, idx) => (
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
        <div className="fixed inset-0 bg-surface-container-highest/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container rounded-3xl shadow-[0_0_50px_rgba(0,218,243,0.25)] w-full max-w-lg border border-outline-variant overflow-hidden">
            <div className="p-8">
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
                <h3 className="text-xl font-extrabold text-on-surface">
                  New {activeSubTab === "pickup" ? "Pickup Task" : "Delivery Task"}
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="bg-surface-container p-2 rounded-full text-on-surface-variant hover:text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                    Client Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.customer}
                    onChange={(e) => setForm({ ...form, customer: e.target.value })}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. Gallery Wall"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                    Item Category
                  </label>
                  <select
                    value={form.subType}
                    onChange={(e) => setForm({ ...form, subType: e.target.value })}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-surface-container font-medium"
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
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                    Client / Site Address
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. Art Gallery, Colombo 07"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                      Assign Driver (Opt)
                    </label>
                    <select
                      value={form.driver || ''}
                      onChange={(e) => setForm({ ...form, driver: e.target.value })}
                      className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-surface-container font-medium"
                    >
                      <option value="">-- Select --</option>
                      <option value="Saman (Master Welder)">Saman (Master Welder)</option>
                      <option value="Kamal (Assistant)">Kamal (Assistant)</option>
                      <option value="Sunil (Driver)">Sunil (Driver)</option>
                      <option value="Nimal (Driver)">Nimal (Driver)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                      Assign Vehicle (Opt)
                    </label>
                    <select
                      value={form.vehicle || ''}
                      onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                      className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-surface-container font-medium"
                    >
                      <option value="">-- Select --</option>
                      <option value="Lorry (WP GE 1234)">Lorry (WP GE 1234)</option>
                      <option value="Van (WP LH 5678)">Van (WP LH 5678)</option>
                      <option value="Motorbike (WP XZ 9012)">Motorbike (WP XZ 9012)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">
                    Job Ticket Photo
                  </label>
                  <div className="border-2 border-dashed border-outline-variant rounded-xl p-6 text-center hover:bg-surface-container-low hover:border-indigo-300 transition-colors cursor-pointer relative group">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/*"
                    />
                    <Upload
                      size={24}
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

                <div className="flex space-x-3 mt-8">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-3 px-4 bg-surface-container rounded-xl text-on-surface font-bold hover:bg-surface-container-high transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddJob}
                    disabled={!form.location}
                    className="flex-1 py-3 px-4 bg-surface-container-highest text-on-surface rounded-xl font-bold hover:bg-surface-container-high transition-colors shadow-[0_8px_30px_rgba(0,218,243,0.15)] active:scale-95 disabled:opacity-50"
                  >
                    Schedule Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
          onSave={(updatedJob) => {
            setJobs(jobs.map((j) => j.id === updatedJob.id ? updatedJob : j));
            setActiveJob(null);
          }}
        />
      )}
    </div>
  );
}
