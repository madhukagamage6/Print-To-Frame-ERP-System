import React, { useState } from 'react';
import { Plus, ArrowLeft, ArrowRight, Truck, Check, Trash2, Calendar, User, DollarSign, Archive, X } from 'lucide-react';
import { toast } from '../../utils/toast';
import LeadCardDetails from './LeadCardDetails';
import DeleteModal from '../common/DeleteModal';

const STAGES = ["Intake", "Processing", "75% Invoice Submitted", "Received", "Completed"];

function LeadColumn({ 
  stage, 
  items, 
  onMove, 
  onMoveBack, 
  isFirstStage, 
  isLastStage, 
  onCardClick, 
  onAddNew, 
  isAdmin, 
  onDelete,
  onCreateLogistics,
  logisticsJobs
}) {
  return (
    <div className="flex flex-col min-w-[300px] bg-surface-container-low/50 rounded-2xl border border-outline-variant/60 p-4 h-full">
      {/* Column Header */}
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${
            stage === "Intake" ? "bg-primary/100" : 
            stage === "Processing" ? "bg-primary text-on-primary" : 
            stage === "75% Invoice Submitted" ? "bg-primary/100" : "bg-secondary text-on-secondary"
          }`} />
          <h3 className="font-bold text-on-surface uppercase tracking-wider text-xs">{stage}</h3>
          <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full text-[10px] font-bold">
            {items.length}
          </span>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar">
        {items.map((lead) => (
          <div 
            key={lead.id}
            onClick={() => onCardClick(lead)}
            className="bg-surface-container p-5 rounded-xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] hover:shadow-[0_4px_25px_rgba(0,218,243,0.1)] hover:border-primary/30 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase">
                {lead.source}
              </span>
              <div className="flex flex-col items-end space-y-1">
                <span className="text-[10px] text-on-surface-variant font-medium flex items-center">
                  <Calendar size={10} className="mr-1" />
                  {lead.date}
                </span>
                {lead.invoicePaid ? (
                  <span className="text-[9px] text-on-surface font-bold flex items-center bg-secondary text-on-secondary px-2 py-0.5 rounded shadow-[0_4px_20px_rgba(0,218,243,0.05)]">
                    PAID
                  </span>
                ) : lead.invoiceGenerated && (
                  <span className="text-[9px] text-secondary font-bold flex items-center bg-secondary/10 px-1 rounded">
                    Inv: {lead.invoiceDate || 'Pending'}
                  </span>
                )}
              </div>
            </div>
            
            <h4 className="font-bold text-on-surface text-sm mb-1 group-hover:text-primary transition-colors">
              {lead.company || lead.name || 'No Company'}
            </h4>
            
            <p className="text-xs text-on-surface-variant mb-4 flex items-center">
              <User size={12} className="mr-1.5 opacity-50" />
              {lead.name || 'Unnamed Contact'}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-4">
              <div className="flex items-center text-on-surface">
                <DollarSign size={14} className="mr-1 text-on-surface-variant" />
                <span className="text-xs font-bold">LKR {Number(lead.value).toLocaleString()}</span>
              </div>

              <div className="flex items-center space-x-2">
                {!isFirstStage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveBack(lead.id);
                    }}
                    className="p-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-primary/80 text-on-primary hover:text-on-surface transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                    title="Move back"
                  >
                    <ArrowLeft size={14} />
                  </button>
                )}
                
                {stage === "75% Invoice Submitted" && (() => {
                  const job = logisticsJobs ? logisticsJobs.find(j => j.leadId === lead.id) : null;
                  if (job && job.status === "Completed") {
                    return (
                      <div className="flex items-center space-x-1 px-2 py-1.5 rounded-lg bg-secondary/10 text-secondary shadow-[0_4px_20px_rgba(0,218,243,0.05)]" title="Pickup Completed">
                        <Check size={14} />
                        <span className="text-[10px] font-bold">Picked Up</span>
                      </div>
                    );
                  }
                  if (job) {
                    return (
                      <div className="flex items-center space-x-1 px-2 py-1.5 rounded-lg bg-primary/10 text-primary shadow-[0_4px_20px_rgba(0,218,243,0.05)]" title="Logistics Requested">
                        <Truck size={14} />
                        <span className="text-[10px] font-bold">Requested</span>
                      </div>
                    );
                  }
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateLogistics(lead);
                      }}
                      className="p-1.5 rounded-lg bg-error/10 text-error hover:bg-error text-on-error hover:text-on-surface transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                      title="Create Logistics Pickup Job"
                    >
                      <Truck size={14} />
                    </button>
                  );
                })()}

                {isLastStage ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(lead.id);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary/80 text-on-primary font-bold text-[10px] uppercase tracking-wider transition-all shadow-[0_4px_25px_rgba(0,218,243,0.1)] flex items-center space-x-1"
                    title="Convert to Deal"
                  >
                    <Check size={14} />
                    <span>Convert</span>
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(lead.id);
                    }}
                    className="p-1.5 rounded-lg bg-slate-300 text-slate-900 hover:bg-primary hover:text-on-primary transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                    title="Move forward"
                  >
                    <ArrowRight size={14} />
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(lead.id);
                    }}
                    className="p-1.5 rounded-lg bg-error/10 text-error hover:bg-error hover:text-on-error transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                    title="Delete Lead (Admin Only)"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {stage === "Intake" && (
          <button
            onClick={onAddNew}
            className="w-full py-3 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant hover:text-primary hover:border-primary/30 hover:bg-primary/10/30 transition-all flex items-center justify-center space-x-2 group"
          >
            <Plus size={16} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-tight">Add New Lead</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Convert Modal
function ConvertDealModal({ lead, onClose, onConfirm }) {
  const [invoiceText, setInvoiceText] = useState(lead?.invoiceDraft || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const generateManualInvoiceDraft = () => {
    setInvoiceText(`# 75% Advance Invoice\n\n- Client: ${lead.name}\n- Value: LKR ${(lead.value * 0.75).toLocaleString()}\n\n[Please review and edit details to complete]`);
  };

  const handleConfirm = () => {
    onConfirm({
      ...lead,
      stage: 'Waiting',
      invoiceDraft: invoiceText
    });
  };

  return (
    <div className="fixed inset-0 bg-surface-container-highest/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <div className="bg-surface-container rounded-3xl w-full max-w-4xl flex flex-col shadow-[0_0_50px_rgba(0,218,243,0.25)] overflow-hidden border border-outline-variant">
        <div className="flex justify-between items-center px-8 py-5 flex-shrink-0 border-b border-outline-variant/50 bg-primary text-on-primary">
          <div>
            <h2 className="text-xl font-extrabold text-on-surface">Convert to Deal: {lead.name}</h2>
            <p className="text-xs font-bold text-indigo-200 mt-1">
              {lead.invoiceGenerated ? "Review the generated 75% Advance Invoice to finalize the commitment." : "Generate 75% Advance Invoice to finalize the commitment."}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-primary text-on-primary rounded-full hover:bg-indigo-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex flex-col flex-1 max-h-[75vh] overflow-y-auto space-y-6">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 bg-surface-container-low p-6 rounded-2xl border border-outline-variant">
              <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center uppercase tracking-widest">Job Overview</h3>
              <ul className="space-y-3 text-sm text-on-surface-variant">
                <li><strong className="text-on-surface">Total Quoted Value:</strong> LKR {(lead.value || 0).toLocaleString()}</li>
                <li><strong className="text-on-surface">75% Advance Due:</strong> LKR {(lead.value * 0.75).toLocaleString()}</li>
                <li><strong className="text-on-surface">Delivery Location:</strong> {lead.deliveryLocation || 'TBD'}</li>
              </ul>
              {!lead.invoiceGenerated && (
                <div className="flex flex-col space-y-3 mt-6">
                  <button
                    onClick={generateManualInvoiceDraft}
                    className="w-full py-3 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container-low font-bold text-xs transition-all flex items-center justify-center space-x-2"
                  >
                    Create Manual Draft (Skip AI)
                  </button>
                </div>
              )}
            </div>
          </div>

          {invoiceText && (
            <div className="flex flex-col flex-1 min-h-[300px]">
              <label className="block text-[10px] uppercase font-bold text-secondary mb-2 tracking-widest flex items-center">
                <Check size={12} className="mr-1" /> Invoice details draft
              </label>
              <textarea
                value={invoiceText}
                onChange={(e) => setInvoiceText(e.target.value)}
                className="w-full flex-1 p-5 bg-surface-container border border-secondary/30 rounded-xl text-sm text-on-surface font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y mb-6"
              />
              <button
                onClick={handleConfirm}
                className="w-full py-4 bg-secondary text-on-secondary hover:bg-secondary/80 text-on-primary rounded-xl font-bold text-sm transition-all  active:scale-95 flex items-center justify-center space-x-2"
              >
                <span>Finalize Conversion to Deal</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Leads({
  leads,
  setLeads,
  logisticsJobs,
  setLogisticsJobs,
  setProjects,
  currentUser,
  onSaveInvoice,
  onMarkInvoicePaid,
  customers = [],
  setCustomers,
  partners = [],
}) {
  const [activeLead, setActiveLead] = useState(null);
  const [leadToConvert, setLeadToConvert] = useState(null);
  const [deleteLeadId, setDeleteLeadId] = useState(null);
  const isAdmin = currentUser?.role === "Admin";

  const handleAddNewLead = () => {
    const newLead = {
      id: `L-${String(Date.now()).slice(-6)}`,
      name: "",
      company: "",
      phone: "",
      email: "",
      value: 0,
      stage: "Intake",
      source: "Manual",
      date: new Date().toISOString().split("T")[0],
      jobScope: "",
      deliveryLocation: "",
      quotationGenerated: false,
      quotationDraft: "",
    };
    setLeads(prev => [...prev, newLead]);
    setActiveLead(newLead);
  };

  // OPTIMIZATION 7: Automatic Client Creation upon saving Lead Details (Prevent Duplicates)
  const handleSaveLeadDetails = (updatedLead) => {
    setLeads(prev => prev.map(lead => lead.id === updatedLead.id ? updatedLead : lead));
    // Keep the modal's lead prop in sync so subsequent saves don't use stale data
    setActiveLead(updatedLead);

    // Save lead details must auto-create client in customer database if doesn't exist
    if (updatedLead.name && setCustomers) {
      const match = customers.find(c => 
        (updatedLead.email && c.email === updatedLead.email) || 
        (updatedLead.phone && c.phone === updatedLead.phone)
      );

      if (match) {
        // If customer exists, increment orders count (if it's a new or modified lead that represents order progress)
        // Or simply keep consistent. Let's make sure it doesn't duplicate.
        console.log('Customer already exists in DB:', match.name);
      } else {
        // Create new customer
        const newCustomer = {
          nic: `AUTO-${Math.floor(100000 + Math.random() * 900000)}`,
          name: updatedLead.name,
          company: updatedLead.company,
          phone: updatedLead.phone,
          email: updatedLead.email,
          type: updatedLead.company ? "Business" : "Individual",
          businessName: updatedLead.company || "",
          orders: 1,
          dateJoined: new Date().toISOString().split('T')[0]
        };
        setCustomers(prev => [...prev, newCustomer]);
        console.log('Automatically created customer profile:', newCustomer.name);
      }
    }
  };

  const handleConvertConfirm = (convertedLead) => {
    // Generate a new ID for the Deal to separate it from the Lead
    const dealId = Date.now().toString() + Math.random().toString(36).substr(2, 5);

    // Save state update
    setLeads(prev => {
      const originalLead = prev.find(lead => lead.id === convertedLead.id);
      if (!originalLead) return prev;

      // Duplicate the lead as a new deal, preserving the original lead in its current stage
      const newDeal = {
        ...convertedLead,
        id: dealId,
        isDeal: true,
        originalLeadId: originalLead.id,
      };

      // Apply any edits made during conversion to the original lead, and move to Completed stage
      const updatedOriginalLead = {
        ...convertedLead,
        stage: 'Completed',
        invoiceDraft: originalLead.invoiceDraft // Keep original invoice draft for the lead
      };

      // Keep the original lead in the leads pipeline, and add the new deal
      return [...prev.map(l => l.id === originalLead.id ? updatedOriginalLead : l), newDeal];
    });
    
    // Increment customer order or add customer if missing
    if (convertedLead.name && setCustomers) {
      const match = customers.find(c => 
        (convertedLead.email && c.email === convertedLead.email) || 
        (convertedLead.phone && c.phone === convertedLead.phone)
      );

      if (match) {
        setCustomers(prev => prev.map(c => 
          c.nic === match.nic ? { ...c, orders: (c.orders || 0) + 1 } : c
        ));
      } else {
        const newCustomer = {
          nic: `AUTO-${Math.floor(100000 + Math.random() * 900000)}`,
          name: convertedLead.name,
          company: convertedLead.company,
          phone: convertedLead.phone,
          email: convertedLead.email,
          type: convertedLead.company ? "Business" : "Individual",
          businessName: convertedLead.company || "",
          orders: 1,
          dateJoined: new Date().toISOString().split('T')[0]
        };
        setCustomers(prev => [...prev, newCustomer]);
      }
    }

    // Create a fabrication project job (Pending status)
    if (setProjects) {
      const newJob = {
        jobNo: `PTF-${String(Date.now()).slice(-4)}`,
        clientNIC: convertedLead.nic || `AUTO-${Math.floor(100000 + Math.random() * 900000)}`,
        scope: convertedLead.jobScope || "Custom steel framing work",
        status: "Pending",
        deadline: convertedLead.date || new Date().toISOString().split('T')[0],
        address: convertedLead.deliveryLocation || "Pickup at Colombo Hub",
        materials: "",
        note: "Lead converted via Kanban pipeline.",
        assignee: "",
        flexReceived: false,
        value: convertedLead.value || 0,
        totalSqFt: convertedLead.totalSqFt || 0,
      };
      setProjects(prev => [newJob, ...prev]);
    }

    toast.success('New Order Received!', {
      description: `Lead ${convertedLead.name} has been converted to a deal and added to Fabrication.`,
    });

    setLeadToConvert(null);
    setActiveLead(null); // Close the active lead modal to return to Kanban
  };

  const handleMoveForward = (leadId) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;
    
    if (targetLead.stage === "Received") {
      // Trigger Convert Deal modal
      setLeadToConvert(targetLead);
    } else if (targetLead.stage !== "Completed") {
      const currentIndex = STAGES.indexOf(targetLead.stage);
      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, stage: STAGES[currentIndex + 1] } : l
      ));
    }
  };

  const handleMoveBackward = (leadId) => {
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;
    
    const currentIndex = STAGES.indexOf(targetLead.stage);
    if (currentIndex > 0) {
      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, stage: STAGES[currentIndex - 1] } : l
      ));
    }
  };

  const handleDeleteLead = () => {
    if (deleteLeadId) {
      setLeads(prev => prev.filter(l => l.id !== deleteLeadId));
      setDeleteLeadId(null);
    }
  };

  const handleCreateLogisticsJob = (lead) => {
    const newLogisticsJob = {
      id: `L-PK-${String(Date.now()).slice(-6)}`,
      type: "Pickup",
      subType: "Material/Flex",
      location: lead.deliveryLocation || "Customer location TBD",
      customer: lead.name,
      status: "Pending",
      startTime: null,
      endTime: null,
      duration: null,
      manifest: null,
      leadId: lead.id
    };
    setLogisticsJobs(prev => [newLogisticsJob, ...prev]);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Page Title & Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end mb-8 gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Leads Intake</h1>
          <p className="text-on-surface-variant text-sm">
            Nurture leads from Intake to Payment Received before committing to production.
          </p>
        </div>
        <div>
          <button
            onClick={handleAddNewLead}
            className="bg-primary text-on-primary hover:bg-primary/80 text-on-primary px-5 py-2.5 rounded-xl  font-bold text-sm transition-all flex items-center space-x-2 active:scale-95 shadow-[0_0_15px_rgba(0,218,243,0.15)] hover:shadow-[0_0_20px_rgba(0,218,243,0.3)]"
          >
            <Plus size={18} />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar">
        <div className="flex space-x-6 h-full min-w-max">
          {STAGES.map((stage, idx) => (
            <LeadColumn
              key={stage}
              stage={stage}
              items={leads.filter(l => !l.isDeal && l.stage === stage)}
              onMove={handleMoveForward}
              onMoveBack={handleMoveBackward}
              isFirstStage={idx === 0}
              isLastStage={idx === STAGES.length - 1}
              onCardClick={setActiveLead}
              onAddNew={handleAddNewLead}
              isAdmin={isAdmin}
              onDelete={setDeleteLeadId}
              onCreateLogistics={handleCreateLogisticsJob}
              logisticsJobs={logisticsJobs}
            />
          ))}
        </div>
      </div>

      {/* Lead details Modal */}
      {activeLead && (
        <LeadCardDetails
          lead={activeLead}
          onClose={() => setActiveLead(null)}
          onSave={handleSaveLeadDetails}
          onSaveInvoice={onSaveInvoice}
          onMarkInvoicePaid={onMarkInvoicePaid}
          partners={partners}
          customers={customers}
          onConvert={(updatedLead) => {
            setActiveLead(null);
            setLeadToConvert(updatedLead);
          }}
        />
      )}

      {/* Deal Conversion Modal */}
      {leadToConvert && (
        <ConvertDealModal
          lead={leadToConvert}
          onClose={() => setLeadToConvert(null)}
          onConfirm={handleConvertConfirm}
        />
      )}

      {/* Delete Lead Modal */}
      <DeleteModal
        isOpen={!!deleteLeadId}
        onClose={() => setDeleteLeadId(null)}
        onConfirm={handleDeleteLead}
        title="Delete Lead?"
        message="Are you sure you want to permanently delete this lead from the intake pipeline? This cannot be undone."
      />
    </div>
  );
}
