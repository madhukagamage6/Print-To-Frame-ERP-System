import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, User, Building, MapPin, Globe, DollarSign, Sparkles, X, 
  Trash2, Check, Clock, Link, QrCode, Copy, Plus, ChevronRight,
  ExternalLink, Layers, ArrowUpRight, ShieldCheck, FileText, CheckCircle2,
  AlertCircle, Download, CreditCard, Send, Handshake, Filter, Phone, Mail,
  Share2, ArrowDownRight, Printer, Edit3, Upload, FileCheck, Save
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
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
import { formatPhone, validatePhone, validateEmail } from '../../utils/validation';

export default function Partners({ partners = [], setPartners, dataStore, currentUser }) {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'applications' | 'settlements'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Selected Partner for Detailed View & Editing
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('profile'); // 'profile' | 'financial' | 'documents'
  const [isSavingPartner, setIsSavingPartner] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: '',
    type: 'Agency',
    contactPerson: '',
    phone: '',
    email: '',
    commissionRate: 0.05,
    bankName: '',
    branchName: '',
    accountNumber: '',
    accountName: '',
  });

  // Applications (Vetting Queue)
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [vettingCommissionRate, setVettingCommissionRate] = useState(0.05);

  // QR Modal
  const [qrPartner, setQrPartner] = useState(null);

  // Settlements
  const [payouts, setPayouts] = useState([]);
  const [settlementPartner, setSettlementPartner] = useState(null);
  const [bankRefInput, setBankRefInput] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Administrator';

  // Synchronize editFormData when selectedPartner changes
  useEffect(() => {
    if (selectedPartner) {
      setEditFormData({
        name: selectedPartner.name || '',
        type: selectedPartner.type || 'Studio Partner',
        contactPerson: selectedPartner.contactPerson || '',
        designation: selectedPartner.designation || 'Director / Owner',
        phone: selectedPartner.phone || '',
        email: selectedPartner.email || '',
        address: selectedPartner.address || '',
        city: selectedPartner.city || 'Colombo',
        brNumber: selectedPartner.brNumber || '',
        commissionRate: Number(selectedPartner.commissionRate) || 0.05,
        bankDetails: {
          bankName: selectedPartner.bankDetails?.bankName || '',
          branchName: selectedPartner.bankDetails?.branchName || '',
          accountNumber: selectedPartner.bankDetails?.accountNumber || '',
          accountName: selectedPartner.bankDetails?.accountName || '',
        },
        documents: selectedPartner.documents || {
          brCertUrl: selectedPartner.brCertUrl || '',
          agreementUrl: selectedPartner.agreementUrl || '',
          guidelinesUrl: selectedPartner.guidelinesUrl || '',
          nicCopyUrl: selectedPartner.nicCopyUrl || '',
        },
        status: selectedPartner.status || 'Active',
      });
      setActiveModalTab('profile');
    } else {
      setEditFormData(null);
    }
  }, [selectedPartner]);

  // Real-time listener for partner applications and settlements
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

  // ── Save Partner Changes ──────────────────────────────────────────────────
  const handleSavePartnerChanges = async (e) => {
    e.preventDefault();
    if (!selectedPartner || !editFormData) return;

    if (!editFormData.name.trim()) {
      toast.error("Studio / Business name is required.");
      return;
    }

    setIsSavingPartner(true);
    try {
      const docId = selectedPartner._firestoreId || selectedPartner.partnerId;
      const payload = {
        name: editFormData.name.trim(),
        type: editFormData.type,
        contactPerson: editFormData.contactPerson.trim(),
        designation: editFormData.designation.trim(),
        phone: editFormData.phone.trim(),
        email: editFormData.email.trim(),
        address: editFormData.address.trim(),
        city: editFormData.city.trim(),
        brNumber: editFormData.brNumber.trim(),
        commissionRate: Number(editFormData.commissionRate) || 0.05,
        bankDetails: editFormData.bankDetails,
        documents: editFormData.documents,
        status: editFormData.status,
        updatedAt: new Date().toISOString(),
      };

      await updateDocument(COLLECTIONS.PARTNERS, docId, payload);
      
      // Update local state
      setPartners(prev => prev.map(p => 
        (p._firestoreId === docId || p.partnerId === docId) ? { ...p, ...payload } : p
      ));

      setSelectedPartner(prev => ({ ...prev, ...payload }));
      toast.success(`Updated ${editFormData.name} successfully!`);
    } catch (err) {
      console.error("Error saving partner:", err);
      toast.error("Failed to save changes: " + err.message);
    } finally {
      setIsSavingPartner(false);
    }
  };

  // ── Upload Document to Storage Vault ──────────────────────────────────────
  const handleUploadDocument = async (e, docKey) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPartner) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB.");
      return;
    }

    setUploadingDocKey(docKey);
    try {
      const partnerId = selectedPartner.partnerId || 'P-GEN';
      const fileRef = ref(storage, `partners/documents/${partnerId}/${docKey}_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      const updatedDocs = {
        ...(editFormData?.documents || {}),
        [docKey]: downloadUrl
      };

      setEditFormData(prev => ({
        ...prev,
        documents: updatedDocs
      }));

      // Immediately save to Firestore
      const docId = selectedPartner._firestoreId || selectedPartner.partnerId;
      await updateDocument(COLLECTIONS.PARTNERS, docId, {
        documents: updatedDocs,
        updatedAt: new Date().toISOString()
      });

      setPartners(prev => prev.map(p => 
        (p._firestoreId === docId || p.partnerId === docId) ? { ...p, documents: updatedDocs } : p
      ));

      toast.success(`Document uploaded and secured in vault!`);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload document: " + err.message);
    } finally {
      setUploadingDocKey(null);
    }
  };

  // ── Create New Partner Manually ───────────────────────────────────────────
  const handleCreatePartner = async () => {
    if (!newPartner.name.trim()) {
      toast.error("Please enter a partner name");
      return;
    }

    const nextId = partners.length > 0 ? Math.max(...partners.map(p => Number(p.id) || 0)) + 1 : 1;
    const lastCode = partners.length > 0 ? partners[partners.length - 1].partnerId : 'P-1000';
    const num = parseInt(lastCode?.split('-')[1] || '1000') + 1;
    const partnerId = `P-${num}`;
    const referralCode = `PTF-REF-${num}`;

    const newEntry = {
      id: nextId,
      partnerId,
      referralCode,
      name: newPartner.name.trim(),
      type: newPartner.type,
      contactPerson: newPartner.contactPerson.trim(),
      phone: newPartner.phone.trim(),
      email: newPartner.email.trim(),
      commissionRate: Number(newPartner.commissionRate) || 0.05,
      bankDetails: {
        bankName: newPartner.bankName.trim(),
        branchName: newPartner.branchName.trim(),
        accountNumber: newPartner.accountNumber.trim(),
        accountName: newPartner.accountName.trim(),
      },
      documents: {},
      totalSqFt: 0,
      paid: 0,
      pending: 0,
      status: 'Active',
      joinedAt: new Date().toISOString(),
    };

    try {
      await addDocument(COLLECTIONS.PARTNERS, newEntry, partnerId);
      setPartners(prev => [...prev, newEntry]);
      setShowCreateModal(false);
      setNewPartner({
        name: '',
        type: 'Agency',
        contactPerson: '',
        phone: '',
        email: '',
        commissionRate: 0.05,
        bankName: '',
        branchName: '',
        accountNumber: '',
        accountName: '',
      });
      toast.success(`Partner ${newEntry.name} registered (${partnerId})`);
      setQrPartner(newEntry);
    } catch (err) {
      toast.error("Failed to register partner: " + err.message);
    }
  };

  // ── Approval Handler for Vetting Queue ────────────────────────────────────
  const handleApproveApplication = async (app) => {
    try {
      const lastCode = partners.length > 0 ? partners[partners.length - 1].partnerId : 'P-1000';
      const num = parseInt(lastCode?.split('-')[1] || '1000') + 1;
      const partnerId = `P-${num}`;
      const referralCode = `PTF-REF-${num}`;

      const newPartnerEntry = {
        partnerId,
        referralCode,
        name: app.businessName || app.applicantName,
        contactPerson: app.contactName || app.applicantName,
        designation: app.designation || 'Partner',
        type: 'Studio Partner',
        phone: app.phone || '',
        email: app.email || '',
        address: app.address || '',
        city: app.city || 'Colombo',
        specialties: app.specialties || [],
        brNumber: app.brNumber || '',
        bankDetails: app.bankDetails || {},
        documents: {
          brCertUrl: app.documents?.brCertUrl || '',
          nicCopyUrl: app.documents?.nicCopyUrl || '',
        },
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
                        <span className="font-bold text-on-surface">{((Number(partner.commissionRate) || 0.05) * 100).toFixed(1)}%</span>
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

      {/* ───────────────────────────────────────────────────────────────────
          MODAL: PARTNER DETAILS & DOCUMENT MANAGEMENT VAULT
          ─────────────────────────────────────────────────────────────────── */}
      {selectedPartner && editFormData && (
        <ModalWrapper
          isOpen={!!selectedPartner}
          onClose={() => setSelectedPartner(null)}
          maxWidth="max-w-3xl"
          height="h-auto"
          ariaLabel="Partner Details & Document Vault"
        >
          <form onSubmit={handleSavePartnerChanges} className="p-6 sm:p-8 space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-outline gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-primary/15 text-primary rounded-2xl">
                  <Building size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-on-surface">{editFormData.name}</h3>
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/30">
                      {selectedPartner.partnerId}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Referral Code: <span className="font-mono font-bold text-on-surface">{selectedPartner.referralCode || selectedPartner.partnerId}</span> · Status: <span className="text-emerald-400 font-bold">{editFormData.status}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQrPartner(selectedPartner)}
                  className="px-3 py-1.5 bg-primary/15 text-primary hover:bg-primary/25 font-bold text-xs rounded-xl border border-primary/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode size={14} /> Marketing QR
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex space-x-2 border-b border-outline pb-2">
              <button
                type="button"
                onClick={() => setActiveModalTab('profile')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeModalTab === 'profile'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Studio Profile & Contacts
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('financial')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeModalTab === 'financial'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Commission & Bank Details
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('documents')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeModalTab === 'documents'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Agreements & Document Vault
              </button>
            </div>

            {/* TAB 1: Profile & Contact */}
            {activeModalTab === 'profile' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface mb-1 tracking-wider">
                      Business / Studio Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface mb-1 tracking-wider">
                      Business Reg (BR) Number
                    </label>
                    <input
                      type="text"
                      value={editFormData.brNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, brNumber: e.target.value })}
                      placeholder="e.g. PV-129481"
                      className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface mb-1 tracking-wider">
                      Contact Person Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.contactPerson}
                      onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface mb-1 tracking-wider">
                      Designation / Role
                    </label>
                    <input
                      type="text"
                      value={editFormData.designation}
                      onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface mb-1 tracking-wider">
                      Mobile Number (+94)
                    </label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: formatPhone(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface mb-1 tracking-wider">
                      Official Email
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs uppercase font-bold text-on-surface mb-1 tracking-wider">
                      Studio Address & City
                    </label>
                    <input
                      type="text"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Commission & Bank */}
            {activeModalTab === 'financial' && (
              <div className="space-y-4">
                {/* Commission Slider */}
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase font-bold text-primary tracking-wider">
                      Referral Commission Rate:
                    </span>
                    <span className="text-base font-black font-mono text-primary">
                      {((Number(editFormData.commissionRate) || 0.05) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.15"
                    step="0.005"
                    value={editFormData.commissionRate}
                    onChange={(e) => setEditFormData({ ...editFormData, commissionRate: Number(e.target.value) })}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-on-surface-variant font-mono">
                    <span>1.0% (Basic)</span>
                    <span>5.0% (Standard)</span>
                    <span>15.0% (VIP Tier)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface mb-1 tracking-wider">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.bankDetails?.bankName}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        bankDetails: { ...editFormData.bankDetails, bankName: e.target.value }
                      })}
                      placeholder="e.g. Commercial Bank of Ceylon"
                      className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface mb-1 tracking-wider">
                      Branch Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.bankDetails?.branchName}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        bankDetails: { ...editFormData.bankDetails, branchName: e.target.value }
                      })}
                      placeholder="e.g. Kollupitiya"
                      className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface mb-1 tracking-wider">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={editFormData.bankDetails?.accountNumber}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        bankDetails: { ...editFormData.bankDetails, accountNumber: e.target.value }
                      })}
                      placeholder="e.g. 1000294819"
                      className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-mono font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface mb-1 tracking-wider">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.bankDetails?.accountName}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        bankDetails: { ...editFormData.bankDetails, accountName: e.target.value }
                      })}
                      placeholder="Name as in bank book"
                      className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-xs sm:text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Document Vault */}
            {activeModalTab === 'documents' && (
              <div className="space-y-4">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Secure storage vault for verified agreements, business registration, and mutual operational quality guidelines.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Doc 1: BR Cert */}
                  <div className="p-4 bg-surface-container-highest/70 rounded-2xl border border-outline flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-primary" />
                        <span className="text-xs font-bold text-on-surface">BR Certificate</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-1">Business Registration Certificate</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editFormData.documents?.brCertUrl ? (
                        <a
                          href={editFormData.documents.brCertUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-primary/15 text-primary hover:bg-primary/25 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink size={12} /> View File
                        </a>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant font-mono">Not Uploaded</span>
                      )}
                      <label className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold border border-outline cursor-pointer transition-colors">
                        {uploadingDocKey === 'brCertUrl' ? 'Uploading...' : 'Upload'}
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => handleUploadDocument(e, 'brCertUrl')}
                          disabled={uploadingDocKey === 'brCertUrl'}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Doc 2: Signed Partner Agreement */}
                  <div className="p-4 bg-surface-container-highest/70 rounded-2xl border border-outline flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileCheck size={18} className="text-emerald-400" />
                        <span className="text-xs font-bold text-on-surface">Partner Agreement</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-1">Signed Mutual Framing Terms</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editFormData.documents?.agreementUrl ? (
                        <a
                          href={editFormData.documents.agreementUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink size={12} /> View Agreement
                        </a>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant font-mono">Pending Signature</span>
                      )}
                      <label className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold border border-outline cursor-pointer transition-colors">
                        {uploadingDocKey === 'agreementUrl' ? 'Uploading...' : 'Upload'}
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => handleUploadDocument(e, 'agreementUrl')}
                          disabled={uploadingDocKey === 'agreementUrl'}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Doc 3: Operational Guidelines */}
                  <div className="p-4 bg-surface-container-highest/70 rounded-2xl border border-outline flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-amber-400" />
                        <span className="text-xs font-bold text-on-surface">Operational Guidelines</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-1">Signed Framing Quality Standards</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editFormData.documents?.guidelinesUrl ? (
                        <a
                          href={editFormData.documents.guidelinesUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink size={12} /> View Guidelines
                        </a>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant font-mono">Not Uploaded</span>
                      )}
                      <label className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold border border-outline cursor-pointer transition-colors">
                        {uploadingDocKey === 'guidelinesUrl' ? 'Uploading...' : 'Upload'}
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => handleUploadDocument(e, 'guidelinesUrl')}
                          disabled={uploadingDocKey === 'guidelinesUrl'}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Doc 4: NIC / Identity */}
                  <div className="p-4 bg-surface-container-highest/70 rounded-2xl border border-outline flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <User size={18} className="text-primary" />
                        <span className="text-xs font-bold text-on-surface">NIC / Passport Copy</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-1">Signatory Identity Verification</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {editFormData.documents?.nicCopyUrl ? (
                        <a
                          href={editFormData.documents.nicCopyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-primary/15 text-primary hover:bg-primary/25 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink size={12} /> View NIC
                        </a>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant font-mono">Not Uploaded</span>
                      )}
                      <label className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold border border-outline cursor-pointer transition-colors">
                        {uploadingDocKey === 'nicCopyUrl' ? 'Uploading...' : 'Upload'}
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => handleUploadDocument(e, 'nicCopyUrl')}
                          disabled={uploadingDocKey === 'nicCopyUrl'}
                        />
                      </label>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-outline flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDeleteId(selectedPartner.partnerId || selectedPartner.id)}
                className="px-4 py-2.5 bg-surface-container-highest hover:bg-error/20 text-on-surface-variant hover:text-error font-bold text-xs rounded-xl border border-outline transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Remove Partner
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPartner(null)}
                  className="px-4 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl border border-outline cursor-pointer transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSavingPartner}
                  className={`px-6 py-2.5 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSavingPartner ? 'opacity-50 cursor-wait' : ''
                  }`}
                >
                  <Save size={14} />
                  <span>{isSavingPartner ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>

          </form>
        </ModalWrapper>
      )}

      {/* ── Add Partner Manual Modal ─────────────────────────────────────── */}
      {showCreateModal && (
        <ModalWrapper
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          maxWidth="max-w-md"
          height="h-auto"
          ariaLabel="Add New Partner"
        >
          <div className="p-6 sm:p-8 space-y-4">
            <div className="pb-2 border-b border-outline">
              <h3 className="text-base font-bold text-on-surface">Add Partner to Network</h3>
              <p className="text-xs text-on-surface-variant">Register a new studio or framing artisan manually.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block uppercase font-bold text-on-surface mb-1 tracking-wider">Studio / Business Name *</label>
                <input
                  type="text"
                  required
                  value={newPartner.name}
                  onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                  placeholder="e.g. Design Studio Colombo"
                  className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block uppercase font-bold text-on-surface mb-1 tracking-wider">Contact Person</label>
                <input
                  type="text"
                  value={newPartner.contactPerson}
                  onChange={(e) => setNewPartner({ ...newPartner, contactPerson: e.target.value })}
                  placeholder="e.g. Ranga Perera"
                  className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block uppercase font-bold text-on-surface mb-1 tracking-wider">Phone (+94)</label>
                  <input
                    type="text"
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner({ ...newPartner, phone: formatPhone(e.target.value) })}
                    placeholder="+94 7X XXX XXXX"
                    className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block uppercase font-bold text-on-surface mb-1 tracking-wider">Commission (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    step="0.5"
                    value={(newPartner.commissionRate * 100)}
                    onChange={(e) => setNewPartner({ ...newPartner, commissionRate: Number(e.target.value) / 100 })}
                    className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block uppercase font-bold text-on-surface mb-1 tracking-wider">Bank Name</label>
                  <input
                    type="text"
                    value={newPartner.bankName}
                    onChange={(e) => setNewPartner({ ...newPartner, bankName: e.target.value })}
                    placeholder="Commercial Bank"
                    className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block uppercase font-bold text-on-surface mb-1 tracking-wider">Account Number</label>
                  <input
                    type="text"
                    value={newPartner.accountNumber}
                    onChange={(e) => setNewPartner({ ...newPartner, accountNumber: e.target.value })}
                    placeholder="1000293841"
                    className="w-full px-3.5 py-2.5 bg-surface-container-highest/60 border border-outline rounded-xl font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleCreatePartner}
                className="flex-1 py-3 bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> Register & Generate QR
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-3 bg-surface-container-highest text-on-surface font-bold text-xs rounded-xl border border-outline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalWrapper>
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

      {/* ── Delete Confirmation ─────────────────────────────────────────── */}
      {deleteId && (
        <DeleteModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={async () => {
            try {
              await deleteDocument(COLLECTIONS.PARTNERS, deleteId);
              setPartners(prev => prev.filter(p => (p.partnerId || p.id) !== deleteId && p._firestoreId !== deleteId));
              setSelectedPartner(null);
              setDeleteId(null);
              toast.success("Partner removed");
            } catch (err) {
              toast.error("Failed to delete: " + err.message);
            }
          }}
          title="Remove Partner"
          message="Are you sure you want to remove this partner from the network?"
        />
      )}

    </div>
  );
}
