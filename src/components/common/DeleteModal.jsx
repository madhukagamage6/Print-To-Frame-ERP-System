import React from 'react';

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  message = "Are you sure you want to permanently delete this item? This action cannot be undone."
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-surface-container-highest/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-left">
      <div className="bg-surface-container rounded-3xl shadow-[0_0_50px_rgba(0,218,243,0.25)] w-full max-w-sm overflow-hidden border border-outline-variant/50 animate-in fade-in zoom-in duration-200">
        <div className="p-8">
          <div className="w-12 h-12 bg-error/20 text-error rounded-2xl flex items-center justify-center mb-6 shadow-[0_4px_20px_rgba(0,218,243,0.05)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
            </svg>
          </div>
          <h3 className="text-xl font-extrabold text-on-surface mb-2">{title}</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed font-medium">{message}</p>
          <div className="flex space-x-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 bg-surface-container text-on-surface rounded-2xl font-bold text-xs hover:bg-surface-container-high transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 py-3.5 bg-error text-on-error rounded-2xl font-bold text-xs  hover:opacity-80 transition-all active:scale-95"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
