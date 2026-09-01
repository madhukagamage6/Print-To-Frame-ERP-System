import React, { useState, useEffect } from 'react';
import { HardDrive, X, FileText, Image, Check, Search, ExternalLink, AlertCircle } from 'lucide-react';
import { fetchUserDriveFiles } from '../../services/driveService';
import { toast } from '../../utils/toast';

export default function GoogleDrivePickerModal({ isOpen, onClose, onSelectFile }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const driveFiles = await fetchUserDriveFiles();
      setFiles(driveFiles);
    } catch (err) {
      setError(err.message || 'Failed to load Google Drive files. Please ensure Google Sign-In with Drive permissions is active.');
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter(f =>
    f.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center space-x-2.5">
            <HardDrive className="text-primary" size={24} />
            <div>
              <h3 className="text-lg font-bold text-on-surface">Google Drive Integration</h3>
              <p className="text-xs text-on-surface-variant">Select digital art files or documents from your Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-surface-container-low border-b border-outline-variant flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-on-surface-variant" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Google Drive files..."
              className="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-4 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={loadFiles}
            className="px-4 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-xs font-bold rounded-xl transition-all"
          >
            Refresh
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-20 text-center text-on-surface-variant">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-sm">Connecting to Google Drive...</p>
            </div>
          ) : error ? (
            <div className="py-12 px-6 text-center bg-error/10 border border-error/30 rounded-xl my-4">
              <AlertCircle className="text-error mx-auto mb-2" size={32} />
              <p className="text-sm font-bold text-error mb-1">Google Drive Access Error</p>
              <p className="text-xs text-on-surface-variant mb-4">{error}</p>
              <button
                onClick={loadFiles}
                className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg"
              >
                Retry Connection
              </button>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-20 text-center text-on-surface-variant">
              <HardDrive className="mx-auto mb-3 opacity-40" size={48} />
              <p className="text-sm">No files found in Google Drive.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFiles.map(file => {
                const isSelected = selectedFile?.id === file.id;
                const isImage = file.mimeType?.includes('image');
                return (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 ${
                      isSelected
                        ? 'bg-primary/15 border-primary shadow-md'
                        : 'bg-surface-container-low border-outline-variant hover:bg-surface-container'
                    }`}
                  >
                    <div className="p-2.5 rounded-lg bg-surface border border-outline-variant/50 text-primary flex-shrink-0">
                      {isImage ? <Image size={20} /> : <FileText size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{file.name}</p>
                      <p className="text-[11px] text-on-surface-variant capitalize truncate">
                        {file.mimeType?.split('.').pop() || 'File'}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
                        <Check size={12} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="text-xs text-on-surface-variant truncate max-w-sm">
            {selectedFile ? <span className="text-primary font-bold">Selected: {selectedFile.name}</span> : 'Select a file to attach'}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-outline-variant rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              disabled={!selectedFile}
              onClick={() => {
                if (selectedFile) {
                  onSelectFile(selectedFile);
                  onClose();
                }
              }}
              className="px-5 py-2 bg-primary text-on-primary font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-40 flex items-center space-x-2"
            >
              <Check size={16} />
              <span>Attach File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
