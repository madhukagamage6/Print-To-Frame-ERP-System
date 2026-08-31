import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard,
  DollarSign,
  Target,
  Kanban,
  Hammer,
  Truck,
  TrendingUp,
  CircleCheckBig,
  ArrowRight,
  CircleAlert,
  User,
  Calculator,
  MessageSquare,
  Users,
  Sparkles,
  Loader,
  Search,
  Check,
  ClipboardCheck,
  Play,
  Wrench,
  Handshake,
  Cpu,
  FileText,
  Inbox,
  Clock,
  Navigation,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Phone,
  Building,
  ChevronRight,
  ShieldCheck,
  Layers,
  BarChart3
} from "lucide-react";
import { generateText } from "../../services/gemini";
import { toast } from "../../utils/toast";
import { subscribeToCollection, COLLECTIONS } from "../../services/firestoreSync";

export const resolveDashboardDomain = (role) => {
  if (!role) return 'crm';
  const r = String(role).toLowerCase().trim();
  
  if (r.includes('admin') || r.includes('director') || r.includes('super') || r === 'manager' || r === 'operations manager') {
    return 'all';
  }
  if (r.includes('operation') || r.includes('logistics') || r.includes('fabricat') || r.includes('workshop') || r.includes('partner')) {
    return 'operations';
  }
  if (r.includes('account') || r.includes('billing') || r.includes('finance') || r.includes('audit')) {
    return 'finance';
  }
  // Sales, SNS Manager, Support, Marketing, Client, or fail-safe default
  return 'crm';
};

const LEAD_STAGES = ["Intake", "Processed", "75% Invoice Submited", "Recived"];
const DEAL_STAGES = ["Waiting", "Fabricating", "Ready To Load", "Hand Over", "Completed"];
const PROJECT_STAGES = ["Pending", "Ongoing", "Ready For Inspection", "Revision", "Completed"];

const PipelineBar = ({ stages, data, getStageColor, onStageClick }) => {
  return (
    <div className="flex items-center gap-1.5 mt-3">
      {stages.map((stage) => {
        const count = data.filter((item) => (item.stage || item.status) === stage).length;
        return (
          <div
            key={stage}
            className={`flex-1 py-2 px-1.5 rounded-xl text-center cursor-pointer transition-all hover:opacity-90 hover:scale-[1.02] border border-outline/30 ${getStageColor(
              stage
            )}`}
            title={`${stage}: ${count} item${count !== 1 ? "s" : ""}`}
            onClick={onStageClick}
          >
            <div className="text-base font-extrabold leading-none">{count}</div>
            <div className="text-[8px] uppercase font-bold tracking-wider opacity-85 truncate mt-1 leading-none">
              {stage}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function Dashboard({
  currentUser,
  setActiveTab,
  projects = [],
  logisticsJobs = [],
  customers = [],
  partners = [],
  leads = [],
  invoices = [],
  setLeads,
  setProjects,
  setLogisticsJobs,
}) {
  const resolvedDomain = resolveDashboardDomain(currentUser?.role);
  const isAdmin = resolvedDomain === 'all';

  const [activeCategory, setActiveCategory] = useState(resolvedDomain);
  const [insight, setInsight] = useState("Focus on high-tension gallery wraps for upcoming digital art deadlines.");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    if (currentUser?.role) {
      setActiveCategory(resolveDashboardDomain(currentUser.role));
    }
  }, [currentUser?.role]);

  useEffect(() => {
    if (isAdmin) {
      const unsub = subscribeToCollection(COLLECTIONS.AUDIT_LOG, setAuditLogs);
      return () => unsub();
    }
  }, [isAdmin]);

  // ── Metrics Calculations ──────────────────────────────────────────────────
  const activeLeads = useMemo(() => leads.filter(l => !l.isDeal && l.stage !== "Completed"), [leads]);
  const activeDeals = useMemo(() => leads.filter(l => l.isDeal && l.stage !== "Completed"), [leads]);
  const ongoingProjects = useMemo(() => projects.filter(p => p.status === "Ongoing"), [projects]);
  const pendingLogistics = useMemo(() => logisticsJobs.filter(j => j.status === "Pending"), [logisticsJobs]);

  const activeLeadsCount = activeLeads.length;
  const activeDealsCount = activeDeals.length;
  const ongoingFabCount = ongoingProjects.length;
  const pendingLogisticsCount = pendingLogistics.length;

  const pendingRevenue = useMemo(() => {
    return leads
      .filter((lead) => lead.isDeal && lead.stage !== "Completed")
      .reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);
  }, [leads]);

  const completedRevenue = useMemo(() => {
    return leads
      .filter((lead) => lead.isDeal && lead.stage === "Completed")
      .reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);
  }, [leads]);

  // ── Priority Action Work Queues (Top 4 Actionable Items) ──────────────────
  const crmActionQueue = useMemo(() => {
    return leads
      .filter(l => !l.isDeal && ["Intake", "Processed", "75% Invoice Submited"].includes(l.stage))
      .slice(0, 4);
  }, [leads]);

  const dealsActionQueue = useMemo(() => {
    return leads
      .filter(l => l.isDeal && ["Waiting", "Fabricating", "Ready To Load"].includes(l.stage))
      .slice(0, 4);
  }, [leads]);

  const opsActionQueue = useMemo(() => {
    return projects
      .filter(p => ["Pending", "Ongoing", "Ready For Inspection"].includes(p.status))
      .slice(0, 4);
  }, [projects]);

  const financeActionQueue = useMemo(() => {
    return invoices
      .filter(inv => inv.status !== 'Paid')
      .slice(0, 4);
  }, [invoices]);

  // Stale Leads Tracking (Leads in stage >= 5 days)
  const staleLeads = useMemo(() => {
    const now = Date.now();
    return (leads || [])
      .filter(l => !l.isDeal && l.stage !== 'Completed')
      .map(l => {
        const stageDate = l.stageEnteredAt || l.date;
        const days = stageDate ? Math.max(0, Math.floor((now - new Date(stageDate).getTime()) / 86400000)) : 0;
        return { ...l, daysInStage: days };
      })
      .filter(l => l.daysInStage >= 5)
      .slice(0, 3);
  }, [leads]);

  // Receivables Aging Exposure
  const invoiceAging = useMemo(() => {
    const buckets = {
      current: { label: "0–30d", count: 0, amount: 0 },
      thirtyToSixty: { label: "31–60d", count: 0, amount: 0 },
      sixtyToNinety: { label: "61–90d", count: 0, amount: 0 },
      overNinety: { label: "90d+ Overdue", count: 0, amount: 0 },
    };
    const now = Date.now();
    (invoices || []).filter(inv => inv.status !== 'Paid').forEach(inv => {
      const invDate = new Date(inv.date || now).getTime();
      const ageDays = Math.max(0, Math.floor((now - invDate) / 86400000));
      const amt = Number(inv.amount || 0);
      if (ageDays <= 30) {
        buckets.current.count++;
        buckets.current.amount += amt;
      } else if (ageDays <= 60) {
        buckets.thirtyToSixty.count++;
        buckets.thirtyToSixty.amount += amt;
      } else if (ageDays <= 90) {
        buckets.sixtyToNinety.count++;
        buckets.sixtyToNinety.amount += amt;
      } else {
        buckets.overNinety.count++;
        buckets.overNinety.amount += amt;
      }
    });
    return buckets;
  }, [invoices]);

  // Status Handlers
  const handleUpdateStatus = (id, type, newStatus) => {
    if (type === "lead" && setLeads) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: newStatus } : l)));
      toast.success(`Updated status to "${newStatus}"`);
    } else if (type === "project" && setProjects) {
      setProjects((prev) => prev.map((p) => (p.jobNo === id ? { ...p, status: newStatus } : p)));
      toast.success(`Updated status to "${newStatus}"`);
    } else if (type === "logistics" && setLogisticsJobs) {
      setLogisticsJobs((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
      toast.success(`Updated status to "${newStatus}"`);
    }
  };

  const fetchAIInsight = async () => {
    setLoadingInsight(true);
    try {
      const prompt = `Print To Frame — Sri Lanka specialty steel gallery framing. Stats: Active Leads: ${activeLeadsCount}, Active Deals (pipeline): ${activeDealsCount}, Fabrication Jobs In Progress: ${ongoingFabCount}, Pending Logistics Jobs: ${pendingLogisticsCount}, Pending Revenue: LKR ${pendingRevenue.toLocaleString()}, Customers: ${customers.length}. Provide one concise, strategic business recommendation (max 2 sentences).`;
      const aiResponse = await generateText(prompt);
      setInsight(aiResponse);
    } catch (error) {
      console.error(error);
      setInsight("Focus on high-tension gallery wraps for upcoming digital art deadlines.");
    } finally {
      setLoadingInsight(false);
    }
  };

  const CATEGORIES = [
    { id: 'all', label: 'All Operations', icon: LayoutDashboard, badge: 'Executive' },
    { id: 'crm', label: 'CRM & Sales', icon: Target, badge: String(activeLeadsCount + activeDealsCount) },
    { id: 'operations', label: 'Production & Logistics', icon: Hammer, badge: String(ongoingFabCount + pendingLogisticsCount) },
    { id: 'finance', label: 'Finance & Billing', icon: DollarSign, badge: 'LKR' },
  ];

  const getSubtitle = () => {
    switch (activeCategory) {
      case 'crm':
        return 'CRM & Sales Command Center — Real-time intake pipeline, quotation volume, and lead status.';
      case 'operations':
        return 'Production & Logistics Command Center — Work orders, cutting schedules, and dispatch status.';
      case 'finance':
        return 'Finance & Accounts Command Center — Receivables aging, revenue performance, and billing status.';
      default:
        return 'Executive Overview — Real-time enterprise overview, project metrics, and financial performance.';
    }
  };

  const getLeadStageColor = (stage) => {
    switch (stage) {
      case "Intake": return "bg-primary/20 text-primary";
      case "Processed": return "bg-sky-500/20 text-sky-400";
      case "75% Invoice Submited": return "bg-amber-500/20 text-amber-400";
      case "Recived": return "bg-emerald-500/20 text-emerald-400";
      default: return "bg-surface-container text-on-surface-variant";
    }
  };

  const getDealStageColor = (stage) => {
    switch (stage) {
      case "Waiting": return "bg-sky-500/20 text-sky-400";
      case "Fabricating": return "bg-amber-500/20 text-amber-400";
      case "Ready To Load": return "bg-primary/20 text-primary";
      case "Hand Over": return "bg-purple-500/20 text-purple-400";
      case "Completed": return "bg-emerald-500/20 text-emerald-400";
      default: return "bg-surface-container text-on-surface-variant";
    }
  };

  const getFabStatusColor = (status) => {
    switch (status) {
      case "Pending": return "bg-amber-500/20 text-amber-400";
      case "Ongoing": return "bg-purple-500/20 text-purple-400";
      case "Ready For Inspection": return "bg-primary/20 text-primary";
      case "Revision": return "bg-rose-500/20 text-rose-400";
      case "Completed": return "bg-emerald-500/20 text-emerald-400";
      default: return "bg-surface-container text-on-surface-variant";
    }
  };

  return (
    <div className="space-y-5">
      {/* ── 1. Page Header & Date ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Dashboard
          </h1>
          <p className="text-on-surface-variant text-xs sm:text-sm mt-0.5">{getSubtitle()}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center text-xs text-secondary bg-secondary/15 border border-secondary/30 px-3 py-1 rounded-full font-bold shadow-sm">
            <span className="flex h-2 w-2 mr-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary text-on-secondary" />
            </span>
            System Online
          </span>
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest bg-surface-container-high px-2.5 py-1 rounded-lg border border-outline">
            {new Date().toLocaleDateString("en-LK", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* ── 2. Admin Category Switcher (ADMIN / EXECUTIVE ONLY) ──────────── */}
      {isAdmin && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(0,218,243,0.3)] scale-100 ring-2 ring-primary/40'
                    : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-on-primary' : 'text-primary'} />
                <span>{cat.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-extrabold uppercase ${
                  isActive ? 'bg-black/25 text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
                }`}>
                  {cat.badge}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── 3. Top 4 High-Impact KPI Metrics Strip ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1 */}
        <div className="p-4 bg-surface-container-high rounded-2xl border border-outline shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-[9px] font-black text-on-surface-variant uppercase tracking-wider mb-0.5">
              {activeCategory === 'crm' ? 'Open Intake Leads' : activeCategory === 'operations' ? 'Ongoing Fabrication' : activeCategory === 'finance' ? 'Pending Receivables' : 'Pipeline Revenue'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-on-surface font-mono">
              {activeCategory === 'crm' ? activeLeadsCount : activeCategory === 'operations' ? ongoingFabCount : activeCategory === 'finance' ? `LKR ${(pendingRevenue / 1000).toFixed(0)}k` : `LKR ${(pendingRevenue / 1000).toFixed(0)}k`}
            </div>
          </div>
          <div className="p-2.5 bg-primary/15 text-primary rounded-xl">
            {activeCategory === 'crm' ? <Target size={18} /> : activeCategory === 'operations' ? <Hammer size={18} /> : activeCategory === 'finance' ? <DollarSign size={18} /> : <TrendingUp size={18} />}
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 bg-surface-container-high rounded-2xl border border-outline shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-[9px] font-black text-on-surface-variant uppercase tracking-wider mb-0.5">
              {activeCategory === 'crm' ? 'Active In-Pipeline Deals' : activeCategory === 'operations' ? 'Ready for Dispatch' : activeCategory === 'finance' ? 'Realized Revenue' : 'Active Workload'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-on-surface font-mono">
              {activeCategory === 'crm' ? activeDealsCount : activeCategory === 'operations' ? pendingLogisticsCount : activeCategory === 'finance' ? `LKR ${(completedRevenue / 1000).toFixed(0)}k` : activeLeadsCount + ongoingFabCount}
            </div>
          </div>
          <div className="p-2.5 bg-sky-500/15 text-sky-400 rounded-xl">
            {activeCategory === 'crm' ? <Kanban size={18} /> : activeCategory === 'operations' ? <Truck size={18} /> : activeCategory === 'finance' ? <CircleCheckBig size={18} /> : <Layers size={18} />}
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 bg-surface-container-high rounded-2xl border border-outline shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-[9px] font-black text-on-surface-variant uppercase tracking-wider mb-0.5">
              {activeCategory === 'crm' ? 'Quoted Pipeline (LKR)' : activeCategory === 'operations' ? 'Partner Subcontracts' : activeCategory === 'finance' ? '90d+ Overdue' : 'Active Customers'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-on-surface font-mono">
              {activeCategory === 'crm' ? `LKR ${(pendingRevenue / 1000).toFixed(0)}k` : activeCategory === 'operations' ? partners.length : activeCategory === 'finance' ? `LKR ${(invoiceAging.overNinety.amount / 1000).toFixed(0)}k` : customers.length}
            </div>
          </div>
          <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl">
            {activeCategory === 'crm' ? <DollarSign size={18} /> : activeCategory === 'operations' ? <Handshake size={18} /> : activeCategory === 'finance' ? <AlertTriangle size={18} /> : <Users size={18} />}
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 bg-surface-container-high rounded-2xl border border-outline shadow-sm flex items-center justify-between">
          <div>
            <span className="block text-[9px] font-black text-on-surface-variant uppercase tracking-wider mb-0.5">
              {activeCategory === 'crm' ? 'Customer Accounts' : activeCategory === 'operations' ? 'Total Work Orders' : activeCategory === 'finance' ? 'Total Invoices' : 'Completed Revenue'}
            </span>
            <div className="text-xl sm:text-2xl font-black text-on-surface font-mono">
              {activeCategory === 'crm' ? customers.length : activeCategory === 'operations' ? projects.length : activeCategory === 'finance' ? invoices.length : `LKR ${(completedRevenue / 1000).toFixed(0)}k`}
            </div>
          </div>
          <div className="p-2.5 bg-emerald-500/15 text-emerald-400 rounded-xl">
            {activeCategory === 'crm' ? <Users size={18} /> : activeCategory === 'operations' ? <ClipboardCheck size={18} /> : activeCategory === 'finance' ? <FileText size={18} /> : <CircleCheckBig size={18} />}
          </div>
        </div>
      </div>

      {/* ── 4. Main Single-Page 2-Zone Command Center ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ── LEFT CANVAS (65% Width — 7/12 on lg) ─────────────────────────── */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Card A: Pipeline Progression Bar */}
          <div className="bg-surface-container-high rounded-2xl border border-outline p-4 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-outline">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-primary/15 text-primary rounded-lg">
                  <BarChart3 size={14} />
                </div>
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  {activeCategory === 'crm' ? 'Leads Intake Pipeline' : activeCategory === 'operations' ? 'Production & Workshop Stages' : activeCategory === 'finance' ? 'Receivables Aging Exposure' : 'Sales & Deals Pipeline'}
                </h3>
              </div>
              <button 
                onClick={() => setActiveTab(activeCategory === 'operations' ? 'fabrication' : activeCategory === 'finance' ? 'invoices' : 'deals')}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                View Pipeline <ChevronRight size={12} />
              </button>
            </div>

            {activeCategory === 'crm' && (
              <PipelineBar
                stages={LEAD_STAGES}
                data={leads.filter((l) => !l.isDeal)}
                getStageColor={getLeadStageColor}
                onStageClick={() => setActiveTab("leads")}
              />
            )}

            {activeCategory === 'operations' && (
              <PipelineBar
                stages={PROJECT_STAGES}
                data={projects}
                getStageColor={getFabStatusColor}
                onStageClick={() => setActiveTab("fabrication")}
              />
            )}

            {(activeCategory === 'all' || activeCategory === 'finance') && (
              <PipelineBar
                stages={DEAL_STAGES}
                data={leads.filter((l) => l.isDeal)}
                getStageColor={getDealStageColor}
                onStageClick={() => setActiveTab("deals")}
              />
            )}
          </div>

          {/* Card B: Priority Action Work Queue (Top 4 Actionable Items) */}
          <div className="bg-surface-container-high rounded-2xl border border-outline p-4 shadow-sm">
            <div className="flex justify-between items-center pb-2.5 border-b border-outline mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-amber-500/15 text-amber-400 rounded-lg">
                  <Clock size={14} />
                </div>
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Priority Action Work Queue
                </h3>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-md border border-outline">
                1-Click Status Advancement
              </span>
            </div>

            {/* Work Queue List Items */}
            <div className="space-y-2.5">
              {activeCategory === 'crm' && (
                crmActionQueue.length === 0 ? (
                  <div className="p-6 text-center text-on-surface-variant text-xs font-medium">All intake leads are up to date!</div>
                ) : (
                  crmActionQueue.map((item) => (
                    <div key={item.id} className="p-3 bg-surface-container-highest/60 rounded-xl border border-outline flex items-center justify-between gap-2 hover:border-primary/40 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">{item.id}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${getLeadStageColor(item.stage)}`}>{item.stage}</span>
                        </div>
                        <p className="text-xs font-bold text-on-surface truncate mt-0.5">{item.name || item.company || 'Direct Client'}</p>
                        <p className="text-[10px] text-on-surface-variant truncate">{item.scope || 'Custom steel gallery framing'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.stage === "Intake" && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, "lead", "Processed")}
                            className="px-2.5 py-1.5 bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Mark Processed
                          </button>
                        )}
                        {item.stage === "Processed" && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, "lead", "75% Invoice Submited")}
                            className="px-2.5 py-1.5 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Submit 75% Inv
                          </button>
                        )}
                        {item.stage === "75% Invoice Submited" && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, "lead", "Recived")}
                            className="px-2.5 py-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Mark Received
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )
              )}

              {activeCategory === 'operations' && (
                opsActionQueue.length === 0 ? (
                  <div className="p-6 text-center text-on-surface-variant text-xs font-medium">No pending fabrication jobs on floor!</div>
                ) : (
                  opsActionQueue.map((item) => (
                    <div key={item.jobNo} className="p-3 bg-surface-container-highest/60 rounded-xl border border-outline flex items-center justify-between gap-2 hover:border-primary/40 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">{item.jobNo}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${getFabStatusColor(item.status)}`}>{item.status}</span>
                        </div>
                        <p className="text-xs font-bold text-on-surface truncate mt-0.5">{item.client || item.title || 'Framing Job'}</p>
                        <p className="text-[10px] text-on-surface-variant truncate">Due: {item.deadline || 'Standard queue'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.status === "Pending" && (
                          <button
                            onClick={() => handleUpdateStatus(item.jobNo, "project", "Ongoing")}
                            className="px-2.5 py-1.5 bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Start Job
                          </button>
                        )}
                        {item.status === "Ongoing" && (
                          <button
                            onClick={() => handleUpdateStatus(item.jobNo, "project", "Ready For Inspection")}
                            className="px-2.5 py-1.5 bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Ready Inspection
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )
              )}

              {(activeCategory === 'all' || activeCategory === 'finance') && (
                dealsActionQueue.length === 0 ? (
                  <div className="p-6 text-center text-on-surface-variant text-xs font-medium">No active deals waiting for review!</div>
                ) : (
                  dealsActionQueue.map((item) => (
                    <div key={item.id} className="p-3 bg-surface-container-highest/60 rounded-xl border border-outline flex items-center justify-between gap-2 hover:border-primary/40 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">{item.id}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${getDealStageColor(item.stage)}`}>{item.stage}</span>
                        </div>
                        <p className="text-xs font-bold text-on-surface truncate mt-0.5">{item.name || item.company || 'Client'}</p>
                        <p className="text-[10px] text-on-surface-variant font-mono">LKR {(Number(item.value) || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.stage === "Waiting" && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, "lead", "Fabricating")}
                            className="px-2.5 py-1.5 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Send to Fab
                          </button>
                        )}
                        {item.stage === "Fabricating" && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, "lead", "Ready To Load")}
                            className="px-2.5 py-1.5 bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Ready to Load
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT CANVAS (35% Width — 5/12 on lg) ────────────────────────── */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Card C: Domain Quick Action Launcher */}
          <div className="bg-surface-container-high rounded-2xl border border-outline p-4 shadow-sm">
            <div className="flex items-center space-x-2 pb-2.5 border-b border-outline mb-3">
              <div className="p-1 bg-primary/15 text-primary rounded-lg">
                <Play size={14} />
              </div>
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Quick Actions
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {activeCategory === 'crm' && (
                <>
                  <button
                    onClick={() => setActiveTab('leads')}
                    className="p-3 bg-surface-container-highest hover:bg-primary/15 text-on-surface hover:text-primary rounded-xl border border-outline hover:border-primary/50 text-left transition-all cursor-pointer group"
                  >
                    <Target size={16} className="text-primary mb-1.5 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold leading-tight">Add New Lead</div>
                    <div className="text-[9px] text-on-surface-variant mt-0.5">Capture inquiry</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('deals')}
                    className="p-3 bg-surface-container-highest hover:bg-sky-500/15 text-on-surface hover:text-sky-400 rounded-xl border border-outline hover:border-sky-500/50 text-left transition-all cursor-pointer group"
                  >
                    <Kanban size={16} className="text-sky-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold leading-tight">Open Deals</div>
                    <div className="text-[9px] text-on-surface-variant mt-0.5">Pipeline board</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('cost-calculator')}
                    className="p-3 bg-surface-container-highest hover:bg-amber-500/15 text-on-surface hover:text-amber-400 rounded-xl border border-outline hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <Calculator size={16} className="text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold leading-tight">Cost Estimator</div>
                    <div className="text-[9px] text-on-surface-variant mt-0.5">Quick quotation</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('customers')}
                    className="p-3 bg-surface-container-highest hover:bg-emerald-500/15 text-on-surface hover:text-emerald-400 rounded-xl border border-outline hover:border-emerald-500/50 text-left transition-all cursor-pointer group"
                  >
                    <Users size={16} className="text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold leading-tight">Client Directory</div>
                    <div className="text-[9px] text-on-surface-variant mt-0.5">Contacts list</div>
                  </button>
                </>
              )}

              {activeCategory === 'operations' && (
                <>
                  <button
                    onClick={() => setActiveTab('fabrication')}
                    className="p-3 bg-surface-container-highest hover:bg-purple-500/15 text-on-surface hover:text-purple-400 rounded-xl border border-outline hover:border-purple-500/50 text-left transition-all cursor-pointer group"
                  >
                    <Hammer size={16} className="text-purple-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold leading-tight">Work Orders</div>
                    <div className="text-[9px] text-on-surface-variant mt-0.5">Workshop floor</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('logistics')}
                    className="p-3 bg-surface-container-highest hover:bg-primary/15 text-on-surface hover:text-primary rounded-xl border border-outline hover:border-primary/50 text-left transition-all cursor-pointer group"
                  >
                    <Truck size={16} className="text-primary mb-1.5 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold leading-tight">Dispatch Queue</div>
                    <div className="text-[9px] text-on-surface-variant mt-0.5">Schedule delivery</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('partners')}
                    className="p-3 bg-surface-container-highest hover:bg-amber-500/15 text-on-surface hover:text-amber-400 rounded-xl border border-outline hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <Handshake size={16} className="text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold leading-tight">Partner Network</div>
                    <div className="text-[9px] text-on-surface-variant mt-0.5">Subcontractors</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className="p-3 bg-surface-container-highest hover:bg-sky-500/15 text-on-surface hover:text-sky-400 rounded-xl border border-outline hover:border-sky-500/50 text-left transition-all cursor-pointer group"
                  >
                    <MessageSquare size={16} className="text-sky-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold leading-tight">Messages</div>
                    <div className="text-[9px] text-on-surface-variant mt-0.5">Team chat</div>
                  </button>
                </>
              )}

              {(activeCategory === 'all' || activeCategory === 'finance') && (
                <>
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className="p-3 bg-surface-container-highest hover:bg-emerald-500/15 text-on-surface hover:text-emerald-400 rounded-xl border border-outline hover:border-emerald-500/50 text-left transition-all cursor-pointer group"
                  >
                    <FileText size={16} className="text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold leading-tight">Invoices Ledger</div>
                    <div className="text-[9px] text-on-surface-variant mt-0.5">Accounts billing</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('deals')}
                    className="p-3 bg-surface-container-highest hover:bg-primary/15 text-on-surface hover:text-primary rounded-xl border border-outline hover:border-primary/50 text-left transition-all cursor-pointer group"
                  >
                    <DollarSign size={16} className="text-primary mb-1.5 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold leading-tight">Revenue Pipeline</div>
                    <div className="text-[9px] text-on-surface-variant mt-0.5">Deals cashflow</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('cost-calculator')}
                    className="p-3 bg-surface-container-highest hover:bg-amber-500/15 text-on-surface hover:text-amber-400 rounded-xl border border-outline hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <Calculator size={16} className="text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold leading-tight">Pricing Engine</div>
                    <div className="text-[9px] text-on-surface-variant mt-0.5">Material margins</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className="p-3 bg-surface-container-highest hover:bg-sky-500/15 text-on-surface hover:text-sky-400 rounded-xl border border-outline hover:border-sky-500/50 text-left transition-all cursor-pointer group"
                  >
                    <MessageSquare size={16} className="text-sky-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold leading-tight">Team Messages</div>
                    <div className="text-[9px] text-on-surface-variant mt-0.5">Internal chat</div>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Card D: Domain Smart Attention Box */}
          <div className="bg-surface-container-high rounded-2xl border border-outline p-4 shadow-sm">
            {activeCategory === 'crm' && (
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-outline mb-2.5">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={14} className="text-amber-400" />
                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Stale Follow-up Attention</h4>
                  </div>
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                    ≥ 5 Days
                  </span>
                </div>
                {staleLeads.length === 0 ? (
                  <p className="text-xs text-on-surface-variant py-2">No stagnant leads in queue. All follow-ups are fresh!</p>
                ) : (
                  <div className="space-y-2">
                    {staleLeads.map(l => (
                      <div key={l.id} className="p-2.5 bg-surface-container-highest rounded-xl border border-outline flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-on-surface">{l.name || l.company || l.id}</div>
                          <div className="text-[10px] text-on-surface-variant">{l.stage} · {l.phone || 'No phone'}</div>
                        </div>
                        <span className="font-mono font-bold text-amber-400 text-[10px] bg-amber-400/15 px-2 py-0.5 rounded">
                          {l.daysInStage}d stuck
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeCategory === 'finance' && (
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-outline mb-2.5">
                  <div className="flex items-center space-x-2">
                    <DollarSign size={14} className="text-emerald-400" />
                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Aging Exposure Summary</h4>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/30">
                    Unpaid
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-surface-container-highest rounded-xl border border-outline text-center">
                    <div className="text-[9px] font-bold text-on-surface-variant">0–30d Current</div>
                    <div className="text-xs font-black text-on-surface font-mono mt-0.5">LKR {(invoiceAging.current.amount / 1000).toFixed(0)}k</div>
                  </div>
                  <div className="p-2 bg-surface-container-highest rounded-xl border border-outline text-center">
                    <div className="text-[9px] font-bold text-amber-400">31–60d Due</div>
                    <div className="text-xs font-black text-amber-400 font-mono mt-0.5">LKR {(invoiceAging.thirtyToSixty.amount / 1000).toFixed(0)}k</div>
                  </div>
                  <div className="p-2 bg-surface-container-highest rounded-xl border border-outline text-center">
                    <div className="text-[9px] font-bold text-rose-400">61–90d Late</div>
                    <div className="text-xs font-black text-rose-400 font-mono mt-0.5">LKR {(invoiceAging.sixtyToNinety.amount / 1000).toFixed(0)}k</div>
                  </div>
                  <div className="p-2 bg-surface-container-highest rounded-xl border border-rose-500/30 text-center">
                    <div className="text-[9px] font-bold text-rose-500">90d+ Overdue</div>
                    <div className="text-xs font-black text-rose-400 font-mono mt-0.5">LKR {(invoiceAging.overNinety.amount / 1000).toFixed(0)}k</div>
                  </div>
                </div>
              </div>
            )}

            {(activeCategory === 'all' || activeCategory === 'operations') && (
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-outline mb-2.5">
                  <div className="flex items-center space-x-2">
                    <Sparkles size={14} className="text-primary" />
                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">AI Business Brief</h4>
                  </div>
                  <button
                    onClick={fetchAIInsight}
                    disabled={loadingInsight}
                    className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    {loadingInsight ? 'Updating...' : 'Refresh'}
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {insight}
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
