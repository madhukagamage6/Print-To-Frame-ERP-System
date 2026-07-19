import React from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, Trash2 } from 'lucide-react';

export default function NotificationsView({ notifications, setNotifications }) {
  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleDelete = (id) => {
    setNotifications((prev) => prev.filter(n => n.id !== id));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight flex items-center">
            <Bell className="mr-3 text-primary" size={32} />
            Notifications Center
          </h1>
          <p className="text-sm font-medium text-on-surface-variant mt-2">
            History of system alerts and status changes
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center space-x-2 px-4 py-2 bg-surface-container border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container-low hover:text-error transition-colors text-sm font-bold shadow-[0_4px_20px_rgba(0,218,243,0.05)]"
          >
            <Trash2 size={16} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      <div className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
              <Bell className="text-on-surface-variant" size={24} />
            </div>
            <h3 className="text-lg font-bold text-on-surface">No Notifications</h3>
            <p className="text-sm text-on-surface-variant mt-1 max-w-sm">
              You're all caught up! New alerts and status updates will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/50">
            {notifications.map((notif) => (
              <div key={notif.id} className="p-4 hover:bg-surface-container-low transition-colors flex items-start space-x-4">
                <div className={`mt-1 flex-shrink-0 ${
                  notif.type === 'error' ? 'text-error' :
                  notif.type === 'success' ? 'text-green-500' :
                  'text-primary'
                }`}>
                  {notif.type === 'error' ? <AlertCircle size={20} /> :
                   notif.type === 'success' ? <CheckCircle2 size={20} /> :
                   <Info size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-on-surface text-sm">{notif.title}</p>
                    <span className="text-xs font-medium text-on-surface-variant whitespace-nowrap ml-4">
                      {new Date(notif.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {notif.message && (
                    <p className="text-sm text-on-surface-variant mt-1">{notif.message}</p>
                  )}
                </div>
                <button 
                  onClick={() => handleDelete(notif.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-on-surface-variant hover:text-error transition-all rounded-lg hover:bg-error/10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
