import React, { useState, useMemo } from "react";
import {
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
  ArrowUpRight
} from "lucide-react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { generateText } from "../../services/gemini";
import { toast } from "../../utils/toast";
import { subscribeToCollection, COLLECTIONS } from "../../services/firestoreSync";

const DEAL_STAGES = ["Waiting", "Fabricating", "Ready To Load", "Hand Over", "Completed"];
const LEAD_STAGES = ["Intake", "Processed", "75% Invoice Submited", "Recived"];
const PROJECT_STAGES = ["Pending", "Ongoing", "Ready For Inspection", "Revision", "Completed"];

const getBadgeIcon = (badge) => {
  switch (badge) {
    case "Intake": return Inbox;
    case "Processed": return Cpu;
    case "75% Invoice Submited": return FileText;
    case "Recived": return Check;
    case "Waiting": return Clock;
    case "Fabricating": return Hammer;
    case "Ready To Load": return Truck;
    case "Hand Over": return Handshake;
    case "Completed": return Check;
    case "Pending": return Clock;
    case "Ongoing": return Play;
    case "Ready For Inspection": return ClipboardCheck;
    case "Revision": return Wrench;
    case "In Transit": return Navigation;
    default: return Package;
  }
};

const PipelineBar = ({ stages, data, getStageColor, onStageClick }) => {
  return (
    <div className="flex items-center gap-1 mt-3">
      {stages.map((stage) => {
        const count = data.filter((item) => (item.stage || item.status) === stage).length;
        return (
          <div
            key={stage}
            className={`flex-1 py-2 px-1 rounded-lg text-center cursor-pointer transition-all hover:opacity-90 hover:scale-[1.02] ${getStageColor(
              stage
            )}`}
            title={`${stage}: ${count} item${count !== 1 ? "s" : ""}`}
            onClick={onStageClick}
          >
            <div className="text-base font-extrabold leading-none">{count}</div>
            <div className="text-[8px] uppercase font-bold tracking-wider opacity-80 truncate mt-0.5 leading-none">
              {stage}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const getColorClasses = (theme) => {
  switch (theme) {
    case "blue":
      return "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border-primary/20 focus:ring-primary";
    case "emerald":
      return "bg-secondary/10 text-secondary hover:bg-secondary/20 hover:text-secondary border-secondary/20 focus:ring-secondary";
    case "amber":
      return "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 hover:text-amber-300 border-amber-400/20 focus:ring-amber-400";
    case "purple":
      return "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border-primary/20 focus:ring-primary";
    case "indigo":
      return "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border-primary/20 focus:ring-primary";
    case "orange":
      return "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 hover:text-amber-300 border-amber-400/20 focus:ring-amber-400";
    case "rose":
      return "bg-error/10 text-error hover:bg-error/20 hover:text-error border-error/30 focus:ring-error";
    default:
      return "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface border-outline-variant/30 focus:ring-slate-500";
  }
};

const ActionItem = ({
  title,
  subtitle,
  badge,
  badgeColor,
  onClick,
  onComplete,
  onReady,
  readyTooltip = "Ready for Pickup",
  completeTooltip = "Complete",
  readyIcon: ReadyIcon = Truck,
  completeIcon: CompleteIcon = Check,
  actions = [],
}) => {
  const mergedActions = [...actions];
  if (onReady && actions.length === 0) {
    mergedActions.push({
      icon: ReadyIcon,
      tooltip: readyTooltip,
      onClick: onReady,
      theme: "blue",
    });
  }
  if (onComplete && actions.length === 0) {
    mergedActions.push({
      icon: CompleteIcon,
      tooltip: completeTooltip,
      onClick: onComplete,
      theme: "emerald",
    });
  }

  return (
    <div
      onClick={onClick}
      className="flex justify-between items-center p-3 bg-surface-container-low/80 hover:bg-primary/10 rounded-xl border border-outline-variant/50 hover:border-primary/30 transition-all cursor-pointer group"
    >
      <div className="overflow-hidden flex-1 mr-2">
        <div className="text-sm font-bold text-on-surface truncate group-hover:text-primary">
          {title}
        </div>
        <div className="text-[10px] text-on-surface-variant truncate mt-0.5">{subtitle}</div>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {mergedActions.map((action, idx) => {
          const IconComponent = action.icon;
          return (
            <div key={idx} className="relative group/tooltip">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                className={`p-1.5 rounded-lg border border-transparent transition-colors flex items-center justify-center focus:outline-none focus:ring-2 ${getColorClasses(action.theme)}`}
                title={action.tooltip}
                aria-label={action.tooltip}
              >
                <IconComponent size={14} />
              </button>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 scale-95 opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-all duration-150 ease-out bg-surface-container-highest text-on-surface text-[10px] font-bold px-2 py-1 rounded shadow-[0_8px_30px_rgba(0,218,243,0.15)] whitespace-nowrap z-50">
                {action.tooltip}
              </span>
            </div>
          );
        })}
        {(() => {
          const BadgeIcon = getBadgeIcon(badge);
          return (
            <div className="relative group/badge">
              <span className={`flex items-center justify-center p-1.5 rounded-full ${badgeColor}`}>
                <BadgeIcon size={14} />
              </span>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 scale-95 opacity-0 group-hover/badge:opacity-100 group-hover/badge:scale-100 transition-all duration-150 ease-out bg-surface-container-highest text-on-surface text-[10px] font-bold px-2 py-1 rounded shadow-[0_8px_30px_rgba(0,218,243,0.15)] whitespace-nowrap z-50">
                {badge}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

const MetricLabel = ({ children }) => (
  <span className="block text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-0.5">
    {children}
  </span>
);

const Dashboard = ({
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
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [insight, setInsight] = useState(
    "Focus on high-tension gallery wraps for upcoming digital art deadlines."
  );
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  React.useEffect(() => {
    const unsub = subscribeToCollection(COLLECTIONS.AUDIT_LOG, setAuditLogs);
    return () => unsub();
  }, []);

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

  const handleMarkCompleted = (id, type) => {
    handleUpdateStatus(id, type, "Completed");
  };

  const handleReadyForPickup = (id, type) => {
    if (type === "lead") {
      handleUpdateStatus(id, type, "Ready To Load");
    } else if (type === "project") {
      handleUpdateStatus(id, type, "Ready For Inspection");
    }
  };

  const getActionsForItem = (item, type) => {
    const actions = [];
    if (type === "lead") {
      if (!item.isDeal) {
        // Lead stages: "Intake", "Processed", "75% Invoice Submited", "Recived", "Completed"
        if (item.stage === "Intake") {
          actions.push({
            icon: Cpu,
            tooltip: "Mark as Processed",
            theme: "blue",
            onClick: () => handleUpdateStatus(item.id, "lead", "Processed")
          });
        } else if (item.stage === "Processed") {
          actions.push({
            icon: FileText,
            tooltip: "Submit 75% Invoice",
            theme: "indigo",
            onClick: () => handleUpdateStatus(item.id, "lead", "75% Invoice Submited")
          });
        } else if (item.stage === "75% Invoice Submited") {
          actions.push({
            icon: Inbox,
            tooltip: "Mark as Received",
            theme: "orange",
            onClick: () => handleUpdateStatus(item.id, "lead", "Recived")
          });
        }
        if (item.stage !== "Completed") {
          actions.push({
            icon: Check,
            tooltip: "Mark as Completed",
            theme: "emerald",
            onClick: () => handleUpdateStatus(item.id, "lead", "Completed")
          });
        }
      } else {
        // Deal stages: "Waiting", "Fabricating", "Ready To Load", "Hand Over", "Completed"
        if (item.stage === "Waiting") {
          actions.push({
            icon: Hammer,
            tooltip: "Start Fabricating",
            theme: "amber",
            onClick: () => handleUpdateStatus(item.id, "lead", "Fabricating")
          });
        } else if (item.stage === "Fabricating") {
          actions.push({
            icon: Truck,
            tooltip: "Mark Ready To Load",
            theme: "blue",
            onClick: () => handleUpdateStatus(item.id, "lead", "Ready To Load")
          });
        } else if (item.stage === "Ready To Load") {
          actions.push({
            icon: Handshake,
            tooltip: "Hand Over to Client",
            theme: "purple",
            onClick: () => handleUpdateStatus(item.id, "lead", "Hand Over")
          });
        }
        if (item.stage !== "Completed") {
          actions.push({
            icon: Check,
            tooltip: "Mark as Completed",
            theme: "emerald",
            onClick: () => handleUpdateStatus(item.id, "lead", "Completed")
          });
        }
      }
    } else if (type === "project") {
      // Fab stages: "Pending", "Ongoing", "Ready For Inspection", "Revision", "Completed"
      if (item.status === "Pending") {
        actions.push({
          icon: Play,
          tooltip: "Start (Ongoing)",
          theme: "indigo",
          onClick: () => handleUpdateStatus(item.jobNo, "project", "Ongoing")
        });
      } else if (item.status === "Ongoing" || item.status === "Revision") {
        actions.push({
          icon: ClipboardCheck,
          tooltip: "Ready For Inspection",
          theme: "blue",
          onClick: () => handleUpdateStatus(item.jobNo, "project", "Ready For Inspection")
        });
      }
      if (item.status !== "Completed") {
        actions.push({
          icon: Check,
          tooltip: "Mark as Completed",
          theme: "emerald",
          onClick: () => handleUpdateStatus(item.jobNo, "project", "Completed")
        });
      }
    } else if (type === "logistics") {
      // Logistics stages: "Pending", "In Transit", "Completed"
      if (item.status === "Pending") {
        actions.push({
          icon: Truck,
          tooltip: "Start Transit",
          theme: "indigo",
          onClick: () => handleUpdateStatus(item.id, "logistics", "In Transit")
        });
      } else if (item.status === "In Transit") {
        actions.push({
          icon: Check,
          tooltip: "Mark as Completed",
          theme: "emerald",
          onClick: () => handleUpdateStatus(item.id, "logistics", "Completed")
        });
      } else if (item.status !== "Completed") {
        actions.push({
          icon: Check,
          tooltip: "Mark as Completed",
          theme: "emerald",
          onClick: () => handleUpdateStatus(item.id, "logistics", "Completed")
        });
      }
    }
    return actions;
  };

  // Search logic
  const searchResults = searchQuery
    ? leads.filter((lead) => {
        const query = searchQuery.toLowerCase();
        return (
          lead.id?.toLowerCase().includes(query) ||
          lead.name?.toLowerCase().includes(query) ||
          lead.phone?.toLowerCase().includes(query)
        );
      })
    : [];

  const activeLeadsCount = leads.filter((lead) => !lead.isDeal && lead.stage !== "Completed").length;
  const activeDealsCount = leads.filter(
    (lead) => lead.isDeal && lead.stage !== "Completed"
  ).length;
  const ongoingFabCount = projects.filter((project) => project.status === "Ongoing").length;
  const pendingLogisticsCount = logisticsJobs.filter((job) => job.status === "Pending").length;

  const pendingRevenue = leads
    .filter((lead) => lead.isDeal && lead.stage !== "Completed")
    .reduce((sum, lead) => sum + (lead.value || 0), 0);

  const completedRevenue = leads
    .filter((lead) => lead.isDeal && lead.stage === "Completed")
    .reduce((sum, lead) => sum + (lead.value || 0), 0);

  // Critical items
  const leadsNeedingAction = leads
    .filter((lead) => !lead.isDeal && ["75% Invoice Submitted", "Received"].includes(lead.stage))
    .slice(0, 4);

  const activeDealsList = leads
    .filter((lead) => lead.isDeal && lead.stage !== "Completed")
    .slice(0, 4);

  const ongoingFabList = projects.filter((project) => project.status !== "Completed").slice(0, 4);

  const logisticsQueue = logisticsJobs.filter((job) => job.status !== "Completed").slice(0, 4);

  const getLeadStageColor = (stage) => {
    switch (stage) {
      case "Intake":
        return "bg-primary/20 text-primary";
      case "Processed":
        return "bg-tertiary/20 text-tertiary";
      case "75% Invoice Submited":
        return "bg-yellow-500/20 text-yellow-500";
      case "Recived":
        return "bg-secondary/20 text-secondary";
      default:
        return "bg-surface-container text-on-surface-variant";
    }
  };

  const getDealStageColor = (stage) => {
    switch (stage) {
      case "Waiting":
        return "bg-tertiary/20 text-tertiary";
      case "Fabricating":
        return "bg-yellow-500/20 text-yellow-500";
      case "Ready To Load":
        return "bg-primary/20 text-primary";
      case "Hand Over":
        return "bg-purple-500/20 text-purple-400";
      case "Completed":
        return "bg-secondary/20 text-secondary";
      default:
        return "bg-surface-container text-on-surface-variant";
    }
  };

  const getFabStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-500/20 text-yellow-500";
      case "Ongoing":
        return "bg-tertiary/20 text-tertiary";
      case "Ready For Inspection":
        return "bg-yellow-500/20 text-yellow-500";
      case "Revision":
        return "bg-error/20 text-error";
      case "Completed":
        return "bg-secondary/20 text-secondary";
      default:
        return "bg-surface-container text-on-surface-variant";
    }
  };

  const fetchAIInsight = async () => {
    setLoadingInsight(true);
    try {
      const prompt = `Print To Frame — Sri Lanka specialty steel gallery framing. Stats: Active Leads: ${activeLeadsCount}, Active Deals (pipeline): ${activeDealsCount}, Fabrication Jobs In Progress: ${ongoingFabCount}, Pending Logistics Jobs: ${pendingLogisticsCount}, Pending Revenue: LKR ${pendingRevenue.toLocaleString()}, Customers: ${
        customers.length
      }. Provide one concise, strategic business insight (max 2 clear sentences), specific and actionable.`;
      const aiResponse = await generateText(prompt);
      setInsight(aiResponse);
    } catch (error) {
      console.error(error);
      setInsight("Error loading business recommendation. Please check your network connection.");
    } finally {
      setLoadingInsight(false);
    }
  };

  // Stale Leads Tracking (Item 12: Leads stuck >= 5 days in non-terminal stages)
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
      .sort((a, b) => b.daysInStage - a.daysInStage);
  }, [leads]);

  // Invoice Aging Buckets (Item 15: Receivables aging exposure)
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

  // Dynamic Monthly Sales & Production Trends (Item 15)
  const trendData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    
    // Past 6 months
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(curYear, curMonth - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      trend.push({
        month: monthNames[mIdx],
        year: yr,
        monthNum: mIdx,
        sales: 0,
        production: 0,
      });
    }

    (invoices || []).forEach(inv => {
      if (!inv.date) return;
      const d = new Date(inv.date);
      const m = d.getMonth();
      const y = d.getFullYear();
      const match = trend.find(t => t.monthNum === m && t.year === y);
      if (match) {
        match.sales += Number(inv.amount || inv.totalValue || 0);
      }
    });

    (projects || []).forEach(p => {
      if (!p.createdAt && !p.deadline) return;
      const d = new Date(p.createdAt || p.deadline);
      const m = d.getMonth();
      const y = d.getFullYear();
      const match = trend.find(t => t.monthNum === m && t.year === y);
      if (match) {
        match.production += 1;
      }
    });

    return trend;
  }, [invoices, projects]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1">
            Dashboard
          </h1>
          <p className="text-on-surface-variant text-sm">Real-time enterprise overview, project metrics, and financial performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="flex items-center text-xs text-secondary bg-secondary/10 border border-secondary/30 px-3 py-1.5 rounded-full font-bold shadow-[0_4px_20px_rgba(0,218,243,0.05)]">
            <span className="flex h-2 w-2 mr-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary text-on-secondary" />
            </span>
            System Online
          </span>
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
            {new Date().toLocaleDateString("en-LK", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Global Search */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-on-surface-variant" size={20} />
          <input
            type="text"
            placeholder="Search orders by ID, Customer Name, or Phone Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant pl-11 pr-4 py-3 rounded-xl shadow-[0_4px_20px_rgba(0,218,243,0.05)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 text-on-surface-variant hover:text-on-surface-variant font-medium text-xs bg-surface-container px-2 py-1 rounded-md"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchQuery && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container rounded-xl shadow-[0_10px_40px_rgba(0,218,243,0.2)] border border-outline-variant max-h-80 overflow-y-auto z-50 p-2">
            {searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => {
                      setSearchQuery("");
                      setActiveTab(result.isDeal ? "pipeline" : "leads");
                    }}
                    className="flex justify-between items-center p-3 hover:bg-surface-container-low rounded-lg cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-bold text-on-surface text-sm flex items-center gap-2">
                        <span>{result.id}</span>
                        <span className="text-on-surface">•</span>
                        <span>{result.name || "Unknown"}</span>
                      </div>
                      <div className="text-xs text-on-surface-variant mt-1">
                        {result.phone || "No phone"} | {result.isDeal ? "Deal" : "Lead"} - {result.stage}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 mr-2 flex-shrink-0">
                        {getActionsForItem(result, "lead").map((action, idx) => {
                          const IconComponent = action.icon;
                          return (
                            <div key={idx} className="relative group/tooltip">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.onClick();
                                }}
                                className={`p-1.5 rounded-lg border border-transparent transition-colors flex items-center justify-center focus:outline-none focus:ring-2 ${getColorClasses(action.theme)}`}
                                title={action.tooltip}
                                aria-label={action.tooltip}
                              >
                                <IconComponent size={14} />
                              </button>
                              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 scale-95 opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-all duration-150 ease-out bg-surface-container-highest text-on-surface text-[10px] font-bold px-2 py-1 rounded shadow-[0_8px_30px_rgba(0,218,243,0.15)] whitespace-nowrap z-50">
                                {action.tooltip}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <ArrowRight size={16} className="text-on-surface-variant" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-on-surface-variant font-medium">
                No orders found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Leads Card */}
        <div
          onClick={() => setActiveTab("leads")}
          className="bg-surface-container p-5 rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] cursor-pointer hover:shadow-[0_4px_25px_rgba(0,218,243,0.1)] hover:border-primary/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
              <Target size={18} className="text-primary" />
            </div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
              Active
            </span>
          </div>
          <div className="text-3xl font-extrabold text-on-surface">{activeLeadsCount}</div>
          <div className="text-xs text-on-surface-variant mt-1 font-medium">Open Leads</div>
        </div>

        {/* Deals Card */}
        <div
          onClick={() => setActiveTab("pipeline")}
          className="bg-surface-container p-5 rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] cursor-pointer hover:shadow-[0_4px_25px_rgba(0,218,243,0.1)] hover:border-primary/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
              <Kanban size={18} className="text-primary" />
            </div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              Deals
            </span>
          </div>
          <div className="text-3xl font-extrabold text-on-surface">{activeDealsCount}</div>
          <div className="text-xs text-on-surface-variant mt-1 font-medium">In Pipeline</div>
        </div>

        {/* Fab Ongoing Card */}
        <div
          onClick={() => setActiveTab("projects")}
          className="bg-surface-container p-5 rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] cursor-pointer hover:shadow-[0_4px_25px_rgba(0,218,243,0.1)] hover:border-primary/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-yellow-500/20 transition-colors">
              <Hammer size={18} className="text-yellow-500" />
            </div>
            <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">
              Fab
            </span>
          </div>
          <div className="text-3xl font-extrabold text-on-surface">{ongoingFabCount}</div>
          <div className="text-xs text-on-surface-variant mt-1 font-medium">Jobs Ongoing</div>
        </div>

        {/* Pending Logistics Card */}
        <div
          onClick={() => setActiveTab("logistics")}
          className="bg-surface-container p-5 rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] cursor-pointer hover:shadow-[0_4px_25px_rgba(0,218,243,0.1)] hover:border-error/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-error/10 text-error rounded-xl group-hover:bg-error/20 transition-colors">
              <Truck size={18} className="text-error" />
            </div>
            <span className="text-[10px] font-bold text-error uppercase tracking-widest">
              Logistics
            </span>
          </div>
          <div className="text-3xl font-extrabold text-on-surface">{pendingLogisticsCount}</div>
          <div className="text-xs text-on-surface-variant mt-1 font-medium">Pending Jobs</div>
        </div>
      </div>

      {/* Revenue & Aging Section (Item 15) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Revenue */}
        <div className="bg-primary/10 border border-primary/30 p-6 rounded-2xl text-on-surface shadow-[0_0_20px_rgba(0,218,243,0.15)] flex justify-between items-start relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] -mr-10 -mt-10 rounded-full pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2 font-mono">
              Pending Revenue
            </p>
            <p className="text-3xl sm:text-4xl font-extrabold text-on-surface font-display tracking-tight">LKR {pendingRevenue.toLocaleString()}</p>
            <p className="text-primary/70 text-xs mt-2 font-medium">
              From {activeDealsCount} active deal{activeDealsCount !== 1 ? "s" : ""}
            </p>
          </div>
          <TrendingUp size={36} className="text-primary opacity-60 relative z-10" />
        </div>

        {/* Completed Revenue */}
        <div className="bg-secondary/10 border border-secondary/30 p-6 rounded-2xl text-on-surface shadow-[0_0_20px_rgba(152,208,218,0.15)] flex justify-between items-start relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 blur-[50px] -mr-10 -mt-10 rounded-full pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-2 font-mono">
              Completed Revenue
            </p>
            <p className="text-3xl sm:text-4xl font-extrabold text-on-surface font-display tracking-tight">LKR {completedRevenue.toLocaleString()}</p>
            <p className="text-secondary/70 text-xs mt-2 font-medium">From closed deals</p>
          </div>
          <CircleCheckBig size={36} className="text-secondary opacity-60 relative z-10" />
        </div>

        {/* Invoice Aging & Receivables Exposure (Item 15) */}
        <div 
          onClick={() => setActiveTab("invoices")}
          className="bg-surface-container border border-outline-variant p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] cursor-pointer hover:border-primary/40 transition-all"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">
              Receivables Aging
            </span>
            <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1">
              View Invoices <ArrowUpRight size={10} />
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-surface-container-low rounded-xl border border-outline-variant/40">
              <span className="text-[8px] font-bold uppercase text-emerald-400">0–30 Days</span>
              <p className="text-xs font-bold font-mono text-on-surface mt-0.5">LKR {invoiceAging.current.amount.toLocaleString()}</p>
              <span className="text-[8px] text-on-surface-variant">{invoiceAging.current.count} inv</span>
            </div>
            <div className="p-2 bg-surface-container-low rounded-xl border border-outline-variant/40">
              <span className="text-[8px] font-bold uppercase text-cyan-400">31–60 Days</span>
              <p className="text-xs font-bold font-mono text-on-surface mt-0.5">LKR {invoiceAging.thirtyToSixty.amount.toLocaleString()}</p>
              <span className="text-[8px] text-on-surface-variant">{invoiceAging.thirtyToSixty.count} inv</span>
            </div>
            <div className="p-2 bg-surface-container-low rounded-xl border border-outline-variant/40">
              <span className="text-[8px] font-bold uppercase text-amber-400">61–90 Days</span>
              <p className="text-xs font-bold font-mono text-on-surface mt-0.5">LKR {invoiceAging.sixtyToNinety.amount.toLocaleString()}</p>
              <span className="text-[8px] text-on-surface-variant">{invoiceAging.sixtyToNinety.count} inv</span>
            </div>
            <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/30">
              <span className="text-[8px] font-bold uppercase text-rose-400">90d+ Overdue</span>
              <p className="text-xs font-bold font-mono text-rose-400 mt-0.5">LKR {invoiceAging.overNinety.amount.toLocaleString()}</p>
              <span className="text-[8px] text-rose-400/80">{invoiceAging.overNinety.count} inv</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trends Chart */}
      <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)]">
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
          <div>
            <h3 className="font-bold text-on-surface text-sm">Monthly Sales & Production Trends</h3>
            <p className="text-[10px] text-on-surface-variant mt-1">Real-time revenue vs volume aggregated directly from live billing and shop fabrication logs.</p>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `LKR ${value / 1000}k`} dx={-10} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={10} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value, name) => {
                  if (name === "Sales Revenue") return [`LKR ${value.toLocaleString()}`, name];
                  return [value, name];
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              <Bar yAxisId="left" dataKey="sales" name="Sales Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
              <Line yAxisId="right" type="monotone" dataKey="production" name="Production Volume" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline Progress Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leads Pipeline Progress */}
        <div
          className="bg-surface-container rounded-2xl border border-outline-variant p-5 shadow-[0_4px_20px_rgba(0,218,243,0.05)] cursor-pointer hover:border-blue-200 hover:shadow-[0_4px_25px_rgba(0,218,243,0.1)] transition-all"
          onClick={() => setActiveTab("leads")}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-on-surface text-sm flex items-center">
              <Target size={16} className="mr-2 text-primary" />
              Leads Pipeline
            </h3>
            <ArrowRight size={14} className="text-on-surface" />
          </div>
          <p className="text-[10px] text-on-surface-variant mb-1">
            {leads.filter((lead) => LEAD_STAGES.includes(lead.stage)).length} total leads
          </p>
          <PipelineBar
            stages={LEAD_STAGES}
            data={leads.filter((lead) => LEAD_STAGES.includes(lead.stage))}
            getStageColor={getLeadStageColor}
            onStageClick={() => setActiveTab("leads")}
          />
        </div>

        {/* Deals Pipeline Progress */}
        <div
          className="bg-surface-container rounded-2xl border border-outline-variant p-5 shadow-[0_4px_20px_rgba(0,218,243,0.05)] cursor-pointer hover:border-primary/30 hover:shadow-[0_4px_25px_rgba(0,218,243,0.1)] transition-all"
          onClick={() => setActiveTab("pipeline")}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-on-surface text-sm flex items-center">
              <Kanban size={16} className="mr-2 text-primary" />
              Deals Pipeline
            </h3>
            <ArrowRight size={14} className="text-on-surface" />
          </div>
          <p className="text-[10px] text-on-surface-variant mb-1">
            {leads.filter((lead) => DEAL_STAGES.includes(lead.stage)).length} total deals
          </p>
          <PipelineBar
            stages={DEAL_STAGES}
            data={leads.filter((lead) => DEAL_STAGES.includes(lead.stage))}
            getStageColor={getDealStageColor}
            onStageClick={() => setActiveTab("pipeline")}
          />
        </div>

        {/* Fab Pipeline Progress */}
        <div
          className="bg-surface-container rounded-2xl border border-outline-variant p-5 shadow-[0_4px_20px_rgba(0,218,243,0.05)] cursor-pointer hover:border-primary/30 hover:shadow-[0_4px_25px_rgba(0,218,243,0.1)] transition-all"
          onClick={() => setActiveTab("projects")}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-on-surface text-sm flex items-center">
              <Hammer size={16} className="mr-2 text-yellow-500" />
              Fabrication Works
            </h3>
            <ArrowRight size={14} className="text-on-surface" />
          </div>
          <p className="text-[10px] text-on-surface-variant mb-1">{projects.length} total jobs</p>
          <PipelineBar
            stages={PROJECT_STAGES}
            data={projects.map((proj) => ({ ...proj, stage: proj.status }))}
            getStageColor={getFabStatusColor}
            onStageClick={() => setActiveTab("projects")}
          />
        </div>
      </div>

      {/* Lists & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stale Leads Alert (Item 12) */}
          <div className="bg-surface-container rounded-2xl border border-rose-500/30 p-5 shadow-[0_4px_20px_rgba(244,63,94,0.05)]">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-outline-variant/40">
              <h3 className="font-bold text-on-surface text-sm flex items-center">
                <AlertTriangle size={15} className="mr-2 text-rose-400" />
                Stale Pipeline Leads ({staleLeads.length})
              </h3>
              <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded uppercase">
                ≥ 5 Days in Stage
              </span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
              {staleLeads.length === 0 ? (
                <p className="text-xs text-emerald-400 italic text-center py-6">
                  ✓ All leads actively moving! Zero pipeline bottlenecks.
                </p>
              ) : (
                staleLeads.slice(0, 5).map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => setActiveTab("leads")}
                    className="p-2.5 bg-surface-container-low hover:bg-surface-container-high rounded-xl border border-outline-variant/50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="font-bold text-xs text-on-surface">{lead.name || lead.company || lead.id}</span>
                      <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                        Stage: {lead.stage} · LKR {Number(lead.value || 0).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-[10px] font-black text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-lg flex-shrink-0">
                      {lead.daysInStage}d stuck
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Leads needing action */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] p-5">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-outline-variant/40">
              <h3 className="font-bold text-on-surface text-sm flex items-center">
                <CircleAlert size={14} className="mr-2 text-yellow-500" />
                Leads Needing Action
              </h3>
              <button
                onClick={() => setActiveTab("leads")}
                className="text-[10px] text-primary font-bold hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
              {leadsNeedingAction.length > 0 ? (
                leadsNeedingAction.map((lead) => (
                  <ActionItem
                    key={lead.id}
                    title={lead.company || lead.clientName}
                    subtitle={`Stage: ${lead.stage}`}
                    badge={lead.stage}
                    badgeColor={getLeadStageColor(lead.stage)}
                    onClick={() => setActiveTab("leads")}
                    actions={getActionsForItem(lead, "lead")}
                  />
                ))
              ) : (
                <p className="text-xs text-on-surface-variant italic text-center py-6">
                  No critical leads right now.
                </p>
              )}
            </div>
          </div>

          {/* Active Deals */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-on-surface text-sm flex items-center">
                <Kanban size={14} className="mr-2 text-primary" />
                Active Deals
              </h3>
              <button
                onClick={() => setActiveTab("pipeline")}
                className="text-[10px] text-primary font-bold hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-2">
              {activeDealsList.length > 0 ? (
                activeDealsList.map((deal) => (
                  <ActionItem
                    key={deal.id}
                    title={deal.company || deal.clientName}
                    subtitle={`LKR ${(deal.value || 0).toLocaleString()}`}
                    badge={deal.stage}
                    badgeColor={getDealStageColor(deal.stage)}
                    onClick={() => setActiveTab("pipeline")}
                    actions={getActionsForItem(deal, "lead")}
                  />
                ))
              ) : (
                <p className="text-xs text-on-surface-variant italic text-center py-6">No active deals.</p>
              )}
            </div>
          </div>

          {/* Fab Floor */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-on-surface text-sm flex items-center">
                <Hammer size={14} className="mr-2 text-yellow-500" />
                Fabrication Floor
              </h3>
              <button
                onClick={() => setActiveTab("projects")}
                className="text-[10px] text-yellow-500 font-bold hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-2">
              {ongoingFabList.length > 0 ? (
                ongoingFabList.map((project) => (
                  <ActionItem
                    key={project.jobNo}
                    title={project.jobNo}
                    subtitle={project.scope}
                    badge={project.status}
                    badgeColor={getFabStatusColor(project.status)}
                    onClick={() => setActiveTab("projects")}
                    actions={getActionsForItem(project, "project")}
                  />
                ))
              ) : (
                <p className="text-xs text-on-surface-variant italic text-center py-6">
                  No active fabrication jobs.
                </p>
              )}
            </div>
          </div>

          {/* Logistics Queue */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-on-surface text-sm flex items-center">
                <Truck size={14} className="mr-2 text-error" />
                Logistics Queue
              </h3>
              <button
                onClick={() => setActiveTab("logistics")}
                className="text-[10px] text-error font-bold hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-2">
              {logisticsQueue.length > 0 ? (
                logisticsQueue.map((job) => (
                  <ActionItem
                    key={job.id}
                    title={job.customer || job.location}
                    subtitle={`${job.type}: ${job.subType}`}
                    badge={job.status}
                    badgeColor={
                      job.status === "In Transit"
                        ? "bg-primary/20 text-primary"
                        : job.status === "Pending"
                        ? "bg-yellow-500/20 text-primary"
                        : "bg-secondary/20 text-secondary"
                    }
                    onClick={() => setActiveTab("logistics")}
                    actions={getActionsForItem(job, "logistics")}
                  />
                ))
              ) : (
                <p className="text-xs text-on-surface-variant italic text-center py-6">
                  No pending logistics.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Controls (Quick Actions & Strategic Advice) */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] p-5">
            <h3 className="font-bold text-on-surface text-sm mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab("leads")}
                className="w-full flex items-center p-3 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary font-bold transition-colors text-sm"
              >
                <Target size={16} className="mr-3" /> New Lead
              </button>
              <button
                onClick={() => setActiveTab("projects")}
                className="w-full flex items-center p-3 bg-primary/10 hover:bg-yellow-500/20 rounded-xl text-primary font-bold transition-colors text-sm"
              >
                <Hammer size={16} className="mr-3" /> New Fab Job
              </button>
              <button
                onClick={() => setActiveTab("logistics")}
                className="w-full flex items-center p-3 bg-error/20 hover:bg-error/30 rounded-xl text-error font-bold transition-colors text-sm"
              >
                <Truck size={16} className="mr-3" /> New Pickup/Delivery
              </button>
              <button
                onClick={() => setActiveTab("customers")}
                className="w-full flex items-center p-3 bg-surface-container-low hover:bg-surface-container rounded-xl text-on-surface font-bold transition-colors text-sm"
              >
                <User size={16} className="mr-3" /> Add Customer
              </button>
              <button
                onClick={() => setActiveTab("calculator")}
                className="w-full flex items-center p-3 bg-secondary/10 hover:bg-secondary/20 rounded-xl text-secondary font-bold transition-colors text-sm"
              >
                <Calculator size={16} className="mr-3" /> Cost Calculator
              </button>
            </div>
          </div>

          {/* AI Strategic Advice */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] p-5 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="font-bold text-on-surface text-sm mb-2 flex items-center">
                <Sparkles size={14} className="mr-1.5 text-primary" />
                AI Business Insight
              </h3>
              <p className="text-xs text-on-surface-variant italic leading-relaxed">
                Receive customized operational advice from Gemini based on your live pipeline data.
              </p>
            </div>
            {insight && (
              <div className="mb-4 p-3 bg-primary/10/50 rounded-xl text-xs text-on-surface border border-indigo-50 leading-relaxed font-semibold">
                {insight}
              </div>
            )}
            <button
              onClick={fetchAIInsight}
              disabled={loadingInsight}
              className="w-full py-3 bg-primary text-on-primary hover:bg-primary/90 rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(0,218,243,0.3)] transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:bg-primary/50 disabled:shadow-none"
            >
              {loadingInsight ? (
                <>
                  <Loader size={14} className="animate-spin mr-2" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} className="mr-2" /> Ask Gemini
                </>
              )}
            </button>
          </div>

          {/* Business Overview Stats */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] p-5">
            <h3 className="font-bold text-on-surface text-sm mb-4">Business Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-xs text-on-surface-variant font-medium flex items-center">
                  <Users size={12} className="mr-2 text-on-surface-variant" />
                  Total Customers
                </span>
                <span className="text-sm font-extrabold text-on-surface">{customers.length}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-xs text-on-surface-variant font-medium flex items-center">
                  <User size={12} className="mr-2 text-on-surface-variant" />
                  Partners
                </span>
                <span className="text-sm font-extrabold text-on-surface">{partners.length}</span>
              </div>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_4px_20px_rgba(0,218,243,0.05)] p-5">
            <h3 className="font-bold text-on-surface text-sm mb-4 flex items-center">
              <Clock size={14} className="mr-2 text-on-surface-variant" />
              Recent Activity
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
              {auditLogs.length > 0 ? (
                auditLogs
                  .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
                  .slice(0, 10)
                  .map((log, idx) => (
                    <div key={log._firestoreId || idx} className="flex flex-col border-b border-outline-variant/30 pb-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-primary uppercase">{log.action}</span>
                        <span className="text-[9px] text-on-surface-variant">{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : 'Just now'}</span>
                      </div>
                      <p className="text-xs text-on-surface mt-0.5 line-clamp-2">
                         <span className="font-bold">{log.userName}:</span> {log.details}
                      </p>
                    </div>
                  ))
              ) : (
                <p className="text-xs text-on-surface-variant italic text-center">No recent activity.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
