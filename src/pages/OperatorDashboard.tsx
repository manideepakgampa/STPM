import { useCallback, useEffect, useRef, useState } from "react";
import TransportLoader from "@/components/TransportLoader";
import jsQR from "jsqr";
import { usePageLoader } from "@/hooks/use-page-loader";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  assignRouteToPass,
  completeTrip,
  fetchAllRoutes,
  fetchOperatorDashboard,
  getActiveTrips,
  getRouteStops,
  updateOperatorRouteAssignment,
  verifyPassByQR,
} from "@/lib/api";
import type { RouteStop } from "@/lib/app-state";
import { subscribeToAppState } from "@/lib/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bus,
  Camera,
  CheckCircle2,
  Clock3,
  Loader2,
  LogOut,
  MapPin,
  Navigation,
  QrCode,
  Route,
  ScanLine,
  ShieldCheck,
  Square,
  Upload,
  Users,
  XCircle,
} from "lucide-react";

const OperatorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const phase = usePageLoader();
  const [activeTab, setActiveTab] = useState<"dashboard" | "scanner" | "route">("dashboard");
  const [dashboard, setDashboard] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [granting, setGranting] = useState(false);
  const [accessState, setAccessState] = useState<"granted" | "denied" | null>(null);
  const [routeDraft, setRouteDraft] = useState("");
  const [savingRoute, setSavingRoute] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [fromStop, setFromStop] = useState("");
  const [toStop, setToStop] = useState("");
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [completingTrip, setCompletingTrip] = useState<string | null>(null);

  const loadOperatorData = useCallback(
    async (showLoader = false) => {
      if (!user || user.role !== "operator") return;
      if (showLoader) setLoading(true);

      const [dashboardData, routeList, trips] = await Promise.all([
        fetchOperatorDashboard(user.id),
        fetchAllRoutes(),
        getActiveTrips(user.id),
      ]);

      setDashboard(dashboardData);
      setRoutes(routeList);
      setActiveTrips(trips);
      setLoading(false);
    },
    [user]
  );

  useEffect(() => {
    if (!user || user.role !== "operator") {
      navigate("/login");
      return;
    }
    void loadOperatorData(true);
    const unsubscribe = subscribeToAppState(() => void loadOperatorData(false));
    return unsubscribe;
  }, [user, navigate, loadOperatorData]);

  useEffect(() => {
    if (dashboard?.assignedRouteId) {
      setRouteDraft(dashboard.assignedRouteId);
      if (!selectedRouteId) setSelectedRouteId(dashboard.assignedRouteId);
    }
  }, [dashboard, selectedRouteId]);

  // Load stops when route selection changes
  useEffect(() => {
    if (!selectedRouteId) return;
    getRouteStops(selectedRouteId).then((stops) => {
      setRouteStops(stops);
      setFromStop(stops[0]?.name ?? "");
      setToStop(stops[stops.length - 1]?.name ?? "");
    });
  }, [selectedRouteId]);

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    setScanning(true);
    setScanResult(null);
    setAccessState(null);
    const result = await verifyPassByQR(scanInput.trim());
    setScanResult(result);
    setSelectedRouteId(dashboard?.assignedRouteId || routes[0]?.id || "");
    setScanning(false);
  };

  const handleGrantAccess = async () => {
    if (!scanResult?.pass?.passId || !selectedRouteId || !user) return;
    if (routeStops.length > 0 && (!fromStop || !toStop)) return;
    if (fromStop === toStop && routeStops.length > 1) return;
    setGranting(true);
    const result = await assignRouteToPass(scanResult.pass.passId, user.id, selectedRouteId, fromStop, toStop);
    setGranting(false);

    if (result.success) {
      setAccessState("granted");
      setActiveTrips((prev) => [result.trip!, ...prev]);
      setTimeout(() => { setAccessState(null); setScanResult(null); setScanInput(""); }, 2200);
    }
  };

  const handleCompleteTrip = async (tripId: string) => {
    if (!user) return;
    setCompletingTrip(tripId);
    const result = await completeTrip(tripId, user.id);
    if (result.success) {
      setActiveTrips((prev) => prev.filter((t) => t.tripId !== tripId));
    }
    setCompletingTrip(null);
  };

  const handleDenyAccess = () => {
    setAccessState("denied");
    setTimeout(() => { setAccessState(null); setScanResult(null); setScanInput(""); }, 2200);
  };

  const handleSaveRoute = async () => {
    if (!user || !routeDraft) return;
    setSavingRoute(true);
    await updateOperatorRouteAssignment(user.id, routeDraft);
    setSavingRoute(false);
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  const occupancy = dashboard ? Math.round((dashboard.currentPassengers / dashboard.vehicleCapacity) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen gradient-dark p-6 space-y-6">
        <Skeleton className="h-16 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-sm">
          <Bus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">No Operator Data</h2>
          <p className="text-sm text-muted-foreground mb-4">Your operator profile hasn't been configured yet. Ask the admin to assign a route and vehicle.</p>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </div>
    );
  }

  if (phase !== "hidden") return <TransportLoader fading={phase === "fading"} />;

  return (
    <div className="min-h-screen gradient-dark">
      <header className="glass sticky top-0 z-50 px-4 py-3 md:px-8">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl gradient-blue-orange flex items-center justify-center">
              <Bus className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-display text-lg font-bold">Operator Panel</p>
              <p className="text-xs text-muted-foreground">Scans and route history sync live to user dashboards</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "dashboard", label: "Dashboard", icon: Route },
            { key: "scanner", label: "Scanner", icon: QrCode },
            { key: "route", label: "Route", icon: Navigation },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === key ? "gradient-blue-orange text-primary-foreground glow-subtle" : "bg-surface-2 text-muted-foreground border border-border"}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Today Trips</p>
                <p className="font-display text-3xl font-bold">{dashboard.todayTrips}</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Passengers</p>
                <p className="font-display text-3xl font-bold">{dashboard.currentPassengers}</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Crowd Level</p>
                <Badge className={dashboard.crowdLevel === "high" ? "bg-destructive/10 text-destructive border-destructive/30" : dashboard.crowdLevel === "moderate" ? "bg-warning/10 text-warning border-warning/30" : "bg-success/10 text-success border-success/30"}>
                  {dashboard.crowdLevel}
                </Badge>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-display text-xl font-bold">{dashboard.assignedRoute || "No route assigned"}</p>
                  <p className="text-sm text-muted-foreground mt-1">{dashboard.from} → {dashboard.to}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{dashboard.vehicleId}</p>
                  <p>{dashboard.predictedCrowd}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Capacity usage</span>
                  <span>{occupancy}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full gradient-blue-orange rounded-full transition-all duration-500" style={{ width: `${occupancy}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "scanner" && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
            <div className="glass-card p-6">
              <div className="h-72 rounded-3xl bg-surface-2 border border-border relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-10 border border-primary/40 rounded-3xl" />
                <div className="absolute left-12 right-12 top-1/2 h-px bg-primary/50 animate-pulse" />
                <div className="text-center">
                  <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Live camera placeholder</p>
                  <ScanLine className="w-5 h-5 text-primary mx-auto mt-2 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="glass-card p-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <Input value={scanInput} onChange={(e) => setScanInput(e.target.value)} placeholder="Paste pass ID or QR payload" className="bg-surface-2 border-border" />
                <Button onClick={handleScan} disabled={scanning} className="gradient-blue-orange text-primary-foreground md:w-40">
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Pass"}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setScanning(true);
                  setScanResult(null);
                  setAccessState(null);
                  try {
                    const img = new Image();
                    img.src = URL.createObjectURL(file);
                    await new Promise((resolve) => { img.onload = resolve; });
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d")!;
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, canvas.width, canvas.height);
                    URL.revokeObjectURL(img.src);
                    if (code) {
                      setScanInput(code.data);
                      const result = await verifyPassByQR(code.data);
                      setScanResult(result);
                      setSelectedRouteId(dashboard?.assignedRouteId || routes[0]?.id || "");
                    } else {
                      setScanResult({ valid: false, error: "Could not read QR code from the image. Please try a clearer image." });
                    }
                  } catch {
                    setScanResult({ valid: false, error: "Failed to process the image." });
                  } finally {
                    setScanning(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-2xl bg-surface-2 border border-border text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" /> Upload QR Image
              </button>
            </div>

            {scanResult && (
              <div className="glass-card p-6 space-y-4">
                {scanResult.valid ? (
                  <>
                    <div className="flex items-center gap-2 text-success">
                      <ShieldCheck className="w-5 h-5" />
                      <p className="font-semibold">Pass verified</p>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4">
                         <p className="font-medium">{scanResult.user?.fullName}</p>
                         <p className="text-xs text-muted-foreground mt-1">{scanResult.pass?.passId} · {scanResult.pass?.type}</p>
                         <p className="text-xs text-muted-foreground mt-2">Expiry: {scanResult.pass?.expiryDate}</p>
                         <p className="text-xs text-muted-foreground">Wallet: ₹{scanResult.walletBalance}</p>
                       </div>
                       <div className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4 space-y-3">
                         <label className="text-xs text-muted-foreground block">Route</label>
                         <select value={selectedRouteId} onChange={(e) => setSelectedRouteId(e.target.value)} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none">
                           {routes.map((r) => (
                             <option key={r.id} value={r.id}>{r.name}</option>
                           ))}
                         </select>
                       </div>
                     </div>

                     {/* Stop Selection */}
                     {routeStops.length > 0 && (
                       <div className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4 space-y-4">
                         <div className="flex items-center gap-2 mb-1">
                           <MapPin className="w-4 h-4 text-primary" />
                           <p className="text-sm font-semibold">Select boarding & destination stops</p>
                         </div>
                         <p className="text-xs text-muted-foreground">Ask the passenger which stops they'll travel between. Journey is calculated for this segment only.</p>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div>
                             <label className="text-xs text-muted-foreground mb-1 block">Boarding Stop</label>
                             <select value={fromStop} onChange={(e) => setFromStop(e.target.value)} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none">
                               {routeStops.map((s) => (
                                 <option key={s.name} value={s.name}>{s.name} ({s.distanceFromStart} km)</option>
                               ))}
                             </select>
                           </div>
                           <div>
                             <label className="text-xs text-muted-foreground mb-1 block">Destination Stop</label>
                             <select value={toStop} onChange={(e) => setToStop(e.target.value)} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none">
                               {routeStops.filter((s) => s.name !== fromStop).map((s) => (
                                 <option key={s.name} value={s.name}>{s.name} ({s.distanceFromStart} km)</option>
                               ))}
                             </select>
                           </div>
                         </div>
                         {fromStop && toStop && fromStop !== toStop && (() => {
                           const s1 = routeStops.find((s) => s.name === fromStop);
                           const s2 = routeStops.find((s) => s.name === toStop);
                           if (!s1 || !s2) return null;
                           const dist = Math.abs(s2.distanceFromStart - s1.distanceFromStart).toFixed(1);
                           const time = Math.abs(s2.timeFromStart - s1.timeFromStart);
                           return (
                             <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm flex items-center justify-between">
                               <span className="text-muted-foreground">Segment: <span className="text-foreground font-medium">{fromStop} → {toStop}</span></span>
                               <span className="font-semibold text-primary">{dist} km · {time} min</span>
                             </div>
                           );
                         })()}
                         {fromStop === toStop && routeStops.length > 1 && (
                           <p className="text-xs text-destructive">Boarding and destination stops cannot be the same.</p>
                         )}
                       </div>
                     )}

                     <p className="text-xs text-muted-foreground">Granting access creates a trip entry visible to the user instantly.</p>
                     <div className="flex gap-3">
                       <Button onClick={handleGrantAccess} disabled={granting || scanResult.duplicate || (routeStops.length > 1 && fromStop === toStop)} className="flex-1 gradient-blue-orange text-primary-foreground">
                         {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}Grant Access
                       </Button>
                       <Button onClick={handleDenyAccess} variant="outline" className="flex-1">
                         <XCircle className="w-4 h-4 mr-2" /> Deny
                       </Button>
                     </div>
                   </>
                 ) : (
                    <div className="space-y-4">
                      <div className={`rounded-2xl border px-5 py-5 ${scanResult.errorType === "expired" ? "border-warning/30 bg-warning/10" : "border-destructive/30 bg-destructive/10"}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${scanResult.errorType === "expired" ? "bg-warning/20" : "bg-destructive/20"}`}>
                            <XCircle className={`w-5 h-5 ${scanResult.errorType === "expired" ? "text-warning" : "text-destructive"}`} />
                          </div>
                          <div>
                            <p className={`font-display font-bold ${scanResult.errorType === "expired" ? "text-warning" : "text-destructive"}`}>
                              {scanResult.errorType === "not_found" && "Pass Not Found"}
                              {scanResult.errorType === "expired" && "Pass Expired"}
                              {scanResult.errorType === "duplicate" && "Duplicate Scan"}
                              {scanResult.errorType === "pending" && "Pending Approval"}
                              {scanResult.errorType === "rejected" && "Pass Rejected"}
                              {!scanResult.errorType && "Verification Failed"}
                            </p>
                            <Badge variant="outline" className={`text-xs mt-1 ${scanResult.errorType === "expired" ? "border-warning/40 text-warning" : "border-destructive/40 text-destructive"}`}>
                              {scanResult.errorType === "not_found" && "INVALID QR"}
                              {scanResult.errorType === "expired" && "EXPIRED"}
                              {scanResult.errorType === "duplicate" && "DUPLICATE"}
                              {scanResult.errorType === "pending" && "PENDING"}
                              {scanResult.errorType === "rejected" && "REJECTED"}
                              {!scanResult.errorType && "ERROR"}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{scanResult.error}</p>
                      </div>

                      {/* Show passenger info if available for context */}
                      {scanResult.user && (
                        <div className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Passenger Info</p>
                          <p className="font-medium">{scanResult.user.fullName}</p>
                          {scanResult.pass && (
                            <>
                              <p className="text-xs text-muted-foreground mt-1">Pass: {scanResult.pass.passId} · {scanResult.pass.type}</p>
                              <p className="text-xs text-muted-foreground">Status: <span className="capitalize">{scanResult.pass.status}</span></p>
                              {scanResult.pass.expiryDate && <p className="text-xs text-muted-foreground">Expiry: {scanResult.pass.expiryDate}</p>}
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button onClick={handleDenyAccess} variant="outline" className="flex-1">
                          <XCircle className="w-4 h-4 mr-2" /> Dismiss
                        </Button>
                      </div>
                    </div>
                 )}
               </div>
             )}

            {/* Active Trips */}
            {activeTrips.length > 0 && (
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-lg font-bold">Active Trips</h3>
                  <span className="ml-auto text-xs text-muted-foreground">{activeTrips.length} onboard</span>
                </div>
                <div className="space-y-3">
                  {activeTrips.map((trip) => (
                    <div key={trip.tripId} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{trip.from} → {trip.to}</p>
                        <p className="text-xs text-muted-foreground mt-1">{trip.routeName} · {trip.distance} · {trip.estimatedTime}</p>
                        <p className="text-xs text-muted-foreground">Boarded: {new Date(trip.timestamp).toLocaleTimeString()}</p>
                      </div>
                      <Button
                        onClick={() => handleCompleteTrip(trip.tripId)}
                        disabled={completingTrip === trip.tripId}
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        {completingTrip === trip.tripId ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Square className="w-3 h-3 mr-1.5" />Trip Completed</>}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
           </div>
         )}

        {activeTab === "route" && (
          <div className="max-w-xl mx-auto glass-card p-6 space-y-4 animate-fade-in-up">
            <div>
              <p className="font-display text-xl font-bold">Active Route Assignment</p>
              <p className="text-sm text-muted-foreground mt-1">Changing this route updates the default route used during scans.</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4 space-y-3">
              <label className="text-xs text-muted-foreground block">Route</label>
              <select value={routeDraft} onChange={(e) => setRouteDraft(e.target.value)} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none">
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border bg-background px-4 py-3">
                  <Users className="w-4 h-4 mb-2 text-primary" />
                  Capacity {dashboard.vehicleCapacity}
                </div>
                <div className="rounded-2xl border border-border bg-background px-4 py-3">
                  <Clock3 className="w-4 h-4 mb-2 text-secondary" />
                  Vehicle {dashboard.vehicleId}
                </div>
              </div>
            </div>
            <Button onClick={handleSaveRoute} disabled={savingRoute} className="w-full gradient-blue-orange text-primary-foreground">
              {savingRoute ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}Confirm Route
            </Button>
          </div>
        )}
      </main>

      {accessState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className={`absolute inset-0 ${accessState === "granted" ? "bg-success/20" : "bg-destructive/20"} backdrop-blur-md`} />
          <div className="relative text-center animate-slide-up">
            {accessState === "granted" ? (
              <>
                <CheckCircle2 className="w-24 h-24 text-success mx-auto mb-4" />
                <p className="font-display text-3xl font-bold text-success">ACCESS GRANTED</p>
              </>
            ) : (
              <>
                <XCircle className="w-24 h-24 text-destructive mx-auto mb-4" />
                <p className="font-display text-3xl font-bold text-destructive">ACCESS DENIED</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorDashboard;
