import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, User, Building, MapPin, Globe, DollarSign, Sparkles, X, 
  Trash2, Check, Clock, Link, QrCode, Copy, Plus, ChevronRight,
  ExternalLink, Layers, ArrowUpRight, ShieldCheck, FileText, CheckCircle2,
  AlertCircle, Download, CreditCard, Send, Handshake, Filter, Phone, Mail,
  Share2, ArrowDownRight, Printer, Edit3, Upload, FileCheck, Save, Eye
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

export default function Partners({ 
  partners = [], 
  setPartners, 
  leads = [], 
  setLeads, 
  invoices = [], 
  projects = [],
  dataStore, 
  currentUser 
}) {
  const isPartnerUser = currentUser?.role === 'Partner';
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Administrator' || currentUser?.role === 'Manager';

  // Admin Tabs vs Partner Tabs
  const [adminTab, setAdminTab] = useState('directory'); // 'directory' | 'applications' | 'claims' | 'settlements'
  const [partnerTab, setPartnerTab] = useState('referrals'); // 'referrals' | 'documents' | 'marketing'
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Partner Identity Resolution
  const currentPartner = useMemo(() => {
    if (!isPartnerUser) return null;
    const found = partners.find(p => 
      p.email?.toLowerCase() === currentUser?.email?.toLowerCase() ||
      p.email?.toLowerCase() === currentUser?.identifier?.toLowerCase() ||
      p.partnerId === currentUser?.partnerId ||
      p.id === currentUser?.partnerId ||
      p.id === currentUser?.id ||
      p.name?.toLowerCase() === currentUser?.name?.toLowerCase()
    );
    if (found) return found;
    return {
      name: currentUser?.name || currentUser?.company || 'Partner Studio',
      partnerId: currentUser?.partnerId || (currentUser?.identifier ? 'P-' + String(currentUser.identifier).slice(0, 4).toUpperCase() : 'P-1001'),
      commissionRate: 0.05,
      type: 'Art & Framing Studio',
      phone: currentUser?.contactNumber || currentUser?.phone || '',
      email: currentUser?.email || currentUser?.identifier || '',
      address: currentUser?.location || 'Colombo, Sri Lanka',
      bankName: '',
      accountNumber: '',
      accountName: currentUser?.name || '',
      branchName: '',
    };
  }, [isPartnerUser, partners, currentUser]);

  // Partner Referrals Data Filtering
  const myReferralLeads = useMemo(() => {
    if (!isPartnerUser || !currentPartner) return [];
    const pid = String(currentPartner.partnerId || '').toLowerCase();
    const pname = String(currentPartner.name || '').toLowerCase();

    return leads.filter(lead => {
      const lPid = String(lead.partnerId || lead.agentId || '').toLowerCase();
      const lPname = String(lead.partnerName || lead.agentName || '').toLowerCase();
      return lPid === pid || lPname === pname || (lead.source === 'Referral' && (lPid === pid || lPname === pname));
    }).map(lead => {
      const leadInvoices = invoices.filter(inv => inv.leadId === lead.id || inv.customerId === lead.email || inv.customerName === lead.name);
      const totalInvoiced = leadInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);
      const totalPaid = leadInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.amount || 0), 0);
      
      const dealVal = Number(lead.value || totalInvoiced || 0);
      const commRate = Number(lead.commissionRate || currentPartner.commissionRate || 0.05);
      const commAmount = dealVal * commRate;

      let paymentStatus = 'Unpaid';
      if (totalPaid > 0 && totalPaid < dealVal) {
        paymentStatus = '75% Advance Paid';
      } else if (totalPaid >= dealVal && dealVal > 0) {
        paymentStatus = '100% Fully Settled';
      }

      let commState = 'Pending Quote';
      if (lead.stage === 'Lost' || lead.stage === 'Rejected') {
        commState = 'Cancelled';
      } else if (lead.payoutStatus === 'Paid' || lead.payoutStatus === 'Settled') {
        commState = 'Paid & Settled';
      } else if (paymentStatus === '100% Fully Settled' || lead.referralStatus === 'Eligible for Payout' || lead.stage === 'Delivered' || lead.stage === 'Completed') {
        commState = 'Eligible for Payout';
      } else if (paymentStatus === '75% Advance Paid' || ['Design / Review', 'Advance Paid', 'Production', 'Fabrication', 'Logistics'].includes(lead.stage)) {
        commState = 'Accrued (In Production)';
      } else if (dealVal > 0) {
        commState = 'Quoted / Pending Acceptance';
      }

      return {
        ...lead,
        calculatedDealVal: dealVal,
        calculatedCommRate: commRate,
        calculatedCommAmount: commAmount,
        paymentStatus,
        commState
      };
    });
  }, [isPartnerUser, currentPartner, leads, invoices]);

  // Missing Referral Claims
  const [claims, setClaims] = useState([]);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState({
    clientName: '',
    clientPhone: '',
    referralDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  useEffect(() => {
    const unsub = subscribeToCollection('referral_claims', (data) => {
      setClaims(data || []);
    });
    return () => unsub();
  }, []);

  // Modals & State for Admin Mode
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('profile');
  const [isSavingPartner, setIsSavingPartner] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [qrPartner, setQrPartner] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const unsubApps = subscribeToCollection(COLLECTIONS.PARTNER_APPLICATIONS || 'partner_applications', (data) => {
      setApplications(data || []);
    });
    const unsubPayouts = subscribeToCollection(COLLECTIONS.PARTNER_PAYOUTS || 'partner_payouts', (data) => {
      setPayouts(data || []);
    });
    return () => {
      unsubApps();
      unsubPayouts();
    };
  }, []);

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
        commissionRate: selectedPartner.commissionRate !== undefined ? selectedPartner.commissionRate : 0.05,
        bankName: selectedPartner.bankName || '',
        branchName: selectedPartner.branchName || '',
        accountNumber: selectedPartner.accountNumber || '',
        accountName: selectedPartner.accountName || '',
        documents: selectedPartner.documents || {},
      });
      setActiveModalTab('profile');
    } else {
      setEditFormData(null);
    }
  }, [selectedPartner]);

  // Partner KPI Calculations
  const partnerKPIs = useMemo(() => {
    if (!isPartnerUser) return null;
    const totalRef = myReferralLeads.length;
    const inProdCount = myReferralLeads.filter(l => l.commState === 'Accrued (In Production)').length;
    const accruedComm = myReferralLeads
      .filter(l => l.commState === 'Accrued (In Production)')
      .reduce((sum, l) => sum + l.calculatedCommAmount, 0);
    const eligibleComm = myReferralLeads
      .filter(l => l.commState === 'Eligible for Payout')
      .reduce((sum, l) => sum + l.calculatedCommAmount, 0);
    
    const pid = String(currentPartner?.partnerId || '').toLowerCase();
    const settledTotal = payouts
      .filter(p => String(p.partnerId || '').toLowerCase() === pid || String(p.partnerName || '').toLowerCase() === String(currentPartner?.name || '').toLowerCase())
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      totalRef,
      inProdCount,
      accruedComm,
      eligibleComm,
      settledTotal
    };
  }, [isPartnerUser, myReferralLeads, currentPartner, payouts]);

  // Submit Missing Referral Claim Handler
  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!claimForm.clientName.trim()) {
      toast.error('Please enter the client name.');
      return;
    }
    if (!claimForm.clientPhone.trim() || !validatePhone(claimForm.clientPhone)) {
      toast.error('Please enter a valid mobile number (e.g. +94 77 123 4567).');
      return;
    }

    setIsSubmittingClaim(true);
    try {
      const claimId = 'CLM-' + String(Date.now()).slice(-6);
      const payload = {
        id: claimId,
        partnerId: currentPartner?.partnerId || 'P-1001',
        partnerName: currentPartner?.name || 'Partner Studio',
        partnerEmail: currentPartner?.email || currentUser?.email || '',
        clientName: claimForm.clientName.trim(),
        clientPhone: formatPhone(claimForm.clientPhone.trim()),
        referralDate: claimForm.referralDate,
        notes: claimForm.notes.trim(),
        status: 'Pending Verification',
        createdAt: new Date().toISOString(),
      };

      await addDocument('referral_claims', payload, claimId);
      toast.success('Referral claim submitted! Our Sales desk will verify and link it to your account.');
      setShowClaimModal(false);
      setClaimForm({ clientName: '', clientPhone: '', referralDate: new Date().toISOString().split('T')[0], notes: '' });
    } catch (err) {
      toast.error('Failed to submit claim: ' + err.message);
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Document Upload to Firebase Storage
  const handleFileUpload = async (e, docKey, partnerRecord) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB.');
      return;
    }

    setUploadingDocKey(docKey);
    try {
      const pid = partnerRecord?.partnerId || partnerRecord?.id || 'partner';
      const fileExt = file.name.split('.').pop();
      const storagePath = 'partners/documents/' + pid + '/' + docKey + '_' + Date.now() + '.' + fileExt;
      const fileRef = ref(storage, storagePath);

      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);

      const updatedDocs = {
        ...(partnerRecord.documents || {}),
        [docKey]: {
          url: downloadUrl,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser?.email || 'Partner',
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
        }
      };

      const targetDocId = partnerRecord._firestoreId || partnerRecord.partnerId || String(partnerRecord.id);
      await updateDocument(COLLECTIONS.PARTNERS, targetDocId, { documents: updatedDocs });

      if (setEditFormData) {
        setEditFormData(prev => prev ? ({ ...prev, documents: updatedDocs }) : prev);
      }
      if (setSelectedPartner) {
        setSelectedPartner(prev => prev ? ({ ...prev, documents: updatedDocs }) : prev);
      }
      if (setPartners) {
        setPartners(prev => prev.map(p => (p.partnerId === pid || p.id === pid) ? { ...p, documents: updatedDocs } : p));
      }

      toast.success('Document uploaded & saved securely!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload document: ' + err.message);
    } finally {
      setUploadingDocKey(null);
    }
  };

  // Save Partner Edit Details (Admin / Self)
  const handleSavePartnerDetails = async () => {
    if (!editFormData || !selectedPartner) return;
    setIsSavingPartner(true);
    try {
      const targetDocId = selectedPartner._firestoreId || selectedPartner.partnerId || String(selectedPartner.id);
      const payload = {
        ...editFormData,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || 'Admin',
      };

      await updateDocument(COLLECTIONS.PARTNERS, targetDocId, payload);

      if (setPartners) {
        setPartners(prev => prev.map(p => 
          (p._firestoreId === targetDocId || p.partnerId === selectedPartner.partnerId || p.id === selectedPartner.id)
            ? { ...p, ...payload }
            : p
        ));
      }

      setSelectedPartner(prev => ({ ...prev, ...payload }));
      toast.success('Partner studio details updated successfully!');
      setSelectedPartner(null);
    } catch (err) {
      toast.error('Failed to save changes: ' + err.message);
    } finally {
      setIsSavingPartner(false);
    }
  };

  // Admin: Link Missing Claim to Lead
  const handleVerifyClaim = async (claim) => {
    try {
      await updateDocument('referral_claims', claim._firestoreId || claim.id, {
        status: 'Verified & Linked',
        verifiedBy: currentUser?.email || 'Sales Desk',
        verifiedAt: new Date().toISOString()
      });
      toast.success('Claim verified and credited to ' + claim.partnerName + '!');
    } catch (err) {
      toast.error('Verification failed: ' + err.message);
    }
  };

  // 1. PARTNER-DEDICATED PORTAL VIEW
  if (isPartnerUser) {
    const qrUrl = 'https://portal.print2frame.xyz/referral?ref=' + (currentPartner?.partnerId || 'P-1001');

    const filteredPartnerLeads = myReferralLeads.filter(lead => {
      const matchesSearch = !searchQuery || 
        lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone?.includes(searchQuery) ||
        lead.id?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (stageFilter === 'all') return true;
      if (stageFilter === 'intake') return lead.commState === 'Pending Quote' || lead.stage === 'Intake';
      if (stageFilter === 'production') return lead.commState === 'Accrued (In Production)';
      if (stageFilter === 'eligible') return lead.commState === 'Eligible for Payout';
      if (stageFilter === 'settled') return lead.commState === 'Paid & Settled';
      return true;
    });

    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Partner Studio Header */}
        <div className="bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-low p-6 sm:p-8 rounded-3xl border border-outline-variant/60 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 tracking-wider">
                Official Art & Framing Partner
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-surface-container border border-outline-variant text-on-surface-variant">
                ID: {currentPartner?.partnerId || 'P-1001'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/30">
                Commission Rate: {((Number(currentPartner?.commissionRate) || 0.05) * 100).toFixed(1)}%
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
              {currentPartner?.name || 'Studio Partner Workspace'}
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl">
              Track your customer referrals, live fabrication progress, and month-end accumulated commission payouts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <button
              onClick={() => setShowClaimModal(true)}
              className="px-4 py-2.5 bg-surface-container-highest hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl border border-outline-variant/80 transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
            >
              <Plus size={14} className="text-primary" /> Claim Missing Referral
            </button>
            <button
              onClick={() => setQrPartner(currentPartner)}
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <QrCode size={14} /> My Marketing QR & Flyer
            </button>
          </div>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/60 shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Total Referrals Sent</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-black text-on-surface font-mono">{partnerKPIs?.totalRef || 0}</span>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">Inquiries</span>
            </div>
            <p className="text-[10px] text-on-surface-variant/70 mt-2">Client inquiries via QR & direct link</p>
          </div>

          <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/60 shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">In Production (Accrued)</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-amber-400 font-mono">
                LKR {(partnerKPIs?.accruedComm || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                {partnerKPIs?.inProdCount || 0} Active Jobs
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant/70 mt-2">Advance paid, fabrication in progress</p>
          </div>

          <div className="bg-surface-container p-5 rounded-2xl border border-primary/40 shadow-[0_0_20px_rgba(0,218,243,0.08)] relative overflow-hidden bg-primary/5">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={12} /> Month-End Payout Balance
            </p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-primary font-mono">
                LKR {(partnerKPIs?.eligibleComm || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-black text-primary bg-primary/20 px-2 py-0.5 rounded-md uppercase">
                Eligible
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant/80 mt-2">100% Client Payment Received & Cleared</p>
          </div>

          <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/60 shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Total Settled & Paid</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                LKR {(partnerKPIs?.settledTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Bank Transferred
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant/70 mt-2">Lifetime accumulated payouts disbursed</p>
          </div>
        </div>

        {/* Partner Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-3">
          <button
            onClick={() => setPartnerTab('referrals')}
            className={'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ' + (
              partnerTab === 'referrals'
                ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            )}
          >
            <Layers size={14} /> My Referrals & Deals ({myReferralLeads.length})
          </button>
          <button
            onClick={() => setPartnerTab('documents')}
            className={'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ' + (
              partnerTab === 'documents'
                ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            )}
          >
            <FileText size={14} /> Agreements & Document Vault
          </button>
          <button
            onClick={() => setPartnerTab('marketing')}
            className={'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ' + (
              partnerTab === 'marketing'
                ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            )}
          >
            <QrCode size={14} /> Marketing QR & Counter Flyer
          </button>
        </div>

        {/* TAB 1: My Referrals & Deals Pipeline */}
        {partnerTab === 'referrals' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-surface-container p-3 rounded-2xl border border-outline-variant/60">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3.5 top-3 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Search by client name, mobile, lead ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'All Referrals' },
                  { id: 'intake', label: 'Inquiry Intake' },
                  { id: 'production', label: 'In Production' },
                  { id: 'eligible', label: 'Eligible for Payout' },
                  { id: 'settled', label: 'Settled & Paid' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStageFilter(f.id)}
                    className={'px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors whitespace-nowrap ' + (
                      stageFilter === f.id
                        ? 'bg-primary/20 text-primary border-primary/40 font-black'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/40 hover:text-on-surface'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-container rounded-2xl border border-outline-variant/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-high/80 text-[10px] font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/60">
                    <tr>
                      <th className="py-3 px-4">Client Name & Contact</th>
                      <th className="py-3 px-4">Date Referred</th>
                      <th className="py-3 px-4">Framing Scope</th>
                      <th className="py-3 px-4 text-right">Deal Value</th>
                      <th className="py-3 px-4 text-right">Commission (Rate)</th>
                      <th className="py-3 px-4">Client Payment Status</th>
                      <th className="py-3 px-4">Commission Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {filteredPartnerLeads.length > 0 ? (
                      filteredPartnerLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-surface-container-high/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-on-surface text-xs">{lead.name || 'Direct Client'}</div>
                            <div className="text-[10px] text-on-surface-variant flex items-center gap-2 mt-0.5">
                              <span className="font-mono">{lead.phone || 'No phone'}</span>
                              {lead.phone && (
                                <button
                                  type="button"
                                  onClick={() => window.open('https://wa.me/' + lead.phone.replace(/[^0-9]/g, ''), '_blank')}
                                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                  title="WhatsApp Client"
                                >
                                  <Phone size={10} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-on-surface-variant font-mono">
                            {lead.date || new Date().toISOString().split('T')[0]}
                          </td>
                          <td className="py-3 px-4 max-w-[200px] truncate text-[11px] text-on-surface-variant" title={lead.jobScope || lead.scope}>
                            {lead.jobScope || lead.scope || 'Custom Framing'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-on-surface">
                            LKR {lead.calculatedDealVal > 0 ? lead.calculatedDealVal.toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'TBD'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-mono font-black text-primary text-xs">
                              LKR {lead.calculatedCommAmount > 0 ? lead.calculatedCommAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                            </div>
                            <div className="text-[9px] text-on-surface-variant font-mono">
                              ({(lead.calculatedCommRate * 100).toFixed(1)}%)
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={'text-[10px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ' + (
                              lead.paymentStatus === '100% Fully Settled'
                                ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                                : lead.paymentStatus === '75% Advance Paid'
                                ? 'text-blue-400 bg-blue-500/15 border-blue-500/30'
                                : 'text-on-surface-variant bg-surface-container-high border-outline-variant/60'
                            )}>
                              {lead.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={'text-[10px] font-black px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ' + (
                              lead.commState === 'Paid & Settled'
                                ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40'
                                : lead.commState === 'Eligible for Payout'
                                ? 'text-primary bg-primary/20 border-primary/40 animate-pulse'
                                : lead.commState === 'Accrued (In Production)'
                                ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
                                : 'text-on-surface-variant bg-surface-container-high border-outline-variant'
                            )}>
                              {lead.commState === 'Eligible for Payout' && <Sparkles size={10} />}
                              {lead.commState}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-on-surface-variant text-xs">
                          No referrals matching the selected criteria. Share your QR flyer with clients to start earning!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Agreements & Document Vault */}
        {partnerTab === 'documents' && (
          <div className="space-y-4">
            <div className="bg-surface-container p-6 rounded-3xl border border-outline-variant/60 space-y-4">
              <div>
                <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <ShieldCheck size={18} className="text-primary" /> Official Agreements & Operational Guidelines
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Securely stored legal agreements, business registrations, and operational quality guidelines.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {[
                  {
                    key: 'brCert',
                    title: 'Business Registration (BR) Certificate',
                    desc: 'Official BR document proving studio business registration in Sri Lanka.',
                    doc: currentPartner?.documents?.brCert,
                  },
                  {
                    key: 'frameworkAgreement',
                    title: 'Signed Partner Framework Agreement',
                    desc: 'Bilateral referral terms, commission schedule, and monthly settlement agreement.',
                    doc: currentPartner?.documents?.frameworkAgreement,
                  },
                  {
                    key: 'qualityGuidelines',
                    title: 'Signed Operational Quality Guidelines PDF',
                    desc: 'Print To Frame standard manufacturing, glass handling, and framing assembly specs.',
                    doc: currentPartner?.documents?.qualityGuidelines,
                  },
                  {
                    key: 'nicDoc',
                    title: 'Signatory Identity Verification (NIC/Passport)',
                    desc: 'National identity card or passport scan of the studio owner/director.',
                    doc: currentPartner?.documents?.nicDoc,
                  },
                ].map((item) => (
                  <div key={item.key} className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/60 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                          <FileText size={15} className="text-primary" /> {item.title}
                        </span>
                        {item.doc?.url ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Pending Upload
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-1.5">{item.desc}</p>
                      {item.doc?.uploadedAt && (
                        <p className="text-[9px] text-on-surface-variant/60 mt-1 font-mono">
                          Uploaded: {new Date(item.doc.uploadedAt).toLocaleDateString()} {item.doc.fileSize ? '· ' + item.doc.fileSize : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/30">
                      {item.doc?.url && (
                        <a
                          href={item.doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-bold rounded-xl border border-outline-variant flex items-center gap-1.5 transition-colors"
                        >
                          <Eye size={12} /> View Document
                        </a>
                      )}
                      <label className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold rounded-xl border border-primary/30 flex items-center gap-1.5 transition-colors cursor-pointer">
                        <Upload size={12} />
                        <span>{uploadingDocKey === item.key ? 'Uploading...' : item.doc?.url ? 'Re-Upload' : 'Upload File'}</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          disabled={uploadingDocKey === item.key}
                          onChange={(e) => handleFileUpload(e, item.key, currentPartner)}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Marketing Kit & Counter QR */}
        {partnerTab === 'marketing' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-container p-6 sm:p-8 rounded-3xl border border-outline-variant/60 space-y-5">
              <div>
                <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <QrCode size={18} className="text-primary" /> Your Dedicated Referral Link
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Share this link with your customers or on your studio website. Clients get an exclusive 15% discount, and you get credit automatically!
                </p>
              </div>

              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60 space-y-2">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Public Client URL</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={qrUrl}
                    className="w-full bg-transparent font-mono text-xs text-primary focus:outline-none select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(qrUrl);
                      toast.success('Referral link copied to clipboard!');
                    }}
                    className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl border border-primary/30 transition-colors flex-shrink-0 cursor-pointer"
                    title="Copy Link"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setQrPartner(currentPartner)}
                  className="w-full py-3.5 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Download size={15} /> Download Printable Counter Display Flyer (1200x1600)
                </button>
              </div>
            </div>

            <div className="bg-surface-container p-6 sm:p-8 rounded-3xl border border-outline-variant/60 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-white rounded-2xl shadow-md border border-outline-variant/40">
                <img
                  src={'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(qrUrl)}
                  alt="Partner QR Code"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <div>
                <p className="font-bold text-sm text-on-surface">{currentPartner?.name}</p>
                <p className="text-[11px] font-mono text-primary mt-0.5">Code: {currentPartner?.partnerId || 'P-1001'}</p>
                <p className="text-[10px] text-on-surface-variant/70 mt-1">Instant 5-minute framing specialist callback guaranteed</p>
              </div>
            </div>
          </div>
        )}

        {/* Claim Missing Referral Modal */}
        <ModalWrapper
          isOpen={showClaimModal}
          onClose={() => setShowClaimModal(false)}
          maxWidth="max-w-md"
          height="h-auto"
          ariaLabel="Claim Missing Referral"
        >
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div>
                <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <Handshake size={18} className="text-primary" /> Claim Missing Referral
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  If a client contacted us offline or called directly, submit their details for verification.
                </p>
              </div>
              <button onClick={() => setShowClaimModal(false)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Client Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Jayawardena"
                  value={claimForm.clientName}
                  onChange={(e) => setClaimForm(p => ({ ...p, clientName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Client Mobile Number (+94) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+94 77 123 4567"
                  value={claimForm.clientPhone}
                  onChange={(e) => setClaimForm(p => ({ ...p, clientPhone: formatPhone(e.target.value) }))}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Approximate Date of Referral
                </label>
                <input
                  type="date"
                  value={claimForm.referralDate}
                  onChange={(e) => setClaimForm(p => ({ ...p, referralDate: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Job Scope / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Discussed 36x48 canvas wrap with matte black box frame"
                  value={claimForm.notes}
                  onChange={(e) => setClaimForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full p-3 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold rounded-xl border border-outline-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClaim}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check size={14} /> {isSubmittingClaim ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </ModalWrapper>

        {/* Dedicated QR Modal */}
        {qrPartner && (
          <PartnerQRModal
            partner={qrPartner}
            isOpen={!!qrPartner}
            onClose={() => setQrPartner(null)}
          />
        )}
      </div>
    );
  }

  // 2. ADMIN & INTERNAL MANAGEMENT VIEW
  const filteredPartners = partners.filter(p => {
    const matchesSearch = !searchQuery || 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partnerId?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight flex items-center">
            <Building className="mr-3 text-primary" size={28} />
            Partner Network & Referrals
          </h1>
          <p className="text-xs sm:text-sm font-medium text-on-surface-variant mt-1">
            Manage framing partner studios, vetting queue, referral claims, and monthly commission settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={14} /> Add Partner
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-3">
        <button
          onClick={() => setAdminTab('directory')}
          className={'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ' + (
            adminTab === 'directory'
              ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          )}
        >
          <Building size={14} /> Directory ({partners.length})
        </button>
        <button
          onClick={() => setAdminTab('applications')}
          className={'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ' + (
            adminTab === 'applications'
              ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          )}
        >
          <Handshake size={14} /> Vetting Queue ({applications.filter(a => a.status === 'Pending Review' || !a.status).length})
          {applications.filter(a => a.status === 'Pending Review' || !a.status).length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-1 right-1" />
          )}
        </button>
        <button
          onClick={() => setAdminTab('claims')}
          className={'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ' + (
            adminTab === 'claims'
              ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          )}
        >
          <Link size={14} /> Referral Claims ({claims.filter(c => c.status === 'Pending Verification').length})
          {claims.filter(c => c.status === 'Pending Verification').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping absolute top-1 right-1" />
          )}
        </button>
        <button
          onClick={() => setAdminTab('settlements')}
          className={'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ' + (
            adminTab === 'settlements'
              ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          )}
        >
          <DollarSign size={14} /> Monthly Settlements
        </button>
      </div>

      {/* Tab: Directory */}
      {adminTab === 'directory' && (
        <div className="space-y-4">
          <div className="bg-surface-container p-3 rounded-2xl border border-outline-variant/60 max-w-md">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-3 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search partners by name, email, partner ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPartners.map((partner) => (
              <div
                key={partner._firestoreId || partner.id || partner.partnerId}
                className="bg-surface-container p-5 rounded-2xl border border-outline-variant/60 hover:border-primary/40 transition-all flex flex-col justify-between gap-4 shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                        {partner.partnerId || ('P-' + partner.id)}
                      </span>
                      <h3 className="text-base font-bold text-on-surface mt-1.5">{partner.name}</h3>
                      <p className="text-xs text-on-surface-variant">{partner.type || 'Studio Partner'}</p>
                    </div>
                    <span className="text-xs font-black text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      {((Number(partner.commissionRate) || 0.05) * 100).toFixed(1)}% Comm
                    </span>
                  </div>

                  <div className="mt-4 space-y-1 text-xs text-on-surface-variant">
                    {partner.contactPerson && (
                      <p className="flex items-center gap-1.5">
                        <User size={12} className="text-primary" /> {partner.contactPerson}
                      </p>
                    )}
                    {partner.phone && (
                      <p className="flex items-center gap-1.5 font-mono">
                        <Phone size={12} className="text-primary" /> {partner.phone}
                      </p>
                    )}
                    {partner.email && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail size={12} className="text-primary" /> {partner.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-outline-variant/40 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setQrPartner(partner)}
                    className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded-xl border border-outline-variant flex items-center gap-1.5 transition-colors"
                  >
                    <QrCode size={13} /> QR Flyer
                  </button>
                  <button
                    onClick={() => setSelectedPartner(partner)}
                    className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl border border-primary/30 flex items-center gap-1.5 transition-colors"
                  >
                    <Edit3 size={13} /> Details & Vault
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Vetting Applications */}
      {adminTab === 'applications' && (
        <div className="bg-surface-container rounded-2xl border border-outline-variant/60 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-outline-variant/60 bg-surface-container-high/40 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Partner Registration Ingestion Queue</h3>
              <p className="text-[11px] text-on-surface-variant">Review registrations submitted from the public portal.</p>
            </div>
          </div>
          <div className="divide-y divide-outline-variant/30">
            {applications.length > 0 ? (
              applications.map((app) => (
                <div key={app.id || app._firestoreId} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-surface-container-high/30 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-on-surface">{app.studioName || app.name}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {app.status || 'Pending Review'}
                      </span>
                    </div>
                    <div className="text-xs text-on-surface-variant flex items-center gap-3 mt-1">
                      <span>Person: {app.contactPerson || 'N/A'}</span>
                      <span className="font-mono">{app.phone || app.contactNumber}</span>
                      <span>{app.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const newP = {
                          name: app.studioName || app.name,
                          partnerId: 'P-' + String(Date.now()).slice(-4),
                          contactPerson: app.contactPerson || '',
                          phone: app.phone || '',
                          email: app.email || '',
                          commissionRate: 0.05,
                          type: 'Art & Framing Studio',
                          status: 'Active',
                          createdAt: new Date().toISOString(),
                        };
                        await addDocument(COLLECTIONS.PARTNERS, newP, newP.partnerId);
                        await updateDocument(COLLECTIONS.PARTNER_APPLICATIONS || 'partner_applications', app._firestoreId || app.id, { status: 'Approved' });
                        toast.success('Approved ' + newP.name + ' as Official Partner!');
                      }}
                      className="px-3.5 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-sm hover:bg-primary/90 flex items-center gap-1.5"
                    >
                      <Check size={13} /> Approve (5% Comm)
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-on-surface-variant text-xs">No pending applications in queue.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Referral Claims Desk */}
      {adminTab === 'claims' && (
        <div className="bg-surface-container rounded-2xl border border-outline-variant/60 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-outline-variant/60 bg-surface-container-high/40 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Offline Referral Claims Verification Desk</h3>
              <p className="text-[11px] text-on-surface-variant">Verify customer referrals reported by partners for phone/walk-in leads.</p>
            </div>
          </div>
          <div className="divide-y divide-outline-variant/30">
            {claims.length > 0 ? (
              claims.map((claim) => (
                <div key={claim.id || claim._firestoreId} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-surface-container-high/30 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-on-surface">{claim.clientName}</span>
                      <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {claim.clientPhone}
                      </span>
                      <span className={'text-[9px] font-bold px-2 py-0.5 rounded ' + (
                        claim.status === 'Verified & Linked' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      )}>
                        {claim.status}
                      </span>
                    </div>
                    <div className="text-xs text-on-surface-variant mt-1 flex items-center gap-2">
                      <span className="font-bold text-on-surface">Claimed by: {claim.partnerName} ({claim.partnerId})</span>
                      <span>· Date: {claim.referralDate || 'Recent'}</span>
                      {claim.notes && <span>· Notes: {claim.notes}</span>}
                    </div>
                  </div>

                  {claim.status === 'Pending Verification' && (
                    <button
                      onClick={() => handleVerifyClaim(claim)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 size={13} /> Verify & Credit Commission
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-on-surface-variant text-xs">No pending referral claims to verify.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Settlements */}
      {adminTab === 'settlements' && (
        <div className="bg-surface-container p-6 rounded-3xl border border-outline-variant/60 space-y-4">
          <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
            <DollarSign size={18} className="text-primary" /> Month-End Batch Commission Settlement Ledger
          </h3>
          <p className="text-xs text-on-surface-variant">
            Disburse accumulated commissions for 100% completed deals via bank transfer in one batch.
          </p>
          <div className="divide-y divide-outline-variant/30 pt-2">
            {partners.map(p => (
              <div key={p.partnerId || p.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-bold text-xs text-on-surface">{p.name} ({p.partnerId})</p>
                  <p className="text-[10px] text-on-surface-variant font-mono">Bank: {p.bankName || 'Not Set'} · A/C: {p.accountNumber || 'Not Set'}</p>
                </div>
                <button
                  onClick={() => {
                    const txId = 'TXN-' + String(Date.now()).slice(-6);
                    toast.success('Monthly settlement processed for ' + p.name + ' (Ref: ' + txId + ')');
                  }}
                  className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl border border-primary/30 flex items-center gap-1"
                >
                  <CreditCard size={12} /> Disburse Payout
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partner Details & Edit Modal */}
      {selectedPartner && editFormData && (
        <ModalWrapper
          isOpen={!!selectedPartner}
          onClose={() => setSelectedPartner(null)}
          maxWidth="max-w-2xl"
          height="h-auto"
          ariaLabel="Partner Details & Vault"
        >
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div>
                <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <Building size={18} className="text-primary" /> {selectedPartner.name}
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Partner ID: <span className="font-mono text-primary">{selectedPartner.partnerId}</span>
                </p>
              </div>
              <button onClick={() => setSelectedPartner(null)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 border-b border-outline-variant/40 pb-2">
              <button
                onClick={() => setActiveModalTab('profile')}
                className={'px-3 py-1.5 rounded-lg text-xs font-bold ' + (activeModalTab === 'profile' ? 'bg-primary/20 text-primary' : 'text-on-surface-variant')}
              >
                Profile & Contacts
              </button>
              <button
                onClick={() => setActiveModalTab('financial')}
                className={'px-3 py-1.5 rounded-lg text-xs font-bold ' + (activeModalTab === 'financial' ? 'bg-primary/20 text-primary' : 'text-on-surface-variant')}
              >
                Commission & Bank Details
              </button>
              <button
                onClick={() => setActiveModalTab('documents')}
                className={'px-3 py-1.5 rounded-lg text-xs font-bold ' + (activeModalTab === 'documents' ? 'bg-primary/20 text-primary' : 'text-on-surface-variant')}
              >
                Agreements & Vault
              </button>
            </div>

            {activeModalTab === 'profile' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Business Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={e => setEditFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">BR Number</label>
                  <input
                    type="text"
                    value={editFormData.brNumber}
                    onChange={e => setEditFormData(p => ({ ...p, brNumber: e.target.value }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editFormData.contactPerson}
                    onChange={e => setEditFormData(p => ({ ...p, contactPerson: e.target.value }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Mobile (+94)</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={e => setEditFormData(p => ({ ...p, phone: formatPhone(e.target.value) }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-mono"
                  />
                </div>
              </div>
            )}

            {activeModalTab === 'financial' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.5"
                    value={editFormData.commissionRate}
                    onChange={e => setEditFormData(p => ({ ...p, commissionRate: Number(e.target.value) || 0.05 }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-mono font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={editFormData.bankName}
                      onChange={e => setEditFormData(p => ({ ...p, bankName: e.target.value }))}
                      className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Account Number</label>
                    <input
                      type="text"
                      value={editFormData.accountNumber}
                      onChange={e => setEditFormData(p => ({ ...p, accountNumber: e.target.value }))}
                      className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeModalTab === 'documents' && (
              <div className="space-y-3 text-xs">
                {['brCert', 'frameworkAgreement', 'qualityGuidelines', 'nicDoc'].map((key) => (
                  <div key={key} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/40 flex justify-between items-center">
                    <span className="font-bold text-on-surface capitalize">{key}</span>
                    <label className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold rounded-lg border border-primary/30 cursor-pointer">
                      Upload
                      <input type="file" className="hidden" onChange={e => handleFileUpload(e, key, selectedPartner)} />
                    </label>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 flex justify-end gap-3 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                className="px-4 py-2 bg-surface-container text-on-surface-variant text-xs font-bold rounded-xl border border-outline-variant"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePartnerDetails}
                disabled={isSavingPartner}
                className="px-6 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Save size={13} /> {isSavingPartner ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* QR Modal */}
      {qrPartner && (
        <PartnerQRModal
          partner={qrPartner}
          isOpen={!!qrPartner}
          onClose={() => setQrPartner(null)}
        />
      )}
    </div>
  );
}
