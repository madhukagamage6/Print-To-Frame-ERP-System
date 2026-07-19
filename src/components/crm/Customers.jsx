import React, { useState } from 'react';
import { Search, User, Building, Phone, Mail, Clock, FileText, Trash2, Sparkles, MessageSquare, Check, X, DollarSign, MapPin } from 'lucide-react';
import { toast } from '../../utils/toast';
import { generateText } from '../../services/gemini';
import DeleteModal from '../common/DeleteModal';

export default function Customers({ customers = [], setCustomers, dataStore, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [newProfile, setNewProfile] = useState({
    nic: '',
    name: '',
    phone: '',
    email: '',
    type: 'Individual',
    businessName: '',
    address: '',
  });

  // AI WhatsApp draft state
  const [isDraftingMsg, setIsDraftingMsg] = useState(false);
  const [whatsappDraft, setWhatsappDraft] = useState('');
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [deleteNic, setDeleteNic] = useState(null);

  const isAdmin = currentUser?.role === 'Admin';

  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(query) ||
      c.nic?.toLowerCase().includes(query) ||
      c.businessName?.toLowerCase().includes(query)
    );
  });

  const handleCreateProfile = () => {
    if (!newProfile.nic.trim() || !newProfile.name.trim()) return;
    
    // Prevent duplicate NIC
    if (customers.some(c => c.nic === newProfile.nic)) {
      toast.error("Customer NIC/ID already exists.");
      return;
    }

    setCustomers(prev => [
      ...prev,
      {
        ...newProfile,
        orders: 1,
        dateJoined: new Date().toISOString().split('T')[0]
      }
    ]);
    
    setShowCreateModal(false);
    setNewProfile({
      nic: '',
      name: '',
      phone: '',
      email: '',
      type: 'Individual',
      businessName: '',
      address: '',
    });
  };

  const getCustomerStats = (customer) => {
    if (!dataStore) return { deals: [], projects: [], invoices: [] };
    
    // Match by email, phone, or name
    const matches = (dataStore.leads || []).filter(l => 
      (l.email && l.email === customer.email) ||
      (l.phone && l.phone === customer.phone) ||
      (l.name && l.name === customer.name)
    );

    const invoices = (dataStore.invoices || []).filter(inv => 
      inv.customerName === customer.name || 
      (inv.leadId && matches.some(m => m.id === inv.leadId))
    );

    const projects = (dataStore.projects || []).filter(proj => 
      proj.clientNIC === customer.nic || proj.customerName === customer.name
    );

    return { deals: matches, projects, invoices };
  };

  const handleGenerateWhatsAppMsg = async (customer) => {
    setIsDraftingMsg(true);
    setWhatsappDraft('');
    setShowDraftModal(true);

    try {
      const prompt = `
        Draft a short, highly professional Sri Lankan WhatsApp message check-in for a client named "${customer.name}" from "Print To Frame Pvt Ltd".
        They are a valuable ${customer.type} client ${customer.businessName ? `(${customer.businessName})` : ''}.
        The message should check if they need any new custom steel framing or gallery canvas wraps.
        Keep it warm, polite, and directly actionable.
      `;
      const response = await generateText(prompt);
      setWhatsappDraft(response);
    } catch (err) {
      setWhatsappDraft(`Hello ${customer.name}, how can we help you today with your custom framing needs? Let us know if you need any steel box-bar wraps!`);
    } finally {
      setIsDraftingMsg(false);
    }
  };

  const handleDeleteProfile = () => {
    if (deleteNic) {
      setCustomers(prev => prev.filter(c => c.nic !== deleteNic));
      if (selectedCustomer?.nic === deleteNic) {
        setSelectedCustomer(null);
      }
      setDeleteNic(null);
    }
  };

  const stats = selectedCustomer ? getCustomerStats(selectedCustomer) : null;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end mb-8 gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Customer Records</h1>
          <p className="text-on-surface-variant text-sm">
            Managing client profiles, relationships, and historical project logs.
          </p>
        </div>
        
        <div className="flex space-x-4">
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-3 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-on-primary px-5 py-2 rounded-xl text-sm font-bold  hover:bg-primary/80 text-on-primary transition-all active:scale-95"
          >
            + Create Profile
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 flex lg:flex-row flex-col gap-6 overflow-hidden">
        {/* Left column: List */}
        <div className="w-full lg:w-1/3 flex flex-col border border-outline-variant bg-surface-container rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,218,243,0.05)] h-full">
          <div className="bg-surface-container-low p-4 border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Client Base ({filteredCustomers.length})
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant text-sm font-medium">
                No customer records found.
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <div
                  key={customer.nic}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`p-4 border-b border-outline-variant/50 cursor-pointer transition-all flex items-center space-x-4 ${
                    selectedCustomer?.nic === customer.nic ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-surface-container-low border-l-4 border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-on-surface shadow-[0_4px_20px_rgba(0,218,243,0.05)] ${
                    customer.type === 'Business' ? 'bg-primary/100' : 'bg-primary text-on-primary'
                  }`}>
                    {customer.name?.charAt(0) || 'C'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-on-surface truncate">
                      {customer.type === 'Business' ? customer.businessName : customer.name}
                    </h4>
                    <p className="text-[10px] text-on-surface-variant font-medium truncate">
                      {customer.nic} • <span className={customer.type === 'Business' ? 'text-yellow-500' : 'text-primary'}>{customer.type}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Detail view */}
        <div className="w-full lg:w-2/3 h-full overflow-y-auto pr-1">
          {selectedCustomer ? (
            <div className="space-y-6">
              
              {/* Profile Card details */}
              <div className="bg-surface-container border border-outline-variant rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,218,243,0.05)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 flex space-x-3 items-center">
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteNic(selectedCustomer.nic)}
                      className="p-3 bg-error/10 text-error hover:bg-error hover:text-on-error rounded-2xl transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                      title="Delete Profile (Admin Only)"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl text-center border border-indigo-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5">Total Orders</p>
                    <p className="text-2xl font-extrabold">{selectedCustomer.orders || 0}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-6">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-3xl text-on-surface shadow-[0_8px_30px_rgba(0,218,243,0.15)] ${
                    selectedCustomer.type === 'Business' ? 'bg-primary/100' : 'bg-primary text-on-primary'
                  }`}>
                    {selectedCustomer.name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-on-surface mb-2">{selectedCustomer.name}</h2>
                    {selectedCustomer.businessName && (
                      <p className="flex items-center text-sm font-bold text-on-surface-variant mb-4">
                        <Building size={14} className="mr-2 text-on-surface-variant" />
                        {selectedCustomer.businessName}
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                      <p className="flex items-center text-xs text-on-surface-variant">
                        <Mail size={12} className="mr-2 opacity-50" /> {selectedCustomer.email || 'No email registered'}
                      </p>
                      <p className="flex items-center text-xs text-on-surface-variant">
                        <Phone size={12} className="mr-2 opacity-50" /> {selectedCustomer.phone || 'No phone registered'}
                      </p>
                      <p className="flex items-center text-xs text-on-surface-variant">
                        <FileText size={12} className="mr-2 opacity-50" /> NIC/BRN: {selectedCustomer.nic}
                      </p>
                      <p className="flex items-center text-xs text-on-surface-variant">
                        <Clock size={12} className="mr-2 opacity-50" /> Joined: {selectedCustomer.dateJoined || 'Prior to 2024'}
                      </p>
                      {selectedCustomer.address && (
                        <p className="flex items-center text-xs text-on-surface-variant col-span-2 mt-1">
                          <MapPin size={12} className="mr-2 opacity-50" /> {selectedCustomer.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-outline-variant/50 flex">
                  <button
                    onClick={() => handleGenerateWhatsAppMsg(selectedCustomer)}
                    className="px-5 py-2.5 bg-secondary text-on-secondary hover:bg-secondary/80 text-on-primary rounded-xl text-xs font-bold  transition-all flex items-center space-x-2 active:scale-95"
                  >
                    <MessageSquare size={14} />
                    <span>Draft WhatsApp Message</span>
                  </button>
                </div>
              </div>

              {/* Stats Log */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Journey Log */}
                <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,218,243,0.05)]">
                  <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center">
                    <FileText size={16} className="mr-2 text-primary" />
                    Journey Log (Leads & Deals)
                  </h3>
                  <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                    {stats?.deals.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic py-4">No historical leads/deals found.</p>
                    ) : (
                      stats?.deals.map(deal => (
                        <div key={deal.id} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/50">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-xs text-on-surface truncate pr-2">
                              {deal.jobScope || 'Custom Steel Frame Job'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-primary/10 text-primary">
                              {deal.stage}
                            </span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant font-medium">
                            LKR {Number(deal.value).toLocaleString()} • {deal.date}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Fabrication projects */}
                <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,218,243,0.05)]">
                  <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center">
                    <Clock size={16} className="mr-2 text-error" />
                    Fabrication Floor Records
                  </h3>
                  <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                    {stats?.projects.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic py-4">No active or historical shop fabrication logs found.</p>
                    ) : (
                      stats?.projects.map(proj => (
                        <div key={proj.jobNo} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/50">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-xs text-on-surface">{proj.jobNo}</span>
                            <span className="text-[9px] font-bold text-on-surface-variant uppercase">{proj.status}</span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant leading-snug line-clamp-2">{proj.scope}</p>
                          <p className="text-[9px] text-on-surface-variant mt-2 font-medium">Assigned to: {proj.assignee || 'Not assigned'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Invoice Logs */}
                <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,218,243,0.05)] md:col-span-2">
                  <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center">
                    <DollarSign size={16} className="mr-2 text-yellow-500" />
                    Financial Invoices
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats?.invoices.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic py-4 col-span-full">No invoices generated for this client.</p>
                    ) : (
                      stats?.invoices.map(inv => (
                        <div key={inv.id} className="p-4 bg-surface-container/50 rounded-2xl border border-outline-variant flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-extrabold text-on-surface mb-0.5">{inv.id}</p>
                            <p className="text-[10px] text-on-surface-variant">{inv.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-on-surface">LKR {Number(inv.amount).toLocaleString()}</p>
                            <span className={`text-[9px] font-bold ${inv.status === 'Paid' ? 'text-secondary' : 'text-yellow-500'}`}>
                              {inv.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-outline-variant rounded-3xl text-on-surface-variant bg-surface-container-low/50">
              <User size={64} className="mb-4 opacity-20" />
              <h3 className="font-bold text-on-surface-variant">No Customer Selected</h3>
              <p className="text-sm max-w-xs text-center mt-2">Select a customer from the left sidebar to view their full journey, logs, and billing logs.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Customer modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-surface-container-highest/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container rounded-3xl shadow-[0_10px_40px_rgba(0,218,243,0.2)] w-full max-w-md overflow-hidden">
            <div className="p-8">
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">
                <h3 className="text-xl font-bold text-on-surface">New Client Profile</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-on-surface-variant hover:text-on-surface-variant transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="flex bg-surface-container p-1 rounded-xl">
                  {['Individual', 'Business'].map(type => (
                    <button
                      key={type}
                      onClick={() => setNewProfile(prev => ({ ...prev, type }))}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        newProfile.type === type ? 'bg-surface-container text-primary shadow-[0_4px_20px_rgba(0,218,243,0.05)]' : 'text-on-surface-variant hover:text-on-surface-variant'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">Identification (NIC/BRN)</label>
                    <input
                      type="text"
                      placeholder="e.g. 901234567V"
                      value={newProfile.nic}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, nic: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                  </div>

                  {newProfile.type === 'Business' && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">Business Name</label>
                      <input
                        type="text"
                        placeholder="Silva Constructions"
                        value={newProfile.businessName}
                        onChange={(e) => setNewProfile(prev => ({ ...prev, businessName: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">Contact Name</label>
                    <input
                      type="text"
                      placeholder="Client Name"
                      value={newProfile.name}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">Phone</label>
                      <div className="flex bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/50">
                        <div className="flex items-center px-3 bg-surface-container border-r border-outline-variant text-sm font-bold text-on-surface-variant select-none">
                          <Phone size={14} className="mr-1.5 text-on-surface-variant" />
                          +94
                        </div>
                        <input 
                          type="text"
                          name="phone"
                          value={newProfile.phone ? newProfile.phone.replace('+94', '') : ''}
                          onChange={(e) => {
                             const val = e.target.value.replace(/[^\d]/g, '').substring(0, 9);
                             setNewProfile(prev => ({ ...prev, phone: '+94' + val }));
                          }}
                          className="w-full px-3 py-2.5 bg-transparent text-sm focus:outline-none"
                          placeholder="7XXXXXXXX"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">Email</label>
                      <input
                        type="email"
                        placeholder="client@test.com"
                        value={newProfile.email}
                        onChange={(e) => setNewProfile(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2 tracking-widest">Address</label>
                    <input
                      type="text"
                      placeholder="123 Main St, Colombo"
                      value={newProfile.address}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateProfile}
                  className="w-full py-4 bg-primary text-on-primary rounded-2xl font-bold text-sm shadow-[0_10px_40px_rgba(0,218,243,0.2)] hover:bg-surface-container-highest transition-all mt-4"
                >
                  Create Customer Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Draft modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-surface-container-highest/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-surface-container rounded-3xl shadow-[0_10px_40px_rgba(0,218,243,0.2)] w-full max-w-md overflow-hidden p-8">
            <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
              <h3 className="font-bold text-on-surface flex items-center uppercase tracking-widest text-xs">
                <Sparkles size={16} className="mr-2 text-secondary" />
                WhatsApp Message Draft
              </h3>
              <button onClick={() => setShowDraftModal(false)} className="text-on-surface-variant hover:text-on-surface-variant">
                <X size={20} />
              </button>
            </div>

            <textarea
              className="w-full h-48 p-5 bg-surface-container-low border border-outline-variant/50 rounded-2xl text-xs text-on-surface leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-inner"
              value={isDraftingMsg ? "Consulting AI for the perfect Sri Lankan check-in..." : whatsappDraft}
              onChange={(e) => setWhatsappDraft(e.target.value)}
            />

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(whatsappDraft);
                  toast.success("Draft copied to clipboard!");
                }}
                className="flex-1 py-3 bg-surface-container border-2 border-outline-variant text-on-surface rounded-xl text-xs font-bold hover:border-primary hover:text-primary transition-all active:scale-95"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowDraftModal(false)}
                className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl text-xs font-bold hover:bg-secondary/80 text-on-primary  transition-all active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation modal */}
      <DeleteModal
        isOpen={!!deleteNic}
        onClose={() => setDeleteNic(null)}
        onConfirm={handleDeleteProfile}
        title="Delete Customer Profile?"
        message="Are you sure you want to permanently delete this customer? All historical logs and records will be hidden."
      />
    </div>
  );
}
