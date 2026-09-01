import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, Shield, User, Mail, Briefcase, Plus, Check, X, Trash2, 
  KeyRound, Clock, Edit2, Save, ChevronRight, Phone, ShieldCheck,
  UserCheck, AlertCircle, Camera, Sparkles, ArrowLeft, Send, Eye,
  Building, CheckCircle2, Copy, PhoneCall, Lock, RefreshCw, Layers
} from 'lucide-react';
import DeleteModal from '../common/DeleteModal';
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from '../../utils/toast';
import { subscribeToCollection, addDocument, updateDocument, COLLECTIONS } from '../../services/firestoreSync';
import { 
  PageHeader, FilterBar, StatusBadge, ModalWrapper, UserAvatar, 
  ImageCropModal, EmailTemplateModal 
} from '../common/ui';
import { SYSTEM_ROLES, ROLE_METADATA, getRoleCategory } from '../../constants/roles';
import { formatPhone } from '../../utils/validation';

export default function AgentDatabase({ 
  users = [], 
  setUsers, 
  pendingUsers = [], 
  setPendingUsers, 
  currentUser, 
  onApprove, 
  onReject,
  partners = [],
  setPartners,
  customers = [],
  setCustomers,
  dataStore 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'employees' | 'clients'
  const [workspaceTab, setWorkspaceTab] = useState('rbac'); // 'rbac' | 'profile' | 'audit' | 'security'
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'
  const [deleteId, setDeleteId] = useState(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const photoInputRef = useRef(null);

  // Image Crop Modal state
  const [rawImageForCrop, setRawImageForCrop] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);

  // Direct User Creation Modal State
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: '',
    identifier: '',
    password: '',
    contactNumber: '',
    role: 'Sales',
    company: '',
    specialty: '',
  });

  // Review Registration Modal State
  const [reviewingApplicant, setReviewingApplicant] = useState(null);
  const [selectedReviewRole, setSelectedReviewRole] = useState('Sales');

  // Email Template Modal State
  const [emailModalConfig, setEmailModalConfig] = useState({
    isOpen: false,
    recipient: null,
    initialTemplateId: null,
  });

  React.useEffect(() => {
    const unsub = subscribeToCollection(COLLECTIONS.AUDIT_LOG, setAuditLogs);
    return () => unsub();
  }, []);

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Administrator';

  // 1. DECOUPLE PARTNERS: Filter out users with role 'Partner' (since partners are managed in Partners tab)
  const nonPartnerUsers = useMemo(() => {
    return users.filter(u => u.role !== 'Partner');
  }, [users]);

  const pendingNonPartnerUsers = useMemo(() => {
    return pendingUsers.filter(u => u.role !== 'Partner');
  }, [pendingUsers]);

  const employeeCount = useMemo(() => {
    return nonPartnerUsers.filter(u => getRoleCategory(u.role) !== 'Clients').length;
  }, [nonPartnerUsers]);

  const clientCount = useMemo(() => {
    return nonPartnerUsers.filter(u => u.role === 'Business Client' || u.role === 'Customer').length;
  }, [nonPartnerUsers]);

  const filteredUsers = useMemo(() => {
    return nonPartnerUsers.filter(u => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query || (
        u.name?.toLowerCase().includes(query) ||
        u.identifier?.toLowerCase().includes(query) ||
        u.role?.toLowerCase().includes(query) ||
        u.company?.toLowerCase().includes(query) ||
        u.contactNumber?.toLowerCase().includes(query)
      );

      if (!matchesSearch) return false;

      if (activeTab === 'employees') return getRoleCategory(u.role) !== 'Clients';
      if (activeTab === 'clients') return u.role === 'Business Client' || u.role === 'Customer';
      return true;
    });
  }, [nonPartnerUsers, searchQuery, activeTab]);

  // Auto-select first member if none selected
  React.useEffect(() => {
    if (!selectedAgent && filteredUsers.length > 0) {
      setSelectedAgent(filteredUsers[0]);
      setEditForm({ ...filteredUsers[0] });
    }
  }, [selectedAgent, filteredUsers]);

  const handleAgentPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setRawImageForCrop(event.target?.result);
      setShowCropModal(true);
      if (photoInputRef.current) photoInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleAgentCropComplete = async (croppedBase64) => {
    if (!selectedAgent) return;
    try {
      await updateDoc(doc(db, "users", selectedAgent.identifier), { photoURL: croppedBase64 });
      setUsers(prev => prev.map(u => u.identifier === selectedAgent.identifier ? { ...u, photoURL: croppedBase64 } : u));
      setSelectedAgent(prev => ({ ...prev, photoURL: croppedBase64 }));
      toast.success("Profile photo updated successfully!");
    } catch (err) {
      toast.error("Failed to update photo: " + err.message);
    }
  };

  const handleDeleteAgent = async () => {
    if (deleteId) {
      try {
        await deleteDoc(doc(db, "users", deleteId));
        setUsers(prev => prev.filter(u => u.identifier !== deleteId));
        if (selectedAgent?.identifier === deleteId) {
          setSelectedAgent(null);
        }
        setDeleteId(null);
        toast.success("User access revoked successfully");
      } catch (err) {
        toast.error("Error removing user: " + err.message);
      }
    }
  };

  const handleRoleChange = async (newRole) => {
    if (!selectedAgent) return;
    try {
      await updateDoc(doc(db, "users", selectedAgent.identifier), { role: newRole });
      setUsers(prev => prev.map(u => u.identifier === selectedAgent.identifier ? { ...u, role: newRole } : u));
      setSelectedAgent(prev => ({ ...prev, role: newRole }));
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      toast.error("Error updating role: " + err.message);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedAgent) return;
    const newStatus = selectedAgent.status === 'Deactivated' ? 'Active' : 'Deactivated';
    try {
      await updateDoc(doc(db, "users", selectedAgent.identifier), { status: newStatus });
      setUsers(prev => prev.map(u => u.identifier === selectedAgent.identifier ? { ...u, status: newStatus } : u));
      setSelectedAgent(prev => ({ ...prev, status: newStatus }));
      toast.success(`User account ${newStatus === 'Active' ? 'Reactivated' : 'Deactivated'}`);
    } catch (err) {
      toast.error("Failed to change account status: " + err.message);
    }
  };

  const handleSaveDetails = async () => {
    if (!selectedAgent) return;
    try {
      const updates = {
        name: editForm.name || selectedAgent.name,
        contactNumber: editForm.contactNumber || selectedAgent.contactNumber || "",
        company: editForm.company || selectedAgent.company || "",
        location: editForm.location || selectedAgent.location || "",
        jobTitle: editForm.jobTitle || selectedAgent.jobTitle || "",
        bio: editForm.bio || selectedAgent.bio || "",
      };
      await updateDoc(doc(db, "users", selectedAgent.identifier), updates);
      setUsers(prev => prev.map(u => u.identifier === selectedAgent.identifier ? { ...u, ...updates } : u));
      setSelectedAgent(prev => ({ ...prev, ...updates }));
      setIsEditing(false);
      toast.success("Member details updated successfully");
    } catch (err) {
      toast.error("Failed to save changes: " + err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createUserForm.name || !createUserForm.identifier) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const emailKey = createUserForm.identifier.trim().toLowerCase();
      const newUser = {
        name: createUserForm.name,
        identifier: emailKey,
        role: createUserForm.role,
        contactNumber: createUserForm.contactNumber,
        company: createUserForm.company,
        specialty: createUserForm.specialty,
        status: 'Active',
        isApproved: true,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "users", emailKey), newUser);
      setUsers(prev => [...prev.filter(u => u.identifier !== emailKey), newUser]);
      setShowCreateUserModal(false);
      setCreateUserForm({
        name: '',
        identifier: '',
        password: '',
        contactNumber: '',
        role: 'Sales',
        company: '',
        specialty: '',
      });
      toast.success(`User ${newUser.name} enrolled as ${newUser.role} successfully!`);
    } catch (err) {
      toast.error("Failed to create user: " + err.message);
    }
  };

  const handleOpenReview = (user) => {
    setReviewingApplicant(user);
    setSelectedReviewRole(user.role || 'Sales');
  };

  const handleExecuteApproval = async () => {
    if (!reviewingApplicant) return;
    const finalRole = selectedReviewRole;
    if (onApprove) {
      await onApprove(reviewingApplicant, finalRole);
    }
    setReviewingApplicant(null);
    toast.success(`Approved ${reviewingApplicant.name} as ${finalRole}`);
  };

  const handleExecuteRejection = async (identifier) => {
    setPendingUsers(prev => prev.filter(u => u.identifier !== identifier));
    if (onReject) await onReject(identifier);
    if (reviewingApplicant?.identifier === identifier) setReviewingApplicant(null);
    toast.info("Registration request dismissed");
  };

  const userAuditLogs = useMemo(() => {
    if (!selectedAgent) return [];
    return auditLogs.filter(log => log.userId === selectedAgent.identifier || log.user === selectedAgent.name)
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }, [auditLogs, selectedAgent]);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col pb-6">
      {/* Standardized Header matching Leads, Customers, and Partners */}
      <PageHeader
        title="User Management"
        subtitle="Manage authenticated internal identities, dynamic RBAC role assignments, and client accounts."
        metrics={[
          { label: "Total Members", value: nonPartnerUsers.length, color: "cyan" },
          { label: "Internal Team", value: employeeCount, color: "emerald" },
          { label: "Client Accounts", value: clientCount, color: "purple" },
          { label: "Pending Approvals", value: pendingNonPartnerUsers.length, color: pendingNonPartnerUsers.length > 0 ? "warning" : "neutral" }
        ]}
        actions={
          isAdmin && (
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(0,218,243,0.25)] active:scale-95 flex-shrink-0 cursor-pointer"
            >
              <Plus size={16} />
              <span>Enroll New Member</span>
            </button>
          )
        }
      />

      {/* Standardized Filter & Search Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Search members by name, email, company, phone, or role..."
        activeFilter={activeTab}
        onFilterChange={setActiveTab}
        filterOptions={[
          { id: 'all', label: 'All Members', count: nonPartnerUsers.length },
          { id: 'employees', label: 'Internal Team', count: employeeCount },
          { id: 'clients', label: 'Corporate & Retail Clients', count: clientCount }
        ]}
        totalCount={nonPartnerUsers.length}
        filteredCount={filteredUsers.length}
      />

      {/* Pending Registrations Callout (Admin Only) */}
      {isAdmin && pendingNonPartnerUsers.length > 0 && (
        <div className="mb-6 p-4 sm:p-5 bg-surface-container/90 border-2 border-primary/40 rounded-3xl shadow-[0_8px_30px_rgba(0,218,243,0.12)] flex-shrink-0 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/20 text-primary rounded-lg">
                <Shield size={16} />
              </div>
              <h3 className="text-xs font-black text-on-surface uppercase tracking-wider">
                Registration Applications Awaiting Review
              </h3>
            </div>
            <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full font-black uppercase tracking-wider">
              {pendingNonPartnerUsers.length} Requests Pending
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingNonPartnerUsers.map(user => (
              <div 
                key={user.identifier} 
                className="p-4 bg-surface-container-low/90 rounded-2xl border border-outline-variant/60 hover:border-primary/50 transition-all flex items-center justify-between shadow-sm"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-extrabold text-on-surface truncate">{user.name}</p>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md border bg-rose-500/15 text-rose-400 border-rose-500/30">
                      {user.role || 'Member'}
                    </span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant font-mono truncate mt-0.5">{user.identifier}</p>
                  {user.company && (
                    <p className="text-[10px] text-primary font-semibold truncate mt-0.5">🏢 {user.company}</p>
                  )}
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <button 
                    onClick={() => handleOpenReview(user)} 
                    className="p-2 bg-primary/15 text-primary border border-primary/30 rounded-xl hover:bg-primary/25 transition-colors cursor-pointer"
                    title="Review Full Dossier"
                  >
                    <Eye size={14} />
                  </button>
                  <button 
                    onClick={() => {
                      setReviewingApplicant(user);
                      setSelectedReviewRole(user.role || 'Sales');
                      handleExecuteApproval();
                    }} 
                    className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer"
                    title="Quick Approve"
                  >
                    <Check size={14} />
                  </button>
                  <button 
                    onClick={() => handleExecuteRejection(user.identifier)} 
                    className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-colors cursor-pointer"
                    title="Decline"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Master-Detail 2-Panel View (Compact & Robust Showcase Style) */}
      <div className="flex-1 flex lg:flex-row flex-col gap-6 overflow-hidden min-h-0">
        
        {/* LEFT COLUMN: User Registry (1/3 Width) */}
        <div className={`w-full lg:w-1/3 ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'} flex-col border border-outline-variant/60 bg-surface-container/60 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)] h-full`}>
          <div className="bg-surface-container-low/80 p-3.5 px-4 border-b border-outline-variant/60 flex justify-between items-center text-xs font-bold text-on-surface-variant uppercase tracking-wider flex-shrink-0">
            <span className="flex items-center gap-2">
              <UserCheck size={14} className="text-primary" />
              Enrolled Members ({filteredUsers.length})
            </span>
            <span className="text-[10px] text-on-surface-variant/70 lowercase font-medium">
              click to inspect
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-outline-variant/30">
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant text-sm font-medium">
                <User size={36} className="mx-auto mb-3 opacity-25 text-on-surface-variant" />
                <p className="font-bold text-on-surface">No members found</p>
                <p className="text-xs text-on-surface-variant mt-1">Try adjusting your search criteria or category filter.</p>
              </div>
            ) : (
              filteredUsers.map(u => {
                const isSelected = selectedAgent?.identifier === u.identifier;
                const roleMeta = ROLE_METADATA[u.role] || { badge: 'bg-surface-container-high text-on-surface-variant' };

                return (
                  <div
                    key={u.identifier}
                    onClick={() => {
                      setSelectedAgent(u);
                      setEditForm({ ...u });
                      setIsEditing(false);
                      setMobileView('detail');
                    }}
                    className={`p-4 transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-primary shadow-[inset_0_0_15px_rgba(0,218,243,0.08)]'
                        : 'hover:bg-surface-container-high/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        photoURL={u.photoURL}
                        name={u.name}
                        role={u.role}
                        size="md"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold text-xs truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                            {u.name}
                          </p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border flex-shrink-0 ${roleMeta.badge}`}>
                            {u.role}
                          </span>
                        </div>

                        <p className="text-[10px] text-on-surface-variant truncate mt-0.5 font-mono">
                          {u.identifier}
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          {u.contactNumber && (
                            <span className="text-[9px] text-on-surface-variant font-mono flex items-center gap-1">
                              <Phone size={9} className="text-primary" /> {u.contactNumber}
                            </span>
                          )}
                          {u.company && (
                            <span className="text-[9px] text-primary/80 truncate">
                              🏢 {u.company}
                            </span>
                          )}
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

        {/* RIGHT COLUMN: Member Workspace Showcase (2/3 Width) */}
        <div className={`flex-1 ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} flex-col border border-outline-variant/60 bg-surface-container/40 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)] h-full`}>
          {!selectedAgent ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <User size={48} className="mx-auto mb-3 opacity-25 text-on-surface-variant" />
              <h3 className="font-bold text-on-surface text-base">No Member Selected</h3>
              <p className="text-xs text-on-surface-variant max-w-sm mt-1">
                Select an internal employee or client account from the registry on the left to inspect permissions, edit contact profile, and review activity audit trail.
              </p>
            </div>
          ) : (
            /* Full Compact & Robust Member Workspace */
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Top Member Profile Banner */}
              <div className="p-5 sm:p-6 bg-surface-container-low/90 border-b border-outline-variant/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Mobile back button */}
                  <button 
                    onClick={() => setMobileView('list')}
                    className="lg:hidden p-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-on-surface-variant"
                  >
                    <X size={16} />
                  </button>

                  {/* Large Avatar with change trigger */}
                  <div className="relative group flex-shrink-0">
                    <UserAvatar
                      photoURL={selectedAgent.photoURL}
                      name={selectedAgent.name}
                      role={selectedAgent.role}
                      size="lg"
                    />
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center text-white transition-opacity cursor-pointer shadow-lg"
                          title="Change Profile Photo"
                        >
                          <Camera size={18} />
                        </button>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAgentPhotoUpload}
                        />
                      </>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-on-surface truncate">{selectedAgent.name}</h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${ROLE_METADATA[selectedAgent.role]?.badge || 'bg-surface-container text-on-surface-variant'}`}>
                        {selectedAgent.role}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        selectedAgent.status === 'Deactivated' 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {selectedAgent.status || 'Active'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant mt-1">
                      <span className="font-mono flex items-center gap-1">
                        <Mail size={11} className="text-primary" /> {selectedAgent.identifier}
                      </span>
                      {selectedAgent.contactNumber && (
                        <span className="font-mono flex items-center gap-1">
                          <Phone size={11} className="text-primary" /> {selectedAgent.contactNumber}
                        </span>
                      )}
                      {selectedAgent.company && (
                        <span className="flex items-center gap-1">
                          <Building size={11} className="text-primary" /> {selectedAgent.company}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                  {selectedAgent.contactNumber && (
                    <a
                      href={`tel:${selectedAgent.contactNumber.replace(/[^0-9+]/g, '')}`}
                      className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Call via Phone Link"
                    >
                      <PhoneCall size={12} /> Call
                    </a>
                  )}
                  <button
                    onClick={() => setEmailModalConfig({
                      isOpen: true,
                      recipient: selectedAgent,
                      initialTemplateId: selectedAgent.role === 'Business Client' ? 'client_approval' : 'employee_invite',
                    })}
                    className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold border border-outline-variant flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mail size={12} /> Email
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setEditForm({ ...selectedAgent });
                          setIsEditing(!isEditing);
                        }}
                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold border border-primary/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit2 size={12} /> {isEditing ? 'Cancel Edit' : 'Edit'}
                      </button>
                      {currentUser?.identifier !== selectedAgent.identifier && (
                        <button
                          onClick={() => setDeleteId(selectedAgent.identifier)}
                          className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition-colors cursor-pointer"
                          title="Revoke Access"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Sub-Workspace Navigation Tabs */}
              <div className="flex items-center gap-2 px-5 pt-3 border-b border-outline-variant/60 bg-surface-container-low/40">
                <button
                  onClick={() => setWorkspaceTab('rbac')}
                  className={'px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ' + (
                    workspaceTab === 'rbac'
                      ? 'border-primary text-primary bg-surface-container/60 font-black'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  <Shield size={13} /> Role & Permissions
                </button>
                <button
                  onClick={() => setWorkspaceTab('profile')}
                  className={'px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ' + (
                    workspaceTab === 'profile'
                      ? 'border-primary text-primary bg-surface-container/60 font-black'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  <User size={13} /> Profile Details
                </button>
                <button
                  onClick={() => setWorkspaceTab('audit')}
                  className={'px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ' + (
                    workspaceTab === 'audit'
                      ? 'border-primary text-primary bg-surface-container/60 font-black'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  <Clock size={13} /> Activity Trail ({userAuditLogs.length})
                </button>
                <button
                  onClick={() => setWorkspaceTab('security')}
                  className={'px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ' + (
                    workspaceTab === 'security'
                      ? 'border-primary text-primary bg-surface-container/60 font-black'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  <Lock size={13} /> Security & Access
                </button>
              </div>

              {/* Sub-Workspace Active Content */}
              <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
                
                {/* TAB 1: Role & RBAC Permissions */}
                {workspaceTab === 'rbac' && (
                  <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/60 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                          <Shield size={14} className="text-primary" /> Dynamic Role Assignment (RBAC)
                        </h4>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Assigned role dictates module visibility, operational actions, and data access policies.
                        </p>
                      </div>
                      <span className={`text-xs font-black px-3 py-1 rounded-lg border ${ROLE_METADATA[selectedAgent.role]?.badge}`}>
                        {selectedAgent.role}
                      </span>
                    </div>

                    {isAdmin ? (
                      <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/60 space-y-3">
                        <label className="block text-[10px] uppercase font-bold text-on-surface-variant">Change Access Level</label>
                        <select 
                          value={selectedAgent.role}
                          onChange={(e) => handleRoleChange(e.target.value)}
                          className="w-full bg-surface-container border border-outline-variant rounded-xl p-2.5 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer"
                        >
                          {SYSTEM_ROLES.filter(r => r !== 'Partner').map(roleName => (
                            <option key={roleName} value={roleName}>
                              {roleName} — {ROLE_METADATA[roleName]?.label || roleName}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-on-surface-variant">
                          Department: <strong className="text-primary">{getRoleCategory(selectedAgent.role)}</strong>
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/60">
                        <p className="text-xs font-bold text-on-surface">Role: {selectedAgent.role}</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">Department: {getRoleCategory(selectedAgent.role)}</p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-outline-variant/40">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Granted Capabilities</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/40 flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          <span>CRM & Lead Intake Access</span>
                        </div>
                        <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/40 flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          <span>Quotation & Invoice Inspection</span>
                        </div>
                        <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/40 flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          <span>Customer Registry Management</span>
                        </div>
                        <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/40 flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          <span>Production & Logistics Overview</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Profile & Identity Details */}
                {workspaceTab === 'profile' && (
                  <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/60 space-y-4">
                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                      <User size={14} className="text-primary" /> Profile & Contact Dossier
                    </h4>

                    {isEditing ? (
                      <div className="space-y-3.5 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Full Name</label>
                            <input
                              type="text"
                              value={editForm.name || ""}
                              onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                              className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Contact Number (+94)</label>
                            <input
                              type="text"
                              value={editForm.contactNumber || ""}
                              onChange={(e) => setEditForm(p => ({ ...p, contactNumber: formatPhone(e.target.value) }))}
                              className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Company / Organization</label>
                            <input
                              type="text"
                              value={editForm.company || ""}
                              onChange={(e) => setEditForm(p => ({ ...p, company: e.target.value }))}
                              className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-1">Workshop Base / Location</label>
                            <input
                              type="text"
                              value={editForm.location || ""}
                              onChange={(e) => setEditForm(p => ({ ...p, location: e.target.value }))}
                              className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 bg-surface-container text-on-surface-variant rounded-xl font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveDetails}
                            className="px-5 py-2 bg-primary text-on-primary rounded-xl font-bold shadow-md flex items-center gap-1.5"
                          >
                            <Save size={13} /> Save Profile
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/60">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase">Full Name</span>
                          <p className="font-bold text-on-surface text-sm mt-0.5">{selectedAgent.name}</p>
                        </div>
                        <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/60">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase">Email Address</span>
                          <p className="font-bold text-on-surface text-sm font-mono mt-0.5 truncate">{selectedAgent.identifier}</p>
                        </div>
                        <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/60">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase">Contact Number</span>
                          <p className="font-bold text-on-surface text-sm font-mono mt-0.5">{selectedAgent.contactNumber || 'Not specified'}</p>
                        </div>
                        <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/60">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase">Organization</span>
                          <p className="font-bold text-on-surface text-sm mt-0.5">{selectedAgent.company || 'Print To Frame Pvt Ltd'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Activity & Audit Trail */}
                {workspaceTab === 'audit' && (
                  <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/60 space-y-4">
                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                      <Clock size={14} className="text-primary" /> Member Activity Stream
                    </h4>
                    <div className="divide-y divide-outline-variant/30 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                      {userAuditLogs.length > 0 ? (
                        userAuditLogs.map((log, idx) => (
                          <div key={log._firestoreId || idx} className="py-3 flex justify-between items-start gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-on-surface">{log.action || 'ACTIVITY'}</span>
                                <span className="text-[9px] font-bold px-2 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                                  {log.module || 'ERP'}
                                </span>
                              </div>
                              <p className="text-[11px] text-on-surface-variant mt-0.5">{log.details || log.description || 'User action logged'}</p>
                            </div>
                            <span className="text-[10px] text-on-surface-variant font-mono flex-shrink-0">
                              {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="py-10 text-center text-on-surface-variant text-xs">
                          No recent logged activity found for this user account.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: Security & Access */}
                {workspaceTab === 'security' && (
                  <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/60 space-y-4">
                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                      <Lock size={14} className="text-primary" /> Security & Account Lifecycle
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/60">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase">Account Status</span>
                        <p className={`font-bold text-sm mt-0.5 ${selectedAgent.status === 'Deactivated' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {selectedAgent.status || 'Active'}
                        </p>
                      </div>
                      <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/60">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase">Auth Provider</span>
                        <p className="font-bold text-on-surface text-sm mt-0.5">Firebase / Google Workspace</p>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="pt-2 flex items-center gap-3">
                        <button
                          onClick={handleToggleStatus}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            selectedAgent.status === 'Deactivated'
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'text-rose-400 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                          }`}
                        >
                          {selectedAgent.status === 'Deactivated' ? 'Reactivate Member Account' : 'Deactivate Member Account'}
                        </button>
                        <button
                          onClick={() => toast.info(`Password reset link dispatched to ${selectedAgent.identifier}`)}
                          className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold border border-outline-variant transition-colors cursor-pointer"
                        >
                          Send Password Reset
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE USER MODAL ─────────────────────────────────────────── */}
      <ModalWrapper
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        maxWidth="max-w-xl"
        height="h-auto"
        ariaLabel="Enroll New Member"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <UserCheck size={18} className="text-primary" /> Enroll New Internal Member
            </h3>
            <button onClick={() => setShowCreateUserModal(false)} className="text-on-surface-variant hover:text-on-surface p-1">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Perera"
                  value={createUserForm.name}
                  onChange={(e) => setCreateUserForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Email / Identifier *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. kasun@print2frame.xyz"
                  value={createUserForm.identifier}
                  onChange={(e) => setCreateUserForm(p => ({ ...p, identifier: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Access Role</label>
                <select
                  value={createUserForm.role}
                  onChange={(e) => setCreateUserForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-bold"
                >
                  {SYSTEM_ROLES.filter(r => r !== 'Partner').map(roleName => (
                    <option key={roleName} value={roleName}>
                      {roleName} ({ROLE_METADATA[roleName]?.label || roleName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Mobile (+94)</label>
                <input
                  type="text"
                  placeholder="+94 77 123 4567"
                  value={createUserForm.contactNumber}
                  onChange={(e) => setCreateUserForm(p => ({ ...p, contactNumber: formatPhone(e.target.value) }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-on-surface font-mono"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="px-4 py-2 bg-surface-container text-on-surface-variant text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-md"
              >
                Enroll Member
              </button>
            </div>
          </form>
        </div>
      </ModalWrapper>

      {/* ── IMAGE CROP MODAL ─────────────────────────────────────────── */}
      {showCropModal && rawImageForCrop && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={() => {
            setShowCropModal(false);
            setRawImageForCrop(null);
          }}
          imageSrc={rawImageForCrop}
          onCropComplete={handleAgentCropComplete}
        />
      )}

      {/* ── EMAIL TEMPLATE MODAL ─────────────────────────────────────────── */}
      {emailModalConfig.isOpen && (
        <EmailTemplateModal
          isOpen={emailModalConfig.isOpen}
          onClose={() => setEmailModalConfig({ isOpen: false, recipient: null, initialTemplateId: null })}
          recipient={emailModalConfig.recipient}
          initialTemplateId={emailModalConfig.initialTemplateId}
        />
      )}

      {/* ── DELETE MODAL ─────────────────────────────────────────── */}
      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteAgent}
        title="Revoke Member Access"
        message="Are you sure you want to revoke this user account? Their past audit events will be preserved."
      />
    </div>
  );
}
