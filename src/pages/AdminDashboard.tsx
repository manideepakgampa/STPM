import { useCallback, useEffect, useMemo, useState } from "react";
import TransportLoader from "@/components/TransportLoader";
import { usePageLoader } from "@/hooks/use-page-loader";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  approvePassApplication,
  createOperator,
  createPlan,
  createRoute,
  createService,
  createVehicle,
  deletePlan,
  deleteRoute,
  deleteService,
  deleteVehicle,
  deleteOperator,
  fetchAdminStats,
  fetchAdminUsers,
  fetchAllPasses,
  fetchAllRoutes,
  fetchNotifications,
  fetchPendingApplications,
  fetchServices,
  fetchVehicles,
  rejectPassApplication,
  sendRenewalAlert,
  sendAdminNotification,
} from "@/lib/api";
import { getAppState, resetAppState, subscribeToAppState } from "@/lib/app-state";
import type { Plan } from "@/lib/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Bus,
  CheckCircle2,
  Clock3,
  CreditCard,
  LayoutDashboard,
  Loader2,
  LogOut,
  Map,
  Menu,
  Megaphone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  Train,
  Truck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import UserDetailSheet from "@/components/admin/UserDetailSheet";
import OperatorDetailSheet from "@/components/admin/OperatorDetailSheet";

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "applications", label: "Applications", icon: CreditCard },
  { id: "renewals", label: "Renewals", icon: RefreshCw },
  { id: "plans", label: "Manage Plans", icon: CreditCard },
  { id: "routes", label: "Manage Routes", icon: Map },
  { id: "vehicles", label: "Manage Vehicles", icon: Bus },
  { id: "buses", label: "Manage Buses", icon: Truck },
  { id: "services", label: "Manage Services", icon: Settings2 },
  { id: "users", label: "Users", icon: Users },
  { id: "operatorsList", label: "Operators", icon: ShieldCheck },
  { id: "createOperator", label: "Create Operator", icon: UserPlus },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;

type TabId = (typeof tabs)[number]["id"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const phase = usePageLoader();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [passes, setPasses] = useState<any[]>([]);
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [allPlans, setAllPlans] = useState<{ student: Plan[]; employee: Plan[] }>({ student: [], employee: [] });
  const [loading, setLoading] = useState(true);
  const [busyApplicationId, setBusyApplicationId] = useState<string | null>(null);
  const [busyRenewalId, setBusyRenewalId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Operator creation form
  const [opForm, setOpForm] = useState({ fullName: "", email: "", mobile: "", password: "", assignedRouteId: "", vehicleId: "", vehicleCapacity: "50" });
  const [creatingOperator, setCreatingOperator] = useState(false);
  const [opSuccess, setOpSuccess] = useState<string | null>(null);
  const [opError, setOpError] = useState("");

  // Detail sheet state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);

  // Route form
  const [routeForm, setRouteForm] = useState({ name: "", from: "", to: "", type: "bus" as "bus" | "metro", distance: "", estimatedTime: "", fare: "" });
  // Vehicle form
  const [vehicleForm, setVehicleForm] = useState({ vehicleId: "", vehicleType: "bus" as "bus" | "metro", capacity: "50" });
  // Plan form
  const [planForm, setPlanForm] = useState({ name: "", duration: "", price: "", routeLimit: "", benefits: "", userType: "student" as "student" | "employee" });
  // Service form
  const [serviceForm, setServiceForm] = useState({ name: "", icon: "bus", description: "" });
  const [formMsg, setFormMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAdminData = useCallback(
    async (showLoader = false) => {
      if (!user || user.role !== "admin") return;
      if (showLoader) setLoading(true);

      const [nextStats, nextUsers, nextPasses, nextApplications, nextServices, nextNotifications, nextRoutes, nextVehicles] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAllPasses(),
        fetchPendingApplications(),
        fetchServices(),
        fetchNotifications(),
        fetchAllRoutes(),
        fetchVehicles(),
      ]);

      const state = getAppState();
      setAllPlans({ student: state.plans.student || [], employee: state.plans.employee || [] });
      setStats(nextStats);
      setUsers(nextUsers);
      setPasses(nextPasses);
      setPendingApplications(nextApplications);
      setServices(nextServices);
      setNotifications(nextNotifications);
      setRoutes(nextRoutes);
      setVehicles(nextVehicles);
      setLoading(false);
    },
    [user]
  );

  useEffect(() => {
    if (!user || user.role !== "admin") { navigate("/login"); return; }
    void loadAdminData(true);
    const unsubscribe = subscribeToAppState(() => void loadAdminData(false));
    return unsubscribe;
  }, [user, navigate, loadAdminData]);

  const expiringPasses = useMemo(() => passes.filter((pass) => {
    if (pass.status !== "active") return false;
    const diff = (new Date(pass.expiryDate).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 30;
  }), [passes]);

  const filteredUsers = useMemo(() => users.filter((e) => e.role === "user" && (e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toLowerCase().includes(searchQuery.toLowerCase()))), [users, searchQuery]);
  const filteredOperators = useMemo(() => users.filter((e) => e.role === "operator" && (e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toLowerCase().includes(searchQuery.toLowerCase()))), [users, searchQuery]);
  const filteredBuses = useMemo(() => vehicles.filter((v) => v.vehicleType === "bus"), [vehicles]);
  const operatorsMap = useMemo(() => getAppState().operators, [users, vehicles]);
  const selectedUserData = useMemo(() => selectedUserId ? users.find((u) => u.id === selectedUserId) ?? null : null, [selectedUserId, users]);
  const selectedOperatorData = useMemo(() => selectedOperatorId ? users.find((u) => u.id === selectedOperatorId) ?? null : null, [selectedOperatorId, users]);
  const selectedOperatorRecord = useMemo(() => selectedOperatorId ? operatorsMap[selectedOperatorId] ?? null : null, [selectedOperatorId, operatorsMap]);
  const filteredApplications = useMemo(() => pendingApplications.filter((e) => e.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || e.userId.toLowerCase().includes(searchQuery.toLowerCase())), [pendingApplications, searchQuery]);

  const handleApprove = async (applicationId: string) => { if (!user) return; setBusyApplicationId(applicationId); await approvePassApplication(applicationId, user.id); setBusyApplicationId(null); };
  const handleReject = async (applicationId: string) => { if (!user) return; setBusyApplicationId(applicationId); await rejectPassApplication(applicationId, user.id); setBusyApplicationId(null); };
  const handleRenewalAlert = async (passId: string) => { setBusyRenewalId(passId); await sendRenewalAlert(passId); setBusyRenewalId(null); };

  const handleCreateOperator = async () => {
    setOpError("");
    if (!opForm.fullName || !opForm.email || !opForm.password) { setOpError("Name, email, and password are required."); return; }
    setCreatingOperator(true);
    const result = await createOperator({ fullName: opForm.fullName, email: opForm.email, mobile: opForm.mobile, password: opForm.password, assignedRouteId: opForm.assignedRouteId || (routes[0]?.id ?? ""), vehicleId: opForm.vehicleId || `VEH-${Date.now().toString(36)}`, vehicleCapacity: parseInt(opForm.vehicleCapacity, 10) || 50 });
    setCreatingOperator(false);
    if (result.success) { setOpSuccess(result.operatorId!); setOpForm({ fullName: "", email: "", mobile: "", password: "", assignedRouteId: "", vehicleId: "", vehicleCapacity: "50" }); } else { setOpError(result.error || "Failed."); }
  };

  const flash = (type: "success" | "error", text: string) => { setFormMsg({ type, text }); setTimeout(() => setFormMsg(null), 3000); };

  const handleCreateRoute = async () => {
    if (!routeForm.name || !routeForm.from || !routeForm.to) { flash("error", "Name, from, to are required."); return; }
    setBusy(true);
    await createRoute({ name: routeForm.name, from: routeForm.from, to: routeForm.to, type: routeForm.type, distance: routeForm.distance || "0 km", estimatedTime: routeForm.estimatedTime || "0 min", fare: Number(routeForm.fare) || 0 });
    setRouteForm({ name: "", from: "", to: "", type: "bus", distance: "", estimatedTime: "", fare: "" });
    flash("success", "Route created!"); setBusy(false);
  };

  const handleCreateVehicle = async () => {
    if (!vehicleForm.vehicleId) { flash("error", "Vehicle ID is required."); return; }
    setBusy(true);
    const res = await createVehicle({ vehicleId: vehicleForm.vehicleId, vehicleType: vehicleForm.vehicleType, capacity: parseInt(vehicleForm.capacity, 10) || 50 });
    if (res.success) { setVehicleForm({ vehicleId: "", vehicleType: "bus", capacity: "50" }); flash("success", "Vehicle created!"); } else { flash("error", res.error || "Failed."); }
    setBusy(false);
  };

  const handleCreatePlan = async () => {
    if (!planForm.name || !planForm.duration || !planForm.price) { flash("error", "Name, duration, price are required."); return; }
    setBusy(true);
    await createPlan({ name: planForm.name, duration: planForm.duration, price: Number(planForm.price), routeLimit: Number(planForm.routeLimit) || -1, benefits: planForm.benefits.split(",").map((b) => b.trim()).filter(Boolean), userType: planForm.userType });
    setPlanForm({ name: "", duration: "", price: "", routeLimit: "", benefits: "", userType: "student" });
    flash("success", "Plan created!"); setBusy(false);
  };

  const handleCreateService = async () => {
    if (!serviceForm.name) { flash("error", "Service name is required."); return; }
    setBusy(true);
    await createService({ name: serviceForm.name, icon: serviceForm.icon, description: serviceForm.description });
    setServiceForm({ name: "", icon: "bus", description: "" });
    flash("success", "Service created!"); setBusy(false);
  };

  const handleResetData = () => { if (window.confirm("This will reset ALL data to empty state. Are you sure?")) { resetAppState(); window.location.reload(); } };
  const handleLogout = () => { logout(); navigate("/login"); };

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0 },
    { label: "Active Passes", value: stats?.activePasses ?? 0 },
    { label: "Pending Applications", value: stats?.pendingApplications ?? 0 },
    { label: "Revenue", value: `₹${stats?.monthlyRevenue ?? 0}` },
  ];

  if (loading) {
    return (
      <div className="min-h-screen gradient-dark p-6 space-y-6">
        <Skeleton className="h-20 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-28 w-full rounded-3xl" />))}
        </div>
      </div>
    );
  }

  const FormAlert = () => formMsg ? (
    <div className={`rounded-2xl border px-4 py-3 text-sm mb-4 ${formMsg.type === "success" ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>{formMsg.text}</div>
  ) : null;

  if (phase !== "hidden") return <TransportLoader fading={phase === "fading"} />;

  return (
    <div className="min-h-screen gradient-dark flex">
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
          <div>
            <p className="font-display text-xl font-bold text-gradient">Admin Control</p>
            <p className="text-xs text-muted-foreground mt-1">Full system management</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground"><XCircle className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${activeTab === tab.id ? "gradient-blue-orange text-primary-foreground glow-subtle" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button onClick={handleResetData} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-warning hover:bg-warning/10 transition-colors"><RotateCcw className="w-4 h-4" /> Reset All Data</button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-destructive hover:bg-destructive/10 transition-colors"><LogOut className="w-4 h-4" /> Logout</button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="glass sticky top-0 z-40 px-4 md:px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground"><Menu className="w-5 h-5" /></button>
            <div>
              <h1 className="font-display text-lg font-bold">{tabs.find((t) => t.id === activeTab)?.label}</h1>
              <p className="text-xs text-muted-foreground">All changes sync instantly across tabs.</p>
            </div>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search user or ID" className="pl-10 bg-surface-2 border-border" />
          </div>
        </header>

        <main className="p-4 md:p-6 space-y-6">
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {statCards.map((card) => (<div key={card.label} className="glass-card p-5 hover-lift"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{card.label}</p><p className="font-display text-3xl font-bold">{card.value}</p></div>))}
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <h2 className="font-display text-xl font-bold mb-4">Monthly Trends</h2>
                  {stats?.monthlyTrends?.length > 0 ? (
                    <div className="space-y-3">{stats.monthlyTrends.map((trend: any) => (
                      <div key={trend.month} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-3 flex items-center justify-between">
                        <span className="font-medium">{trend.month}</span>
                        <div className="text-right text-sm text-muted-foreground"><p>{trend.passes} passes</p><p>₹{trend.revenue}</p></div>
                      </div>
                    ))}</div>
                  ) : <p className="text-sm text-muted-foreground">No trend data yet.</p>}
                </div>
                <div className="glass-card p-6">
                  <h2 className="font-display text-xl font-bold mb-4">Live Pipeline</h2>
                  {pendingApplications.length > 0 ? (
                    <div className="space-y-3">{pendingApplications.slice(0, 5).map((app) => (
                      <div key={app.applicationId} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-3 flex items-center justify-between gap-3">
                        <div><p className="font-medium">{app.user?.fullName}</p><p className="text-xs text-muted-foreground">{app.type}</p></div>
                        <Badge className="bg-primary/10 text-primary border-primary/30">pending</Badge>
                      </div>
                    ))}</div>
                  ) : <p className="text-sm text-muted-foreground">No pending applications.</p>}
                </div>
              </div>
            </div>
          )}

          {/* APPLICATIONS */}
          {activeTab === "applications" && (
            <div className="glass-card p-6 animate-fade-in-up">
              <h2 className="font-display text-xl font-bold mb-4">Pending Applications</h2>
              <div className="space-y-3">
                {filteredApplications.length === 0 ? <p className="text-sm text-muted-foreground">No pending applications.</p> : filteredApplications.map((app) => (
                  <div key={app.applicationId} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div><p className="font-medium">{app.user?.fullName} · {app.userId}</p><p className="text-sm text-muted-foreground mt-1">{app.type} · ₹{app.plan?.price ?? 0}</p><p className="text-xs text-muted-foreground mt-1">Applied on {app.appliedAt}</p></div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleApprove(app.applicationId)} disabled={busyApplicationId === app.applicationId} className="gradient-blue-orange text-primary-foreground">
                        {busyApplicationId === app.applicationId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}Approve
                      </Button>
                      <Button onClick={() => handleReject(app.applicationId)} disabled={busyApplicationId === app.applicationId} variant="outline"><XCircle className="w-4 h-4 mr-2" /> Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RENEWALS */}
          {activeTab === "renewals" && (
            <div className="glass-card p-6 animate-fade-in-up">
              <h2 className="font-display text-xl font-bold mb-4">Expiring Passes</h2>
              <div className="space-y-3">
                {expiringPasses.length === 0 ? <p className="text-sm text-muted-foreground">No passes near expiry.</p> : expiringPasses.map((pass) => (
                  <div key={pass.passId} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div><p className="font-medium">{pass.user?.fullName} · {pass.passId}</p><p className="text-sm text-muted-foreground mt-1">{pass.type}</p><p className="text-xs text-warning mt-1">Expires on {pass.expiryDate}</p></div>
                    <Button onClick={() => handleRenewalAlert(pass.passId)} disabled={busyRenewalId === pass.passId} variant="outline">
                      {busyRenewalId === pass.passId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}Send Alert
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MANAGE PLANS */}
          {activeTab === "plans" && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="max-w-xl mx-auto glass-card p-6">
                <h2 className="font-display text-xl font-bold mb-4">Create New Plan</h2>
                <FormAlert />
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs mb-1.5 block">User Type</Label>
                    <select value={planForm.userType} onChange={(e) => setPlanForm({ ...planForm, userType: e.target.value as any })} className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground focus:outline-none">
                      <option value="student">Student</option>
                      <option value="employee">Employee</option>
                    </select>
                  </div>
                  <div><Label className="text-xs mb-1.5 block">Plan Name</Label><Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="Monthly Pass" className="bg-surface-2 border-border" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-xs mb-1.5 block">Duration (e.g. 30 Days)</Label><Input value={planForm.duration} onChange={(e) => setPlanForm({ ...planForm, duration: e.target.value })} placeholder="30 Days" className="bg-surface-2 border-border" /></div>
                    <div><Label className="text-xs mb-1.5 block">Price (₹)</Label><Input value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value.replace(/\D/g, "") })} placeholder="500" className="bg-surface-2 border-border" /></div>
                  </div>
                  <div><Label className="text-xs mb-1.5 block">Route Limit (-1 for unlimited)</Label><Input value={planForm.routeLimit} onChange={(e) => setPlanForm({ ...planForm, routeLimit: e.target.value })} placeholder="-1" className="bg-surface-2 border-border" /></div>
                  <div><Label className="text-xs mb-1.5 block">Benefits (comma-separated)</Label><Input value={planForm.benefits} onChange={(e) => setPlanForm({ ...planForm, benefits: e.target.value })} placeholder="Unlimited routes, All transport, 10% cashback" className="bg-surface-2 border-border" /></div>
                  <Button onClick={handleCreatePlan} disabled={busy} className="w-full gradient-blue-orange text-primary-foreground">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Create Plan</>}</Button>
                </div>
              </div>

              {(["student", "employee"] as const).map((type) => (
                <div key={type} className="glass-card p-6">
                  <h2 className="font-display text-lg font-bold mb-4 capitalize">{type} Plans</h2>
                  {(allPlans[type] || []).length === 0 ? <p className="text-sm text-muted-foreground">No {type} plans yet.</p> : (
                    <div className="space-y-3">{allPlans[type].map((plan) => (
                      <div key={plan.id} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{plan.name} <span className="text-xs text-muted-foreground ml-2">{plan.id}</span></p>
                          <p className="text-sm text-muted-foreground">{plan.duration} · ₹{plan.price} · {plan.routeLimit === -1 ? "Unlimited" : plan.routeLimit} routes</p>
                          <p className="text-xs text-muted-foreground mt-1">{plan.benefits.join(", ")}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={async () => { await deletePlan(plan.id, type); }} className="text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* MANAGE ROUTES */}
          {activeTab === "routes" && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="max-w-xl mx-auto glass-card p-6">
                <h2 className="font-display text-xl font-bold mb-4">Create New Route</h2>
                <FormAlert />
                <div className="space-y-4">
                  <div><Label className="text-xs mb-1.5 block">Route Name</Label><Input value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} placeholder="Route 42 - Downtown Express" className="bg-surface-2 border-border" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-xs mb-1.5 block">From</Label><Input value={routeForm.from} onChange={(e) => setRouteForm({ ...routeForm, from: e.target.value })} placeholder="Central Station" className="bg-surface-2 border-border" /></div>
                    <div><Label className="text-xs mb-1.5 block">To</Label><Input value={routeForm.to} onChange={(e) => setRouteForm({ ...routeForm, to: e.target.value })} placeholder="Airport Terminal" className="bg-surface-2 border-border" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs mb-1.5 block">Type</Label>
                      <select value={routeForm.type} onChange={(e) => setRouteForm({ ...routeForm, type: e.target.value as any })} className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground focus:outline-none">
                        <option value="bus">Bus</option><option value="metro">Metro</option>
                      </select>
                    </div>
                    <div><Label className="text-xs mb-1.5 block">Distance</Label><Input value={routeForm.distance} onChange={(e) => setRouteForm({ ...routeForm, distance: e.target.value })} placeholder="24 km" className="bg-surface-2 border-border" /></div>
                    <div><Label className="text-xs mb-1.5 block">Est. Time</Label><Input value={routeForm.estimatedTime} onChange={(e) => setRouteForm({ ...routeForm, estimatedTime: e.target.value })} placeholder="45 min" className="bg-surface-2 border-border" /></div>
                  </div>
                  <div><Label className="text-xs mb-1.5 block">Fare (₹)</Label><Input value={routeForm.fare} onChange={(e) => setRouteForm({ ...routeForm, fare: e.target.value.replace(/\D/g, "") })} placeholder="35" className="bg-surface-2 border-border" /></div>
                  <Button onClick={handleCreateRoute} disabled={busy} className="w-full gradient-blue-orange text-primary-foreground">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Create Route</>}</Button>
                </div>
              </div>
              <div className="glass-card p-6">
                <h2 className="font-display text-lg font-bold mb-4">Existing Routes ({routes.length})</h2>
                {routes.length === 0 ? <p className="text-sm text-muted-foreground">No routes yet. Create one above.</p> : (
                  <div className="space-y-3">{routes.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{r.name} <Badge variant="outline" className="ml-2">{r.type}</Badge></p>
                        <p className="text-sm text-muted-foreground">{r.from} → {r.to} · {r.distance} · {r.estimatedTime} · ₹{r.fare}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={async () => { await deleteRoute(r.id); }} className="text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}</div>
                )}
              </div>
            </div>
          )}

          {/* MANAGE VEHICLES */}
          {activeTab === "vehicles" && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="max-w-xl mx-auto glass-card p-6">
                <h2 className="font-display text-xl font-bold mb-4">Add New Vehicle</h2>
                <FormAlert />
                <div className="space-y-4">
                  <div><Label className="text-xs mb-1.5 block">Vehicle ID</Label><Input value={vehicleForm.vehicleId} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleId: e.target.value })} placeholder="BUS-042-A" className="bg-surface-2 border-border" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs mb-1.5 block">Type</Label>
                      <select value={vehicleForm.vehicleType} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value as any })} className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground focus:outline-none">
                        <option value="bus">Bus</option><option value="metro">Metro</option>
                      </select>
                    </div>
                    <div><Label className="text-xs mb-1.5 block">Capacity</Label><Input value={vehicleForm.capacity} onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value.replace(/\D/g, "") })} placeholder="50" className="bg-surface-2 border-border" /></div>
                  </div>
                  <Button onClick={handleCreateVehicle} disabled={busy} className="w-full gradient-blue-orange text-primary-foreground">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Add Vehicle</>}</Button>
                </div>
              </div>
              <div className="glass-card p-6">
                <h2 className="font-display text-lg font-bold mb-4">Fleet ({vehicles.length})</h2>
                {vehicles.length === 0 ? <p className="text-sm text-muted-foreground">No vehicles yet.</p> : (
                  <div className="space-y-3">{vehicles.map((v) => (
                    <div key={v.vehicleId} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{v.vehicleId} <Badge variant="outline" className="ml-2">{v.vehicleType}</Badge></p>
                        <p className="text-sm text-muted-foreground">Capacity: {v.capacity} · Current: {v.currentPassengers}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={async () => { await deleteVehicle(v.vehicleId); }} className="text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}</div>
                )}
              </div>
            </div>
          )}

          {/* MANAGE SERVICES */}
          {activeTab === "services" && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="max-w-xl mx-auto glass-card p-6">
                <h2 className="font-display text-xl font-bold mb-4">Create New Service</h2>
                <FormAlert />
                <div className="space-y-4">
                  <div><Label className="text-xs mb-1.5 block">Service Name</Label><Input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="City Buses" className="bg-surface-2 border-border" /></div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Icon</Label>
                    <select value={serviceForm.icon} onChange={(e) => setServiceForm({ ...serviceForm, icon: e.target.value })} className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground focus:outline-none">
                      <option value="bus">Bus</option><option value="metro">Metro</option><option value="map">Map</option><option value="train">Train</option>
                    </select>
                  </div>
                  <div><Label className="text-xs mb-1.5 block">Description</Label><Input value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} placeholder="Urban bus network" className="bg-surface-2 border-border" /></div>
                  <Button onClick={handleCreateService} disabled={busy} className="w-full gradient-blue-orange text-primary-foreground">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Create Service</>}</Button>
                </div>
              </div>
              <div className="glass-card p-6">
                <h2 className="font-display text-lg font-bold mb-4">Active Services ({services.length})</h2>
                {services.length === 0 ? <p className="text-sm text-muted-foreground">No services yet.</p> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{services.map((service) => (
                    <div key={service.id} className="glass-card p-5 hover-lift relative">
                      <Button variant="ghost" size="icon" onClick={async () => { await deleteService(service.id); }} className="absolute top-3 right-3 text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-display text-lg font-bold">{service.name}</h2>
                        <Badge className={service.status === "active" ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground"}>{service.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                      <p className="text-xs text-muted-foreground mt-3">{service.routes} routes · crowd {service.crowdLevel}</p>
                    </div>
                  ))}</div>
                )}
              </div>
            </div>
          )}

          {/* USERS (only role=user) */}
          {activeTab === "users" && (
            <div className="glass-card p-6 animate-fade-in-up">
              <h2 className="font-display text-xl font-bold mb-4">Registered Users</h2>
              <div className="space-y-3">
                {filteredUsers.length === 0 ? <p className="text-sm text-muted-foreground">No users registered yet.</p> : filteredUsers.map((entry) => (
                  <div key={entry.id} onClick={() => setSelectedUserId(entry.id)} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:border-primary/40 transition-colors">
                    <div><p className="font-medium">{entry.fullName}</p><p className="text-xs text-muted-foreground mt-1">{entry.id} · {entry.userType}</p></div>
                    <div className="flex flex-wrap gap-2 text-xs items-center">
                      <Badge variant="outline">Wallet ₹{entry.walletBalance}</Badge>
                      <Badge variant="outline">{entry.activePasses} active passes</Badge>
                      <Badge variant="outline">{entry.pendingApplications} pending</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPERATORS LIST */}
          {activeTab === "operatorsList" && (
            <div className="glass-card p-6 animate-fade-in-up">
              <h2 className="font-display text-xl font-bold mb-4">Operators ({filteredOperators.length})</h2>
              <div className="space-y-3">
                {filteredOperators.length === 0 ? <p className="text-sm text-muted-foreground">No operators created yet.</p> : filteredOperators.map((entry) => {
                  const opData = operatorsMap[entry.id];
                  return (
                    <div key={entry.id} onClick={() => setSelectedOperatorId(entry.id)} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:border-primary/40 transition-colors">
                      <div>
                        <p className="font-medium">{entry.fullName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{entry.id} · {entry.email}</p>
                        {opData && <p className="text-xs text-muted-foreground mt-0.5">Route: {opData.assignedRoute} · Vehicle: {opData.vehicleId}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs items-center">
                        <Badge className={entry.status === "active" ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground"}>{entry.status}</Badge>
                        {opData && <Badge variant="outline" className={
                          opData.crowdLevel === "high" ? "border-destructive/30 text-destructive" :
                          opData.crowdLevel === "moderate" ? "border-warning/30 text-warning" :
                          "border-success/30 text-success"
                        }>{opData.crowdLevel} crowd</Badge>}
                        <Button variant="ghost" size="icon" onClick={async (e) => { e.stopPropagation(); if (window.confirm(`Delete operator ${entry.fullName}?`)) await deleteOperator(entry.id); }} className="text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MANAGE BUSES */}
          {activeTab === "buses" && (
            <div className="glass-card p-6 animate-fade-in-up">
              <h2 className="font-display text-xl font-bold mb-4">Buses ({filteredBuses.length})</h2>
              <div className="space-y-3">
                {filteredBuses.length === 0 ? <p className="text-sm text-muted-foreground">No buses in the fleet. Add a bus from the Manage Vehicles tab.</p> : filteredBuses.map((v) => (
                  <div key={v.vehicleId} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium flex items-center gap-2"><Bus className="w-4 h-4 text-primary" /> {v.vehicleId}</p>
                      <p className="text-sm text-muted-foreground">Capacity: {v.capacity} · Current Passengers: {v.currentPassengers}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={async () => { await deleteVehicle(v.vehicleId); }} className="text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CREATE OPERATOR */}
          {activeTab === "createOperator" && (
            <div className="max-w-xl mx-auto glass-card p-6 animate-fade-in-up">
              <h2 className="font-display text-xl font-bold mb-2">Create Operator Account</h2>
              <p className="text-sm text-muted-foreground mb-6">Only admin can create operator accounts.</p>
              {opSuccess && (
                <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-4 mb-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <div><p className="text-sm font-semibold text-success">Operator created</p><p className="text-xs text-muted-foreground">ID: {opSuccess}</p></div>
                  <button onClick={() => setOpSuccess(null)} className="ml-auto text-muted-foreground hover:text-foreground"><XCircle className="w-4 h-4" /></button>
                </div>
              )}
              {opError && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">{opError}</div>}
              <div className="space-y-4">
                <div><Label className="text-xs mb-1.5 block">Full Name</Label><Input value={opForm.fullName} onChange={(e) => setOpForm({ ...opForm, fullName: e.target.value })} placeholder="Operator name" className="bg-surface-2 border-border" /></div>
                <div><Label className="text-xs mb-1.5 block">Email</Label><Input value={opForm.email} onChange={(e) => setOpForm({ ...opForm, email: e.target.value })} placeholder="operator@example.com" className="bg-surface-2 border-border" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs mb-1.5 block">Mobile</Label><Input value={opForm.mobile} onChange={(e) => setOpForm({ ...opForm, mobile: e.target.value })} placeholder="+91..." className="bg-surface-2 border-border" /></div>
                  <div><Label className="text-xs mb-1.5 block">Password</Label><Input value={opForm.password} onChange={(e) => setOpForm({ ...opForm, password: e.target.value })} placeholder="Login password" className="bg-surface-2 border-border" /></div>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Assigned Route</Label>
                  <select value={opForm.assignedRouteId} onChange={(e) => setOpForm({ ...opForm, assignedRouteId: e.target.value })} className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground focus:outline-none">
                    <option value="">Select route...</option>
                    {routes.map((r) => (<option key={r.id} value={r.id}>{r.name} ({r.from} → {r.to})</option>))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs mb-1.5 block">Vehicle ID</Label><Input value={opForm.vehicleId} onChange={(e) => setOpForm({ ...opForm, vehicleId: e.target.value })} placeholder="BUS-042-A" className="bg-surface-2 border-border" /></div>
                  <div><Label className="text-xs mb-1.5 block">Vehicle Capacity</Label><Input value={opForm.vehicleCapacity} onChange={(e) => setOpForm({ ...opForm, vehicleCapacity: e.target.value.replace(/\D/g, "") })} placeholder="50" className="bg-surface-2 border-border" /></div>
                </div>
                <Button onClick={handleCreateOperator} disabled={creatingOperator} className="w-full gradient-blue-orange text-primary-foreground">
                  {creatingOperator ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Create Operator</>}
                </Button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Send Notification */}
              <div className="glass-card p-6">
                <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" /> Send Notification
                </h2>
                <NotificationSender users={users} />
              </div>

              {/* Quick Actions */}
              <div className="glass-card p-6">
                <h2 className="font-display text-lg font-bold mb-3">Quick Alerts</h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Renewal Reminder (All)", action: async () => {
                      const expiringPasses = passes.filter(p => {
                        const daysLeft = Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / 86400000);
                        return p.status === "active" && daysLeft <= 7 && daysLeft > 0;
                      });
                      for (const p of expiringPasses) await sendRenewalAlert(p.passId);
                      if (expiringPasses.length === 0) alert("No passes expiring within 7 days.");
                    }},
                    { label: "Service Update", action: () => sendAdminNotification({ title: "Service Update", message: "Transport services have been updated. Check your routes for changes.", type: "broadcast" }) },
                    { label: "Maintenance Alert", action: () => sendAdminNotification({ title: "Scheduled Maintenance", message: "Some routes may experience delays due to scheduled maintenance.", type: "broadcast" }) },
                    { label: "Holiday Schedule", action: () => sendAdminNotification({ title: "Holiday Schedule", message: "Please note the modified transport schedule for the upcoming holiday.", type: "broadcast" }) },
                  ].map(({ label, action }) => (
                    <Button key={label} variant="outline" size="sm" onClick={action} className="border-primary/30 text-primary hover:bg-primary/10">
                      <Megaphone className="w-3 h-3 mr-1" /> {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Feed */}
              <div className="glass-card p-6">
                <h2 className="font-display text-xl font-bold mb-4">Notification Feed</h2>
                <div className="space-y-3">
                  {notifications.length === 0 ? <p className="text-sm text-muted-foreground">No notifications yet.</p> : notifications.map((n) => (
                    <div key={n.id} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === "broadcast" ? "bg-secondary" : "bg-primary"}`} />
                          <div>
                            <p className="font-medium">{n.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                            {n.userId && <p className="text-xs text-muted-foreground mt-1">To: {n.userId}</p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs text-muted-foreground">{n.date}</span>
                          <Badge variant="outline" className="block mt-1 text-[10px]">{n.type}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Detail Sheets */}
      <UserDetailSheet
        open={!!selectedUserId}
        onOpenChange={(open) => { if (!open) setSelectedUserId(null); }}
        user={selectedUserData}
        passes={passes}
      />
      <OperatorDetailSheet
        open={!!selectedOperatorId}
        onOpenChange={(open) => { if (!open) setSelectedOperatorId(null); }}
        operator={selectedOperatorData}
        operatorData={selectedOperatorRecord}
      />
    </div>
  );
};

/* ─── Notification Sender Sub-Component ─── */
const NotificationSender = ({ users }: { users: any[] }) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"broadcast" | "targeted">("broadcast");
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    if (type === "targeted" && !targetUserId) return;
    setSending(true);
    await sendAdminNotification({ title, message, type, userId: type === "targeted" ? targetUserId : undefined });
    setSending(false);
    setSent(true);
    setTitle("");
    setMessage("");
    setTargetUserId("");
    setTimeout(() => setSent(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["broadcast", "targeted"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
              type === t ? "gradient-blue-orange text-primary-foreground" : "bg-surface-2 text-muted-foreground border border-border"
            }`}
          >
            {t === "broadcast" ? "📢 Broadcast (All Users)" : "🎯 Targeted (Specific User)"}
          </button>
        ))}
      </div>

      {type === "targeted" && (
        <div>
          <Label className="text-xs mb-1.5 block">Select User</Label>
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          >
            <option value="">-- Select user --</option>
            {users.filter(u => u.role === "user").map((u) => (
              <option key={u.id} value={u.id}>{u.fullName} ({u.id})</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <Label className="text-xs mb-1.5 block">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" className="bg-surface-2 border-border" />
      </div>

      <div>
        <Label className="text-xs mb-1.5 block">Message</Label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your notification message..."
          rows={3}
          className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
        />
      </div>

      <Button
        onClick={handleSend}
        disabled={sending || !title.trim() || !message.trim() || (type === "targeted" && !targetUserId)}
        className="w-full gradient-blue-orange text-primary-foreground"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : sent ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Sent!</> : <><Send className="w-4 h-4 mr-1" /> Send Notification</>}
      </Button>
    </div>
  );
};

export default AdminDashboard;
