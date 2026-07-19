import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity, 
  Shield, 
  Check, 
  X, 
  ChartPie, 
  Download, 
  BriefcaseBusiness, 
  Building, 
  FileText 
} from 'lucide-react';
import Card from '../common/Card';

export default function AdminPanel({ dataStore }) {
  const leads = dataStore?.leads || [];
  const projects = dataStore?.projects || [];
  const invoices = dataStore?.invoices || [];
  const partners = dataStore?.partners || [];
  const customers = dataStore?.customers || [];

  console.log("AdminPanel Data Load:", {
    leads: leads.length,
    invoices: invoices.length,
  });

  const totalPipeline = leads.reduce((acc, lead) => acc + (Number(lead.value) || 0), 0);
  const invoicedGap = invoices
    .filter((inv) => inv.status !== "Paid")
    .reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
  const partnerOwed = partners.reduce((acc, part) => acc + (Number(part.pending) || 0), 0);
  const deliveredVolume = leads
    .filter((lead) => lead.stage === "Completed")
    .reduce((acc, lead) => acc + (Number(lead.totalSqFt) || 0), 0);

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="p-6 bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] flex items-center space-x-4">
      <div className={`p-3 rounded-xl ${colorClass} text-on-surface`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none mb-1">
          {title}
        </p>
        <p className="text-xl font-extrabold text-on-surface leading-none">
          {value}
        </p>
      </div>
    </div>
  );

  const downloadCSV = (label, data) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0] || {}).join(",");
    const rows = data.map((item) =>
      Object.values(item)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(",")
    ).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + "\n" + rows);
    const link = document.createElement("a");
    link.href = csvContent;
    link.download = `PTF_${label}.csv`;
    link.click();
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="bg-surface-container-highest text-on-surface p-6 rounded-3xl flex justify-between items-center shadow-[0_10px_40px_rgba(0,218,243,0.2)] border border-slate-800">
        <div>
          <h2 className="text-2xl font-black tracking-tighter">PTF EXECUTIVE CONTROL</h2>
          <div className="flex items-center space-x-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-secondary text-on-secondary animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">
              System Monitoring Active • V2.1.0
            </span>
          </div>
        </div>
        <div className="flex space-x-4 text-right">
          <div>
            <p className="text-[8px] font-bold text-on-surface-variant uppercase">Data Records</p>
            <p className="text-sm font-bold">
              {(leads.length + projects.length + invoices.length).toLocaleString()}
            </p>
          </div>
          <div className="w-px h-8 bg-surface-container-high" />
          <div>
            <p className="text-[8px] font-bold text-on-surface-variant uppercase">Status</p>
            <p className="text-sm font-bold text-emerald-400">READY</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Pipeline"
          value={`LKR ${totalPipeline.toLocaleString()}`}
          icon={TrendingUp}
          colorClass="bg-primary text-on-primary"
        />
        <StatCard
          title="Invoiced Gap"
          value={`LKR ${invoicedGap.toLocaleString()}`}
          icon={DollarSign}
          colorClass="bg-primary/100"
        />
        <StatCard
          title="Partner Owed"
          value={`LKR ${partnerOwed.toLocaleString()}`}
          icon={Building}
          colorClass="bg-error text-on-error"
        />
        <StatCard
          title="Delivered Volume"
          value={`${deliveredVolume.toLocaleString()} SqFt`}
          icon={Activity}
          colorClass="bg-secondary text-on-secondary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="p-8 lg:col-span-1">
          <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="text-sm font-bold text-on-surface">Overview Status</h3>
          </div>
          <div className="space-y-4">
            <div className="text-center py-12 border-2 border-dashed border-outline-variant/50 rounded-3xl">
              <Shield size={32} className="mx-auto text-on-surface mb-4" />
              <p className="text-[10px] font-bold text-on-surface-variant uppercase">System Secure</p>
            </div>
          </div>
        </Card>

        <Card className="p-8 lg:col-span-2">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-8">
            System Reliability Indicators
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h4 className="text-[10px] font-black uppercase text-on-surface mb-6 flex items-center">
                <ChartPie size={14} className="mr-2 text-primary" />
                Conversion Health
              </h4>
              <div className="space-y-6">
                {["Intake", "Processing", "Deal"].map((stage) => {
                  const count = leads.filter((l) => l.stage === stage).length;
                  const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
                  return (
                    <div key={stage}>
                      <div className="flex justify-between text-[8px] font-black uppercase text-on-surface-variant mb-2">
                        <span>{stage}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-1.5 bg-surface-container-low rounded-full overflow-hidden border border-outline-variant/50">
                        <div
                          className="h-full bg-primary text-on-primary transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase text-on-surface mb-6 flex items-center">
                <Activity size={14} className="mr-2 text-error" />
                Delivery Velocity
              </h4>
              <div className="space-y-6">
                {["Pending", "In Progress", "Completed"].map((status) => {
                  const count = projects.filter((p) => p.status === status).length;
                  const pct = projects.length > 0 ? (count / projects.length) * 100 : 0;
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-[8px] font-black uppercase text-on-surface-variant mb-2">
                        <span>{status}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-1.5 bg-surface-container-low rounded-full overflow-hidden border border-outline-variant/50">
                        <div
                          className="h-full bg-error transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="pt-8 border-t border-outline-variant">
        <div className="flex items-center space-x-2 mb-6">
          <Download size={18} className="text-on-surface-variant" />
          <h3 className="text-xs font-black uppercase text-on-surface-variant tracking-widest">
            Auditable Snapshots
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Invoices", data: invoices, color: "hover:border-yellow-500/30", icon: FileText },
            { label: "Leads", data: leads, color: "hover:border-indigo-400", icon: BriefcaseBusiness },
            { label: "Partners", data: partners, color: "hover:border-error/30", icon: Building },
            { label: "Customers", data: customers, color: "hover:border-emerald-400", icon: Users },
          ].map((snap) => (
            <button
              key={snap.label}
              onClick={() => downloadCSV(snap.label, snap.data)}
              className={`bg-surface-container border border-outline-variant p-6 rounded-3xl text-left transition-all hover:bg-surface-container-low ${snap.color} group`}
            >
              <snap.icon size={20} className="text-on-surface-variant mb-2" />
              <p className="text-[10px] font-black text-on-surface uppercase tracking-tight">
                {snap.label}
              </p>
              <p className="text-[8px] text-on-surface-variant italic">Download CSV</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
