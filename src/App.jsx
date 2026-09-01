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
  Sun,
  Moon,
  Handshake,
} from "lucide-react";
import { initAuth, logout, emailLogin, emailRegister, db } from "./services/firebase";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, onSnapshot } from "firebase/firestore";
import { subscribeToCollection, addDocument, updateDocument, COLLECTIONS } from "./services/firestoreSync";
import { toast } from "./utils/toast";
import { UserAvatar } from "./components/common/ui";

// Components
const Dashboard = React.lazy(() => import("./components/dashboard/Dashboard"));
const Leads = React.lazy(() => import("./components/crm/Leads"));
const Deals = React.lazy(() => import("./components/crm/Deals"));
const Invoices = React.lazy(() => import("./components/crm/Invoices"));
const Customers = React.lazy(() => import("./components/crm/Customers"));
const Partners = React.lazy(() => import("./components/crm/Partners"));
const FabricationWorks = React.lazy(() => import("./components/operations/FabricationWorks"));
const Logistics = React.lazy(() => import("./components/operations/Logistics"));
const CostCalculator = React.lazy(() => import("./components/tools/CostCalculator"));
const Messages = React.lazy(() => import("./components/tools/Messages"));
const AdminPanel = React.lazy(() => import("./components/admin/AdminPanel"));
import Login from "./components/auth/Login";
const NotificationsView = React.lazy(() => import("./components/dashboard/NotificationsView"));
const AgentDatabase = React.lazy(() => import("./components/admin/AgentDatabase"));
const UserProfile = React.lazy(() => import("./components/common/UserProfile"));

import { usePermissions } from "./context/PermissionsContext";
import { MessagingProvider, useMessaging } from "./context/MessagingContext";
import FloatingMessageToast from "./components/common/FloatingMessageToast";
import MiniChatDrawer from "./components/tools/MiniChatDrawer";

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
import { logActivity } from "./services/auditLog";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import LoadingSpinner from "./components/common/LoadingSpinner";


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
const NavLink = ({ icon: Icon, label, id, activeTab, setActiveTab, onClick, badge, collapsed, onNavigate }) => {
  const isActive = activeTab === id;
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setActiveTab(id);
    }
    if (onNavigate) onNavigate();
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center rounded-xl transition-all duration-200 relative group min-h-[44px] ${
        collapsed ? "justify-center p-3" : "px-4 py-2.5"
      } ${
        isActive
          ? "bg-primary/10 text-primary border border-primary/30 font-bold"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      }`}
    >
      <div className="flex-shrink-0 relative">
        <Icon size={18} className={isActive ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface"} />
        {/* Badge when collapsed */}
        <div className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-on-error text-[8px] font-bold transition-opacity duration-300 ${collapsed && badge > 0 ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          {badge > 9 ? "9+" : badge}
        </div>
      </div>
      
      <div className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${collapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-3 flex-1"}`}>
        <span className="font-medium text-xs truncate flex-1 text-left">{label}</span>
        
        {/* Badge when expanded */}
        {badge > 0 && (
          <span className="ml-2 inline-flex items-center justify-center w-4 h-4 bg-error text-on-error text-[9px] font-black rounded-full">
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

// Real-Time Messages Badge NavLink
const MessagesNavLink = ({ activeTab, setActiveTab, collapsed, onNavigate }) => {
  const { totalUnreadCount } = useMessaging();
  return (
    <NavLink
      icon={MessageSquare}
      label="Messages"
      id="messages"
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      badge={totalUnreadCount}
      collapsed={collapsed}
      onNavigate={onNavigate}
    />
  );
};

function App() {
  const { canAccess } = usePermissions();
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
  const [currentUser, setCurrentUser] = useState(null);

  // Approved User List
  const [users, setUsers] = useState([]);

  // Pending User Registration requests
  const [pendingUsers, setPendingUsers] = useState([]);

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

  // Theme Management (Item 21: Full Light / Dark Mode)
  const [theme, setTheme] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('ptf_theme') || 'dark' : 'dark';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('ptf_theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const [activeTabRaw, setActiveTabRaw] = useState("dashboard");
  const activeTab = activeTabRaw;
  const setActiveTab = (tabId) => {
    setActiveTabRaw(tabId);
    setSidebarCollapsed(true);
    setMobileMenuOpen(false);
  };

  // Route Protection for Partner Role (5 Modules Only)
  useEffect(() => {
    if (currentUser?.role === 'Partner') {
      const allowedTabs = ['dashboard', 'notifications', 'partners', 'profile'];
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('partners');
      }
    }
  }, [currentUser, activeTab]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Core CRM / Ops States
  const [customers, setCustomers] = useState(defaultCustomers);
  const [partners, setPartners] = useState(defaultPartners);
  const [projects, setProjects] = useState(defaultProjects);
  const [logisticsJobs, setLogisticsJobs] = useState(defaultLogistics);
  const [leads, setLeads] = useState(defaultLeads);
  const [invoices, setInvoices] = useState(defaultInvoices);
  const [quotations, setQuotations] = useState([]);

  // Subscribe to Firestore collections
  useEffect(() => {
    if (!currentUser?.isApproved) return;

    const unsubCustomers = subscribeToCollection(COLLECTIONS.CUSTOMERS, setCustomers);
    const unsubPartners = subscribeToCollection(COLLECTIONS.PARTNERS, setPartners);
    const unsubProjects = subscribeToCollection(COLLECTIONS.PROJECTS, setProjects);
    const unsubLogistics = subscribeToCollection(COLLECTIONS.LOGISTICS, setLogisticsJobs);
    const unsubLeads = subscribeToCollection(COLLECTIONS.LEADS, setLeads);
    const unsubInvoices = subscribeToCollection(COLLECTIONS.INVOICES, setInvoices);
    const unsubQuotations = subscribeToCollection(COLLECTIONS.QUOTATIONS, setQuotations);

    return () => {
      unsubCustomers();
      unsubPartners();
      unsubProjects();
      unsubLogistics();
      unsubLeads();
      unsubInvoices();
      unsubQuotations();
    };
  }, [currentUser]);

  // Invoices Firestore Sync Handlers
  const handleSaveInvoice = async (invoiceData) => {
    try {
      const docId = invoiceData.id || `INV-${String(Date.now()).slice(-6)}`;
      const cleanInvoice = {
        ...invoiceData,
        id: docId,
        amount: Number(invoiceData.amount) || 0,
        totalValue: Number(invoiceData.totalValue || invoiceData.amount) || 0,
        createdAt: invoiceData.createdAt || new Date().toISOString(),
        status: invoiceData.status || 'Unpaid',
        type: invoiceData.type || 'Advance',
        customerName: invoiceData.customerName || 'Direct Customer',
        company: invoiceData.company || '',
        date: invoiceData.date || new Date().toISOString().split('T')[0],
        // Add dueDate: 7 days from creation (for overdue reminder tracking)
        dueDate: invoiceData.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      };
      
      // Save directly to Firestore
      await addDocument(COLLECTIONS.INVOICES, cleanInvoice, docId);
      
      // Optimistic local state update
      setInvoices(prev => {
        const existingIdx = prev.findIndex(inv => inv.id === docId || inv._firestoreId === docId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { _firestoreId: docId, ...cleanInvoice };
          return updated;
        }
        return [{ _firestoreId: docId, ...cleanInvoice }, ...prev];
      });

      // Audit log for invoice creation (Item 8)
      await logActivity(
        currentUser?.email || 'unknown',
        currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown',
        'INVOICE_CREATED',
        'Invoices',
        `Invoice ${docId} created for ${cleanInvoice.customerName}. Amount: LKR ${cleanInvoice.amount} (${cleanInvoice.type}). Due: ${cleanInvoice.dueDate}`
      );

      toast.success(`Invoice ${docId} synchronized with Firestore database!`);
    } catch (err) {
      console.error("Failed to save invoice to Firestore:", err);
      toast.error("Failed to save invoice to database: " + err.message);
    }
  };

  const handleMarkLeadInvoicePaid = async (leadId) => {
    if (!leadId) return;
    try {
      // 1. Find and update any related invoice(s)
      const relatedInvoices = invoices.filter(inv => inv.leadId === leadId);
      setInvoices(prev => prev.map(inv => 
        inv.leadId === leadId ? { ...inv, status: 'Paid' } : inv
      ));

      for (const inv of relatedInvoices) {
        if (inv.status !== 'Paid') {
          const invDocId = inv._firestoreId || inv.id;
          await updateDocument(COLLECTIONS.INVOICES, invDocId, { status: 'Paid' });
        }
      }

      // 2. Update the lead in Firestore and locally
      const targetLead = leads.find(l => l.id === leadId || l._firestoreId === leadId);
      if (targetLead) {
        const leadDocId = targetLead._firestoreId || targetLead.id;
        const newStage = targetLead.stage === '75% Invoice Submitted' ? 'Received' : targetLead.stage;
        
        // Check if full 100% payment is complete
        const isPartnerReferral = Boolean(targetLead.partnerId || targetLead.partnerName || targetLead.source === 'Referral');
        const sqFt = Number(targetLead.totalSqFt || targetLead.sqFt || (targetLead.pricingMetadata?.costSalesAmount ? (targetLead.pricingMetadata.costSalesAmount / 53.5) : 0));
        let commRate = Number(targetLead.commissionRate || 53.5);
        if (commRate > 0 && commRate <= 1) commRate = 53.5;
        const dealVal = Number(targetLead.value || 0);
        const commAmount = targetLead.pricingMetadata?.costSalesAmount 
          ? Number(targetLead.pricingMetadata.costSalesAmount) 
          : (sqFt > 0 ? sqFt * commRate : (dealVal / 850) * commRate);

        const updatedLeadPayload = {
          invoicePaid: true,
          stage: newStage,
          ...(isPartnerReferral ? { referralStatus: 'Eligible for Payout' } : {})
        };

        setLeads(prev => prev.map(lead => (lead.id === leadId || lead._firestoreId === leadId) ? { ...lead, ...updatedLeadPayload } : lead));
        await updateDocument(COLLECTIONS.LEADS, leadDocId, updatedLeadPayload);

        // 3. Emit notification for partner commission eligibility
        if (isPartnerReferral) {
          const notif = {
            id: `notif_comm_${Date.now()}`,
            title: 'Commission Eligible: Full Payment Cleared',
            message: `100% payment cleared for client ${targetLead.name || 'Referred Client'} (Deal ${targetLead.id}). Commission of LKR ${commAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} is now eligible for month-end payout!`,
            date: new Date().toISOString(),
            type: 'commission',
            partnerId: targetLead.partnerId || '',
          };
          setNotificationsList(prev => [notif, ...prev]);
        }
      }

      toast.success("Payment recorded and synchronized across Leads & Invoices!");
    } catch (err) {
      console.error("Error syncing paid status to lead/invoices:", err);
      toast.error("Failed to update payment status: " + err.message);
    }
  };

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
    // Listen to users and pendingUsers from Firestore (Moved to separate useEffect)    // Initialize Firebase Auth
    const unsubAuth = initAuth(
      async (user, token) => {
        setIsFirebaseReady(true);
        if (token) setWorkspaceToken(token);
        
        const emailKey = user.email ? user.email.trim().toLowerCase() : '';
        try {
          console.log("1. Fetching users doc for:", emailKey);
          const userDoc = await getDoc(doc(db, "users", emailKey));
          console.log("1. Result:", userDoc.exists());
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Auto-sync Google photoURL if user profile doesn't have a photo but Google Auth provides one
            if (!userData.photoURL && user.photoURL) {
              userData.photoURL = user.photoURL;
              setDoc(doc(db, "users", emailKey), { photoURL: user.photoURL }, { merge: true }).catch(console.warn);
            }
            if (user.photoURL && (userData.role === 'Partner' || userData.partnerId)) {
              const pMatch = partners.find(p => p.email?.toLowerCase() === emailKey || p.partnerId === userData.partnerId);
              if (pMatch && !pMatch.photoURL) {
                const pDocId = pMatch._firestoreId || pMatch.id || pMatch.partnerId;
                updateDocument(COLLECTIONS.PARTNERS, pDocId, { photoURL: user.photoURL }).catch(console.warn);
              }
            }
            if (userData.isApproved || userData.status === 'Active' || userData.status === undefined) {
              setCurrentUser({ ...userData, isApproved: true });
            } else {
              logout();
              setLoginError("Your account has been disabled or deactivated.");
            }
          } else {
            console.log("2. Fetching pendingUsers doc for:", emailKey);
            const pendingDoc = await getDoc(doc(db, "pendingUsers", emailKey));
            console.log("2. Result:", pendingDoc.exists());
            
            if (pendingDoc.exists()) {
              logout();
              setLoginError("Your account is pending admin approval.");
            } else {
              console.log("3. User not found, checking admin conditions");
              const isAdminEmail = emailKey === "madhukagamage6@gmail.com" || emailKey === "madhukagamage@gmail.com";
              
              if (token || isAdminEmail) {
                console.log("4. Creating new admin user profile");
                const newUser = {
                  identifier: emailKey,
                  password: "",
                  name: user.displayName || emailKey,
                  role: isAdminEmail ? "Admin" : "Customer",
                  isApproved: true,
                  status: 'Active',
                  photoURL: user.photoURL || '',
                };
                await setDoc(doc(db, "users", emailKey), newUser);
                console.log("5. Created successfully");
                setCurrentUser(newUser);
              } else {
                console.log("4. Creating pendingUser profile");
                const pendingUser = {
                  identifier: emailKey,
                  password: "",
                  name: user.displayName || emailKey,
                  role: "Customer",
                  status: 'Pending',
                };
                await setDoc(doc(db, "pendingUsers", emailKey), pendingUser);
                console.log("5. Created pending successfully");
                logActivity(emailKey, user.displayName || emailKey, 'REGISTER', 'Auth', 'New user registered and is pending approval.');
                logout();
                setLoginError("Account pending admin approval. Please wait for an administrator to approve your account.");
              }
            }
          }
        } catch(error) {
          console.error("Error at step!", error);
          logout();
          setLoginError("Database access denied: " + error.message);
        }
      },
      () => {
        setIsFirebaseReady(true);
        setWorkspaceToken(null);
        setCurrentUser(null);
      }
    );
    
    return () => {
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    let unsubUsers;
    let unsubPending;

    if (currentUser?.isApproved) {
      // All approved users need the full user list to use the Messaging feature.
      // Firestore rules already allow all authenticated users to read /users/*.
      unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        const u = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          u.push(data);
          if (currentUser?.identifier && data.identifier === currentUser.identifier) {
            setCurrentUser(prev => {
              if (!prev) return data;
              if (
                prev.photoURL !== data.photoURL || 
                prev.role !== data.role || 
                prev.name !== data.name ||
                prev.selectedPreset !== data.selectedPreset
              ) {
                return { ...prev, ...data };
              }
              return prev;
            });
          }
        });
        setUsers(u);
      });
    }

    if (currentUser?.role === 'Admin' || currentUser?.role === 'admin') {
      // Pending users are Admin-only
      unsubPending = onSnapshot(collection(db, "pendingUsers"), (snapshot) => {
        const pu = [];
        snapshot.forEach(doc => pu.push(doc.data()));
        setPendingUsers(pu);
      });
    }

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubPending) unsubPending();
    };
  }, [currentUser]);

  // localStorage sync hooks removed in favor of Firestore subscriptions

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
    
    try {
      await emailLogin(username, password);
      logActivity(username, username, 'LOGIN', 'Auth', 'User logged in successfully.');
      setLoginError("");
    } catch (err) {
      setLoginError("Invalid credentials or Firebase error: " + err.message);
    }
  };

  const handleRegister = async (regData) => {
    try {
      // Create user in Firebase Auth (throws if already exists)
      await emailRegister(regData.identifier, regData.password);
      
      // At this point, the user is authenticated and onAuthStateChanged will fire.
      // We explicitly overwrite any basic pendingUser document created by initAuth
      // with our complete registration data including requested role and mobile.
      const completeRegData = { ...regData };
      delete completeRegData.password; // Don't store plaintext password
      
      await setDoc(doc(db, "pendingUsers", regData.identifier), completeRegData);
      
      logActivity(regData.identifier, regData.name, 'REGISTER', 'Auth', 'User requested access via registration form.');
      setRegisterSuccess("Registration submitted successfully. Please wait for admin approval.");
      setLoginError("");
      
      await logout(); // Sign out immediately since they are pending approval
    } catch (err) {
      if (err.message.includes("email-already-in-use")) {
        setLoginError("User already exists. Please log in.");
      } else {
        setLoginError(err.message);
      }
    }
  };

  const approvePending = async (regData, customRole) => {
    try {
      const finalRole = customRole || regData.role || 'Partner';
      const approvedUser = { 
        ...regData, 
        role: finalRole, 
        isApproved: true,
        status: 'Active',
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser?.identifier || 'Admin',
      };
      await setDoc(doc(db, "users", regData.identifier), approvedUser);
      await deleteDoc(doc(db, "pendingUsers", regData.identifier));

      // Auto-Sync: If role is Partner, automatically provision in partners collection
      if (finalRole === 'Partner') {
        const nextId = partners.length > 0 ? Math.max(...partners.map(p => p.id || 0)) + 1 : 1;
        const partnerCode = `P-${1000 + nextId}`;
        const newPartnerRecord = {
          id: nextId,
          partnerId: partnerCode,
          name: regData.name,
          email: regData.identifier,
          phone: regData.mobile || regData.contactNumber || '',
          type: regData.specialty ? 'Custom Workshop / Artisan' : 'Agency',
          commissionRate: 53.5,
          totalSqFt: 0,
          paid: 0,
          pending: 0,
          status: 'Active',
          createdAt: new Date().toISOString(),
        };
        await addDocument(COLLECTIONS.PARTNERS, newPartnerRecord, partnerCode);
        setPartners(prev => [...prev.filter(p => p.partnerId !== partnerCode), newPartnerRecord]);
      }

      // Auto-Sync: If role is Business Client, automatically provision in customers collection
      if (finalRole === 'Business Client') {
        const newCustomerRecord = {
          nic: regData.identifier,
          name: regData.name,
          businessName: regData.company || regData.name,
          type: 'Business',
          phone: regData.mobile || regData.contactNumber || '',
          email: regData.identifier,
          status: 'Active',
          createdAt: new Date().toISOString(),
        };
        await addDocument(COLLECTIONS.CUSTOMERS, newCustomerRecord, regData.identifier);
        setCustomers(prev => [...prev.filter(c => c.nic !== regData.identifier), newCustomerRecord]);
      }

      logActivity(currentUser.identifier, currentUser.name, 'APPROVE', 'Admin', `Approved user access for ${regData.identifier} as ${finalRole}`);
      return approvedUser;
    } catch (err) {
      console.error("Error approving user:", err);
      toast.error("Error approving user: " + err.message);
      throw err;
    }
  };

  const rejectPending = async (identifier) => {
    try {
      await deleteDoc(doc(db, "pendingUsers", identifier));
      logActivity(currentUser.identifier, currentUser.name, 'REJECT', 'Admin', `Rejected user access for ${identifier}`);
    } catch (err) {
      console.error("Error rejecting user:", err);
      toast.error("Error rejecting user: " + err.message);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    await logout();
    localStorage.removeItem("ptf_user");
    setCurrentUser(null);
    setWorkspaceToken(null);
  };

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => (u.identifier === updatedUser.identifier || u.email === updatedUser.identifier) ? { ...u, ...updatedUser } : u));
    try {
      localStorage.setItem("ptf_user", JSON.stringify(updatedUser));
    } catch (e) {
      console.warn("Could not cache user locally", e);
    }

    // Auto-propagate profile photo and contact updates to partners collection if user is Partner
    if (updatedUser.role === 'Partner' || updatedUser.partnerId) {
      const pMatch = partners.find(p => 
        p.email?.toLowerCase() === updatedUser.identifier?.toLowerCase() || 
        p.partnerId === updatedUser.partnerId || 
        p.id === updatedUser.partnerId
      );
      if (pMatch) {
        const pDocId = pMatch._firestoreId || pMatch.id || pMatch.partnerId;
        const pUpdates = {
          name: updatedUser.name || pMatch.name,
          phone: updatedUser.contactNumber || pMatch.phone,
          photoURL: updatedUser.photoURL || pMatch.photoURL || '',
          contactPerson: updatedUser.name || pMatch.contactPerson,
        };
        updateDocument(COLLECTIONS.PARTNERS, pDocId, pUpdates).catch(console.warn);
        setPartners(prev => prev.map(p => (p.id === pDocId || p.partnerId === pMatch.partnerId) ? { ...p, ...pUpdates } : p));
      }
    }
  };

  if (!isFirebaseReady) {
    return <LoadingSpinner fullScreen message="Initializing system..." />;
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
    <MessagingProvider
      currentUser={currentUser}
      users={users}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      <div className="flex h-[100dvh] bg-surface font-sans text-on-surface overflow-hidden relative">
      {/* Scroll Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-primary z-[100] shadow-[0_0_10px_rgba(0,218,243,0.8)] transition-[width] duration-75 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />
      
      {/* Grid background */}
      <div className="fixed inset-0 technical-grid opacity-15 pointer-events-none z-0"></div>
      
      {/* Mobile Top App Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface-container/90 backdrop-blur-xl text-on-surface z-40 flex justify-between items-center px-4 border-b border-outline-variant/40 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(true)} 
            className="p-2 -ml-1 text-on-surface-variant hover:text-on-surface bg-surface-container-high rounded-xl border border-outline-variant/60 active:scale-95 cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo-dark.png" alt="Print To Frame" className="h-7 w-auto object-contain" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Notification Bell */}
          <button
            onClick={() => { setActiveTab('notifications'); setUnreadNotificationsCount(0); }}
            className="p-2 text-on-surface-variant hover:text-on-surface bg-surface-container-high rounded-xl border border-outline-variant/60 relative active:scale-95 cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-on-error text-[9px] font-black rounded-full flex items-center justify-center">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Quick Theme Switch */}
          <button
            onClick={toggleTheme}
            className="p-2 text-on-surface-variant hover:text-on-surface bg-surface-container-high rounded-xl border border-outline-variant/60 active:scale-95 cursor-pointer"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-primary" />}
          </button>

          {/* User Avatar */}
          <div 
            onClick={() => setActiveTab('profile')}
            className="cursor-pointer active:scale-95"
            title="My Profile"
          >
            <UserAvatar user={currentUser} size="sm" showStatus status="active" />
          </div>
        </div>
      </div>

      {/* Mobile Drawer Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar / Slide-in Mobile Drawer Navigation */}
      <div
        onMouseEnter={() => setIsHoveringSidebar(true)}
        onMouseLeave={() => setIsHoveringSidebar(false)}
        className={`fixed inset-y-0 left-0 transform ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 transition-all duration-300 ease-in-out z-50 md:z-10 ${
          effectivelyCollapsed ? "w-20" : "w-72 md:w-64"
        } bg-surface-container/95 md:bg-surface-container/60 backdrop-blur-2xl md:backdrop-blur-md text-on-surface flex flex-col h-[100dvh] md:h-full border-r border-outline-variant/30 shadow-2xl md:shadow-none`}
      >
        {/* Mobile Drawer Top Header (Close Button) */}
        <div className="flex md:hidden h-16 shrink-0 justify-between items-center px-4 border-b border-outline-variant/40">
          <img src="/logo-dark.png" alt="Print To Frame" className="h-7 w-auto object-contain" />
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-on-surface-variant hover:text-on-surface bg-surface-container-high rounded-xl border border-outline-variant/60 active:scale-95 cursor-pointer"
            aria-label="Close Navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Desktop Logo Header */}
        <div className={`hidden md:flex h-20 md:h-28 shrink-0 justify-center items-center relative ${effectivelyCollapsed ? "px-2" : "px-6"} [@media(max-height:500px)]:h-16`}>
          {effectivelyCollapsed ? (
            <img src="/logo-dark.png" alt="Print To Frame" className="w-14 h-auto object-contain" />
          ) : (
            <img src="/logo-dark.png" alt="Print To Frame" className="w-32 md:w-48 h-auto object-contain [@media(max-height:500px)]:w-24" />
          )}
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto sidebar-scroll overflow-x-hidden pt-4 md:pt-0 pb-20 md:pb-0 ${effectivelyCollapsed ? "px-2" : "px-3 md:px-4"}`}>
          {currentUser?.role === 'Partner' ? (
            <div className="space-y-1">
              <NavLink icon={LayoutDashboard} label="Dashboard" id="dashboard" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />
              <NavLink
                icon={Bell} label="Notifications" id="notifications" activeTab={activeTab}
                setActiveTab={(id) => { setActiveTab(id); setUnreadNotificationsCount(0); }}
                badge={unreadNotificationsCount} collapsed={effectivelyCollapsed}
                onNavigate={() => setMobileMenuOpen(false)}
              />
              <NavLink icon={Handshake} label="Partners" id="partners" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />
              <NavLink icon={User} label="My Profile" id="profile" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />
              <NavLink
                icon={LogOut}
                label="Sign Out"
                id="logout"
                onClick={handleSignOut}
                activeTab={activeTab}
                collapsed={effectivelyCollapsed}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
          ) : (
            <>
              {/* Overview Group */}
              {(canAccess(currentUser?.role, 'dashboard') || canAccess(currentUser?.role, 'notifications')) && (
                <NavGroup title="Overview" isOpen={navGroupsOpen.overview} onToggle={() => toggleGroup("overview")} collapsed={effectivelyCollapsed}>
                  {canAccess(currentUser?.role, 'dashboard') && (
                    <NavLink icon={LayoutDashboard} label="Dashboard" id="dashboard" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />
                  )}
                  {canAccess(currentUser?.role, 'notifications') && (
                    <NavLink
                      icon={Bell} label="Notifications" id="notifications" activeTab={activeTab}
                      setActiveTab={(id) => { setActiveTab(id); setUnreadNotificationsCount(0); }}
                      badge={unreadNotificationsCount} collapsed={effectivelyCollapsed}
                      onNavigate={() => setMobileMenuOpen(false)}
                    />
                  )}
                </NavGroup>
              )}

              {/* CRM Group */}
              {(canAccess(currentUser?.role, 'leads') || canAccess(currentUser?.role, 'pipeline')) && (
                <NavGroup title="CRM" isOpen={navGroupsOpen.crm} onToggle={() => toggleGroup("crm")} collapsed={effectivelyCollapsed}>
                  {canAccess(currentUser?.role, 'leads') && <NavLink icon={Target} label="Leads" id="leads" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />}
                  {canAccess(currentUser?.role, 'pipeline') && <NavLink icon={Kanban} label="Deals" id="pipeline" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />}
                </NavGroup>
              )}

              {/* Databases Group */}
              {(canAccess(currentUser?.role, 'customers') || canAccess(currentUser?.role, 'agents') || canAccess(currentUser?.role, 'partners') || canAccess(currentUser?.role, 'invoices')) && (
                <NavGroup title="Databases" isOpen={navGroupsOpen.databases} onToggle={() => toggleGroup("databases")} collapsed={effectivelyCollapsed}>
                  {canAccess(currentUser?.role, 'customers') && <NavLink icon={User} label="Customers" id="customers" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />}
                  {canAccess(currentUser?.role, 'agents') && <NavLink icon={Users} label="User Management" id="agents" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />}
                  {canAccess(currentUser?.role, 'partners') && <NavLink icon={Building} label="Partners" id="partners" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />}
                  {canAccess(currentUser?.role, 'invoices') && <NavLink icon={FileText} label="Invoices" id="invoices" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />}
                </NavGroup>
              )}

              {/* Operations Group */}
              {(canAccess(currentUser?.role, 'projects') || canAccess(currentUser?.role, 'logistics')) && (
                <NavGroup title="Operations" isOpen={navGroupsOpen.ops} onToggle={() => toggleGroup("ops")} collapsed={effectivelyCollapsed}>
                  {canAccess(currentUser?.role, 'projects') && <NavLink icon={Hammer} label="Fabrication Works" id="projects" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />}
                  {canAccess(currentUser?.role, 'logistics') && <NavLink icon={Truck} label="Logistics" id="logistics" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />}
                </NavGroup>
              )}

              {/* Tools Group */}
              {(canAccess(currentUser?.role, 'calculator') || canAccess(currentUser?.role, 'messages')) && (
                <NavGroup title="Tools" isOpen={navGroupsOpen.tools} onToggle={() => toggleGroup("tools")} collapsed={effectivelyCollapsed}>
                  {canAccess(currentUser?.role, 'calculator') && <NavLink icon={Calculator} label="Cost Calculator" id="calculator" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />}
                  {canAccess(currentUser?.role, 'messages') && (
                    <MessagesNavLink
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      collapsed={effectivelyCollapsed}
                      onNavigate={() => setMobileMenuOpen(false)}
                    />
                  )}
                </NavGroup>
              )}

              {/* System & Profile Group */}
              <NavGroup title="Settings" isOpen={navGroupsOpen.system} onToggle={() => toggleGroup("system")} collapsed={effectivelyCollapsed}>
                <NavLink icon={User} label="My Profile" id="profile" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />
                {canAccess(currentUser?.role, 'admin') && (
                  <NavLink icon={Shield} label="System Overview" id="admin" activeTab={activeTab} setActiveTab={setActiveTab} collapsed={effectivelyCollapsed} onNavigate={() => setMobileMenuOpen(false)} />
                )}
                <NavLink
                  icon={LogOut}
                  label="Sign Out"
                  id="logout"
                  onClick={handleSignOut}
                  activeTab={activeTab}
                  collapsed={effectivelyCollapsed}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </NavGroup>
            </>
          )}
        </nav>
        
        {/* User Session profile and Theme Switcher */}
        <div className={`text-[10px] text-on-surface-variant border-t border-outline-variant/30 transition-all duration-300 ${effectivelyCollapsed ? "p-3 flex flex-col items-center space-y-3" : "p-4 md:p-5 [@media(max-height:500px)]:p-2 space-y-3"}`}>
          {effectivelyCollapsed ? (
            <>
              {/* Compact Profile Avatar */}
              <div 
                onClick={() => setActiveTab('profile')} 
                className="relative group cursor-pointer"
                title="View & Edit My Profile"
              >
                <UserAvatar user={currentUser} size="md" showStatus status="active" />
                {/* Floating Profile Info Tooltip */}
                <div className="absolute left-full ml-3 bottom-0 px-3 py-2 bg-surface-container-highest text-on-surface text-xs rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 border border-outline-variant/50">
                  <p className="font-bold">{currentUser.name || "Unknown User"}</p>
                  <p className="text-primary font-bold uppercase tracking-tighter text-[9px] opacity-80 mt-0.5">
                    {currentUser.role || "No Role"} • Click to edit profile
                  </p>
                </div>
              </div>

              {/* Compact Theme Toggle Button (Item 21) */}
              <button
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                className="w-10 h-10 rounded-xl bg-surface-container-high text-on-surface hover:bg-outline-variant flex items-center justify-center transition-all duration-200 cursor-pointer"
              >
                {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-primary" />}
              </button>
            </>
          ) : (
            <>
              <div 
                onClick={() => setActiveTab('profile')}
                className="flex items-center space-x-3 bg-surface-container hover:bg-surface-container-high p-2.5 rounded-2xl ring-1 ring-outline-variant/50 hover:ring-primary/50 transition-all cursor-pointer group"
                title="Click to view and manage your profile"
              >
                <UserAvatar user={currentUser} size="md" showStatus status="active" />
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-bold truncate group-hover:text-primary transition-colors text-xs">{currentUser.name || "Unknown User"}</p>
                  <p className="text-primary font-medium uppercase tracking-tighter text-[8px] opacity-80">
                    {currentUser.role || "No Role"} • Profile
                  </p>
                </div>
              </div>

              {/* Expanded Theme Switcher (Item 21) */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-outline-variant/60 hover:border-primary/40 text-on-surface text-xs font-bold transition-all cursor-pointer"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-primary" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-mono">{theme}</span>
              </button>

              <div className="[@media(max-height:500px)]:hidden text-center pt-1 border-t border-outline-variant/20">
                <p className="font-bold text-[10px] text-on-surface-variant">Print To Frame Pvt Ltd</p>
                <p className="text-[9px] text-on-surface-variant/60">Kadawatha, Sri Lanka</p>
              </div>
            </>
          )}
        </div>
      </div>

      <Toaster position="bottom-right" richColors duration={3000} />
      <FloatingMessageToast setActiveTab={setActiveTab} />
      <MiniChatDrawer currentUser={currentUser} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main
        className="flex-1 overflow-y-auto pt-16 md:pt-0 bg-transparent relative z-10 custom-scrollbar"
        onScroll={handleMainScroll}
        onClick={() => {
          if (!sidebarCollapsed) {
            setSidebarCollapsed(true);
          }
        }}
      >
        <div className="max-w-7xl mx-auto p-3 sm:p-5 md:p-8 lg:p-10 relative min-h-full pb-24 md:pb-20">
          <ErrorBoundary>
            <React.Suspense fallback={<LoadingSpinner message="Loading module..." />}>
            {activeTab === "dashboard" && canAccess(currentUser?.role, 'dashboard') && (
              <Dashboard
                currentUser={currentUser}
                setActiveTab={setActiveTab}
                projects={projects}
                logisticsJobs={logisticsJobs}
                customers={customers}
                partners={partners}
                leads={leads}
                invoices={invoices}
                setLeads={setLeads}
                setProjects={setProjects}
                setLogisticsJobs={setLogisticsJobs}
              />
            )}

          {activeTab === "notifications" && canAccess(currentUser?.role, 'notifications') && (
            <NotificationsView
              notifications={notificationsList}
              setNotifications={setNotificationsList}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "leads" && canAccess(currentUser?.role, 'leads') && (
            <Leads
              leads={leads}
              setLeads={setLeads}
              logisticsJobs={logisticsJobs}
              setLogisticsJobs={setLogisticsJobs}
              setProjects={setProjects}
              currentUser={currentUser}
              onSaveInvoice={handleSaveInvoice}
              customers={customers}
              setCustomers={setCustomers}
              partners={partners}
              quotations={quotations}
              setQuotations={setQuotations}
              onMarkInvoicePaid={handleMarkLeadInvoicePaid}
            />
          )}

          {activeTab === "pipeline" && canAccess(currentUser?.role, 'pipeline') && (
            <Deals
              leads={leads}
              setLeads={setLeads}
              setProjects={setProjects}
              logisticsJobs={logisticsJobs}
              setLogisticsJobs={setLogisticsJobs}
              invoices={invoices}
              currentUser={currentUser}
              partners={partners}
              setPartners={setPartners}
              customers={customers}
              setCustomers={setCustomers}
              quotations={quotations}
              onSaveInvoice={handleSaveInvoice}
              onMarkInvoicePaid={handleMarkLeadInvoicePaid}
            />
          )}

          {activeTab === "invoices" && canAccess(currentUser?.role, 'invoices') && (
            <Invoices 
              invoices={invoices} 
              setInvoices={setInvoices} 
              onMarkPaid={handleMarkLeadInvoicePaid}
              currentUser={currentUser}
            />
          )}

          {activeTab === "customers" && canAccess(currentUser?.role, 'customers') && (
            <Customers customers={customers} setCustomers={setCustomers} dataStore={dataStore} currentUser={currentUser} />
          )}

          {activeTab === "partners" && canAccess(currentUser?.role, 'partners') && (
            <Partners
              partners={partners}
              setPartners={setPartners}
              leads={leads}
              setLeads={setLeads}
              invoices={invoices}
              projects={projects}
              users={users}
              setUsers={setUsers}
              dataStore={dataStore}
              currentUser={currentUser}
            />
          )}

          {activeTab === "agents" && canAccess(currentUser?.role, 'agents') && (
            <AgentDatabase 
              users={users}
              setUsers={setUsers}
              pendingUsers={pendingUsers}
              setPendingUsers={setPendingUsers}
              currentUser={currentUser}
              onApprove={approvePending}
              onReject={rejectPending}
              partners={partners}
              setPartners={setPartners}
              customers={customers}
              setCustomers={setCustomers}
              dataStore={dataStore}
            />
          )}

          {activeTab === "projects" && canAccess(currentUser?.role, 'projects') && (
            <FabricationWorks
              projects={projects}
              setProjects={setProjects}
              customers={customers}
              partners={partners}
              currentUser={currentUser}
              onSaveInvoice={handleSaveInvoice}
            />
          )}

          {activeTab === "logistics" && canAccess(currentUser?.role, 'logistics') && (
            <Logistics jobs={logisticsJobs} setJobs={setLogisticsJobs} currentUser={currentUser} />
          )}

          {activeTab === "calculator" && canAccess(currentUser?.role, 'calculator') && <CostCalculator />}

          {activeTab === "messages" && canAccess(currentUser?.role, 'messages') && (
            <Messages users={users} currentUser={currentUser} />
          )}

          {activeTab === "admin" && canAccess(currentUser?.role, 'admin') && (
            <AdminPanel
              dataStore={dataStore}
            />
          )}

          {activeTab === "profile" && (
            <UserProfile
              currentUser={currentUser}
              onUpdateUser={handleUpdateUser}
              onSignOut={handleSignOut}
              setActiveTab={setActiveTab}
            />
          )}

          {!canAccess(currentUser?.role, activeTab) && (
            <div className="h-full flex items-center justify-center font-bold text-on-surface-variant">
              You do not have permission to access this module.
            </div>
          )}
          </React.Suspense>

          {/* Footer */}
          <footer className="absolute bottom-6 left-10 right-10 flex justify-between items-center text-[10px] text-on-surface-variant border-t border-outline-variant/30 pt-4">
            <p>© 2024 Print To Frame Pvt Ltd. Sri Lanka Specialist Framing.</p>
            <div className="flex space-x-4">
              <span>print2frame.xyz</span>
              <span>Contact: +94 711 141 9027</span>
            </div>
          </footer>
          </ErrorBoundary>
        </div>
      </main>
    </div>
    </MessagingProvider>
  );
}

export default App;
