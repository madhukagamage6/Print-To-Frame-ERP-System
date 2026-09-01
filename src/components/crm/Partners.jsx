import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, User, Building, MapPin, Globe, DollarSign, Sparkles, X, 
  Trash2, Check, Clock, Link, QrCode, Copy, Plus, ChevronRight,
  ExternalLink, Layers, ArrowUpRight, ShieldCheck, FileText, CheckCircle2,
  AlertCircle, Download, CreditCard, Send, Handshake, Filter, Phone, Mail,
  Share2, ArrowDownRight, Printer, Edit3, Upload, FileCheck, Save, Eye, PhoneCall
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
import { exportToCsv } from '../../utils/csvExport';

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

  // Navigation & Filter States
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'applications' | 'claims' | 'settlements'
  const [partnerTab, setPartnerTab] = useState('referrals'); // 'referrals' | 'documents' | 'marketing'
  const [workspaceTab, setWorkspaceTab] = useState('referrals'); // 'referrals' | 'documents' | 'financial' | 'marketing'
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [isSavingPartner, setIsSavingPartner] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState(null);
  const [qrPartner, setQrPartner] = useState(null);
  const [deletePartnerId, setDeletePartnerId] = useState(null);

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

  // Ingestion applications from portal
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const unsubClaims = subscribeToCollection('referral_claims', (data) => {
      setClaims(data || []);
    });
    const unsubApps = subscribeToCollection(COLLECTIONS.PARTNER_APPLICATIONS || 'partner_applications', (data) => {
      setApplications(data || []);
    });
    return () => {
      unsubClaims();
      unsubApps();
    };
  }, []);

  // New Partner Form State
  const [newPartner, setNewPartner] = useState({
    name: '',
    partnerId: '',
    type: 'Art & Framing Studio',
    contactPerson: '',
    phone: '',
    email: '',
    address: 'Colombo, Sri Lanka',
    commissionRate: 0.05,
    brNumber: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
    branchName: '',
    status: 'Active',
  });

  // Partner Identity Resolution for logged-in Partner role
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

  // Helper to calculate partner referral stats
  const getPartnerReferrals = (partner) => {
    if (!partner) return [];
    const pid = String(partner.partnerId || partner.id || '').toLowerCase();
    const pname = String(partner.name || '').toLowerCase();

    return leads.filter(lead => {
      const lPid = String(lead.partnerId || lead.agentId || '').toLowerCase();
      const lPname = String(lead.partnerName || lead.agentName || '').toLowerCase();
      return lPid === pid || lPname === pname || (lead.source === 'Referral' && (lPid === pid || lPname === pname));
    }).map(lead => {
      const leadInvoices = invoices.filter(inv => inv.leadId === lead.id || inv.customerId === lead.email || inv.customerName === lead.name);
      const totalInvoiced = leadInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);
      const totalPaid = leadInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.amount || 0), 0);
      
      const dealVal = Number(lead.value || totalInvoiced || 0);
      const commRate = Number(lead.commissionRate || partner.commissionRate || 0.05);
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
  };

  // Partner Referrals for Current Logged-in Partner
  const myReferralLeads = useMemo(() => {
    return getPartnerReferrals(currentPartner);
  }, [currentPartner, leads, invoices]);

  // Selected Partner's Referrals (in Admin view)
  const selectedPartnerLeads = useMemo(() => {
    return getPartnerReferrals(selectedPartner);
  }, [selectedPartner, leads, invoices]);

  // Document Upload Handler
  const handleFileUpload = async (e, docKey, targetPartner) => {
    const file = e.target.files?.[0];
    if (!file || !targetPartner) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingDocKey(docKey);
    try {
      const pid = targetPartner.partnerId || targetPartner.id || 'P-1001';
      const storageRef = ref(storage, `partners/${pid}/${docKey}_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      const updatedDocs = {
        ...(targetPartner.documents || {}),
        [docKey]: {
          url: downloadUrl,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        }
      };

      const docId = targetPartner._firestoreId || targetPartner.id || pid;
      await updateDocument(COLLECTIONS.PARTNERS, docId, { documents: updatedDocs });

      // Update local state
      if (setPartners) {
        setPartners(prev => prev.map(p => (p.partnerId === pid || p.id === pid) ? { ...p, documents: updatedDocs } : p));
      }
      if (selectedPartner && (selectedPartner.partnerId === pid || selectedPartner.id === pid)) {
        setSelectedPartner(prev => ({ ...prev, documents: updatedDocs }));
      }

      toast.success('Document securely uploaded and verified!');
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Document upload failed: ' + (err.message || 'Storage error'));
    } finally {
      setUploadingDocKey(null);
    }
  };

  // Create Partner
  const handleCreatePartner = async (e) => {
    e.preventDefault();
    if (!newPartner.name.trim()) {
      toast.error('Please enter a studio or partner name');
      return;
    }

    const partnerId = newPartner.partnerId.trim() || ('P-' + String(Date.now()).slice(-4));
    const partnerPayload = {
      ...newPartner,
      partnerId,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDocument(COLLECTIONS.PARTNERS, partnerPayload, partnerId);
      if (setPartners) {
        setPartners(prev => [...prev, { ...partnerPayload, id: partnerId }]);
      }
      setShowCreateModal(false);
      setNewPartner({
        name: '',
        partnerId: '',
        type: 'Art & Framing Studio',
        contactPerson: '',
        phone: '',
        email: '',
        address: 'Colombo, Sri Lanka',
        commissionRate: 0.05,
        brNumber: '',
        bankName: '',
        accountNumber: '',
        accountName: '',
        branchName: '',
        status: 'Active',
      });
      toast.success(`Partner ${partnerPayload.name} (${partnerId}) created successfully!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create partner: ' + err.message);
    }
  };

  // Save Partner Details Edit
  const handleSavePartnerDetails = async () => {
    if (!editFormData || !selectedPartner) return;
    setIsSavingPartner(true);
    try {
      const docId = selectedPartner._firestoreId || selectedPartner.id || selectedPartner.partnerId;
      await updateDocument(COLLECTIONS.PARTNERS, docId, editFormData);

      if (setPartners) {
        setPartners(prev => prev.map(p => (p.id === docId || p.partnerId === selectedPartner.partnerId) ? { ...p, ...editFormData } : p));
      }
      setSelectedPartner(prev => ({ ...prev, ...editFormData }));
      setShowEditModal(false);
      toast.success('Partner details updated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update partner: ' + err.message);
    } finally {
      setIsSavingPartner(false);
    }
  };

  // Delete Partner
  const handleDeletePartner = async () => {
    if (!deletePartnerId) return;
    try {
      await deleteDocument(COLLECTIONS.PARTNERS, deletePartnerId);
      if (setPartners) {
        setPartners(prev => prev.filter(p => (p._firestoreId !== deletePartnerId && p.id !== deletePartnerId && p.partnerId !== deletePartnerId)));
      }
      if (selectedPartner && (selectedPartner._firestoreId === deletePartnerId || selectedPartner.id === deletePartnerId || selectedPartner.partnerId === deletePartnerId)) {
        setSelectedPartner(null);
      }
      setDeletePartnerId(null);
      toast.success('Partner profile removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete partner: ' + err.message);
    }
  };

  // Submit Referral Claim
  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!claimForm.clientName || !claimForm.clientPhone) {
      toast.error('Please enter client name and contact number');
      return;
    }

    setIsSubmittingClaim(true);
    try {
      const p = currentPartner || { name: 'Direct Partner', partnerId: 'P-1001' };
      const claimPayload = {
        partnerId: p.partnerId || 'P-1001',
        partnerName: p.name || 'Partner',
        partnerEmail: p.email || '',
        clientName: claimForm.clientName,
        clientPhone: claimForm.clientPhone,
        referralDate: claimForm.referralDate,
        notes: claimForm.notes,
        status: 'Pending Verification',
        createdAt: new Date().toISOString(),
      };

      await addDocument('referral_claims', claimPayload);
      setShowClaimModal(false);
      setClaimForm({
        clientName: '',
        clientPhone: '',
        referralDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      toast.success('Referral claim submitted! Operations team will cross-check within 24 hours.');
    } catch (err) {
      console.error(err);
      toast.error('Claim submission failed: ' + err.message);
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Verify Claim Handler (Admin)
  const handleVerifyClaim = async (claim) => {
    try {
      await updateDocument('referral_claims', claim._firestoreId || claim.id, {
        status: 'Verified & Linked',
        verifiedAt: new Date().toISOString(),
        verifiedBy: currentUser?.email || 'Admin',
      });
      toast.success(`Referral for ${claim.clientName} verified & linked to ${claim.partnerName}!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to verify claim');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    try {
      const columns = [
        { key: 'partnerId', label: 'Partner ID' },
        { key: 'name', label: 'Studio Name' },
        { key: 'type', label: 'Partner Type' },
        { key: 'contactPerson', label: 'Contact Person' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'commissionRate', label: 'Commission Rate' },
        { key: 'brNumber', label: 'BR Number' },
        { key: 'bankName', label: 'Bank Name' },
        { key: 'accountNumber', label: 'Account Number' },
        { key: 'status', label: 'Status' },
      ];
      exportToCsv(filteredPartners, columns, 'PTF_Partners_Directory');
      toast.success(`Exported ${filteredPartners.length} partner records to CSV`);
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    }
  };

  // Filtered partners list for admin search
  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query || 
        p.name?.toLowerCase().includes(query) ||
        p.contactPerson?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.phone?.toLowerCase().includes(query) ||
        p.partnerId?.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (activeFilter === 'active') return p.status === 'Active' || !p.status;
      return true;
    });
  }, [partners, searchQuery, activeFilter]);

  const activePartnersCount = partners.filter(p => p.status === 'Active' || !p.status).length;
  const pendingAppsCount = applications.filter(a => a.status === 'Pending Review' || !a.status).length;
  const pendingClaimsCount = claims.filter(c => c.status === 'Pending Verification').length;

  const publicQrUrl = (partner) => {
    const pid = partner?.partnerId || partner?.id || 'P-1001';
    return `https://print2frame.xyz/client-detail-submitting-form?ref=${pid}`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DEDICATED PARTNER ROLE VIEW (When logged in as Partner)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isPartnerUser) {
    const partnerQr = publicQrUrl(currentPartner);
    const totalAccumulatedComm = myReferralLeads.reduce((s, l) => s + (l.calculatedCommAmount || 0), 0);
    const eligiblePayoutComm = myReferralLeads.filter(l => l.commState === 'Eligible for Payout').reduce((s, l) => s + (l.calculatedCommAmount || 0), 0);
    const inProductionCount = myReferralLeads.filter(l => l.commState === 'Accrued (In Production)').length;

    return (
      <div className="h-[calc(100vh-140px)] flex flex-col pb-6 space-y-4">
        {/* Standardized Header */}
        <PageHeader
          title="Partners"
          subtitle="Your personal partner workspace, referral tracking, agreements vault, and counter QR flyers."
          metrics={[
            { label: "Partner ID", value: currentPartner?.partnerId || 'P-1001', color: "cyan" },
            { label: "Commission Rate", value: `${((Number(currentPartner?.commissionRate) || 0.05) * 100).toFixed(0)}%`, color: "amber" },
            { label: "Eligible Payout", value: `LKR ${eligiblePayoutComm.toLocaleString()}`, color: "emerald" },
            { label: "Total Accumulated", value: `LKR ${totalAccumulatedComm.toLocaleString()}`, color: "cyan" }
          ]}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowClaimModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-surface-container border border-outline-variant hover:border-primary/40 text-on-surface rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0 cursor-pointer"
              >
                <Handshake size={14} className="text-primary" />
                <span>Claim Offline Referral</span>
              </button>
              <button
                onClick={() => setQrPartner(currentPartner)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(0,218,243,0.25)] active:scale-95 flex-shrink-0 cursor-pointer"
              >
                <QrCode size={16} />
                <span>Print QR Flyer</span>
              </button>
            </div>
          }
        />

        {/* Sub-Navigation Tabs */}
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
            <ShieldCheck size={14} /> Agreements Vault (4)
          </button>
          <button
            onClick={() => setPartnerTab('marketing')}
            className={'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ' + (
              partnerTab === 'marketing'
                ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            )}
          >
            <QrCode size={14} /> Marketing Kit & QR Flyer
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Referrals & Deals Table */}
          {partnerTab === 'referrals' && (
            <div className="space-y-4">
              <div className="bg-surface-container rounded-2xl border border-outline-variant/60 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container-high/80 text-[10px] font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/60">
                      <tr>
                        <th className="py-3 px-4">Client Name & Contact</th>
                        <th className="py-3 px-4">Date Referred</th>
                        <th className="py-3 px-4">Framing Scope</th>
                        <th className="py-3 px-4 text-right">Deal Value</th>
                        <th className="py-3 px-4 text-right">Commission</th>
                        <th className="py-3 px-4">Client Payment Status</th>
                        <th className="py-3 px-4">Commission Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {myReferralLeads.length > 0 ? (
                        myReferralLeads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-surface-container-high/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-on-surface text-xs">{lead.name || 'Direct Client'}</div>
                              <div className="text-[10px] text-on-surface-variant flex items-center gap-2 mt-0.5">
                                <span className="font-mono">{lead.phone || 'No phone'}</span>
                                {lead.phone && (
                                  <button
                                    type="button"
                                    onClick={() => window.open('https://wa.me/' + lead.phone.replace(/[^0-9]/g, ''), '_blank')}
                                    className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
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
                          <td colSpan={7} className="py-12 text-center text-on-surface-variant text-xs">
                            <Layers size={36} className="mx-auto mb-2 opacity-25 text-on-surface-variant" />
                            <p className="font-bold text-on-surface">No referrals yet</p>
                            <p className="text-[11px] text-on-surface-variant mt-1">Share your QR flyer or referral link with clients to start earning commissions!</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Agreements Vault */}
          {partnerTab === 'documents' && (
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
          )}

          {/* Marketing Kit & QR Flyer */}
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
                      value={partnerQr}
                      className="w-full bg-transparent font-mono text-xs text-primary focus:outline-none select-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(partnerQr);
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
                    src={'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(partnerQr)}
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
        </div>

        {/* Claim Modal */}
        <ModalWrapper
          isOpen={showClaimModal}
          onClose={() => setShowClaimModal(false)}
          maxWidth="max-w-md"
          height="h-auto"
          ariaLabel="Claim Missing Referral"
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Handshake size={18} className="text-primary" /> Claim Missing Referral
              </h3>
              <button onClick={() => setShowClaimModal(false)} className="text-on-surface-variant hover:text-on-surface p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitClaim} className="space-y-3.5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Client Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Jayawardena"
                  value={claimForm.clientName}
                  onChange={(e) => setClaimForm(p => ({ ...p, clientName: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Client Mobile (+94) *</label>
                <input
                  type="text"
                  required
                  placeholder="+94 77 123 4567"
                  value={claimForm.clientPhone}
                  onChange={(e) => setClaimForm(p => ({ ...p, clientPhone: formatPhone(e.target.value) }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Date of Referral</label>
                <input
                  type="date"
                  value={claimForm.referralDate}
                  onChange={(e) => setClaimForm(p => ({ ...p, referralDate: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Notes / Scope (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Details of the job discussed..."
                  value={claimForm.notes}
                  onChange={(e) => setClaimForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs text-on-surface"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2 bg-surface-container text-on-surface-variant text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClaim}
                  className="px-5 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-md"
                >
                  {isSubmittingClaim ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </ModalWrapper>

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

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ADMIN & INTERNAL MANAGEMENT MASTER-DETAIL VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col pb-6">
      {/* Standardized Header matching Leads, Customers, and User Management */}
      <PageHeader
        title="Partners"
        subtitle="Manage framing partner studios, vetting queue, referral tracking, and monthly commission settlements."
        metrics={[
          { label: "Total Partners", value: partners.length, color: "cyan" },
          { label: "Active Studios", value: activePartnersCount, color: "emerald" },
          { label: "Vetting Queue", value: pendingAppsCount, color: "amber" },
          { label: "Missing Claims", value: pendingClaimsCount, color: "rose" }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-surface-container border border-outline-variant hover:border-primary/40 text-on-surface rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0 cursor-pointer"
              title="Export partner directory to CSV"
            >
              <Download size={15} className="text-primary" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(0,218,243,0.25)] active:scale-95 flex-shrink-0 cursor-pointer"
            >
              <Plus size={16} />
              <span>Register Partner</span>
            </button>
          </div>
        }
      />

      {/* Standardized Filter & Search Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search partners by studio name, partner ID, contact person, phone, email..."
        activeFilter={activeFilter}
        onFilterChange={(filterId) => {
          setActiveFilter(filterId);
          if (filterId === 'applications' || filterId === 'claims' || filterId === 'settlements') {
            setSelectedPartner(null);
          }
        }}
        filterOptions={[
          { id: 'all', label: 'All Partners', count: partners.length },
          { id: 'active', label: 'Active Studios', count: activePartnersCount },
          { id: 'applications', label: 'Vetting Queue', count: pendingAppsCount },
          { id: 'claims', label: 'Referral Claims', count: pendingClaimsCount },
          { id: 'settlements', label: 'Monthly Settlements', count: partners.length }
        ]}
        totalCount={partners.length}
        filteredCount={filteredPartners.length}
      />

      {/* Main Master-Detail Layout */}
      <div className="flex-1 flex lg:flex-row flex-col gap-6 overflow-hidden min-h-0">
        
        {/* VIEW 1: Vetting Applications Queue */}
        {activeFilter === 'applications' ? (
          <div className="flex-1 bg-surface-container/60 border border-outline-variant/60 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 border-b border-outline-variant/60 bg-surface-container-low/80 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <Handshake size={14} className="text-primary" />
                  Partner Registration Ingestion Queue ({applications.length})
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Review partnership registrations submitted from the public portal.</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-outline-variant/30">
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
                      <div className="text-xs text-on-surface-variant flex flex-wrap items-center gap-3 mt-1">
                        <span>Person: <strong>{app.contactPerson || 'N/A'}</strong></span>
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
                          if (setPartners) setPartners(prev => [...prev, newP]);
                          toast.success(`Approved ${newP.name} as Official Partner!`);
                        }}
                        className="px-3.5 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-sm hover:bg-primary/90 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check size={13} /> Approve (5% Comm)
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-on-surface-variant text-xs">
                  <Handshake size={36} className="mx-auto mb-2 opacity-25" />
                  <p className="font-bold text-on-surface">No pending applications in queue</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">New studio partner registrations will automatically appear here.</p>
                </div>
              )}
            </div>
          </div>
        ) : activeFilter === 'claims' ? (
          /* VIEW 2: Referral Claims Desk */
          <div className="flex-1 bg-surface-container/60 border border-outline-variant/60 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 border-b border-outline-variant/60 bg-surface-container-low/80 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <Link size={14} className="text-primary" />
                  Offline Referral Claims Verification Desk ({claims.length})
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Verify customer referrals reported by partners for phone/walk-in leads.</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-outline-variant/30">
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
                      <div className="text-xs text-on-surface-variant mt-1 flex flex-wrap items-center gap-2">
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
                <div className="py-16 text-center text-on-surface-variant text-xs">
                  <Link size={36} className="mx-auto mb-2 opacity-25" />
                  <p className="font-bold text-on-surface">No pending referral claims</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">Missing referral reports submitted by partners will appear here.</p>
                </div>
              )}
            </div>
          </div>
        ) : activeFilter === 'settlements' ? (
          /* VIEW 3: Monthly Settlements */
          <div className="flex-1 bg-surface-container/60 border border-outline-variant/60 rounded-2xl overflow-hidden shadow-sm flex flex-col p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <DollarSign size={18} className="text-primary" /> Month-End Batch Commission Settlement Ledger
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Disburse accumulated commissions for 100% completed deals via bank transfer in one batch.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-outline-variant/30">
              {partners.map(p => {
                const partnerLeads = getPartnerReferrals(p);
                const eligiblePayout = partnerLeads.filter(l => l.commState === 'Eligible for Payout').reduce((s, l) => s + (l.calculatedCommAmount || 0), 0);
                const totalSettled = partnerLeads.filter(l => l.commState === 'Paid & Settled').reduce((s, l) => s + (l.calculatedCommAmount || 0), 0);

                return (
                  <div key={p.partnerId || p.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-on-surface">{p.name}</p>
                        <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{p.partnerId}</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                        Bank: <strong className="text-on-surface">{p.bankName || 'Not Set'}</strong> · A/C: <strong className="text-on-surface">{p.accountNumber || 'Not Set'}</strong> · Branch: {p.branchName || 'N/A'}
                      </p>
                      <div className="flex items-center gap-3 text-xs mt-1">
                        <span className="text-emerald-400 font-mono font-bold">Eligible: LKR {eligiblePayout.toLocaleString()}</span>
                        <span className="text-on-surface-variant font-mono">Settled: LKR {totalSettled.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const txId = 'TXN-' + String(Date.now()).slice(-6);
                        toast.success(`Monthly settlement processed for ${p.name} (Ref: ${txId})`);
                      }}
                      className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl border border-primary/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <CreditCard size={14} /> Disburse Payout
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* VIEW 4: MASTER-DETAIL 2-PANEL VIEW (Matching Customers & User Management) */
          <>
            {/* LEFT COLUMN: Partner Directory List (1/3 Width) */}
            <div className={`w-full lg:w-1/3 ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'} flex-col border border-outline-variant/60 bg-surface-container/60 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)] h-full`}>
              <div className="bg-surface-container-low/80 p-3.5 px-4 border-b border-outline-variant/60 flex justify-between items-center text-xs font-bold text-on-surface-variant uppercase tracking-wider flex-shrink-0">
                <span className="flex items-center gap-2">
                  <Handshake size={14} className="text-primary" />
                  Partner Directory ({filteredPartners.length})
                </span>
                <span className="text-[10px] text-on-surface-variant/70 lowercase font-medium">
                  click to inspect
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-outline-variant/30">
                {filteredPartners.length === 0 ? (
                  <div className="p-12 text-center text-on-surface-variant text-sm font-medium">
                    <Handshake size={36} className="mx-auto mb-3 opacity-25 text-on-surface-variant" />
                    <p className="font-bold text-on-surface">No partner records found</p>
                    <p className="text-xs text-on-surface-variant mt-1">Try adjusting your search query or filter.</p>
                  </div>
                ) : (
                  filteredPartners.map(partner => {
                    const isSelected = (selectedPartner?.partnerId === partner.partnerId) || (selectedPartner?.id === partner.id);
                    const partnerLeads = getPartnerReferrals(partner);
                    const partnerComm = partnerLeads.reduce((s, l) => s + (l.calculatedCommAmount || 0), 0);

                    return (
                      <div
                        key={partner._firestoreId || partner.id || partner.partnerId}
                        onClick={() => {
                          setSelectedPartner(partner);
                          setEditFormData({ ...partner });
                          setMobileView('detail');
                        }}
                        className={`p-4 transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                          isSelected 
                            ? 'bg-primary/10 border-l-4 border-primary shadow-[inset_0_0_15px_rgba(0,218,243,0.08)]' 
                            : 'hover:bg-surface-container-high/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary font-bold text-sm shadow-inner flex-shrink-0">
                            {partner.name ? partner.name.charAt(0).toUpperCase() : 'P'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`font-bold text-xs truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                                {partner.name}
                              </p>
                              <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20 flex-shrink-0">
                                {partner.partnerId || 'P-1001'}
                              </span>
                            </div>

                            <p className="text-[10px] text-on-surface-variant truncate mt-0.5">
                              {partner.contactPerson ? `${partner.contactPerson} · ` : ''}{partner.phone || partner.email || 'No contact'}
                            </p>

                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                                {((Number(partner.commissionRate) || 0.05) * 100).toFixed(0)}% Comm
                              </span>
                              <span className="text-[9px] font-semibold text-on-surface-variant font-mono">
                                {partnerLeads.length} referral{partnerLeads.length === 1 ? '' : 's'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight size={14} className={`text-on-surface-variant/40 transition-transform group-hover:translate-x-0.5 ${isSelected ? 'text-primary' : ''}`} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Selected Partner Workspace (2/3 Width) */}
            <div className={`flex-1 ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} flex-col border border-outline-variant/60 bg-surface-container/40 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)] h-full`}>
              {!selectedPartner ? (
                /* Empty Selection Placeholder */
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <Handshake size={48} className="mx-auto mb-3 opacity-25 text-on-surface-variant" />
                  <h3 className="font-bold text-on-surface text-base">No Partner Selected</h3>
                  <p className="text-xs text-on-surface-variant max-w-sm mt-1">
                    Select a studio partner from the directory on the left to inspect relationship profile, agreement vault, commission ledger, and marketing QR kits.
                  </p>
                </div>
              ) : (
                /* Full Interactive Partner Workspace */
                <div className="flex-1 flex flex-col overflow-hidden">
                  
                  {/* Top Partner Profile Banner */}
                  <div className="p-5 sm:p-6 bg-surface-container-low/90 border-b border-outline-variant/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Mobile back button */}
                      <button 
                        onClick={() => setMobileView('list')}
                        className="lg:hidden p-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-on-surface-variant"
                      >
                        <X size={16} />
                      </button>

                      <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-black text-lg shadow-sm flex-shrink-0">
                        {selectedPartner.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-black text-on-surface truncate">{selectedPartner.name}</h2>
                          <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                            {selectedPartner.partnerId}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {selectedPartner.status || 'Active'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant mt-1">
                          {selectedPartner.contactPerson && <span>Contact: <strong className="text-on-surface">{selectedPartner.contactPerson}</strong></span>}
                          {selectedPartner.phone && (
                            <span className="font-mono flex items-center gap-1">
                              <Phone size={11} className="text-primary" /> {selectedPartner.phone}
                            </span>
                          )}
                          {selectedPartner.email && (
                            <span className="flex items-center gap-1">
                              <Mail size={11} className="text-primary" /> {selectedPartner.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                      {selectedPartner.phone && (
                        <a
                          href={`tel:${selectedPartner.phone.replace(/[^0-9+]/g, '')}`}
                          className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Call Studio via Phone Link"
                        >
                          <PhoneCall size={12} /> Call
                        </a>
                      )}
                      <button
                        onClick={() => setQrPartner(selectedPartner)}
                        className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold border border-outline-variant flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <QrCode size={12} /> QR Flyer
                      </button>
                      <button
                        onClick={() => {
                          setEditFormData({ ...selectedPartner });
                          setShowEditModal(true);
                        }}
                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold border border-primary/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setDeletePartnerId(selectedPartner._firestoreId || selectedPartner.id || selectedPartner.partnerId)}
                        className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition-colors cursor-pointer"
                        title="Delete Partner"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Sub-Workspace Navigation Tabs */}
                  <div className="flex items-center gap-2 px-5 pt-3 border-b border-outline-variant/60 bg-surface-container-low/40">
                    <button
                      onClick={() => setWorkspaceTab('referrals')}
                      className={'px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ' + (
                        workspaceTab === 'referrals'
                          ? 'border-primary text-primary bg-surface-container/60 font-black'
                          : 'border-transparent text-on-surface-variant hover:text-on-surface'
                      )}
                    >
                      <Layers size={13} /> Referrals & Deals ({selectedPartnerLeads.length})
                    </button>
                    <button
                      onClick={() => setWorkspaceTab('documents')}
                      className={'px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ' + (
                        workspaceTab === 'documents'
                          ? 'border-primary text-primary bg-surface-container/60 font-black'
                          : 'border-transparent text-on-surface-variant hover:text-on-surface'
                      )}
                    >
                      <ShieldCheck size={13} /> Agreements Vault (4)
                    </button>
                    <button
                      onClick={() => setWorkspaceTab('financial')}
                      className={'px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ' + (
                        workspaceTab === 'financial'
                          ? 'border-primary text-primary bg-surface-container/60 font-black'
                          : 'border-transparent text-on-surface-variant hover:text-on-surface'
                      )}
                    >
                      <CreditCard size={13} /> Bank & Payouts
                    </button>
                    <button
                      onClick={() => setWorkspaceTab('marketing')}
                      className={'px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ' + (
                        workspaceTab === 'marketing'
                          ? 'border-primary text-primary bg-surface-container/60 font-black'
                          : 'border-transparent text-on-surface-variant hover:text-on-surface'
                      )}
                    >
                      <QrCode size={13} /> Marketing Kit
                    </button>
                  </div>

                  {/* Sub-Workspace Active Content */}
                  <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
                    
                    {/* 1. Referrals & Deals Table */}
                    {workspaceTab === 'referrals' && (
                      <div className="bg-surface-container rounded-2xl border border-outline-variant/60 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-surface-container-high/80 text-[10px] font-black uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/60">
                              <tr>
                                <th className="py-3 px-4">Client Name</th>
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-4 text-right">Deal Value</th>
                                <th className="py-3 px-4 text-right">Commission</th>
                                <th className="py-3 px-4">Payment</th>
                                <th className="py-3 px-4">Commission Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/30">
                              {selectedPartnerLeads.length > 0 ? (
                                selectedPartnerLeads.map((lead) => (
                                  <tr key={lead.id} className="hover:bg-surface-container-high/40 transition-colors">
                                    <td className="py-3 px-4">
                                      <div className="font-bold text-on-surface">{lead.name || 'Direct Client'}</div>
                                      <div className="text-[10px] text-on-surface-variant font-mono">{lead.phone || 'No phone'}</div>
                                    </td>
                                    <td className="py-3 px-4 text-[11px] text-on-surface-variant font-mono">
                                      {lead.date || new Date().toISOString().split('T')[0]}
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-bold text-on-surface">
                                      LKR {lead.calculatedDealVal > 0 ? lead.calculatedDealVal.toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'TBD'}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <div className="font-mono font-black text-primary text-xs">
                                        LKR {lead.calculatedCommAmount > 0 ? lead.calculatedCommAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
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
                                      <span className={'text-[10px] font-black px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ' + (
                                        lead.commState === 'Paid & Settled'
                                          ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40'
                                          : lead.commState === 'Eligible for Payout'
                                          ? 'text-primary bg-primary/20 border-primary/40 animate-pulse'
                                          : lead.commState === 'Accrued (In Production)'
                                          ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
                                          : 'text-on-surface-variant bg-surface-container-high border-outline-variant'
                                      )}>
                                        {lead.commState}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6} className="py-8 text-center text-on-surface-variant text-xs">
                                    No referrals linked to {selectedPartner.name} yet.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* 2. Agreements Vault */}
                    {workspaceTab === 'documents' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          {
                            key: 'brCert',
                            title: 'Business Registration (BR) Certificate',
                            desc: 'Official BR document proving studio business registration in Sri Lanka.',
                            doc: selectedPartner?.documents?.brCert,
                          },
                          {
                            key: 'frameworkAgreement',
                            title: 'Signed Partner Framework Agreement',
                            desc: 'Bilateral referral terms, commission schedule, and monthly settlement agreement.',
                            doc: selectedPartner?.documents?.frameworkAgreement,
                          },
                          {
                            key: 'qualityGuidelines',
                            title: 'Signed Operational Quality Guidelines PDF',
                            desc: 'Print To Frame standard manufacturing, glass handling, and framing assembly specs.',
                            doc: selectedPartner?.documents?.qualityGuidelines,
                          },
                          {
                            key: 'nicDoc',
                            title: 'Signatory Identity Verification (NIC/Passport)',
                            desc: 'National identity card or passport scan of the studio owner/director.',
                            doc: selectedPartner?.documents?.nicDoc,
                          },
                        ].map((item) => (
                          <div key={item.key} className="bg-surface-container p-4 rounded-2xl border border-outline-variant/60 flex flex-col justify-between gap-3">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                                  <FileText size={14} className="text-primary" /> {item.title}
                                </span>
                                {item.doc?.url ? (
                                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Verified
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                    Pending
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-on-surface-variant mt-1">{item.desc}</p>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/30">
                              {item.doc?.url && (
                                <a
                                  href={item.doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-bold rounded-xl border border-outline-variant flex items-center gap-1 transition-colors"
                                >
                                  <Eye size={11} /> View
                                </a>
                              )}
                              <label className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold rounded-xl border border-primary/30 flex items-center gap-1 transition-colors cursor-pointer">
                                <Upload size={11} />
                                <span>{uploadingDocKey === item.key ? 'Uploading...' : item.doc?.url ? 'Re-Upload' : 'Upload'}</span>
                                <input
                                  type="file"
                                  accept=".pdf,.png,.jpg,.jpeg"
                                  className="hidden"
                                  disabled={uploadingDocKey === item.key}
                                  onChange={(e) => handleFileUpload(e, item.key, selectedPartner)}
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 3. Bank & Payouts */}
                    {workspaceTab === 'financial' && (
                      <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/60 space-y-4">
                        <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                          <CreditCard size={14} className="text-primary" /> Bank Account & Payout Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/60">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase">Bank Name</span>
                            <p className="font-bold text-on-surface text-sm mt-0.5">{selectedPartner.bankName || 'Not Set'}</p>
                          </div>
                          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/60">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase">Account Number</span>
                            <p className="font-bold text-on-surface text-sm font-mono mt-0.5">{selectedPartner.accountNumber || 'Not Set'}</p>
                          </div>
                          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/60">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase">Account Holder Name</span>
                            <p className="font-bold text-on-surface text-sm mt-0.5">{selectedPartner.accountName || selectedPartner.name}</p>
                          </div>
                          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/60">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase">Branch</span>
                            <p className="font-bold text-on-surface text-sm mt-0.5">{selectedPartner.branchName || 'Colombo Main'}</p>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={() => {
                              setEditFormData({ ...selectedPartner });
                              setShowEditModal(true);
                            }}
                            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold border border-primary/30 transition-colors"
                          >
                            Update Bank Details
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 4. Marketing Kit */}
                    {workspaceTab === 'marketing' && (
                      <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/60 space-y-4">
                        <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                          <QrCode size={14} className="text-primary" /> Dedicated Counter QR Code & Referral URL
                        </h4>
                        <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/60 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase">Public Form URL</p>
                            <p className="font-mono text-xs text-primary truncate mt-0.5">{publicQrUrl(selectedPartner)}</p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(publicQrUrl(selectedPartner));
                              toast.success('Referral link copied!');
                            }}
                            className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl border border-primary/30 cursor-pointer"
                          >
                            <Copy size={13} />
                          </button>
                        </div>

                        <button
                          onClick={() => setQrPartner(selectedPartner)}
                          className="w-full py-3 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Download size={14} /> Download Printable Counter Display Flyer (1200x1600)
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── CREATE PARTNER MODAL ─────────────────────────────────────────── */}
      <ModalWrapper
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="max-w-xl"
        height="h-auto"
        ariaLabel="Register Partner"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <Handshake size={18} className="text-primary" /> Register New Framing Partner Studio
            </h3>
            <button onClick={() => setShowCreateModal(false)} className="text-on-surface-variant hover:text-on-surface p-1">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreatePartner} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Studio / Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Ranga Framing"
                  value={newPartner.name}
                  onChange={(e) => setNewPartner(p => ({ ...p, name: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Partner Code / ID</label>
                <input
                  type="text"
                  placeholder="e.g. P-1002 (auto-generated if empty)"
                  value={newPartner.partnerId}
                  onChange={(e) => setNewPartner(p => ({ ...p, partnerId: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Ranga Madhuka"
                  value={newPartner.contactPerson}
                  onChange={(e) => setNewPartner(p => ({ ...p, contactPerson: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Mobile (+94)</label>
                <input
                  type="text"
                  placeholder="+94 77 123 4567"
                  value={newPartner.phone}
                  onChange={(e) => setNewPartner(p => ({ ...p, phone: formatPhone(e.target.value) }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="studio@example.com"
                  value={newPartner.email}
                  onChange={(e) => setNewPartner(p => ({ ...p, email: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.5"
                  value={newPartner.commissionRate}
                  onChange={(e) => setNewPartner(p => ({ ...p, commissionRate: Number(e.target.value) || 0.05 }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-surface-container text-on-surface-variant text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-md"
              >
                Register Partner
              </button>
            </div>
          </form>
        </div>
      </ModalWrapper>

      {/* ── EDIT PARTNER MODAL ─────────────────────────────────────────── */}
      {showEditModal && editFormData && (
        <ModalWrapper
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          maxWidth="max-w-xl"
          height="h-auto"
          ariaLabel="Edit Partner Details"
        >
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Edit3 size={18} className="text-primary" /> Edit {selectedPartner?.name} Profile
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-on-surface-variant hover:text-on-surface p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Studio / Business Name</label>
                  <input
                    type="text"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">BR Number</label>
                  <input
                    type="text"
                    value={editFormData.brNumber || ''}
                    onChange={(e) => setEditFormData(p => ({ ...p, brNumber: e.target.value }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editFormData.contactPerson || ''}
                    onChange={(e) => setEditFormData(p => ({ ...p, contactPerson: e.target.value }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Mobile (+94)</label>
                  <input
                    type="text"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData(p => ({ ...p, phone: formatPhone(e.target.value) }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Commission Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.5"
                    value={editFormData.commissionRate || 0.05}
                    onChange={(e) => setEditFormData(p => ({ ...p, commissionRate: Number(e.target.value) || 0.05 }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={editFormData.bankName || ''}
                    onChange={(e) => setEditFormData(p => ({ ...p, bankName: e.target.value }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={editFormData.accountNumber || ''}
                    onChange={(e) => setEditFormData(p => ({ ...p, accountNumber: e.target.value }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-surface-container text-on-surface-variant text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePartnerDetails}
                  disabled={isSavingPartner}
                  className="px-6 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-md"
                >
                  {isSavingPartner ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* ── DELETE MODAL ─────────────────────────────────────────── */}
      <DeleteModal
        isOpen={!!deletePartnerId}
        onClose={() => setDeletePartnerId(null)}
        onConfirm={handleDeletePartner}
        title="Remove Partner Studio"
        message="Are you sure you want to remove this partner from the directory? Their past referral deals and invoices will remain intact."
      />

      {/* ── QR FLYER MODAL ─────────────────────────────────────────── */}
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
