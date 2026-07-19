import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Target,
  Kanban,
  FileText,
  User,
  Users,
  Map,
  Hammer,
  Truck,
  Calculator,
  MessageSquare,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Info,
  CircleCheckBig,
  Building,
  Bell,
} from "lucide-react";
import { initAuth, logout, emailLogin, emailRegister } from "./services/firebase";

// Components
import Dashboard from "./components/dashboard/Dashboard";
import Leads from "./components/crm/Leads";
import Deals from "./components/crm/Deals";
import Invoices from "./components/crm/Invoices";
import Customers from "./components/crm/Customers";
import Partners from "./components/crm/Partners";
import ExecutionPlan from "./components/operations/ExecutionPlan";
import FabricationWorks from "./components/operations/FabricationWorks";
import Logistics from "./components/operations/Logistics";
import CostCalculator from "./components/tools/CostCalculator";
import Messages from "./components/tools/Messages";
import AdminPanel from "./components/admin/AdminPanel";
import Login from "./components/auth/Login";
import NotificationsView from "./components/dashboard/NotificationsView";

import AgentDatabase from "./components/admin/AgentDatabase";

// Defaults
import {
  defaultLeads,
  defaultCustomers,
  defaultPartners,
  defaultProjects,
  defaultLogistics,
  defaultInvoices,
} from "./services/dataDefaults";
import { Toaster } from "sonner";
import { subscribeToNotifications, emitNotification } from "./utils/events";

export let showToast = (t) => {
  emitNotification(t);
};

export function oT() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

export function uT(t, e = {}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(t, e);
  }
}

export let triggerBrowserNotification = (t, e) => {
  uT(t, e);
};

// Nav Link Component
const NavLink = ({ icon: Icon, label, id, activeTab, setActiveTab, onClick, badge, collapsed }) => {
  const isActive = activeTab === id;
  return (
    <button
      onClick={onClick || (() => setActiveTab(id))}
      className={`w-full flex items-center rounded-lg transition-all duration-300 relative group ${
        collapsed ? "justify-center p-3" : "px-4 py-3"
      } ${
        isActive
          ? "bg-primary/10 text-primary border border-primary/30"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      }`}
    >
      <div className="flex-shrink-0 relative">
        <Icon size={20} className={isActive ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface"} />
        {/* Badge when collapsed */}
        <div className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-on-error text-[8px] font-bold transition-opacity duration-300 ${collapsed && badge > 0 ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          {badge > 9 ? "9+" : badge}
        </div>
      </div>
      
      <div className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${collapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-3 flex-1"}`}>
        <span className="font-medium text-sm truncate flex-1 text-left">{label}</span>
        
        {/* Badge when expanded */}
        {badge > 0 && (
          <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-error text-on-error text-xs font-bold rounded-full">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>

      {/* Tooltip when collapsed */}
      <div className={`absolute left-full ml-3 px-2.5 py-1.5 bg-surface-container-highest text-on-surface text-xs font-bold rounded-lg shadow-xl opacity-0 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 border border-outline-variant/50 ${collapsed ? "group-hover:opacity-100" : ""}`}>
        {label}
      </div>
    </button>
  );
};

// Collapsible Menu Group
const NavGroup = ({ title, children, isOpen, onToggle, collapsed }) => {
  return (
    <div className={`transition-all duration-300 ${collapsed ? "py-2 border-b border-outline-variant/10" : "mb-4"}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-widest hover:text-on-surface transition-all duration-300 overflow-hidden whitespace-nowrap ${collapsed ? "h-0 opacity-0 px-0" : "px-4 py-2 opacity-100 h-auto"}`}
        tabIndex={collapsed ? -1 : 0}
      >
        <span>{title}</span>
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      <div className={`space-y-1 transition-all duration-300 ${collapsed ? "" : (isOpen ? "mt-1" : "h-0 overflow-hidden opacity-0")}`}>
        {children}
      </div>
    </div>
  );
};

function App() {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [workspaceToken, setWorkspaceToken] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleMainScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Prevent division by zero if there's no scrolling
    if (scrollHeight <= clientHeight) {
      setScrollProgress(0);
      return;
    }
    const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setScrollProgress(progress);
  };

  // Global Notifications State
  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    const unsub = subscribeToNotifications((item) => {
      setNotificationsList((prev) => [
        { ...item, date: new Date().toISOString(), read: false },
        ...prev,
      ]);
      setUnreadNotificationsCount((prev) => prev + 1);
    });
    return () => unsub();
  }, []);

  // Current User Session
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("ptf_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Approved User List
  const [users, setUsers] = useState(() => {
    const defaultUsers = [
      {
        identifier: "admin",
        password: "M",
        name: "Madhuka Gamage",
        role: "Admin",
        isApproved: true,
      },
      {
        identifier: "madhukagamage@gmail.com",
        password: "Madhuka007",
        name: "Madhuka Gamage",
        role: "Admin",
        isApproved: true,
      },
      {
        identifier: "sales",
        password: "S",
        name: "Sales User",
        role: "Sales",
        isApproved: true,
      },
    ];
    const saved = localStorage.getItem("ptf_users");
    let parsedUsers = saved ? JSON.parse(saved) : defaultUsers;
    
    // Ensure the hardcoded admin is always present and approved
    const adminEmail = "madhukagamage@gmail.com";
    const existingAdminIndex = parsedUsers.findIndex(u => u.identifier === adminEmail);
    if (existingAdminIndex >= 0) {
      parsedUsers[existingAdminIndex] = {
        ...parsedUsers[existingAdminIndex],
        role: "Admin",
        isApproved: true,
        password: "Madhuka007"
      };
    } else {
      parsedUsers.push(defaultUsers.find(u => u.identifier === adminEmail));
    }
    
    return parsedUsers;
  });

  // Pending User Registration requests
  const [pendingUsers, setPendingUsers] = useState(() => {
    const saved = localStorage.getItem("ptf_pending");
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.filter(u => u.identifier !== "madhukagamage@gmail.com");
  });

  const [loginError, setLoginError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const isIframePreview = typeof window !== 'undefined' && window.self !== window.top;


  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectivelyCollapsed = !isMobile && sidebarCollapsed && !isHoveringSidebar;

  const [activeTabRaw, setActiveTabRaw] = useState("dashboard");
  const activeTab = activeTabRaw;
  const setActiveTab = (tabId) => {
    setActiveTabRaw(tabId);
    setSidebarCollapsed(true);
    setMobileMenuOpen(false);
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Core CRM / Ops States
  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem("ptf_customers");
    return saved ? JSON.parse(saved) : defaultCustomers;
  });

  const [partners, setPartners] = useState(() => {
    const saved = localStorage.getItem("ptf_partners");
    return saved ? JSON.parse(saved) : defaultPartners;
  });

  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem("ptf_projects");
    return saved ? JSON.parse(saved) : defaultProjects;
  });

  const [logisticsJobs, setLogisticsJobs] = useState(() => {
    const saved = localStorage.getItem("ptf_logistics");
    return saved ? JSON.parse(saved) : defaultLogistics;
  });

  const [leads, setLeads] = useState(() => {
    const saved = localStorage.getItem("ptf_leads");
    return saved ? JSON.parse(saved) : defaultLeads;
  });

  const [invoices, setInvoices] = useState(() => {
    const saved = localStorage.getItem("ptf_invoices");
    return saved ? JSON.parse(saved) : defaultInvoices;
  });

  // Collapsible Menu Folders
  const [navGroupsOpen, setNavGroupsOpen] = useState({
    overview: true,
    crm: true,
    databases: true,
    ops: true,
    tools: true,
    system: true,
  });

  useEffect(() => {
    oT(); // Request notification permissions
    
    // Initialize Firebase Auth
    const unsub = initAuth(
      (user, token) => {
        setIsFirebaseReady(true);
        if (token) setWorkspaceToken(token);
        
        // Find or create user
        const matched = users.find(u => u.identifier === user.email);
        const isPending = pendingUsers.find(u => u.identifier === user.email);

        if (matched) {
          if (matched.isApproved) {
            setCurrentUser(matched);
          } else {
            logout();
          }
        } else if (isPending) {
          logout();
          setLoginError("Your account is pending admin approval.");
        } else {
          // New user from Google Sign In
          if (token) {
            const newUser = {
              identifier: user.email,
              password: "",
              name: user.displayName || user.email,
              role: "Customer",
              isApproved: true,
            };
            setUsers(prev => [...prev, newUser]);
            setCurrentUser(newUser);
          } else {
            logout();
            setLoginError("User record not found. Please register.");
          }
        }
      },
      () => {
        setIsFirebaseReady(true);
        setWorkspaceToken(null);
      }
    );
    return () => unsub();
  }, [users, pendingUsers]);

  // Sync users database updates
  useEffect(() => {
    const hardcodedUsers = [
      {
        identifier: "admin",
        password: "M",
        name: "Madhuka Gamage",
        role: "Admin",
        isApproved: true,
      },
      {
        identifier: "sales",
        password: "S",
        name: "Sales User",
        role: "Sales",
        isApproved: true,
      },
    ];

    setUsers((prev) => {
      const merged = [...prev];
      let changed = false;
      hardcodedUsers.forEach((hUser) => {
        const idx = merged.findIndex((u) => u.identifier === hUser.identifier);
        if (idx === -1) {
          merged.push(hUser);
          changed = true;
        } else if (hUser.identifier === "sales" && merged[idx].password !== hUser.password) {
          merged[idx] = { ...merged[idx], password: hUser.password };
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem("ptf_users", JSON.stringify(merged));
      }
      return merged;
    });
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem("ptf_user", JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("ptf_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("ptf_pending", JSON.stringify(pendingUsers));
  }, [pendingUsers]);

  useEffect(() => {
    localStorage.setItem("ptf_customers", JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem("ptf_partners", JSON.stringify(partners));
  }, [partners]);

  useEffect(() => {
    localStorage.setItem("ptf_projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem("ptf_logistics", JSON.stringify(logisticsJobs));
  }, [logisticsJobs]);

  useEffect(() => {
    localStorage.setItem("ptf_leads", JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem("ptf_invoices", JSON.stringify(invoices));
  }, [invoices]);

  const toggleGroup = (key) => {
    setNavGroupsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (activeTab === "messages") {
      setUnreadMessages(0);
    }
  }, [activeTab]);

  const dataStore = {
    customers,
    projects,
    partners,
    logisticsJobs,
    leads,
    invoices,
  };

  const handleLogin = async (username, password) => {
    setLoginError("");
    setRegisterSuccess("");
    
    // For local hardcoded admins
    if (username === "admin" || username === "sales" || username === "madhukagamage@gmail.com") {
      const matched = users.find((u) => u.identifier === username && u.password === password);
      if (matched) {
        setCurrentUser(matched);
        setActiveTab("dashboard");
        return;
      }
    }

    try {
      const matched = users.find((u) => u.identifier === username);
      const isPending = pendingUsers.find((u) => u.identifier === username);

      if (isPending) {
        setLoginError("Your account is pending admin approval.");
        return;
      }

      if (!matched) {
        setLoginError("Account not found. Please register first.");
        return;
      }

      await emailLogin(username, password);
      setLoginError("");
    } catch (err) {
      setLoginError("Invalid credentials or Firebase error: " + err.message);
    }
  };

  const handleRegister = async (regData) => {
    try {
      const exists = users.find((u) => u.identifier === regData.identifier);
      const pendingExists = pendingUsers.find(
        (u) => u.identifier === regData.identifier
      );

      if (exists || pendingExists) {
        setLoginError("User already exists.");
        return;
      }

      await emailRegister(regData.identifier, regData.password);
      
      setPendingUsers([...pendingUsers, regData]);
      setRegisterSuccess("Registration submitted successfully. Please wait for admin approval.");
      setLoginError("");
      
      await logout(); // Sign out immediately since they are pending approval
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const approvePending = (regData) => {
    setUsers([...users, { ...regData, isApproved: true }]);
    setPendingUsers(pendingUsers.filter((u) => u.identifier !== regData.identifier));
  };

  const rejectPending = (identifier) => {
    setPendingUsers(pendingUsers.filter((u) => u.identifier !== identifier));
  };

  // Reset live datasets back to initial demo defaults
  const resetDemoData = () => {
    if (!window.confirm("Reset demo data to defaults? This will overwrite local data.")) {
      return;
    }
    const defaultAdmins = [
      {
        identifier: "admin",
        password: "M",
        name: "Madhuka Gamage",
        role: "Admin",
        isApproved: true,
      },
      {
        identifier: "sales",
        password: "S",
        name: "Sales User",
        role: "Sales",
        isApproved: true,
      },
    ];

    try {
      localStorage.setItem("ptf_users", JSON.stringify(defaultAdmins));
      localStorage.setItem("ptf_pending", JSON.stringify([]));
      localStorage.setItem("ptf_customers", JSON.stringify(defaultCustomers));
      localStorage.setItem("ptf_partners", JSON.stringify(defaultPartners));
      localStorage.setItem("ptf_projects", JSON.stringify(defaultProjects));
      localStorage.setItem("ptf_logistics", JSON.stringify(defaultLogistics));
      localStorage.setItem("ptf_leads", JSON.stringify(defaultLeads));
      localStorage.setItem("ptf_invoices", JSON.stringify(defaultInvoices));
    } catch (e) {
      console.error(e);
    }

    setUsers(defaultAdmins);
    setPendingUsers([]);
    setCustomers(defaultCustomers);
    setPartners(defaultPartners);
    setProjects(defaultProjects);
    setLogisticsJobs(defaultLogistics);
    setLeads(defaultLeads);
    setInvoices(defaultInvoices);
  };

  if (!isFirebaseReady) {
    return <div className="min-h-screen bg-surface flex items-center justify-center font-bold text-on-surface-variant font-mono tracking-widest uppercase">Initializing...</div>;
  }

  if (!currentUser) {
    return (
      <Login
        onLogin={handleLogin}
        onRegister={handleRegister}
        errorMsg={loginError}
        successMsg={registerSuccess}
      />
    );
  }

  return (
    <div className="flex h-[100dvh] bg-surface font-sans text-on-surface overflow-hidden relative">
      {/* Scroll Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-primary z-[100] shadow-[0_0_10px_rgba(0,218,243,0.8)] transition-[width] duration-75 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />
      
      {/* Grid background */}
      <div className="fixed inset-0 technical-grid opacity-15 pointer-events-none z-0"></div>
      
      {/* Mobile Header */}
      {!mobileMenuOpen && (
        <div className="md:hidden fixed top-0 w-full bg-surface-container/60 backdrop-blur-md text-on-surface z-50 flex justify-between items-center p-4 border-b border-outline-variant/30">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1 -ml-1">
            <Menu size={24} />
          </button>
          <div className="font-bold text-lg flex items-center">
            <img src="/logo-dark.png" alt="Print To Frame" className="h-8 w-auto" />
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-surface-container-highest/80 backdrop-blur-sm z-30" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div
        onMouseEnter={() => setIsHoveringSidebar(true)}
        onMouseLeave={() => setIsHoveringSidebar(false)}
        className={`fixed inset-y-0 left-0 transform ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 transition-all duration-300 ease-in-out z-40 md:z-10 ${
          effectivelyCollapsed ? "w-20" : "w-64"
        } bg-surface-container md:bg-surface-container/60 backdrop-blur-md text-on-surface flex flex-col h-[100dvh] md:h-full border-r border-outline-variant/30`}
      >
        <div className={`hidden md:flex h-20 md:h-28 shrink-0 justify-center items-center relative ${effectivelyCollapsed ? "px-2" : "px-6"} [@media(max-height:500px)]:h-16`}>
          {effectivelyCollapsed ? (
            <img src="/logo-dark.png" alt="Print To Frame" className="w-14 h-auto object-contain" />
          ) : (
            <img src="/logo-dark.png" alt="Print To Frame" className="w-32 md:w-48 h-auto object-contain [@media(max-height:500px)]:w-24" />
          )}
          
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto sidebar-scroll overflow-x-hidden pt-6 md:pt-0 pb-20 md:pb-0 ${effectivelyCollapsed ? "px-2" : "px-4"}`}>
          {/* Overview Group */}
          <NavGroup title="Overview" isOpen={navGroupsOpen.overview} onToggle={() => toggleGroup("overview")} collapsed={effectivelyCollapsed}>
            <NavLink
              icon={LayoutDashboard}
              label="Dashboard"
              id="dashboard"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              collapsed={effectivelyCollapsed}
            />
            <NavLink
              icon={Bell}
              label="Notifications"
              id="notifications"
              activeTab={activeTab}
              setActiveTab={(id) => {
                setActiveTab(id);
                setUnreadNotificationsCount(0);
              }}
              badge={unreadNotificationsCount}
              collapsed={effectivelyCollapsed}
            />
          </NavGroup>

          {/* CRM Group */}
          <NavGroup title="CRM" isOpen={navGroupsOpen.crm} onToggle={() => toggleGroup("crm")} collapsed={effectivelyCollapsed}>
            <NavLink icon={Target} label="Leads" id="leads" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} />
            <NavLink icon={Kanban} label="Deals" id="pipeline" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} />
          </NavGroup>

          {/* Databases Group */}
          <NavGroup title="Databases" isOpen={navGroupsOpen.databases} onToggle={() => toggleGroup("databases")} collapsed={effectivelyCollapsed}>
            <NavLink icon={User} label="Customer Database" id="customers" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} />
            <NavLink icon={Users} label="User Management" id="agents" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} />
            <NavLink icon={Building} label="Partner Database" id="partners" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} />
            <NavLink icon={FileText} label="Invoices Database" id="invoices" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} />
          </NavGroup>

          {/* Operations Group */}
          <NavGroup title="Operations" isOpen={navGroupsOpen.ops} onToggle={() => toggleGroup("ops")} collapsed={effectivelyCollapsed}>
            <NavLink icon={Map} label="Execution Plan" id="roadmap" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} />
            <NavLink icon={Hammer} label="Fabrication Works" id="projects" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} />
            <NavLink icon={Truck} label="Logistics" id="logistics" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} />
          </NavGroup>

          {/* Tools Group */}
          <NavGroup title="Tools" isOpen={navGroupsOpen.tools} onToggle={() => toggleGroup("tools")} collapsed={effectivelyCollapsed}>
            <NavLink icon={Calculator} label="Cost Calculator" id="calculator" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} />
            <NavLink
              icon={MessageSquare}
              label="Messages"
              id="messages"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              badge={unreadMessages}
              collapsed={effectivelyCollapsed}
            />
          </NavGroup>

          {/* System Group */}
          <NavGroup title="Settings" isOpen={navGroupsOpen.system} onToggle={() => toggleGroup("system")} collapsed={effectivelyCollapsed}>
            {currentUser.role === "Admin" && (
              <NavLink icon={Shield} label="System Overview" id="admin" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} />
            )}
            <NavLink
              icon={LogOut}
              label="Sign Out"
              id="logout"
              onClick={async () => {
                await logout();
                localStorage.removeItem("ptf_user");
                setCurrentUser(null);
                setWorkspaceToken(null);
              }}
              activeTab={activeTab}
              collapsed={effectivelyCollapsed}
            />
          </NavGroup>
        </nav>

        {/* Vertical Center Collapse Button (Mobile) */}
        {!isIframePreview && (
          <button
          onClick={(e) => {
            e.stopPropagation();
            if (isMobile) { setMobileMenuOpen(!mobileMenuOpen); } else { setSidebarCollapsed(!sidebarCollapsed); }
          }}
          className="flex md:hidden absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 rounded-r-md rounded-l-none bg-surface-container-highest border border-l-0 border-outline-variant items-center justify-center text-on-surface hover:text-primary hover:border-primary/50 shadow-lg transition-all duration-200 z-50 cursor-pointer"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isMobile ? (mobileMenuOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />) : (sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)}
        </button>
        )}
        
        {/* User Session profile and Reset button */}
        <div className={`text-[10px] text-on-surface-variant border-t border-outline-variant/30 transition-all duration-300 ${effectivelyCollapsed ? "p-3 flex flex-col items-center space-y-4" : "p-4 md:p-6 [@media(max-height:500px)]:p-2"}`}>
          {effectivelyCollapsed ? (
            <>
              {/* Compact Profile Avatar */}
              <div className="relative group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-bold text-primary text-sm uppercase shadow-[0_0_10px_rgba(0,218,243,0.2)]">
                  {currentUser.name?.charAt(0) || "U"}
                </div>
                {/* Floating Profile Info Tooltip */}
                <div className="absolute left-full ml-3 bottom-0 px-3 py-2 bg-surface-container-highest text-on-surface text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 border border-outline-variant/50">
                  <p className="font-bold">{currentUser.name || "Unknown User"}</p>
                  <p className="text-primary font-bold uppercase tracking-tighter text-[9px] opacity-80 mt-0.5">
                    {currentUser.role || "No Role"}
                  </p>
                </div>
              </div>

              {/* Compact Reset Button */}
              <button
                onClick={resetDemoData}
                title="Reset demo data"
                className="w-10 h-10 rounded-xl bg-surface-container-high text-on-surface hover:bg-outline-variant flex items-center justify-center transition-all duration-200 cursor-pointer"
              >
                <RefreshCw size={14} className="text-on-surface-variant" />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-3 mb-2 md:mb-4 bg-surface-container p-2 md:p-3 rounded-xl ring-1 ring-outline-variant/50 [@media(max-height:500px)]:mb-1">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-primary text-xs uppercase shadow-[0_0_10px_rgba(0,218,243,0.2)]">
                  {currentUser.name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-bold truncate">{currentUser.name || "Unknown User"}</p>
                  <p className="text-primary font-medium uppercase tracking-tighter text-[8px] opacity-80">
                    {currentUser.role || "No Role"}
                  </p>
                </div>
              </div>
              <div className="[@media(max-height:500px)]:hidden">
                <p className="font-bold mb-1">Print To Frame Pvt Ltd</p>
                <p>Kadawatha, Sri Lanka</p>
              </div>
              <div className="mt-3 [@media(max-height:500px)]:hidden">
                <button
                  onClick={resetDemoData}
                  className="w-full text-[11px] px-3 py-2 rounded bg-surface-container-high text-on-surface hover:bg-outline-variant font-bold transition-colors cursor-pointer"
                >
                  Reset demo data
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Toaster position="bottom-right" richColors duration={3000} />

      {/* Main Content Area */}
      <main
        className="flex-1 overflow-y-auto pt-20 md:pt-0 bg-transparent relative z-10"
        onScroll={handleMainScroll}
        onClick={() => {
          if (!sidebarCollapsed) {
            setSidebarCollapsed(true);
          }
        }}
      >
        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-10 relative min-h-full pb-20">
          {activeTab === "dashboard" && (
            <Dashboard
              setActiveTab={setActiveTab}
              projects={projects}
              logisticsJobs={logisticsJobs}
              customers={customers}
              partners={partners}
              leads={leads}
              setLeads={setLeads}
              setProjects={setProjects}
              setLogisticsJobs={setLogisticsJobs}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationsView
              notifications={notificationsList}
              setNotifications={setNotificationsList}
            />
          )}

          {activeTab === "leads" && (
            <Leads
              leads={leads}
              setLeads={setLeads}
              logisticsJobs={logisticsJobs}
              setLogisticsJobs={setLogisticsJobs}
              setProjects={setProjects}
              currentUser={currentUser}
              onSaveInvoice={(invoice) => setInvoices((prev) => [invoice, ...prev])}
              customers={customers}
              setCustomers={setCustomers}
              partners={partners}
              onMarkInvoicePaid={(leadId) => {
                if(leadId) {
                  setInvoices(prev => prev.map(inv => 
                    inv.leadId === leadId ? { ...inv, status: 'Paid' } : inv
                  ));
                }
              }}
            />
          )}

          {activeTab === "pipeline" && (
            <Deals
              leads={leads}
              setLeads={setLeads}
              setProjects={setProjects}
              currentUser={currentUser}
              partners={partners}
              setPartners={setPartners}
              customers={customers}
              setCustomers={setCustomers}
              onSaveInvoice={(invoice) => setInvoices((prev) => [invoice, ...prev])}
              onMarkInvoicePaid={(leadId) => {
                if(leadId) {
                  setInvoices(prev => prev.map(inv => 
                    inv.leadId === leadId ? { ...inv, status: 'Paid' } : inv
                  ));
                }
              }}
            />
          )}

          {activeTab === "invoices" && (
            <Invoices 
              invoices={invoices} 
              setInvoices={setInvoices} 
              onMarkPaid={(leadId) => {
                if(leadId) {
                  setLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, invoicePaid: true } : lead));
                }
              }}
            />
          )}

          {activeTab === "customers" && (
            <Customers customers={customers} setCustomers={setCustomers} dataStore={dataStore} currentUser={currentUser} />
          )}

          {activeTab === "partners" && (
            <Partners
              partners={partners}
              setPartners={setPartners}
              dataStore={dataStore}
              currentUser={currentUser}
            />
          )}

          {activeTab === "agents" && (
            <AgentDatabase 
              users={users}
              setUsers={setUsers}
              pendingUsers={pendingUsers}
              setPendingUsers={setPendingUsers}
              currentUser={currentUser}
            />
          )}

          {activeTab === "roadmap" && <ExecutionPlan />}

          {activeTab === "projects" && (
            <FabricationWorks
              projects={projects}
              setProjects={setProjects}
              customers={customers}
              partners={partners}
              currentUser={currentUser}
            />
          )}

          {activeTab === "logistics" && (
            <Logistics jobs={logisticsJobs} setJobs={setLogisticsJobs} currentUser={currentUser} />
          )}

          {activeTab === "calculator" && <CostCalculator />}

          {activeTab === "messages" && (
            <Messages users={users} currentUser={currentUser} onUnreadCountChange={setUnreadMessages} />
          )}

          {activeTab === "admin" && currentUser.role === "Admin" && (
            <AdminPanel
              dataStore={dataStore}
            />
          )}

          {/* Footer */}
          <footer className="absolute bottom-6 left-10 right-10 flex justify-between items-center text-[10px] text-on-surface-variant border-t border-outline-variant/30 pt-4">
            <p>© 2024 Print To Frame Pvt Ltd. Sri Lanka Specialist Framing.</p>
            <div className="flex space-x-4">
              <span>print2frame.xyz</span>
              <span>Contact: +94 711 141 9027</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
