import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, User, Building, MapPin, Globe, DollarSign, Sparkles, X, 
  Trash2, Check, Clock, Link, QrCode, Copy, Plus, ChevronRight,
  ExternalLink, Layers, ArrowUpRight, ShieldCheck, FileText, CheckCircle2,
  AlertCircle, Download, CreditCard, Send, Handshake, Filter, Phone, Mail,
  Share2, ArrowDownRight, Printer
} from 'lucide-react';
import { generateText } from '../../services/gemini';
import { toast } from '../../utils/toast';
import DeleteModal from '../common/DeleteModal';
import { PageHeader, FilterBar, StatusBadge, ModalWrapper, UserAvatar } from '../common/ui';
import PartnerQRModal from './PartnerQRModal';
import { 
  subscribeToCollection, 
  addDocument, 
  updateDocument, 
  deleteDocument,
  COLLECTIONS 
} from '../../services/firestoreSync';

export default function Partners({ partners = [], setPartners, dataStore, currentUser }) {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'applications' | 'settlements'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Applications (Vetting Queue)
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [vettingCommissionRate, setVettingCommissionRate] = useState(0.05); // 5% default

  // QR Modal
  const [qrPartner, setQrPartner] = useState(null);

  // Settlements
  const [payouts, setPayouts] = useState([]);
  const [settlementPartner, setSettlementPartner] = useState(null);
  const [bankRefInput, setBankRefInput] = useState('');

  // AI Strategy
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [strategyResult, setStrategyResult] = useState('');
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Administrator';

  // Real-time listener for partner applications
  useEffect(() => {
    const unsubApps = subscribeToCollection(COLLECTIONS.PARTNER_APPLICATIONS, (data) => {
      setApplications(data || []);
    });
    const unsubPayouts = subscribeToCollection(COLLECTIONS.PARTNER_PAYOUTS, (data) => {
      setPayouts(data || []);
    });
    return () => {
      unsubApps();
      unsubPayouts();
    };
  }, []);

  const pendingAppsCount = useMemo(() => {
    return applications.filter(a => a.status === 'Pending' || a.status === 'NeedsInfo').length;
  }, [applications]);

  // Summary Metrics
  const totalSqFt = partners.reduce((acc, p) => acc + (Number(p.totalSqFt) || 0), 0);
  const totalPaid = partners.reduce((acc, p) => acc + (Number(p.paid) || 0), 0);
  const totalPending = partners.reduce((acc, p) => acc + (Number(p.pending) || 0), 0);

  const filteredPartners = partners.filter(p => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      p.name?.toLowerCase().includes(query) ||
      p.partnerId?.toLowerCase().includes(query) ||
      p.type?.toLowerCase().includes(query) ||
      p.contactPerson?.toLowerCase().includes(query)
    );

    if (!matchesSearch) return false;
    if (activeFilter === 'agency') return p.type === 'Agency';
    if (activeFilter === 'printer') return p.type === 'Printer';
    if (activeFilter === 'freelancer') return p.type === 'Freelancer';
    return true;
  });

  // Calculate dynamic commissions per partner from linked Deals
  const partnerCommissions = useMemo(() => {
    const allLeads = dataStore?.leads || [];
    const map = {};

    partners.forEach(p => {
      const pid = p.partnerId || p.id;
      const refDeals = allLeads.filter(l => (l.partnerId === pid || l.agentId === pid) && l.isDeal);
      const totalContractValue = refDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      const rate = Number(p.commissionRate) || 0.05;
      const earned = totalContractValue * rate;
      const paid = Number(p.paid) || 0;
      const payable = Math.max(0, earned - paid);

      map[pid] = {
        partner: p,
        dealCount: refDeals.length,
        totalContractValue,
        rate,
        earned,
        paid,
        payable,
        deals: refDeals
      };
    });

    return map;
  }, [partners, dataStore?.leads]);

  // ── Approval Handler ──────────────────────────────────────────────────────
  const handleApproveApplication = async (app) => {
    try {
      const lastCode = partners.length > 0 ? partners[partners.length - 1].partnerId : 'P-1000';
      const num = parseInt(lastCode.split('-')[1] || '1000') + 1;
      const partnerId = `P-${num}`;
      const referralCode = `PTF-REF-${num}`;

      const newPartnerEntry = {
        partnerId,
        referralCode,
        name: app.businessName || app.applicantName,
        contactPerson: app.contactName || app.applicantName,
        type: 'Studio Partner',
        phone: app.phone || '',
        email: app.email || '',
        address: app.address || '',
        city: app.city || 'Colombo',
        specialties: app.specialties || [],
        brNumber: app.brNumber || '',
        bankDetails: app.bankDetails || {},
        commissionRate: vettingCommissionRate,
        totalSqFt: 0,
        paid: 0,
        pending: 0,
        status: 'Active',
        joinedAt: new Date().toISOString(),
      };

      await addDocument(COLLECTIONS.PARTNERS, newPartnerEntry, partnerId);
      await updateDocument(COLLECTIONS.PARTNER_APPLICATIONS, app._firestoreId || app.applicationId, {
        status: 'Approved',
        partnerId,
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser?.email || 'Admin',
      });

      setSelectedApplication(null);
      toast.success(`Approved ${app.businessName}! Assigned ID: ${partnerId}`);
      setQrPartner(newPartnerEntry);
    } catch (err) {
      toast.error('Failed to approve: ' + err.message);
    }
  };

  const handleRejectApplication = async (app, reason = 'Did not meet requirements') => {
    try {
      await updateDocument(COLLECTIONS.PARTNER_APPLICATIONS, app._firestoreId || app.applicationId, {
        status: 'Rejected',
        rejectionReason: reason,
        rejectedAt: new Date().toISOString(),
        rejectedBy: currentUser?.email || 'Admin',
      });
      setSelectedApplication(null);
      toast.error(`Application ${app.applicationId} marked as Rejected`);
    } catch (err) {
      toast.error('Failed to reject: ' + err.message);
    }
  };

  // ── Settlement Payout Handler ─────────────────────────────────────────────
  const handleDisbursePayout = async (e) => {
    e.preventDefault();
    if (!settlementPartner) return;
    const item = partnerCommissions[settlementPartner.partnerId];
    if (!item || item.payable <= 0) {
      toast.error("No outstanding payable balance.");
      return;
    }

    try {
      const payoutId = `PO-${new Date().toISOString().slice(0,7)}-${String(Date.now()).slice(-4)}`;
      const payoutPayload = {
        payoutId,
        partnerId: settlementPartner.partnerId,
        partnerName: settlementPartner.name,
        amount: item.payable,
        bankDetails: settlementPartner.bankDetails || {},
        bankRef: bankRefInput.trim() || 'Direct Transfer',
        dealsIncluded: item.deals.map(d => d.id),
        date: new Date().toISOString(),
        disbursedBy: currentUser?.email || 'Admin',
      };

      await addDocument(COLLECTIONS.PARTNER_PAYOUTS, payoutPayload, payoutId);
      await updateDocument(COLLECTIONS.PARTNERS, settlementPartner._firestoreId || settlementPartner.partnerId, {
        paid: (Number(settlementPartner.paid) || 0) + item.payable,
        pending: 0,
        lastPayoutDate: new Date().toISOString(),
      });

      setSettlementPartner(null);
      setBankRefInput('');
      toast.success(`Disbursed LKR ${item.payable.toLocaleString()} to ${settlementPartner.name}!`);
    } catch (err) {
      toast.error('Payout failed: ' + err.message);
    }
  };

  const exportSettlementCSV = () => {
    const rows = [
      ['Partner ID', 'Partner Name', 'Contact Person', 'Bank Name', 'Branch', 'Account Number', 'Account Name', 'Deals Count', 'Contract Value (LKR)', 'Commission Rate', 'Payable Commission (LKR)']
    ];

    Object.values(partnerCommissions).forEach(c => {
      if (c.payable > 0) {
        rows.push([
          c.partner.partnerId,
          `"${c.partner.name}"`,
          `"${c.partner.contactPerson || ''}"`,
          `"${c.partner.bankDetails?.bankName || ''}"`,
          `"${c.partner.bankDetails?.branchName || ''}"`,
          `"${c.partner.bankDetails?.accountNumber || ''}"`,
          `"${c.partner.bankDetails?.accountName || ''}"`,
          c.dealCount,
          c.totalContractValue,
          `${(c.rate * 100).toFixed(1)}%`,
          c.payable
        ]);
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PTF_Partner_Payouts_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded Bank Transfer Payout CSV!");
  };

  return (
    <div className="space-y-6">
      
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <PageHeader 
        title="Partner Network" 
        subtitle="Manage artisan framing partners, review onboarding applications, and disburse referral commissions."
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs rounded-xl border border-outline transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 size={14} className="text-primary" />
            <span>Invite Partner</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(0,218,243,0.3)] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Partner</span>
          </button>
        </div>
      </PageHeader>

      {/* ── Sub-Navigation Tabs ──────────────────────────────────────────── */}
      <div className="flex items-center space-x-2 border-b border-outline pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline'
          }`}
        >
          <Building size={14} />
          <span>Active Partner Directory</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-black/20 text-on-primary">
            {partners.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'applications'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline'
          }`}
        >
          <ShieldCheck size={14} />
          <span>Onboarding Vetting Queue</span>
          {pendingAppsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-black bg-amber-500 text-black animate-pulse">
              {pendingAppsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settlements')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'settlements'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline'
          }`}
        >
          <CreditCard size={14} />
          <span>Monthly Settlements & Payouts</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────
          TAB 1: ACTIVE PARTNER DIRECTORY
          ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-surface-container-high rounded-2xl border border-outline shadow-sm">
              <span className="block text-[9px] font-black text-on-surface-variant uppercase tracking-wider mb-0.5">Total Partners</span>
              <div className="text-2xl font-black text-on-surface font-mono">{partners.length}</div>
            </div>
            <div className="p-4 bg-surface-container-high rounded-2xl border border-outline shadow-sm">
              <span className="block text-[9px] font-black text-on-surface-variant uppercase tracking-wider mb-0.5">Total Referred SqFt</span>
              <div className="text-2xl font-black text-primary font-mono">{totalSqFt.toLocaleString()} sqft</div>
            </div>
            <div className="p-4 bg-surface-container-high rounded-2xl border border-outline shadow-sm">
              <span className="block text-[9px] font-black text-on-surface-variant uppercase tracking-wider mb-0.5">Total Commission Paid</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">LKR {(totalPaid / 1000).toFixed(0)}k</div>
            </div>
            <div className="p-4 bg-surface-container-high rounded-2xl border border-outline shadow-sm">
              <span className="block text-[9px] font-black text-on-surface-variant uppercase tracking-wider mb-0.5">Pending Settlements</span>
              <div className="text-2xl font-black text-amber-400 font-mono">LKR {(totalPending / 1000).toFixed(0)}k</div>
            </div>
          </div>

          {/* Search & Filter */}
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search by partner name, ID, contact..."
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            filterOptions={[
              { id: 'all', label: 'All Partners' },
              { id: 'agency', label: 'Agencies' },
              { id: 'printer', label: 'Printers' },
              { id: 'freelancer', label: 'Artisans' },
            ]}
          />

          {/* Partners Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPartners.map(partner => {
              const comm = partnerCommissions[partner.partnerId] || { dealCount: 0, payable: 0 };
              return (
                <div 
                  key={partner.partnerId || partner.id}
                  className="bg-surface-container-high rounded-2xl border border-outline p-5 shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/30">
                          {partner.partnerId}
                        </span>
                        <h3 className="text-base font-bold text-on-surface mt-1">{partner.name}</h3>
                        {partner.contactPerson && (
                          <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <User size={12} /> {partner.contactPerson}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setQrPartner(partner)}
                        className="p-2 bg-surface-container-highest hover:bg-primary/15 text-on-surface hover:text-primary rounded-xl border border-outline transition-colors cursor-pointer"
                        title="View & Download Marketing QR Code"
                      >
                        <QrCode size={18} />
                      </button>
                    </div>

                    <div className="p-3 bg-surface-container-highest/60 rounded-xl border border-outline text-xs space-y-1 font-mono">
                      <div className="flex justify-between text-on-surface-variant">
                        <span>Commission Rate:</span>
                        <span className="font-bold text-on-surface">{((partner.commissionRate || 0.05) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-on-surface-variant">
                        <span>Deals Converted:</span>
                        <span className="font-bold text-primary">{comm.dealCount} deals</span>
                      </div>
                      <div className="flex justify-between text-on-surface-variant pt-1 border-t border-outline">
                        <span>Payable Balance:</span>
                        <span className="font-bold text-amber-400">LKR {comm.payable.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-outline flex items-center justify-between gap-2">
                    <button
                      onClick={() => setQrPartner(partner)}
                      className="px-3 py-1.5 bg-primary/15 hover:bg-primary/25 text-primary text-xs font-bold rounded-xl border border-primary/30 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode size={13} /> QR Flyer
                    </button>
                    <button
                      onClick={() => setSelectedPartner(partner)}
                      className="px-3 py-1.5 bg-surface-container-highest hover:bg-surface-container text-on-surface text-xs font-bold rounded-xl border border-outline transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>Details</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          TAB 2: ONBOARDING VETTING QUEUE
          ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="p-4 bg-surface-container-high rounded-2xl border border-outline flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Prospective Partner Applications</h3>
              <p className="text-xs text-on-surface-variant">Review business registrations, applicant credentials, and assign commission rates.</p>
            </div>
            <button
              onClick={() => window.open('/partner/register', '_blank')}
              className="px-3.5 py-1.5 bg-primary/15 text-primary font-bold text-xs rounded-xl border border-primary/30 flex items-center gap-1.5 hover:bg-primary/25 cursor-pointer"
            >
              <ExternalLink size={13} /> Test Public Form
            </button>
          </div>

          {applications.length === 0 ? (
            <div className="p-12 text-center bg-surface-container-high rounded-2xl border border-outline text-on-surface-variant space-y-2">
              <ShieldCheck size={32} className="mx-auto text-primary/50" />
              <p className="text-sm font-bold">Vetting queue is empty</p>
              <p className="text-xs">New registrations from /partner/register will appear here for review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {applications.map(app => (
                <div key={app.applicationId || app._firestoreId} className="bg-surface-container-high rounded-2xl border border-outline p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${
                        app.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}>
                        {app.status || 'Pending Review'}
                      </span>
                      <h4 className="text-base font-bold text-on-surface mt-1.5">{app.businessName}</h4>
                      <p className="text-xs text-on-surface-variant">{app.contactName} ({app.designation || 'Partner'})</p>
                    </div>
                    <span className="font-mono text-xs text-on-surface-variant">{app.applicationId}</span>
                  </div>

                  <div className="p-3 bg-surface-container-highest rounded-xl border border-outline text-xs space-y-1 font-mono">
                    <div>Phone: <span className="text-on-surface font-bold">{app.phone}</span></div>
                    <div>Email: <span className="text-on-surface">{app.email}</span></div>
                    <div>Bank: <span className="text-primary font-bold">{app.bankDetails?.bankName} (Acc: {app.bankDetails?.accountNumber})</span></div>
                  </div>

                  {app.status !== 'Approved' && (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedApplication(app)}
                        className="flex-1 py-2.5 bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ShieldCheck size={14} /> Review & Approve
                      </button>
                      <button
                        onClick={() => handleRejectApplication(app)}
                        className="px-3 py-2.5 bg-surface-container-highest hover:bg-error/20 text-on-surface-variant hover:text-error font-bold text-xs rounded-xl border border-outline transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          TAB 3: MONTHLY COMMISSION SETTLEMENTS
          ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          <div className="p-4 bg-surface-container-high rounded-2xl border border-outline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Monthly Partner Commission Ledger</h3>
              <p className="text-xs text-on-surface-variant">Accrued referral earnings from converted Deals ready for direct bank transfer disbursement.</p>
            </div>
            <button
              onClick={exportSettlementCSV}
              className="px-4 py-2 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 font-bold text-xs rounded-xl border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download size={14} /> Export Bank Transfer CSV
            </button>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-outline overflow-hidden bg-surface-container-high shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-highest border-b-2 border-outline text-xs uppercase font-extrabold text-on-surface tracking-wider">
                  <th className="p-3">Partner ID</th>
                  <th className="p-3">Partner Name</th>
                  <th className="p-3">Bank Account</th>
                  <th className="p-3 text-center">Deals</th>
                  <th className="p-3 text-right">Contract Value</th>
                  <th className="p-3 text-right">Payable Commission</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {Object.values(partnerCommissions).map(({ partner, dealCount, totalContractValue, rate, payable }) => (
                  <tr key={partner.partnerId} className="hover:bg-surface-container-highest/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">{partner.partnerId}</td>
                    <td className="p-3 font-bold text-on-surface">{partner.name}</td>
                    <td className="p-3 font-mono text-[11px] text-on-surface-variant">
                      {partner.bankDetails?.bankName ? `${partner.bankDetails.bankName} - ${partner.bankDetails.accountNumber}` : 'No bank details'}
                    </td>
                    <td className="p-3 text-center font-bold">{dealCount}</td>
                    <td className="p-3 text-right font-mono">LKR {totalContractValue.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-black text-amber-400">
                      LKR {payable.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      {payable > 0 ? (
                        <button
                          onClick={() => setSettlementPartner(partner)}
                          className="px-3 py-1.5 bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs rounded-lg transition-all cursor-pointer"
                        >
                          Disburse
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Partner QR Code Modal ────────────────────────────────────────── */}
      {qrPartner && (
        <PartnerQRModal
          isOpen={!!qrPartner}
          onClose={() => setQrPartner(null)}
          partner={qrPartner}
        />
      )}

      {/* ── Partner Vetting & Approval Modal ─────────────────────────────── */}
      {selectedApplication && (
        <ModalWrapper
          isOpen={!!selectedApplication}
          onClose={() => setSelectedApplication(null)}
          maxWidth="max-w-xl"
          height="h-auto"
          ariaLabel="Review Partner Application"
        >
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-start pb-3 border-b border-outline">
              <div>
                <h3 className="text-lg font-black text-on-surface">Vetting Application: {selectedApplication.businessName}</h3>
                <p className="text-xs text-on-surface-variant">Reference ID: {selectedApplication.applicationId}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-surface-container-highest rounded-2xl border border-outline">
                <div><span className="text-on-surface-variant">Applicant:</span> <span className="font-bold text-on-surface">{selectedApplication.contactName}</span></div>
                <div><span className="text-on-surface-variant">Phone:</span> <span className="font-bold font-mono text-primary">{selectedApplication.phone}</span></div>
                <div><span className="text-on-surface-variant">Email:</span> <span className="text-on-surface">{selectedApplication.email}</span></div>
                <div><span className="text-on-surface-variant">BR Number:</span> <span className="font-mono text-on-surface">{selectedApplication.brNumber}</span></div>
              </div>

              {/* Commission Rate Slider */}
              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/30 space-y-2">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-primary">Allocated Commission Rate:</span>
                  <span className="text-base font-black font-mono text-primary">{(vettingCommissionRate * 100).toFixed(1)}%</span>
                </div>
                <input 
                  type="range"
                  min="0.01"
                  max="0.15"
                  step="0.005"
                  value={vettingCommissionRate}
                  onChange={(e) => setVettingCommissionRate(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-on-surface-variant font-mono">
                  <span>1.0% (Basic)</span>
                  <span>5.0% (Standard)</span>
                  <span>15.0% (Premium)</span>
                </div>
              </div>

              {/* Documents preview */}
              <div>
                <label className="block text-xs uppercase font-bold text-on-surface mb-2 tracking-wider">Submitted Verification Documents</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-surface-container-highest rounded-xl border border-outline text-center">
                    <FileText size={20} className="mx-auto text-primary mb-1" />
                    <div className="text-[11px] font-bold text-on-surface">BR Certificate</div>
                    {selectedApplication.documents?.brCertUrl ? (
                      <a href={selectedApplication.documents.brCertUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline mt-1 block">View Document</a>
                    ) : (
                      <span className="text-[10px] text-on-surface-variant">Not provided</span>
                    )}
                  </div>
                  <div className="p-3 bg-surface-container-highest rounded-xl border border-outline text-center">
                    <ShieldCheck size={20} className="mx-auto text-primary mb-1" />
                    <div className="text-[11px] font-bold text-on-surface">NIC / Identity</div>
                    {selectedApplication.documents?.nicCopyUrl ? (
                      <a href={selectedApplication.documents.nicCopyUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline mt-1 block">View Document</a>
                    ) : (
                      <span className="text-[10px] text-on-surface-variant">Not provided</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleApproveApplication(selectedApplication)}
                className="flex-1 py-3 bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check size={15} /> Approve & Generate QR Code
              </button>
              <button
                type="button"
                onClick={() => setSelectedApplication(null)}
                className="px-4 py-3 bg-surface-container-highest text-on-surface font-bold text-xs rounded-xl border border-outline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* ── Disburse Settlement Modal ────────────────────────────────────── */}
      {settlementPartner && (
        <ModalWrapper
          isOpen={!!settlementPartner}
          onClose={() => setSettlementPartner(null)}
          maxWidth="max-w-md"
          height="h-auto"
          ariaLabel="Disburse Commission Payout"
        >
          <form onSubmit={handleDisbursePayout} className="p-6 sm:p-8 space-y-6">
            <div className="pb-3 border-b border-outline">
              <h3 className="text-lg font-black text-on-surface">Disburse Partner Commission</h3>
              <p className="text-xs text-on-surface-variant">{settlementPartner.name} ({settlementPartner.partnerId})</p>
            </div>

            <div className="p-4 bg-surface-container-highest rounded-2xl border border-outline space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Payable Amount:</span>
                <span className="text-base font-black font-mono text-amber-400">
                  LKR {partnerCommissions[settlementPartner.partnerId]?.payable.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Bank:</span>
                <span className="font-bold text-on-surface">{settlementPartner.bankDetails?.bankName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Account:</span>
                <span className="font-bold font-mono text-on-surface">{settlementPartner.bankDetails?.accountNumber || 'N/A'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-on-surface mb-1.5 tracking-wider">
                Bank Transfer Reference / Transaction ID *
              </label>
              <input 
                type="text"
                required
                value={bankRefInput}
                onChange={(e) => setBankRefInput(e.target.value)}
                placeholder="e.g. TXN-984218 or Cheque #4912"
                className="w-full px-4 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-mono font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check size={15} /> Confirm Payout Disbursed
              </button>
              <button
                type="button"
                onClick={() => setSettlementPartner(null)}
                className="px-4 py-3 bg-surface-container-highest text-on-surface font-bold text-xs rounded-xl border border-outline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* ── Invite Partner Modal ─────────────────────────────────────────── */}
      {showInviteModal && (
        <ModalWrapper
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          maxWidth="max-w-md"
          height="h-auto"
          ariaLabel="Invite Partner"
        >
          <div className="p-6 sm:p-8 space-y-5">
            <div className="pb-3 border-b border-outline">
              <h3 className="text-lg font-black text-on-surface">Invite a Framing Partner</h3>
              <p className="text-xs text-on-surface-variant">Share the onboarding link with studios, print agencies, or artists.</p>
            </div>

            <div className="p-4 bg-surface-container-highest rounded-2xl border border-outline space-y-2">
              <div className="text-xs font-bold text-on-surface">Registration Portal Link:</div>
              <div className="p-2.5 bg-surface-container-lowest rounded-xl font-mono text-xs text-primary break-all select-all border border-outline">
                {typeof window !== 'undefined' ? `${window.location.origin}/partner/register` : 'https://portal.print2frame.xyz/partner/register'}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}/partner/register` : 'https://portal.print2frame.xyz/partner/register';
                  navigator.clipboard.writeText(url);
                  toast.success("Partner registration link copied!");
                  setShowInviteModal(false);
                }}
                className="flex-1 py-3 bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Copy size={14} /> Copy Registration Link
              </button>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-3 bg-surface-container-highest text-on-surface font-bold text-xs rounded-xl border border-outline cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* ── Legacy Delete Confirmation ───────────────────────────────────── */}
      {deleteId && (
        <DeleteModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={() => {
            setPartners(prev => prev.filter(p => (p.partnerId || p.id) !== deleteId));
            setDeleteId(null);
            toast.success("Partner removed");
          }}
          title="Remove Partner"
          message="Are you sure you want to remove this partner from the network?"
        />
      )}

    </div>
  );
}
