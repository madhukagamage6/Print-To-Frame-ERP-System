import React, { useState } from 'react';
import { Search, User, Building, MapPin, Globe, DollarSign, Sparkles, X, Trash2, Check, Clock } from 'lucide-react';
import { generateText } from '../../services/gemini';
import DeleteModal from '../common/DeleteModal';

export default function Partners({ partners = [], setPartners, dataStore, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredPartners = partners.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(query) ||
      p.partnerId?.toLowerCase().includes(query)
    );
  });

  const handleCreatePartner = () => {
    if (newPartner.name.trim() === '') return;

    const nextId = partners.length > 0 ? Math.max(...partners.map(p => p.id)) + 1 : 1;
    const lastCode = partners.length > 0 ? partners[partners.length - 1].partnerId : 'P-1000';
    const num = parseInt(lastCode.split('-')[1]) + 1;
    
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
    setShowCreateModal(false);
    setNewPartner({ name: '', type: 'Agency', googleLink: '', socialLink: '' });
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
          ? { ...p, paid: p.paid + p.pending, pending: 0 }
          : p
      ));
      setSelectedPartner(prev => ({
        ...prev,
        paid: prev.paid + prev.pending,
        pending: 0
      }));
    }
  };

  const handleDeletePartner = () => {
    if (deleteId) {
      setPartners(prev => prev.filter(p => p.partnerId !== deleteId));
      if (selectedPartner?.partnerId === deleteId) {
        setSelectedPartner(null);
      }
      setDeleteId(null);
    }
  };

  const relations = selectedPartner ? getPartnerRelationships(selectedPartner) : null;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end mb-8 gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Partner Network</h1>
          <p className="text-on-surface-variant text-sm">
            Managing Art Studio, Printing Agency, and Strategic Referral relations.
          </p>
        </div>
        
        <div className="flex space-x-4">
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-3 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search partners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-on-primary px-5 py-2 rounded-xl text-sm font-bold  hover:bg-primary/80 text-on-primary transition-all active:scale-95"
          >
            + New Partner
          </button>
        </div>
      </div>

      {/* Grid view */}
      <div className="flex-1 flex lg:flex-row flex-col gap-6 overflow-hidden">
        {/* Left Side: List */}
        <div className="w-full lg:w-1/3 flex flex-col border border-outline-variant bg-surface-container rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,218,243,0.05)] h-full">
          <div className="bg-surface-container-low p-4 border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Active Network ({filteredPartners.length})
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredPartners.map(p => (
              <div
                key={p.partnerId}
                onClick={() => setSelectedPartner(p)}
                className={`p-4 border-b border-outline-variant/50 cursor-pointer transition-all flex items-center space-x-4 ${
                  selectedPartner?.partnerId === p.partnerId ? 'bg-primary/10 border-l-4 border-primary shadow-inner' : 'hover:bg-surface-container-low border-l-4 border-transparent'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-on-surface shadow-[0_4px_20px_rgba(0,218,243,0.05)] ${
                  p.type === 'Agency' ? 'bg-primary/100' : p.type === 'Printer' ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary'
                }`}>
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-bold text-xs text-on-surface truncate">{p.name}</h4>
                    {p.pending > 0 && <span className="w-2 h-2 rounded-full bg-secondary text-on-secondary animate-pulse" />}
                  </div>
                  <p className="text-[10px] text-on-surface-variant font-medium">
                    {p.partnerId} • <span className="text-on-surface-variant italic uppercase">{p.type}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Details */}
        <div className="w-full lg:w-2/3 h-full overflow-y-auto pr-1">
          {selectedPartner ? (
            <div className="space-y-6">
              
              {/* Partner Overview details */}
              <div className="bg-surface-container border border-outline-variant rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,218,243,0.05)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 flex space-x-3">
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteId(selectedPartner.partnerId)}
                      className="p-3 bg-error/10 text-error hover:bg-error hover:text-on-error rounded-2xl transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)] h-fit self-center"
                      title="Delete Partner Profile (Admin Only)"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <div className="bg-surface-container-low text-on-surface-variant px-4 py-2 rounded-2xl text-center border border-outline-variant/50">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 opacity-50">Total Vol</p>
                    <p className="text-xl font-extrabold">{selectedPartner.totalSqFt || 0} <span className="text-[10px] uppercase">SqFt</span></p>
                  </div>
                  <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl text-center border border-indigo-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 opacity-70">Paid Out</p>
                    <p className="text-xl font-extrabold">LKR {selectedPartner.paid?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-6">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-3xl text-on-surface shadow-[0_8px_30px_rgba(0,218,243,0.15)] ${
                    selectedPartner.type === 'Agency' ? 'bg-primary/100' : selectedPartner.type === 'Printer' ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary'
                  }`}>
                    {selectedPartner.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-on-surface mb-1">{selectedPartner.name}</h2>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                      {selectedPartner.partnerId} • {selectedPartner.type}
                    </p>
                    <div className="flex items-center space-x-4">
                      {selectedPartner.googleLink && (
                        <a href={selectedPartner.googleLink} target="_blank" rel="noreferrer" className="flex items-center text-[10px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">
                          <MapPin size={12} className="mr-2" /> Maps Location
                        </a>
                      )}
                      {selectedPartner.socialLink && (
                        <a href={selectedPartner.socialLink} target="_blank" rel="noreferrer" className="flex items-center text-[10px] font-bold text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg hover:bg-pink-100 transition-colors">
                          <Globe size={12} className="mr-2" /> Social Handle
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Settlement and AI strategy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Pending payouts */}
                <div className="bg-secondary/10 border border-emerald-100 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,218,243,0.05)] overflow-hidden relative">
                  <div className="relative z-10">
                    <h3 className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-widest flex items-center">
                      <DollarSign size={14} className="mr-1.5" />
                      Pending Commission
                    </h3>
                    <p className="text-3xl font-extrabold text-emerald-900 mb-6 font-mono tracking-tighter">
                      LKR {selectedPartner.pending?.toLocaleString() || 0}
                    </p>
                    <button
                      onClick={() => handleSettleCommission(selectedPartner)}
                      disabled={selectedPartner.pending <= 0}
                      className={`w-full py-4 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-[0_4px_25px_rgba(0,218,243,0.1)] active:scale-95 ${
                        selectedPartner.pending > 0 
                          ? 'bg-secondary text-on-secondary hover:bg-secondary/80 text-on-primary ' 
                          : 'bg-emerald-200 text-emerald-400 cursor-not-allowed'
                      }`}
                    >
                      <Check size={16} />
                      <span>Mark balance as Settled</span>
                    </button>
                  </div>
                </div>

                {/* Gemini advice */}
                <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,218,243,0.05)] flex flex-col justify-between">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-on-surface mb-2 uppercase tracking-widest flex items-center">
                      <Sparkles size={14} className="mr-1.5 text-primary" />
                      Relationship Strategy
                    </h3>
                    <p className="text-xs text-on-surface-variant italic leading-relaxed">
                      Consult with Gemini AI to generate customized relationship growth strategies for this partner.
                    </p>
                  </div>
                  <button
                    onClick={() => handleGenerateStrategy(selectedPartner)}
                    className="w-full py-4 bg-primary text-on-primary hover:bg-primary/80 text-on-primary rounded-2xl font-bold text-xs  transition-all flex items-center justify-center space-x-2 active:scale-95"
                  >
                    <Sparkles size={16} />
                    <span>Consult Gemini AI Strategy</span>
                  </button>
                </div>

                {/* Referral pipeline */}
                <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,218,243,0.05)] h-[400px] flex flex-col">
                  <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center">
                    <Clock size={16} className="mr-2 text-primary" />
                    Referral Pipeline
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
                    {relations?.referrals.length === 0 ? (
                      <p className="text-[10px] text-on-surface-variant italic py-8 text-center bg-surface-container-low/50 border border-dashed border-outline-variant rounded-2xl">
                        No referrals found for this agent.
                      </p>
                    ) : (
                      relations?.referrals.map(lead => (
                        <div key={lead.id} className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/50 hover:shadow-[0_4px_20px_rgba(0,218,243,0.05)] transition-all border-l-4 border-indigo-400">
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="font-bold text-xs text-on-surface truncate pr-2 uppercase">
                              {lead.company || lead.name}
                            </span>
                            <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded leading-none">
                              {lead.stage}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-outline-variant/50">
                            <span className="text-[10px] text-on-surface-variant font-medium">
                              Value: LKR {lead.value?.toLocaleString()}
                            </span>
                            <div className="text-right">
                              <p className="text-[8px] text-on-surface-variant font-bold uppercase tracking-wide">Commission</p>
                              <p className="text-xs font-bold text-secondary leading-none">
                                LKR {((lead.totalSqFt || 0) * 53.5).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Shared projects */}
                <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,218,243,0.05)] h-[400px] flex flex-col">
                  <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center">
                    <Building size={16} className="mr-2 text-error" />
                    Shared Production Jobs
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
                    {relations?.productions.length === 0 ? (
                      <p className="text-[10px] text-on-surface-variant italic py-8 text-center bg-surface-container-low/50 border border-dashed border-outline-variant rounded-2xl">
                        No production fabrication jobs linked.
                      </p>
                    ) : (
                      relations?.productions.map(proj => (
                        <div key={proj.jobNo} className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/50 border-l-4 border-error/30">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-xs text-on-surface">{proj.jobNo}</span>
                            <span className="text-[9px] font-extrabold text-error italic">{proj.status}</span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant leading-snug line-clamp-2 mb-2 italic">
                            "{proj.scope}"
                          </p>
                          <p className="text-[9px] text-on-surface-variant font-medium">Assigned to: {proj.assignee}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-outline-variant rounded-3xl text-on-surface-variant bg-surface-container-low/50">
              <User size={64} className="mb-4 opacity-10" />
              <h3 className="font-bold text-on-surface-variant">No Partner Selected</h3>
              <p className="text-sm max-w-xs text-center mt-2">
                Select a referral partner, design agency, or printer to view their status, payout records, and pipelines.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Partner modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-surface-container-highest/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container rounded-3xl shadow-[0_10px_40px_rgba(0,218,243,0.2)] w-full max-w-md overflow-hidden">
            <div className="p-8">
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">
                <h3 className="text-xl font-extrabold text-on-surface">Register Art Partner</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-on-surface-variant hover:text-on-surface-variant">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">Partner/Agency Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Colombo Print Shop"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">Partner Category</label>
                  <select
                    value={newPartner.type}
                    onChange={(e) => setNewPartner(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 bg-surface-container"
                  >
                    <option value="Agency">Creative Agency</option>
                    <option value="Printer">Digital Art Printer</option>
                    <option value="Freelancer">Freelance Designer</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">Google Map Link</label>
                    <input
                      type="text"
                      placeholder="https://maps..."
                      value={newPartner.googleLink}
                      onChange={(e) => setNewPartner(prev => ({ ...prev, googleLink: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">Social Media Link</label>
                    <input
                      type="text"
                      placeholder="https://instagram..."
                      value={newPartner.socialLink}
                      onChange={(e) => setNewPartner(prev => ({ ...prev, socialLink: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreatePartner}
                  className="w-full py-4 bg-primary text-on-primary rounded-2xl font-bold text-sm shadow-[0_10px_40px_rgba(0,218,243,0.2)] hover:bg-surface-container-highest transition-all mt-4"
                >
                  Add to Network
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Strategy modal */}
      {showStrategyModal && (
        <div className="fixed inset-0 bg-surface-container-highest/60 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-surface-container rounded-3xl shadow-[0_0_50px_rgba(0,218,243,0.25)] w-full max-w-lg overflow-hidden border border-outline-variant">
            <div className="p-8">
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
                <h3 className="font-extrabold text-on-surface flex items-center uppercase tracking-widest text-xs">
                  <Sparkles size={16} className="mr-2 text-primary" />
                  Gemini Art Strategy for {selectedPartner.name}
                </h3>
                <button onClick={() => setShowStrategyModal(false)} className="text-on-surface-variant hover:text-on-surface-variant">
                  <X size={20} />
                </button>
              </div>

              <div className="bg-primary/10/50 p-6 rounded-2xl border border-indigo-100 text-sm text-on-surface leading-relaxed min-h-[250px] whitespace-pre-line shadow-inner">
                {isGeneratingStrategy ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Sparkles size={32} className="animate-spin text-primary mb-4" />
                    <p className="font-bold text-indigo-900">Formulating partner roadmap...</p>
                  </div>
                ) : strategyResult}
              </div>

              <div className="mt-8 flex justify-end">
                <button onClick={() => setShowStrategyModal(false)} className="px-8 py-3 bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high">
                  Close Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeletePartner}
        title="Delete Partner?"
        message="Are you sure you want to permanently delete this partner? All historical commissions will be removed."
      />
    </div>
  );
}
