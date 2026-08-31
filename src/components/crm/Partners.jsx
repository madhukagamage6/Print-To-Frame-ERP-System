import React, { useState } from 'react';
import { 
  Search, User, Building, MapPin, Globe, DollarSign, Sparkles, X, 
  Trash2, Check, Clock, Link, QrCode, Copy, Plus, ChevronRight,
  ExternalLink, Layers, ArrowUpRight
} from 'lucide-react';
import { generateText } from '../../services/gemini';
import { toast } from '../../utils/toast';
import DeleteModal from '../common/DeleteModal';
import { PageHeader, FilterBar, StatusBadge, ModalWrapper, UserAvatar } from '../common/ui';

export default function Partners({ partners = [], setPartners, dataStore, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [newPartner, setNewPartner] = useState({
    name: '',
    type: 'Agency',
    googleLink: '',
    socialLink: '',
  });

  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [strategyResult, setStrategyResult] = useState('');
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const isAdmin = currentUser?.role === 'Admin';
  const [showQR, setShowQR] = useState(false);

  // Summary Metrics
  const totalSqFt = partners.reduce((acc, p) => acc + (Number(p.totalSqFt) || 0), 0);
  const totalPaid = partners.reduce((acc, p) => acc + (Number(p.paid) || 0), 0);
  const totalPending = partners.reduce((acc, p) => acc + (Number(p.pending) || 0), 0);

  const agencyCount = partners.filter(p => p.type === 'Agency').length;
  const printerCount = partners.filter(p => p.type === 'Printer').length;
  const freelancerCount = partners.filter(p => p.type === 'Freelancer').length;

  const filteredPartners = partners.filter(p => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      p.name?.toLowerCase().includes(query) ||
      p.partnerId?.toLowerCase().includes(query) ||
      p.type?.toLowerCase().includes(query)
    );

    if (!matchesSearch) return false;

    if (activeFilter === 'agency') return p.type === 'Agency';
    if (activeFilter === 'printer') return p.type === 'Printer';
    if (activeFilter === 'freelancer') return p.type === 'Freelancer';
    return true;
  });

  const handleCreatePartner = () => {
    if (newPartner.name.trim() === '') {
      toast.error("Please enter a partner name");
      return;
    }

    const nextId = partners.length > 0 ? Math.max(...partners.map(p => p.id || 0)) + 1 : 1;
    const lastCode = partners.length > 0 ? partners[partners.length - 1].partnerId : 'P-1000';
    const num = parseInt(lastCode.split('-')[1] || '1000') + 1;
    
    const partnerId = `P-${num}`;
    const newEntry = {
      id: nextId,
      partnerId,
      name: newPartner.name,
      type: newPartner.type,
      totalSqFt: 0,
      paid: 0,
      pending: 0,
      googleLink: newPartner.googleLink,
      socialLink: newPartner.socialLink,
    };

    setPartners(prev => [...prev, newEntry]);
    setSelectedPartner(newEntry);
    setShowCreateModal(false);
    setNewPartner({ name: '', type: 'Agency', googleLink: '', socialLink: '' });
    toast.success(`Partner ${newPartner.name} registered`);
  };

  const getPartnerRelationships = (partner) => {
    if (!dataStore) return { referrals: [], productions: [] };
    const referrals = (dataStore.leads || []).filter(l => l.agentId === partner.partnerId);
    const productions = (dataStore.projects || []).filter(p => p.partnerId === partner.partnerId);
    return { referrals, productions };
  };

  const handleGenerateStrategy = async (partner) => {
    setIsGeneratingStrategy(true);
    setStrategyResult('');
    setShowStrategyModal(true);

    try {
      const prompt = `
        You are a strategic business advisor for "Print To Frame Pvt Ltd" (specialist steel canvas framing in Sri Lanka).
        Suggest 3 professional strategies to increase steel framing and digital art referral volume from our partner "${partner.name}" who is categorized as a "${partner.type}".
        Focus on mutual profitability, local Sri Lankan art dynamics, and gallery wrap marketing.
      `;
      const response = await generateText(prompt);
      setStrategyResult(response);
    } catch {
      setStrategyResult('Error generating strategy. Please try again later.');
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const handleSettleCommission = (partner) => {
    if (partner.pending <= 0) return;
    
    if (window.confirm(`Settle LKR ${partner.pending.toLocaleString()} to ${partner.name}? This moves the balance to "Paid".`)) {
      setPartners(prev => prev.map(p => 
        p.partnerId === partner.partnerId
          ? { ...p, paid: (p.paid || 0) + (p.pending || 0), pending: 0 }
          : p
      ));
      setSelectedPartner(prev => ({
        ...prev,
        paid: (prev.paid || 0) + (prev.pending || 0),
        pending: 0
      }));
      toast.success(`Commission settled for ${partner.name}`);
    }
  };

  const handleDeletePartner = () => {
    if (deleteId) {
      setPartners(prev => prev.filter(p => p.partnerId !== deleteId));
      if (selectedPartner?.partnerId === deleteId) {
        setSelectedPartner(null);
      }
      setDeleteId(null);
      toast.success("Partner removed from network");
    }
  };

  const relations = selectedPartner ? getPartnerRelationships(selectedPartner) : null;
  const referralLink = selectedPartner ? `${window.location.origin}/referral?partnerId=${selectedPartner.partnerId}` : '';
  const qrCodeUrl = selectedPartner ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(referralLink)}` : '';

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied to clipboard!');
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col pb-6">
      {/* Standardized Header */}
      <PageHeader
        title="Partners"
        subtitle="Collaborative network of Creative Agencies, Digital Art Printers, and Freelance Referral Agents."
        metrics={[
          { label: "Total Partners", value: partners.length, color: "cyan" },
          { label: "Total Volume", value: `${totalSqFt.toLocaleString()} SqFt`, color: "amber" },
          { label: "Settled Payouts", value: `LKR ${totalPaid.toLocaleString()}`, color: "emerald" },
          { label: "Pending Payouts", value: `LKR ${totalPending.toLocaleString()}`, color: totalPending > 0 ? "warning" : "neutral" }
        ]}
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(0,218,243,0.25)] active:scale-95 flex-shrink-0"
          >
            <Plus size={16} />
            <span>Register Partner</span>
          </button>
        }
      />

      {/* Standardized Filter & Search Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search by partner name, ID, category..."
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        filterOptions={[
          { id: 'all', label: 'All Partners', count: partners.length },
          { id: 'agency', label: 'Creative Agencies', count: agencyCount },
          { id: 'printer', label: 'Art Printers', count: printerCount },
          { id: 'freelancer', label: 'Freelancers', count: freelancerCount }
        ]}
        totalCount={partners.length}
        filteredCount={filteredPartners.length}
      />

      {/* Main Grid split */}
      <div className="flex-1 flex lg:flex-row flex-col gap-6 overflow-hidden min-h-0">
        {/* Left Side: Partner List */}
        <div className="w-full lg:w-1/3 flex flex-col border border-outline-variant/60 bg-surface-container/60 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)] h-full">
          <div className="bg-surface-container-low/80 p-3.5 px-4 border-b border-outline-variant/60 flex justify-between items-center text-xs font-bold text-on-surface-variant uppercase tracking-wider flex-shrink-0">
            <span className="flex items-center gap-2">
              <Building size={14} className="text-primary" />
              Active Network ({filteredPartners.length})
            </span>
            <span className="text-[10px] text-on-surface-variant/70 lowercase font-medium">
              click to inspect
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-outline-variant/30">
            {filteredPartners.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant text-sm font-medium">
                <Building size={36} className="mx-auto mb-3 opacity-25 text-on-surface-variant" />
                <p className="font-bold text-on-surface">No partners found</p>
                <p className="text-xs text-on-surface-variant mt-1">Try adjusting your search query or filter category.</p>
              </div>
            ) : (
              filteredPartners.map(p => {
                const isSelected = selectedPartner?.partnerId === p.partnerId;
                const isAgency = p.type === 'Agency';
                const isPrinter = p.type === 'Printer';

                return (
                  <div
                    key={p.partnerId}
                    onClick={() => setSelectedPartner(p)}
                    className={`p-4 cursor-pointer transition-all flex items-center space-x-3.5 ${
                      isSelected 
                        ? 'bg-primary/10 border-l-4 border-primary shadow-inner' 
                        : 'hover:bg-surface-container-high/40 border-l-4 border-transparent'
                    }`}
                  >
                    <UserAvatar user={{ ...p, role: 'partner' }} size="md" />

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-1 mb-0.5">
                        <h4 className="font-bold text-xs text-on-surface truncate">{p.name}</h4>
                        {p.pending > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" title="Pending Commission" />
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 text-[10px] text-on-surface-variant font-mono">
                        <span>{p.partnerId}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          isAgency ? 'bg-primary/10 text-primary' : isPrinter ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {p.type}
                        </span>
                      </div>
                    </div>

                    <ChevronRight size={14} className={`text-on-surface-variant/40 transition-transform ${isSelected ? 'text-primary translate-x-0.5' : ''}`} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Details Inspector */}
        <div className="w-full lg:w-2/3 h-full overflow-y-auto custom-scrollbar pr-1">
          {selectedPartner ? (
            <div className="space-y-6">
              
              {/* Partner Overview details */}
              <div className="bg-surface-container/70 border border-outline-variant/60 rounded-3xl p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.2)] relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                  <div className="flex items-start space-x-5">
                    <UserAvatar user={{ ...selectedPartner, role: 'partner' }} size="xl" className="shadow-md" />

                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap mb-1">
                        <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
                          {selectedPartner.name}
                        </h2>
                        <StatusBadge status={selectedPartner.type} size="xs" />
                      </div>

                      <p className="text-xs font-mono font-bold text-on-surface-variant mb-3">
                        ID: {selectedPartner.partnerId}
                      </p>

                      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                        {selectedPartner.googleLink && (
                          <a 
                            href={selectedPartner.googleLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center text-[10px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 border border-primary/20 transition-colors"
                          >
                            <MapPin size={12} className="mr-1.5" /> Maps Location
                          </a>
                        )}
                        {selectedPartner.socialLink && (
                          <a 
                            href={selectedPartner.socialLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center text-[10px] font-bold text-pink-400 bg-pink-500/10 px-3 py-1.5 rounded-lg hover:bg-pink-500/20 border border-pink-500/20 transition-colors"
                          >
                            <Globe size={12} className="mr-1.5" /> Social Channel
                          </a>
                        )}
                        <button 
                          onClick={() => setShowQR(!showQR)} 
                          className="flex items-center text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors"
                        >
                          <QrCode size={12} className="mr-1.5" /> {showQR ? 'Hide QR' : 'Referral QR'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="bg-surface-container-low text-on-surface-variant px-3.5 py-2 rounded-2xl text-center border border-outline-variant/60">
                      <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Total Volume</p>
                      <p className="text-base sm:text-lg font-black text-on-surface font-mono">
                        {selectedPartner.totalSqFt || 0} <span className="text-[10px] uppercase font-sans">SqFt</span>
                      </p>
                    </div>
                    <div className="bg-emerald-500/10 text-emerald-400 px-3.5 py-2 rounded-2xl text-center border border-emerald-500/20">
                      <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">Paid Out</p>
                      <p className="text-base sm:text-lg font-black font-mono">
                        LKR {(selectedPartner.paid || 0).toLocaleString()}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteId(selectedPartner.partnerId)}
                        className="p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20"
                        title="Delete Partner Profile (Admin Only)"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* QR Code and Referral Link Expandable */}
                {showQR && (
                  <div className="mt-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <img src={qrCodeUrl} alt="Referral QR Code" className="w-24 h-24 rounded-xl border border-outline-variant/80 shadow-sm bg-white p-1" />
                    <div className="flex-1 w-full min-w-0">
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1 tracking-wider">
                        Unique Partner Referral Link
                      </p>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={referralLink} 
                          className="flex-1 px-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-xs font-mono text-on-surface" 
                        />
                        <button 
                          onClick={copyReferralLink} 
                          className="p-2 bg-primary text-on-primary hover:bg-primary/90 rounded-lg transition-colors"
                          title="Copy Link"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-1.5 leading-relaxed">
                        Clients scanning this QR code or visiting this referral link will be automatically assigned to {selectedPartner.name}.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Settlement and AI strategy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Pending Commission Settlement */}
                <div className="bg-surface-container/70 border border-outline-variant/60 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wider flex items-center">
                      <DollarSign size={14} className="mr-1 text-amber-400" />
                      Pending Commission
                    </h3>
                    <p className="text-2xl sm:text-3xl font-black text-on-surface mb-4 font-mono">
                      LKR {(selectedPartner.pending || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                      Outstanding commission for confirmed steel framing referral jobs awaiting final vendor disbursement.
                    </p>
                  </div>

                  <button
                    onClick={() => handleSettleCommission(selectedPartner)}
                    disabled={!selectedPartner.pending || selectedPartner.pending <= 0}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 ${
                      selectedPartner.pending > 0 
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.25)]' 
                        : 'bg-surface-container-high text-on-surface-variant/50 cursor-not-allowed border border-outline-variant/40'
                    }`}
                  >
                    <Check size={16} />
                    <span>Mark Balance as Settled</span>
                  </button>
                </div>

                {/* Gemini AI Strategic Advice */}
                <div className="bg-surface-container/70 border border-outline-variant/60 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider flex items-center">
                      <Sparkles size={14} className="mr-1.5 text-cyan-400" />
                      Relationship Strategy Advisor
                    </h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                      Generate tailored business growth strategies, commission tier recommendations, and localized gallery marketing ideas powered by Gemini AI.
                    </p>
                  </div>

                  <button
                    onClick={() => handleGenerateStrategy(selectedPartner)}
                    className="w-full py-3.5 bg-primary/15 text-primary hover:bg-primary hover:text-on-primary border border-primary/30 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 active:scale-95"
                  >
                    <Sparkles size={16} />
                    <span>Consult Gemini AI Strategy</span>
                  </button>
                </div>

                {/* Referral pipeline */}
                <div className="bg-surface-container/70 border border-outline-variant/60 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15)] h-[380px] flex flex-col">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant/40 flex-shrink-0">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center">
                      <Clock size={14} className="mr-2 text-primary" />
                      Referral Pipeline
                    </h3>
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      {relations?.referrals.length || 0} leads
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                    {relations?.referrals.length === 0 ? (
                      <div className="text-[11px] text-on-surface-variant/60 italic py-12 text-center bg-surface-container-low/50 border border-dashed border-outline-variant rounded-2xl">
                        No active referral leads found for this partner ID.
                      </div>
                    ) : (
                      relations?.referrals.map(lead => (
                        <div key={lead.id} className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/50 hover:border-primary/40 transition-all">
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="font-bold text-xs text-on-surface truncate pr-2 uppercase">
                              {lead.company || lead.name}
                            </span>
                            <StatusBadge status={lead.stage || 'Intake'} size="xs" />
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-outline-variant/30 text-[10px] text-on-surface-variant font-mono">
                            <span>Value: LKR {(lead.value || 0).toLocaleString()}</span>
                            <span className="text-emerald-400 font-bold">
                              Comm: LKR {((lead.totalSqFt || 0) * 53.5).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Shared production jobs */}
                <div className="bg-surface-container/70 border border-outline-variant/60 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15)] h-[380px] flex flex-col">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant/40 flex-shrink-0">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center">
                      <Layers size={14} className="mr-2 text-cyan-400" />
                      Shared Production Jobs
                    </h3>
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      {relations?.productions.length || 0} jobs
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                    {relations?.productions.length === 0 ? (
                      <div className="text-[11px] text-on-surface-variant/60 italic py-12 text-center bg-surface-container-low/50 border border-dashed border-outline-variant rounded-2xl">
                        No production fabrication jobs currently assigned.
                      </div>
                    ) : (
                      relations?.productions.map(proj => (
                        <div key={proj.jobNo} className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/50 hover:border-primary/40 transition-all">
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="font-bold text-xs text-on-surface font-mono">{proj.jobNo}</span>
                            <StatusBadge status={proj.status || 'Fabricating'} size="xs" />
                          </div>
                          <p className="text-[11px] text-on-surface-variant leading-snug line-clamp-2 mb-1.5 italic">
                            "{proj.scope}"
                          </p>
                          <p className="text-[9px] text-on-surface-variant/70 font-medium">Assigned Tech: {proj.assignee}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/60 rounded-3xl text-on-surface-variant bg-surface-container/40 p-8 text-center">
              <Building size={56} className="mb-3 opacity-20 text-on-surface" />
              <h3 className="font-bold text-base text-on-surface">No Partner Selected</h3>
              <p className="text-xs max-w-sm text-on-surface-variant mt-1.5 leading-relaxed">
                Select a referral partner, design agency, or art printer to view their status, payout records, QR referral channels, and linked jobs.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Standardized New Partner Modal */}
      {showCreateModal && (
        <ModalWrapper
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          maxWidth="max-w-md"
          height="h-auto max-h-[85vh]"
          ariaLabel="Register Art Partner"
        >
          <div className="px-6 py-5 border-b border-outline-variant bg-surface-container-low flex justify-between items-center flex-shrink-0">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-on-surface">
                Register Art Partner
              </h3>
              <p className="text-[10px] uppercase font-bold text-primary tracking-widest mt-0.5">
                Strategic Alliance & Referral Network
              </p>
            </div>
            <button 
              onClick={() => setShowCreateModal(false)} 
              className="p-2 bg-surface-container-high text-on-surface-variant rounded-full hover:bg-surface-variant transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                Partner / Agency Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Colombo Canvas Studio"
                value={newPartner.name}
                onChange={(e) => setNewPartner(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                Partner Category *
              </label>
              <select
                value={newPartner.type}
                onChange={(e) => setNewPartner(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
              >
                <option value="Agency">Creative Agency</option>
                <option value="Printer">Digital Art Printer</option>
                <option value="Freelancer">Freelance Designer</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Google Maps Location Link
                </label>
                <input
                  type="text"
                  placeholder="https://maps.google.com/..."
                  value={newPartner.googleLink}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, googleLink: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Social Media / Portfolio Link
                </label>
                <input
                  type="text"
                  placeholder="https://instagram.com/..."
                  value={newPartner.socialLink}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, socialLink: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface"
                />
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 border-t border-outline-variant bg-surface-container-low flex justify-end space-x-3 flex-shrink-0">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-5 py-2.5 bg-surface-container-high text-on-surface rounded-xl font-bold text-xs hover:bg-surface-container-highest transition-colors border border-outline-variant/60"
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePartner}
              disabled={!newPartner.name.trim()}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(0,218,243,0.2)] active:scale-95 disabled:opacity-50"
            >
              Register Partner
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* Standardized AI Strategy Modal */}
      {showStrategyModal && (
        <ModalWrapper
          isOpen={showStrategyModal}
          onClose={() => setShowStrategyModal(false)}
          maxWidth="max-w-lg"
          height="h-auto max-h-[85vh]"
          ariaLabel="Strategic AI Advisor"
        >
          <div className="px-6 py-5 border-b border-outline-variant bg-surface-container-low flex justify-between items-center flex-shrink-0">
            <h3 className="font-bold text-on-surface flex items-center uppercase tracking-widest text-xs">
              <Sparkles size={16} className="mr-2 text-cyan-400" />
              Gemini Strategy: {selectedPartner?.name}
            </h3>
            <button onClick={() => setShowStrategyModal(false)} className="p-1.5 text-on-surface-variant hover:text-on-surface">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-4">
            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant text-xs sm:text-sm text-on-surface leading-relaxed min-h-[220px] whitespace-pre-line font-sans shadow-inner">
              {isGeneratingStrategy ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Sparkles size={32} className="animate-spin text-primary mb-3" />
                  <p className="font-bold text-primary">Consulting Gemini AI strategy advisor...</p>
                </div>
              ) : (
                strategyResult || 'No strategy generated yet.'
              )}
            </div>
          </div>

          <div className="p-4 sm:p-5 border-t border-outline-variant bg-surface-container-low flex justify-end flex-shrink-0">
            <button 
              onClick={() => setShowStrategyModal(false)} 
              className="px-6 py-2.5 bg-surface-container-high text-on-surface hover:bg-surface-variant rounded-xl text-xs font-bold transition-colors border border-outline-variant/60"
            >
              Close Advisory
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* Delete Partner Modal */}
      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeletePartner}
        title="Delete Partner Profile?"
        message="Are you sure you want to permanently delete this partner? All historical referral links and commission records will be removed."
      />
    </div>
  );
}

