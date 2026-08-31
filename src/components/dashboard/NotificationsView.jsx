import React, { useState, useMemo } from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, Trash2, MessageSquare, ExternalLink, Filter } from 'lucide-react';
import { useMessaging } from '../../context/MessagingContext';

export default function NotificationsView({ notifications = [], setNotifications, setActiveTab }) {
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'SYSTEM' | 'MESSAGES'
  const { messages, openMiniChat } = useMessaging();

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleDelete = (id) => {
    setNotifications((prev) => prev.filter(n => n.id !== id));
  };

  // Convert direct messages to notification feed items
  const messageItems = useMemo(() => {
    return (messages || []).slice(-30).reverse().map(msg => ({
      id: `msg_${msg._firestoreId || msg.id}`,
      type: 'message',
      title: `Message from ${msg.senderName || msg.fromId}`,
      message: msg.text || 'Attachment / Image',
      date: new Date(Number(msg.timestamp) || Date.now()).toISOString(),
      rawMessage: msg
    }));
  }, [messages]);

  const combinedNotifications = useMemo(() => {
    if (filterType === 'SYSTEM') return notifications;
    if (filterType === 'MESSAGES') return messageItems;
    
    // Combined and sorted by date
    return [...notifications, ...messageItems].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [notifications, messageItems, filterType]);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight flex items-center">
            <Bell className="mr-3 text-primary" size={28} />
            Notifications & Activity Hub
          </h1>
          <p className="text-xs sm:text-sm font-medium text-on-surface-variant mt-1">
            Real-time feed of system status changes, alerts, and direct team messages
          </p>
        </div>

        <div className="flex items-center gap-2">
          {notifications.length > 0 && filterType !== 'MESSAGES' && (
            <button
              onClick={handleClearAll}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-surface-container border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container-low hover:text-error transition-colors text-xs font-bold shadow-sm"
            >
              <Trash2 size={13} />
              <span>Clear System Alerts</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3 overflow-x-auto">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterType === 'ALL'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant'
          }`}
        >
          All Activity ({notifications.length + messageItems.length})
        </button>
        <button
          onClick={() => setFilterType('MESSAGES')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filterType === 'MESSAGES'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant'
          }`}
        >
          <MessageSquare size={13} />
          <span>Team Messages ({messageItems.length})</span>
        </button>
        <button
          onClick={() => setFilterType('SYSTEM')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filterType === 'SYSTEM'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant'
          }`}
        >
          <Info size={13} />
          <span>System Alerts ({notifications.length})</span>
        </button>
      </div>

      {/* Notification Feed List */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] overflow-hidden">
        {combinedNotifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center mb-3">
              <Bell className="text-on-surface-variant" size={22} />
            </div>
            <h3 className="text-base font-bold text-on-surface">No Notifications</h3>
            <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
              You're all caught up! New alerts and team messages will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/40">
            {combinedNotifications.map((notif) => {
              const isMessage = notif.type === 'message';
              return (
                <div key={notif.id} className="p-4 hover:bg-surface-container-low transition-colors flex items-start space-x-3.5 group">
                  <div className={`mt-0.5 flex-shrink-0 ${
                    notif.type === 'error' ? 'text-error' :
                    notif.type === 'success' ? 'text-green-500' :
                    isMessage ? 'text-primary' :
                    'text-cyan-400'
                  }`}>
                    {notif.type === 'error' ? <AlertCircle size={18} /> :
                     notif.type === 'success' ? <CheckCircle2 size={18} /> :
                     isMessage ? <MessageSquare size={18} /> :
                     <Info size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-on-surface text-xs sm:text-sm">{notif.title}</p>
                      <span className="text-[10px] font-mono text-on-surface-variant whitespace-nowrap ml-3">
                        {new Date(notif.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} {' '}
                        {new Date(notif.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {notif.message && (
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{notif.message}</p>
                    )}

                    {isMessage && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (openMiniChat) {
                              openMiniChat({
                                identifier: notif.rawMessage.fromId,
                                name: notif.rawMessage.senderName || notif.rawMessage.fromId
                              });
                            } else if (setActiveTab) {
                              setActiveTab('messages');
                            }
                          }}
                          className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                        >
                          <ExternalLink size={10} />
                          <span>Open Quick Chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {!isMessage && (
                    <button 
                      onClick={() => handleDelete(notif.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-on-surface-variant hover:text-error transition-all rounded-lg hover:bg-error/10"
                      title="Dismiss"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
