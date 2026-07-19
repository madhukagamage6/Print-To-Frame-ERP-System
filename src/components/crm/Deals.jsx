import React, { useState } from 'react';
import { Plus, ArrowLeft, ArrowRight, Trash2, Calendar, User, DollarSign } from 'lucide-react';
import { toast } from '../../utils/toast';
import DeleteModal from '../common/DeleteModal';
import LeadCardDetails from './LeadCardDetails';

const DEALS_STAGES = ["Waiting", "Fabricating", "Ready To Load", "Hand Over", "Completed"];

function DealColumn({
  stage,
  items,
  onMove,
  onMoveBack,
  isFirstStage,
  isLastStage,
  onCardClick,
  onAddNew,
  isAdmin,
  onDelete
}) {
  return (
    <div className="flex flex-col min-w-[300px] bg-surface-container-low/50 rounded-2xl border border-outline-variant/60 p-4 h-full">
      {/* Column Header */}
      <div className="flex justify-between items-center mb-6 px-2">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${
            stage === "Waiting" ? "bg-primary text-on-primary" :
            stage === "Fabricating" ? "bg-primary/100" :
            stage === "Ready To Load" ? "bg-primary/100" :
            stage === "Hand Over" ? "bg-purple-500" : "bg-secondary text-on-secondary"
          }`} />
          <h3 className="font-bold text-on-surface uppercase tracking-wider text-xs">{stage}</h3>
          <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full text-[10px] font-bold">
            {items.length}
          </span>
        </div>
      </div>

      {/* Column Cards */}
      <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar">
        {items.map((deal) => (
          <div
            key={deal.id}
            onClick={() => onCardClick(deal)}
            className="bg-surface-container p-5 rounded-xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] hover:shadow-[0_4px_25px_rgba(0,218,243,0.1)] hover:border-primary/30 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase">
                {deal.source}
              </span>
              <span className="text-[10px] text-on-surface-variant font-medium flex items-center">
                <Calendar size={10} className="mr-1" />
                {deal.date}
              </span>
            </div>

            <h4 className="font-bold text-on-surface text-sm mb-1 group-hover:text-primary transition-colors">
              {deal.company || deal.name || 'No Company'}
            </h4>

            <p className="text-xs text-on-surface-variant mb-4 flex items-center">
              <User size={12} className="mr-1.5 opacity-50" />
              {deal.name || 'Unnamed Contact'}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-4">
              <div className="flex items-center text-on-surface">
                <DollarSign size={14} className="mr-1 text-on-surface-variant" />
                <span className="text-xs font-bold">LKR {Number(deal.value).toLocaleString()}</span>
              </div>

              <div className="flex items-center space-x-2">
                {!isFirstStage && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveBack(deal.id); }}
                    className="p-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-primary/80 text-on-primary hover:text-on-surface transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                    title="Move back"
                  >
                    <ArrowLeft size={14} />
                  </button>
                )}

                {!isLastStage && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMove(deal.id); }}
                    className="p-1.5 rounded-lg bg-slate-300 text-slate-900 hover:bg-primary hover:text-on-primary transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                    title="Move forward"
                  >
                    <ArrowRight size={14} />
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(deal.id); }}
                    className="p-1.5 rounded-lg bg-error/10 text-error hover:bg-error hover:text-on-error transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                    title="Delete Deal (Admin Only)"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Deals({
  leads,
  setLeads,
  currentUser,
  partners = [],
  setPartners,
  customers = [],
  setCustomers,
  onSaveInvoice,
  onMarkInvoicePaid
}) {
  const [activeDeal, setActiveDeal] = useState(null);
  const [deleteDealId, setDeleteDealId] = useState(null);
  const isAdmin = currentUser?.role === "Admin";

  const handleMoveForward = (dealId) => {
    setLeads(prev => prev.map(deal => {
      if (deal.id === dealId) {
        const currentIndex = DEALS_STAGES.indexOf(deal.stage);
        if (currentIndex + 1 < DEALS_STAGES.length) {
          const nextStage = DEALS_STAGES[currentIndex + 1];
          
          // Commission trigger: If next stage is Completed, calculate agent commission
          if (nextStage === "Completed") {
            if (onSaveInvoice) {
              const invId = `FIN-${String(Date.now()).slice(-6)}`;
              onSaveInvoice({
                id: invId,
                leadId: deal.id,
                customerName: deal.name,
                company: deal.company,
                date: new Date().toISOString().split('T')[0],
                amount: (deal.value || 0) * 0.25,
                totalValue: deal.value || 0,
                type: 'Final',
                status: 'Unpaid',
                aiDraft: `Final Settlement (25%) for project.`
              });
            }

            if (deal.agentId && partners.length && setPartners) {
              const sqFt = Number(deal.totalSqFt) || 0;
              const commissionAmount = sqFt * 53.5; // LKR 53.50 per sqft commission
              
              const agent = partners.find(p => p.partnerId === deal.agentId);
              if (agent) {
                setPartners(prevPartners => prevPartners.map(p => 
                  p.partnerId === deal.agentId 
                    ? { ...p, pending: (p.pending || 0) + commissionAmount, totalSqFt: (p.totalSqFt || 0) + sqFt }
                    : p
                ));
                toast.success(`Deal Completed!`, {
                  description: `LKR ${commissionAmount.toLocaleString()} commission assigned to Agent ${agent.name}. 25% Final Invoice generated.`
                });
              }
            } else {
              toast.success(`Deal Completed!`, {
                description: `25% Final Invoice generated successfully.`
              });
            }
          }
          return { ...deal, stage: nextStage };
        }
      }
      return deal;
    }));
  };

  const handleMoveBackward = (dealId) => {
    setLeads(prev => prev.map(deal => {
      if (deal.id === dealId) {
        const currentIndex = DEALS_STAGES.indexOf(deal.stage);
        if (currentIndex > 0) {
          return { ...deal, stage: DEALS_STAGES[currentIndex - 1] };
        }
      }
      return deal;
    }));
  };

  const handleDeleteConfirm = () => {
    if (deleteDealId) {
      setLeads(prev => prev.filter(deal => deal.id !== deleteDealId));
      setDeleteDealId(null);
    }
  };

  const handleAddNewFallback = () => {
    toast.info("Deal creation usually occurs via Lead Conversion.");
  };

  const handleSaveDealDetails = (updatedDeal) => {
    setLeads(prev => prev.map(deal => deal.id === updatedDeal.id ? updatedDeal : deal));
    setActiveDeal(null);
  };

  // Only display leads that are in deal pipeline stages (Waiting, Fabricating, Ready To Load, Hand Over, Completed)
  const activeDeals = leads.filter(l => l.isDeal && DEALS_STAGES.includes(l.stage));

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end mb-8 gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Deals Pipeline</h1>
          <p className="text-on-surface-variant text-sm">
            Manage committed deals and project transitions from one place.
          </p>
        </div>
        <div>
          <button
            onClick={handleAddNewFallback}
            className="bg-primary text-on-primary hover:bg-primary/80 text-on-primary px-5 py-2.5 rounded-xl  font-bold text-sm transition-all flex items-center space-x-2 active:scale-95 shadow-[0_0_15px_rgba(0,218,243,0.15)] hover:shadow-[0_0_20px_rgba(0,218,243,0.3)]"
          >
            <Plus size={18} />
            <span>New Deal</span>
          </button>
        </div>
      </div>

      {/* Board Layout */}
      <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar">
        <div className="flex space-x-6 h-full min-w-max">
          {DEALS_STAGES.map((stage, idx) => (
            <DealColumn
              key={stage}
              stage={stage}
              items={activeDeals.filter(d => d.stage === stage)}
              onMove={handleMoveForward}
              onMoveBack={handleMoveBackward}
              isFirstStage={idx === 0}
              isLastStage={idx === DEALS_STAGES.length - 1}
              onCardClick={setActiveDeal}
              onAddNew={handleAddNewFallback}
              isAdmin={isAdmin}
              onDelete={setDeleteDealId}
            />
          ))}
        </div>
      </div>

      {/* Delete Deal modal */}
      <DeleteModal
        isOpen={!!deleteDealId}
        onClose={() => setDeleteDealId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Deal?"
        message="Are you sure you want to permanently delete this deal? This will remove all project and financial tracking for this item."
      />

      {/* Deal details Modal */}
      {activeDeal && (
        <LeadCardDetails
          lead={activeDeal}
          onClose={() => setActiveDeal(null)}
          onSave={handleSaveDealDetails}
          onSaveInvoice={onSaveInvoice}
          onMarkInvoicePaid={onMarkInvoicePaid}
          partners={partners}
          customers={customers}
          onConvert={() => {
            // Conversion should ideally be hidden for active deals, but we provide a no-op just in case
            toast.info("This item is already a deal.");
          }}
        />
      )}
    </div>
  );
}
