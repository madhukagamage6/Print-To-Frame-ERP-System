import React, { useState } from 'react';
import { Search, Shield, User, Mail, Briefcase, Plus, Check, X, Trash2, KeyRound } from 'lucide-react';
import Card from '../common/Card';
import DeleteModal from '../common/DeleteModal';

export default function AgentDatabase({ users = [], setUsers, pendingUsers = [], setPendingUsers, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Employees');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const isAdmin = currentUser?.role === 'Admin';

  const getRoleCategory = (role) => {
    const r = role?.toLowerCase() || '';
    if (r === 'partner') return 'Partners';
    if (r === 'customer') return 'Customers';
    return 'Employees';
  };

  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      u.name?.toLowerCase().includes(query) ||
      u.identifier?.toLowerCase().includes(query) ||
      u.role?.toLowerCase().includes(query)
    );
    const matchesTab = getRoleCategory(u.role) === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleDeleteAgent = () => {
    if (deleteId) {
      setUsers(prev => prev.filter(u => u.identifier !== deleteId));
      if (selectedAgent?.identifier === deleteId) {
        setSelectedAgent(null);
      }
      setDeleteId(null);
    }
  };

  const handleApprove = (regData) => {
    setUsers([...users, { ...regData, isApproved: true }]);
    setPendingUsers(pendingUsers.filter(u => u.identifier !== regData.identifier));
  };

  const handleReject = (identifier) => {
    setPendingUsers(pendingUsers.filter(u => u.identifier !== identifier));
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end mb-8 gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">User Management</h1>
          <p className="text-on-surface-variant text-sm">
            Manage system access, roles, and review pending registrations.
          </p>
        </div>
        
        <div className="flex space-x-4">
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-3 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        {['Employees', 'Partners', 'Customers'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab 
                ? 'bg-primary text-on-primary shadow-[0_4px_25px_rgba(0,218,243,0.1)] ' 
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-low border border-outline-variant'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Pending Registrations (Admin Only) */}
      {isAdmin && pendingUsers.length > 0 && (
        <Card className="mb-6 p-6 border-l-4 border-l-indigo-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-on-surface flex items-center">
              <Shield size={16} className="mr-2 text-primary" />
              Pending Access Requests
            </h3>
            <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded-full font-bold">
              {pendingUsers.length} Pending
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingUsers.map(user => (
              <div key={user.identifier} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant flex items-center justify-between">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-bold text-on-surface truncate">{user.name}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{user.identifier}</p>
                  <p className="text-[10px] font-bold text-primary uppercase mt-1">{user.role}</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleApprove(user)} className="p-2 bg-secondary text-on-secondary rounded-lg hover:bg-secondary/80 text-on-primary">
                    <Check size={14} />
                  </button>
                  <button onClick={() => handleReject(user.identifier)} className="p-2 bg-error text-on-error text-on-surface rounded-lg hover:bg-error text-on-error">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main Grid */}
      <div className="flex-1 flex lg:flex-row flex-col gap-6 overflow-hidden">
        {/* Left column: List */}
        <div className="w-full lg:w-1/3 flex flex-col border border-outline-variant bg-surface-container rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,218,243,0.05)] h-full">
          <div className="bg-surface-container-low p-4 border-b border-outline-variant flex justify-between items-center">
             <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
               Active Users ({filteredUsers.length})
             </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant text-sm font-medium">
                No users found.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map(u => (
                  <button
                    key={u.identifier}
                    onClick={() => setSelectedAgent(u)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      selectedAgent?.identifier === u.identifier 
                        ? 'bg-primary/10 border-primary/30 shadow-[0_4px_20px_rgba(0,218,243,0.05)]' 
                        : 'border-transparent hover:bg-surface-container-low hover:border-outline-variant'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-on-surface flex-shrink-0 ${
                        u.role === 'Admin' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest'
                      }`}>
                        {u.name?.charAt(0) || <User size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold truncate ${selectedAgent?.identifier === u.identifier ? 'text-indigo-900' : 'text-on-surface'}`}>
                          {u.name}
                        </p>
                        <p className="text-[10px] text-on-surface-variant truncate">{u.identifier}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Details */}
        <div className="w-full lg:w-2/3 h-full overflow-y-auto pr-1">
          {selectedAgent ? (
            <div className="space-y-6">
              
              <div className="bg-surface-container border border-outline-variant rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,218,243,0.05)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 flex space-x-3 items-center">
                  {isAdmin && currentUser.identifier !== selectedAgent.identifier && (
                    <button
                      onClick={() => setDeleteId(selectedAgent.identifier)}
                      className="p-3 bg-error/10 text-error hover:bg-error hover:text-on-error rounded-2xl transition-all shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
                      title="Remove Access (Admin Only)"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  {selectedAgent.isApproved && (
                    <div className="bg-secondary/10 text-secondary px-4 py-2 rounded-2xl text-center border border-emerald-100 flex flex-col items-center justify-center">
                       <Check size={16} strokeWidth={4} className="mb-0.5" />
                       <p className="text-[10px] font-bold uppercase tracking-widest">Verified</p>
                    </div>
                  )}
                </div>

                <div className="flex items-start space-x-6">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-3xl text-on-surface shadow-[0_8px_30px_rgba(0,218,243,0.15)] ${
                    selectedAgent.role === 'Admin' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest'
                  }`}>
                    {selectedAgent.name?.charAt(0) || <User size={32} />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-on-surface mb-1">{selectedAgent.name}</h2>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                      {selectedAgent.identifier} • {selectedAgent.role || 'Agent'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                      <p className="flex items-center text-xs text-on-surface-variant">
                        <Mail size={12} className="mr-2 opacity-50" /> {selectedAgent.identifier}
                      </p>
                      <div className="flex items-center text-xs text-on-surface-variant">
                        <Briefcase size={12} className="mr-2 opacity-50" /> 
                        <span className="mr-2">Department:</span>
                        {isAdmin ? (
                          <select 
                            value={selectedAgent.role}
                            onChange={(e) => {
                              const newRole = e.target.value;
                              setUsers(prev => prev.map(u => u.identifier === selectedAgent.identifier ? { ...u, role: newRole } : u));
                              setSelectedAgent(prev => ({ ...prev, role: newRole }));
                            }}
                            className="bg-surface-container-low border border-outline-variant rounded px-2 py-1 text-xs font-bold text-on-surface outline-none"
                          >
                            <option value="Admin">Admin</option>
                            <option value="Sales">Sales</option>
                            <option value="Operations">Operations</option>
                            <option value="Customer">Customer</option>
                            <option value="Partner">Partner</option>
                          </select>
                        ) : (
                          selectedAgent.role
                        )}
                      </div>
                      <p className="flex items-center text-xs text-on-surface-variant">
                        <KeyRound size={12} className="mr-2 opacity-50" /> Credentials Active
                      </p>
                      <p className="flex items-center text-xs text-on-surface-variant">
                        <Shield size={12} className="mr-2 opacity-50" /> <span className="text-secondary font-bold ml-1">Access Granted</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Add Activity Logs here */}
              <div className="bg-surface-container border border-outline-variant rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,218,243,0.05)]">
                <h3 className="text-sm font-extrabold text-on-surface mb-4 flex items-center">
                   <Clock size={16} className="mr-2 text-on-surface-variant" />
                   Activity Logs
                </h3>
                <div className="text-center py-8 text-on-surface-variant text-sm">
                   Activity logs will appear here.
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full border-2 border-dashed border-outline-variant rounded-3xl flex flex-col items-center justify-center text-on-surface-variant">
              <User size={48} className="mb-4 text-on-surface" />
              <p className="text-sm font-medium">Select a user to view their details</p>
            </div>
          )}
        </div>
      </div>

      <DeleteModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteAgent}
        title="Remove Agent"
        message="Are you sure you want to remove this agent's access? They will no longer be able to log in to the ERP."
      />
    </div>
  );
}
