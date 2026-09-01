import React, { useState, useEffect } from 'react';
import { Users, X, Mail, Phone, Building, Check, Search, AlertCircle, MessageSquare } from 'lucide-react';
import { fetchGoogleContacts } from '../../services/contactsService';
import { toast } from '../../utils/toast';

export default function ContactSyncModal({ isOpen, onClose, onImportContacts }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const googleContacts = await fetchGoogleContacts();
      setContacts(googleContacts);
    } catch (err) {
      setError(err.message || 'Failed to fetch Google Contacts. Please ensure Google Sign-In with Contacts permission is active.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedContactIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedContactIds(next);
  };

  const toggleAll = () => {
    if (selectedContactIds.size === filteredContacts.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(filteredContacts.map(c => c.resourceName)));
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const handleImport = () => {
    const chosen = contacts.filter(c => selectedContactIds.has(c.resourceName));
    if (chosen.length === 0) {
      toast.error('Select at least one contact to import.');
      return;
    }
    onImportContacts(chosen);
    toast.success(`Successfully imported ${chosen.length} contacts from Google Contacts & WhatsApp sync.`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center space-x-2.5">
            <Users className="text-primary" size={24} />
            <div>
              <h3 className="text-lg font-bold text-on-surface">Google Contacts & WhatsApp Sync</h3>
              <p className="text-xs text-on-surface-variant">Import email and WhatsApp contacts directly into Print-To-Frame ERP CRM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Actions */}
        <div className="p-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-on-surface-variant" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Google Contacts by name, email, or phone..."
              className="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={toggleAll}
            className="px-4 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-xs font-bold rounded-xl transition-all whitespace-nowrap"
          >
            {selectedContactIds.size === filteredContacts.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-20 text-center text-on-surface-variant">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-sm">Syncing with Google Contacts & WhatsApp...</p>
            </div>
          ) : error ? (
            <div className="py-12 px-6 text-center bg-error/10 border border-error/30 rounded-xl my-4">
              <AlertCircle className="text-error mx-auto mb-2" size={32} />
              <p className="text-sm font-bold text-error mb-1">Google Contacts Sync Error</p>
              <p className="text-xs text-on-surface-variant mb-4">{error}</p>
              <button
                onClick={loadContacts}
                className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg"
              >
                Retry Sync
              </button>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-20 text-center text-on-surface-variant">
              <Users className="mx-auto mb-3 opacity-40" size={48} />
              <p className="text-sm">No Google Contacts found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredContacts.map(contact => {
                const isSelected = selectedContactIds.has(contact.resourceName);
                return (
                  <div
                    key={contact.resourceName}
                    onClick={() => toggleSelect(contact.resourceName)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 ${
                      isSelected
                        ? 'bg-primary/15 border-primary shadow-md'
                        : 'bg-surface-container-low border-outline-variant hover:bg-surface-container'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center flex-shrink-0 text-sm">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{contact.name}</p>
                      <div className="flex items-center space-x-2 text-[11px] text-on-surface-variant mt-0.5">
                        <Mail size={12} className="flex-shrink-0" />
                        <span className="truncate">{contact.email || 'No email'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-on-surface-variant mt-0.5">
                        <Phone size={12} className="flex-shrink-0 text-emerald-400" />
                        <span className="truncate">{contact.phone || 'No phone'}</span>
                        {contact.phone && (
                          <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">
                            <MessageSquare size={9} />
                            <span>WhatsApp Ready</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant bg-surface'
                    }`}>
                      {isSelected && <Check size={12} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="text-xs text-on-surface-variant">
            <span className="font-bold text-on-surface">{selectedContactIds.size}</span> contacts selected for ERP synchronization
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-outline-variant rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              disabled={selectedContactIds.size === 0}
              onClick={handleImport}
              className="px-5 py-2 bg-primary text-on-primary font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-40 flex items-center space-x-2"
            >
              <Check size={16} />
              <span>Import & Sync Contacts</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
