import React, { useState, useRef } from 'react';
import { 
  Search, Shield, User, Mail, Briefcase, Plus, Check, X, Trash2, 
  KeyRound, Clock, Edit2, Save, ChevronRight, Phone, ShieldCheck,
  UserCheck, AlertCircle, Camera, Sparkles, ArrowLeft, Send, Eye,
  Building, CheckCircle2, Copy
} from 'lucide-react';
import Card from '../common/Card';
import DeleteModal from '../common/DeleteModal';
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from '../../utils/toast';
import { subscribeToCollection, addDocument, COLLECTIONS } from '../../services/firestoreSync';
import { 
  PageHeader, FilterBar, StatusBadge, ModalWrapper, UserAvatar, 
  ImageCropModal, EmailTemplateModal 
} from '../common/ui';
import { SYSTEM_ROLES, ROLE_METADATA, getRoleCategory } from '../../constants/roles';

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
  const [activeTab, setActiveTab] = useState('all');
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
  const [selectedReviewRole, setSelectedReviewRole] = useState('Partner');

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

  const isAdmin = currentUser?.role === 'Admin';

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

  const employeeCount = users.filter(u => getRoleCategory(u.role) !== 'Partners' && getRoleCategory(u.role) !== 'Clients').length;
  const partnerCount = users.filter(u => u.role === 'Partner').length;
  const clientCount = users.filter(u => u.role === 'Business Client' || u.role === 'Customer').length;

  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      u.name?.toLowerCase().includes(query) ||
      u.identifier?.toLowerCase().includes(query) ||
      u.role?.toLowerCase().includes(query) ||
      u.company?.toLowerCase().includes(query)
    );

    if (!matchesSearch) return false;

    if (activeTab === 'employees') return getRoleCategory(u.role) !== 'Partners' && getRoleCategory(u.role) !== 'Clients';
    if (activeTab === 'partners') return u.role === 'Partner';
    if (activeTab === 'clients') return u.role === 'Business Client' || u.role === 'Customer';
    return true;
  });

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
    const nextStatus = selectedAgent.status === 'Deactivated' ? 'Active' : 'Deactivated';
    try {
      await updateDoc(doc(db, "users", selectedAgent.identifier), { status: nextStatus });
      setUsers(prev => prev.map(u => u.identifier === selectedAgent.identifier ? { ...u, status: nextStatus } : u));
      setSelectedAgent(prev => ({ ...prev, status: nextStatus }));
      toast.success(`User status set to ${nextStatus}`);
    } catch (err) {
      toast.error("Failed to update user status: " + err.message);
    }
  };

  // Direct User Creation Handler
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createUserForm.name || !createUserForm.identifier) {
      toast.error("Please provide both name and email/identifier.");
      return;
    }
    try {
      const emailKey = createUserForm.identifier.trim().toLowerCase();
      const role = createUserForm.role || 'Sales';
      const tempPass = createUserForm.password?.trim() || `PTF@${Math.floor(1000 + Math.random() * 9000)}`;

      const newUser = {
        name: createUserForm.name.trim(),
        identifier: emailKey,
        contactNumber: createUserForm.contactNumber?.trim() || '',
        role,
        company: createUserForm.company?.trim() || '',
        specialty: createUserForm.specialty?.trim() || '',
        status: 'Active',
        isApproved: true,
        tempPassword: tempPass,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.email || 'Admin',
      };

      await setDoc(doc(db, "users", emailKey), newUser);
      setUsers(prev => [...prev.filter(u => u.identifier !== emailKey), newUser]);

      // Auto-Sync: Partner domain creation
      let generatedPartnerId = null;
      if (role === 'Partner' && setPartners) {
        const nextId = (partners?.length || 0) > 0 ? Math.max(...partners.map(p => p.id || 0)) + 1 : 1;
        generatedPartnerId = `P-${1000 + nextId}`;
        const newPartnerRecord = {
          id: nextId,
          partnerId: generatedPartnerId,
          name: newUser.name,
          email: emailKey,
          phone: newUser.contactNumber,
          type: newUser.specialty ? 'Custom Workshop / Artisan' : 'Agency',
          totalSqFt: 0,
          paid: 0,
          pending: 0,
          status: 'Active',
          createdAt: new Date().toISOString(),
        };
        await addDocument(COLLECTIONS.PARTNERS, newPartnerRecord, generatedPartnerId);
        setPartners(prev => [...prev.filter(p => p.partnerId !== generatedPartnerId), newPartnerRecord]);
      }

      // Auto-Sync: Customer domain creation
      if (role === 'Business Client' && setCustomers) {
        const newCustomerRecord = {
          nic: emailKey,
          name: newUser.name,
          businessName: newUser.company || newUser.name,
          type: 'Business',
          phone: newUser.contactNumber,
          email: emailKey,
          status: 'Active',
          createdAt: new Date().toISOString(),
        };
        await addDocument(COLLECTIONS.CUSTOMERS, newCustomerRecord, emailKey);
        setCustomers(prev => [...prev.filter(c => c.nic !== emailKey), newCustomerRecord]);
      }

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

      toast.success(`User ${newUser.name} enrolled with role: ${newUser.role}`);

      // Open Email Template Composer immediately with credentials
      setEmailModalConfig({
        isOpen: true,
        recipient: {
          ...newUser,
          partnerId: generatedPartnerId,
          tempPassword: tempPass,
        },
        initialTemplateId: role === 'Partner' ? 'partner_approval' : role === 'Business Client' ? 'client_approval' : 'employee_invite',
      });

    } catch (err) {
      toast.error("Failed to enroll user: " + err.message);
    }
  };

  const handleSaveDetails = async () => {
    if (!selectedAgent) return;
    try {
      await updateDoc(doc(db, "users", selectedAgent.identifier), {
        name: editForm.name,
        contactNumber: editForm.contactNumber || "",
        company: editForm.company || "",
      });
      setUsers(prev => prev.map(u => u.identifier === selectedAgent.identifier ? { ...u, ...editForm } : u));
      setSelectedAgent(prev => ({ ...prev, ...editForm }));
      setIsEditing(false);
      toast.success("User details updated successfully");
    } catch (err) {
      toast.error("Error updating details: " + err.message);
    }
  };

  const handleResetPassword = async () => {
    toast.info(`Password reset email instructions sent to ${selectedAgent.identifier}`);
  };

  // Review & Approve Request Flow
  const handleOpenReview = (applicant) => {
    setReviewingApplicant(applicant);
    setSelectedReviewRole(applicant.role || 'Partner');
  };

  const handleExecuteApproval = async () => {
    if (!reviewingApplicant) return;
    try {
      const applicantCopy = { ...reviewingApplicant };
      setPendingUsers(prev => prev.filter(u => u.identifier !== applicantCopy.identifier));
      
      let approvedUser = null;
      if (onApprove) {
        approvedUser = await onApprove(applicantCopy, selectedReviewRole);
      }
      
      setReviewingApplicant(null);
      toast.success(`Access approved for ${applicantCopy.name} as ${selectedReviewRole}`);

      // Launch Email Template Composer for the newly approved applicant
      setEmailModalConfig({
        isOpen: true,
        recipient: {
          ...applicantCopy,
          role: selectedReviewRole,
          tempPassword: applicantCopy.tempPassword || '[Generated upon registration]',
        },
        initialTemplateId: selectedReviewRole === 'Partner' ? 'partner_approval' : 'client_approval',
      });
    } catch (err) {
      toast.error("Approval failed: " + err.message);
    }
  };

  const handleExecuteRejection = async (identifier) => {
    setPendingUsers(prev => prev.filter(u => u.identifier !== identifier));
    if (onReject) await onReject(identifier);
    if (reviewingApplicant?.identifier === identifier) setReviewingApplicant(null);
    toast.info("Registration request dismissed");
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col pb-6">
      {/* Standardized Header */}
      <PageHeader
        title="User Management"
        subtitle="Manage authenticated identities, dynamic RBAC role assignments, and pending registrations."
        metrics={[
          { label: "Total Members", value: users.length, color: "cyan" },
          { label: "Internal Team", value: employeeCount, color: "emerald" },
          { label: "Art Partners", value: partnerCount, color: "amber" },
          { label: "Client Accounts", value: clientCount, color: "purple" },
          { label: "Pending Approvals", value: pendingUsers.length, color: pendingUsers.length > 0 ? "warning" : "neutral" }
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
        placeholder="Search users by name, email, company, or role..."
        activeFilter={activeTab}
        onFilterChange={setActiveTab}
        filterOptions={[
          { id: 'all', label: 'All Members', count: users.length },
          { id: 'employees', label: 'Internal Team', count: employeeCount },
          { id: 'partners', label: 'Art & Framing Partners', count: partnerCount },
          { id: 'clients', label: 'Corporate & Retail Clients', count: clientCount }
        ]}
        totalCount={users.length}
        filteredCount={filteredUsers.length}
      />

      {/* Pending Registrations Callout (Admin Only) */}
      {isAdmin && pendingUsers.length > 0 && (
        <div className="mb-6 p-5 bg-surface-container/90 border-2 border-primary/40 rounded-3xl shadow-[0_8px_30px_rgba(0,218,243,0.12)] flex-shrink-0 animate-in fade-in duration-200">
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
              {pendingUsers.length} Requests Pending
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingUsers.map(user => (
              <div 
                key={user.identifier} 
                className="p-4 bg-surface-container-low/90 rounded-2xl border border-outline-variant/60 hover:border-primary/50 transition-all flex items-center justify-between shadow-sm"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-extrabold text-on-surface truncate">{user.name}</p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                      user.role === 'Partner' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant font-mono truncate mt-0.5">{user.identifier}</p>
                  {user.company && (
                    <p className="text-[10px] text-primary font-semibold truncate mt-0.5">🏢 {user.company}</p>
                  )}
                  {user.specialty && (
                    <p className="text-[10px] text-cyan-400 font-semibold truncate mt-0.5">✨ {user.specialty}</p>
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
                      setSelectedReviewRole(user.role || 'Partner');
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

      {/* Main Master-Detail Grid */}
      <div className="flex-1 flex lg:flex-row flex-col gap-6 overflow-hidden min-h-0">
        {/* Left column: User Registry */}
        <div className={`w-full lg:w-1/3 ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'} flex-col border border-outline-variant/60 bg-surface-container/60 rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)] h-full`}>
          <div className="bg-surface-container-low/80 p-3.5 px-4 border-b border-outline-variant/60 flex justify-between items-center text-xs font-bold text-on-surface-variant uppercase tracking-wider flex-shrink-0">
             <span className="flex items-center gap-2">
               <UserCheck size={14} className="text-primary" />
               Enrolled Members ({filteredUsers.length})
             </span>
             <span className="text-[10px] text-on-surface-variant/70 lowercase font-medium">
               click to inspect & assign role
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
                      setIsEditing(false);
                      setMobileView('detail');
                    }}
                    className={`p-4 transition-all cursor-pointer flex items-center space-x-3.5 ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-primary text-on-surface shadow-sm'
                        : 'hover:bg-surface-container-high/40 text-on-surface-variant'
                    }`}
                  >
                    <UserAvatar
                      photoURL={u.photoURL}
                      name={u.name}
                      role={u.role}
                      size="md"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-black text-on-surface truncate">{u.name}</h4>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${roleMeta.badge}`}>
                          {u.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant/80 font-mono truncate">{u.identifier}</p>
                      {u.company && (
                        <p className="text-[10px] text-primary/90 font-medium truncate mt-0.5">🏢 {u.company}</p>
                      )}
                    </div>

                    <ChevronRight size={14} className="text-outline/40 flex-shrink-0" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Selected Member Dossier Inspector */}
        <div className={`w-full lg:w-2/3 ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} flex-col overflow-y-auto custom-scrollbar h-full`}>
          {selectedAgent ? (
            <div className="space-y-6">
              {/* Mobile Back Button */}
              <div className="lg:hidden">
                <button
                  onClick={() => setMobileView('list')}
                  className="flex items-center gap-2 text-xs font-bold text-primary bg-surface-container px-3 py-2 rounded-xl border border-outline-variant/60 hover:bg-surface-container-high transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Members Directory</span>
                </button>
              </div>

              {/* Master Member Profile Card */}
              <div className="bg-surface-container/70 border border-outline-variant/60 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15)] relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative group">
                      <UserAvatar
                        photoURL={selectedAgent.photoURL}
                        name={selectedAgent.name}
                        role={selectedAgent.role}
                        size="xl"
                      />
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => photoInputRef.current?.click()}
                            className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Upload & Crop Photo"
                          >
                            <Camera size={18} />
                            <span className="text-[8px] font-bold uppercase mt-1">Change</span>
                          </button>
                          <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAgentPhotoUpload}
                            className="hidden"
                          />
                        </>
                      )}
                    </div>

                    <div className="min-w-0">
                      {isEditing ? (
                        <div className="space-y-2 mb-1">
                          <input
                            type="text"
                            value={editForm.name || ""}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="bg-surface-container-low border border-outline-variant rounded-xl px-3 py-1.5 text-sm font-bold text-on-surface outline-none focus:border-primary w-full"
                            placeholder="Full Name"
                          />
                          <input
                            type="text"
                            value={editForm.contactNumber || ""}
                            onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                            className="bg-surface-container-low border border-outline-variant rounded-xl px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary w-full"
                            placeholder="Contact Number (+94 ...)"
                          />
                        </div>
                      ) : (
                        <>
                          <h2 className="text-lg sm:text-xl font-black text-on-surface tracking-tight truncate">
                            {selectedAgent.name}
                          </h2>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                              ROLE_METADATA[selectedAgent.role]?.badge || 'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              {selectedAgent.role}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-mono">
                              Dept: {getRoleCategory(selectedAgent.role)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inspector Action Buttons */}
                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-wrap">
                    {/* Compose Email / Credentials Button */}
                    <button
                      onClick={() => setEmailModalConfig({
                        isOpen: true,
                        recipient: selectedAgent,
                        initialTemplateId: selectedAgent.role === 'Partner' ? 'partner_approval' : selectedAgent.role === 'Business Client' ? 'client_approval' : 'employee_invite',
                      })}
                      className="px-3 py-2 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Send Formatted Email Notification"
                    >
                      <Mail size={14} />
                      <span>Email Templates</span>
                    </button>

                    {isAdmin && (
                      <>
                        {isEditing ? (
                          <button
                            onClick={handleSaveDetails}
                            className="p-2.5 bg-primary text-on-primary rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(0,218,243,0.3)] cursor-pointer"
                            title="Save Changes"
                          >
                            <Save size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditForm({ 
                                name: selectedAgent.name, 
                                contactNumber: selectedAgent.contactNumber || "",
                                company: selectedAgent.company || "" 
                              });
                              setIsEditing(true);
                            }}
                            className="p-2.5 bg-surface-container-high text-on-surface hover:bg-surface-variant hover:text-primary rounded-xl transition-all border border-outline-variant/60 cursor-pointer"
                            title="Edit Details"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {currentUser?.identifier !== selectedAgent.identifier && (
                          <button
                            onClick={() => setDeleteId(selectedAgent.identifier)}
                            className="p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20 cursor-pointer"
                            title="Revoke User Access"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Attributes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-outline-variant/60">
                  <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/50 flex items-center space-x-3">
                    <Mail size={16} className="text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Email Account</p>
                      <p className="text-xs font-mono font-bold text-on-surface truncate">{selectedAgent.identifier}</p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/50 flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <Briefcase size={16} className="text-cyan-400 flex-shrink-0" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Dynamic Access Role</p>
                        {isAdmin ? (
                          <select 
                            value={selectedAgent.role}
                            onChange={(e) => handleRoleChange(e.target.value)}
                            className="bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer mt-0.5"
                          >
                            {SYSTEM_ROLES.map(roleName => (
                              <option key={roleName} value={roleName}>
                                {roleName} ({ROLE_METADATA[roleName]?.label || roleName})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-xs font-bold text-on-surface mt-0.5">{selectedAgent.role}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <ShieldCheck size={16} className={selectedAgent.status === 'Deactivated' ? 'text-rose-400' : 'text-emerald-400'} />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Account Status</p>
                        <p className={`text-xs font-bold ${selectedAgent.status === 'Deactivated' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {selectedAgent.status || 'Active'}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={handleToggleStatus}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          selectedAgent.status === 'Deactivated'
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'text-rose-400 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                      >
                        {selectedAgent.status === 'Deactivated' ? 'Reactivate' : 'Deactivate'}
                      </button>
                    )}
                  </div>

                  <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/50 flex items-center space-x-3">
                    <Phone size={16} className="text-pink-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Contact Number</p>
                      <p className="text-xs font-bold text-on-surface truncate mt-0.5">
                        {selectedAgent.contactNumber || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Activity Audit Stream */}
              <div className="bg-surface-container/70 border border-outline-variant/60 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant/40">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center">
                     <Clock size={15} className="mr-2 text-primary" />
                     User Audit Activity Stream
                  </h3>
                  <span className="text-[10px] text-on-surface-variant font-mono">
                    {auditLogs.filter(log => log.userId === selectedAgent.identifier).length} events
                  </span>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {auditLogs.filter(log => log.userId === selectedAgent.identifier).length === 0 ? (
                    <div className="text-center py-8 text-on-surface-variant text-xs italic bg-surface-container-low/50 border border-dashed border-outline-variant rounded-2xl">
                       No logged audit activity recorded for this user ID.
                    </div>
                  ) : (
                    auditLogs.filter(log => log.userId === selectedAgent.identifier)
                      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
                      .map((log, idx) => (
                        <div key={log._firestoreId || idx} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/40">
                           <div className="flex justify-between items-center mb-1">
                             <span className="font-bold text-on-surface text-[11px] uppercase tracking-wider">{log.action}</span>
                             <span className="text-[10px] text-on-surface-variant font-mono">{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : 'Recent'}</span>
                           </div>
                           <p className="text-[11px] text-on-surface-variant">
                             <span className="font-semibold text-primary">{log.module}:</span> {log.details}
                           </p>
                        </div>
                      ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full min-h-[350px] border-2 border-dashed border-outline-variant/60 rounded-3xl flex flex-col items-center justify-center text-on-surface-variant bg-surface-container/40 p-8 text-center">
              <User size={56} className="mb-3 opacity-20 text-on-surface" />
              <h3 className="font-bold text-base text-on-surface">No Member Selected</h3>
              <p className="text-xs max-w-sm text-on-surface-variant mt-1.5 leading-relaxed">
                Select an employee, art partner, or corporate client from the registry to inspect identity credentials, adjust dynamic access roles, or dispatch email templates.
              </p>
            </div>
          )}
        </div>
      </div>

      <DeleteModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteAgent}
        title="Revoke Member Access?"
        message="Are you sure you want to revoke this user's account? They will be immediately disconnected from the ERP workspace."
      />

      {/* Direct User Creation Modal */}
      {showCreateUserModal && (
        <ModalWrapper
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          maxWidth="max-w-xl"
          height="h-auto max-h-[90vh]"
          ariaLabel="Enroll New Member"
        >
          <div className="px-6 py-5 border-b border-outline-variant bg-surface-container-low flex justify-between items-center flex-shrink-0">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-on-surface">
                Enroll Member & Provision Access
              </h3>
              <p className="text-[10px] uppercase font-bold text-primary tracking-widest mt-0.5">
                Dynamic Role-Based Access Control
              </p>
            </div>
            <button 
              onClick={() => setShowCreateUserModal(false)} 
              className="p-2 bg-surface-container-high text-on-surface-variant rounded-full hover:bg-surface-variant transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                Full Name *
              </label>
              <input 
                type="text" 
                value={createUserForm.name} 
                onChange={e => setCreateUserForm({...createUserForm, name: e.target.value})} 
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface" 
                placeholder="e.g. Kasun Perera"
                required 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Email / Workspace ID *
                </label>
                <input 
                  type="email" 
                  value={createUserForm.identifier} 
                  onChange={e => setCreateUserForm({...createUserForm, identifier: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface font-mono" 
                  placeholder="kasun@print2frame.xyz"
                  required 
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Initial Password
                </label>
                <input 
                  type="text" 
                  value={createUserForm.password} 
                  onChange={e => setCreateUserForm({...createUserForm, password: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface font-mono" 
                  placeholder="Auto-generated if blank"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Contact Number
                </label>
                <input 
                  type="text" 
                  value={createUserForm.contactNumber} 
                  onChange={e => setCreateUserForm({...createUserForm, contactNumber: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface" 
                  placeholder="+94 7X XXX XXXX"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Assigned Role *
                </label>
                <select
                  value={createUserForm.role}
                  onChange={e => setCreateUserForm({...createUserForm, role: e.target.value})}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface font-bold cursor-pointer"
                >
                  {SYSTEM_ROLES.map(role => (
                    <option key={role} value={role}>
                      {role} — {ROLE_METADATA[role]?.desc || role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {createUserForm.role === 'Business Client' && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Company / Enterprise Name
                </label>
                <input 
                  type="text" 
                  value={createUserForm.company} 
                  onChange={e => setCreateUserForm({...createUserForm, company: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface" 
                  placeholder="e.g. Apex Architects Pvt Ltd"
                />
              </div>
            )}

            {createUserForm.role === 'Partner' && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                  Workshop Specialization / Focus
                </label>
                <input 
                  type="text" 
                  value={createUserForm.specialty} 
                  onChange={e => setCreateUserForm({...createUserForm, specialty: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 text-on-surface" 
                  placeholder="e.g. Canvas Stretcher Frames, Floating Acrylics"
                />
              </div>
            )}

            <div className="pt-4 border-t border-outline-variant flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setShowCreateUserModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-6 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(0,218,243,0.3)] active:scale-95 cursor-pointer"
              >
                Enroll User & Prepare Welcome Email
              </button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {/* Review Registration Request Modal */}
      {reviewingApplicant && (
        <ModalWrapper
          isOpen={!!reviewingApplicant}
          onClose={() => setReviewingApplicant(null)}
          maxWidth="max-w-xl"
          height="h-auto max-h-[90vh]"
          ariaLabel="Review Registration Request"
        >
          <div className="px-6 py-5 border-b border-outline-variant bg-surface-container-low flex justify-between items-center flex-shrink-0">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-on-surface">
                Review Registration Dossier
              </h3>
              <p className="text-[10px] uppercase font-bold text-primary tracking-widest mt-0.5">
                Applicant ID: {reviewingApplicant.identifier}
              </p>
            </div>
            <button 
              onClick={() => setReviewingApplicant(null)} 
              className="p-2 bg-surface-container-high text-on-surface-variant rounded-full hover:bg-surface-variant transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
            <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/60 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Applicant Name:</span>
                <span className="text-sm font-extrabold text-on-surface">{reviewingApplicant.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Email Account:</span>
                <span className="text-xs font-mono font-bold text-primary">{reviewingApplicant.identifier}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Mobile Number:</span>
                <span className="text-xs font-bold text-on-surface">{reviewingApplicant.mobile || reviewingApplicant.contactNumber || 'Not provided'}</span>
              </div>
              {reviewingApplicant.company && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Company / Entity:</span>
                  <span className="text-xs font-bold text-on-surface">{reviewingApplicant.company}</span>
                </div>
              )}
              {reviewingApplicant.specialty && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Specialization:</span>
                  <span className="text-xs font-bold text-cyan-400">{reviewingApplicant.specialty}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">
                Assign / Confirm Access Role *
              </label>
              <select
                value={selectedReviewRole}
                onChange={(e) => setSelectedReviewRole(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              >
                {SYSTEM_ROLES.map(r => (
                  <option key={r} value={r}>
                    {r} — {ROLE_METADATA[r]?.desc || r}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-on-surface-variant mt-1.5 leading-relaxed">
                Approving this request will immediately activate workspace privileges, provision a linked database entry if applicable, and generate a pre-filled welcome email draft.
              </p>
            </div>

            <div className="pt-4 border-t border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-3">
              <button 
                type="button" 
                onClick={() => handleExecuteRejection(reviewingApplicant.identifier)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded-xl border border-rose-500/20 transition-all cursor-pointer"
              >
                Decline Request
              </button>

              <button 
                type="button" 
                onClick={handleExecuteApproval}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl hover:bg-emerald-600 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={16} />
                <span>Approve & Open Email Draft</span>
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Dynamic Email Template Dispatcher Modal */}
      {emailModalConfig.isOpen && (
        <EmailTemplateModal
          isOpen={emailModalConfig.isOpen}
          onClose={() => setEmailModalConfig({ isOpen: false, recipient: null, initialTemplateId: null })}
          recipient={emailModalConfig.recipient}
          initialTemplateId={emailModalConfig.initialTemplateId}
          currentUser={currentUser}
        />
      )}

      {/* Image Crop & Adjuster Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        imageSrc={rawImageForCrop}
        onCropComplete={handleAgentCropComplete}
        onClose={() => setShowCropModal(false)}
      />
    </div>
  );
}
