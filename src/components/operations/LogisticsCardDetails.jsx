import React, { useState } from 'react';
import { X, Truck, MapPin, User, FileText, Clock, Calendar, CheckCircle, Bell, Send, UserCheck } from 'lucide-react';
import { showToast } from '../../App';

export default function LogisticsCardDetails({ job, onClose, onSave }) {
  const [formData, setFormData] = useState({
    subType: job.subType || '',
    location: job.location || '',
    customer: job.customer || '',
    manifest: job.manifest || '',
    driver: job.driver || '',
    vehicle: job.vehicle || '',
    notified: job.notified || false,
    lastNotifiedAt: job.lastNotifiedAt || null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotifyClient = () => {
    const now = new Date().toISOString();
    setFormData(prev => ({
      ...prev,
      notified: true,
      lastNotifiedAt: now
    }));
    showToast({
      title: "Client Notified",
      message: `Notification sent to ${formData.customer || 'Client'} for ${job.type} at ${formData.location}.`,
      type: "success"
    });
  };

  const handleSave = () => {
    onSave({
      ...job,
      ...formData
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-surface-container-highest/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-container rounded-3xl w-full max-w-3xl flex flex-col shadow-[0_0_50px_rgba(0,218,243,0.25)] overflow-hidden border border-outline-variant animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-5 flex-shrink-0 border-b border-outline-variant/50 bg-surface-container-low/50">
          <div>
            <h2 className="text-xl font-black text-on-surface flex items-center">
              <Truck className="mr-3 text-primary" size={24} />
              Logistics Task Details
            </h2>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
              Job ID: <span className="text-on-surface-variant font-mono">{job.id}</span> • Type: <span className="text-primary font-black">{job.type}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-surface-container-high text-on-surface-variant rounded-full hover:bg-surface-variant transition-all hover:rotate-90 duration-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center pb-2 border-b border-outline-variant/50">
                <User size={14} className="mr-2 text-primary" />
                Task Information
              </h3>
              
              <div>
                <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">Client Name</label>
                <input 
                  type="text"
                  name="customer"
                  value={formData.customer}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Gallery Wall"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">Item Category</label>
                <select 
                  name="subType"
                  value={formData.subType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-surface-container font-medium"
                >
                  <option value="">-- Select Category --</option>
                  <option value="Printed Canvas">Printed Canvas</option>
                  <option value="Steel Supply">Steel Supply</option>
                  <option value="Packaging Materials">Packaging Materials</option>
                  <option value="Finished Steel Frame">Finished Gallery-Wrap Frame</option>
                  <option value="Client Sample">Steel Frame Sample</option>
                  <option value="Waste Return">Material Scrap Return</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest">Location / Address</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-3 text-on-surface-variant" />
                  <input 
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Provide full location or address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest flex items-center">
                  <UserCheck size={12} className="mr-1.5 text-primary" /> Assigned Driver
                </label>
                <select 
                  name="driver"
                  value={formData.driver}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-surface-container font-medium"
                >
                  <option value="">-- Select Driver --</option>
                  <option value="Saman (Master Welder)">Saman (Master Welder)</option>
                  <option value="Kamal (Assistant)">Kamal (Assistant)</option>
                  <option value="Sunil (Driver)">Sunil (Driver)</option>
                  <option value="Nimal (Driver)">Nimal (Driver)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest flex items-center">
                  <Truck size={12} className="mr-1.5 text-primary" /> Assigned Vehicle
                </label>
                <select 
                  name="vehicle"
                  value={formData.vehicle}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none bg-surface-container font-medium"
                >
                  <option value="">-- Select Vehicle --</option>
                  <option value="Lorry (WP GE 1234)">Lorry (WP GE 1234)</option>
                  <option value="Van (WP LH 5678)">Van (WP LH 5678)</option>
                  <option value="Motorbike (WP XZ 9012)">Motorbike (WP XZ 9012)</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center pb-2 border-b border-outline-variant/50">
                <Clock size={14} className="mr-2 text-primary" />
                Status & Tracking
              </h3>

              <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/50 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-on-surface-variant">Current Status</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    job.status === "Pending" ? "bg-yellow-500/20 text-primary" :
                    job.status === "In Transit" ? "bg-primary/20 text-primary" :
                    "bg-secondary/20 text-secondary"
                  }`}>
                    {job.status}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-on-surface-variant flex items-center">
                    <Calendar size={12} className="mr-1.5" /> Start Time
                  </span>
                  <span className="text-xs font-mono text-on-surface">
                    {job.startTime ? new Date(job.startTime).toLocaleString() : 'Not Started'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-on-surface-variant flex items-center">
                    <CheckCircle size={12} className="mr-1.5" /> End Time
                  </span>
                  <span className="text-xs font-mono text-on-surface">
                    {job.endTime ? new Date(job.endTime).toLocaleString() : 'Incomplete'}
                  </span>
                </div>

                {job.duration && (
                  <div className="flex justify-between items-center pt-2 border-t border-outline-variant">
                    <span className="text-xs font-bold text-on-surface-variant">Total Duration</span>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                      {job.duration}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/50 space-y-4">
                <h4 className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider flex items-center mb-2">
                  <Bell size={12} className="mr-1.5 text-primary" /> Client Notifications
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant">Notification Status</span>
                  {formData.notified ? (
                    <span className="flex items-center text-secondary bg-secondary/10 px-2 py-1 rounded text-[10px] font-bold border border-emerald-100">
                      Notified
                    </span>
                  ) : (
                    <span className="flex items-center text-on-surface-variant bg-surface-container px-2 py-1 rounded text-[10px] font-bold">
                      Not Notified
                    </span>
                  )}
                </div>
                {formData.lastNotifiedAt && (
                  <div className="text-[10px] text-on-surface-variant font-medium">
                    Last sent: {new Date(formData.lastNotifiedAt).toLocaleString()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleNotifyClient}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold text-xs border border-primary/30 transition-all active:scale-95 mt-2 animate-in fade-in duration-300"
                >
                  <Send size={12} />
                  <span>Send Notification</span>
                </button>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5 tracking-widest flex items-center">
                  <FileText size={12} className="mr-1.5" /> Manifest / Notes
                </label>
                <textarea 
                  name="manifest"
                  value={formData.manifest || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-4 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Delivery slips, notes or reference..."
                />
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-outline-variant/50 bg-surface-container-low flex justify-end space-x-4">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 border border-outline-variant rounded-xl text-on-surface-variant font-bold text-xs hover:bg-surface-container transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-8 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs  hover:bg-primary/80 text-on-primary transition-all active:scale-95"
          >
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
