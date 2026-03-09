import { useCallback, useEffect, useMemo, useState } from "react";
import TransportLoader from "@/components/TransportLoader";
import { usePageLoader } from "@/hooks/use-page-loader";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  addWalletMoney,
  completeTrip,
  fetchServices,
  fetchUserApplications,
  fetchUserDashboard,
  fetchUserPasses,
  fetchWallet,
  fetchTrips,
} from "@/lib/api";
import { subscribeToAppState } from "@/lib/app-state";
import Navbar from "@/components/Navbar";
import PassCard from "@/components/PassCard";
import ServicesSection from "@/components/ServicesSection";
import WalletSection from "@/components/WalletSection";
import RecentActivity from "@/components/RecentActivity";
import FloatingActionButton from "@/components/FloatingActionButton";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Award, Bus, Check, Clock3, Loader2, MapPin, Navigation, Wallet, Zap } from "lucide-react";

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const phase = usePageLoader();
  const [dashData, setDashData] = useState<any>(null);
  const [passes, setPasses] = useState<any[]>([]);
  const [walletData, setWalletData] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [finishingTrip, setFinishingTrip] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async (showLoader = false) => {
      if (!user) return;
      if (showLoader) setLoading(true);
      setError("");

      try {
        const [dashboard, userPasses, wallet, serviceList, userApplications, userTrips] = await Promise.all([
          fetchUserDashboard(user.id),
          fetchUserPasses(user.id),
          fetchWallet(user.id),
          fetchServices(),
          fetchUserApplications(user.id),
          fetchTrips(user.id),
        ]);

        setDashData(dashboard);
        setPasses(userPasses);
        setWalletData(wallet);
        setServices(serviceList);
        setApplications(userApplications);
        setTrips(userTrips);
      } catch {
        setError("Failed to load live dashboard data.");
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    void loadDashboard(true);
    const unsubscribe = subscribeToAppState(() => void loadDashboard(false));
    return unsubscribe;
  }, [user, navigate, loadDashboard]);

  const handleAddMoney = async (amount: number) => {
    if (!user) return;
    await addWalletMoney(user.id, amount);
  };

  const handleFinishTrip = async (tripId: string) => {
    setFinishingTrip(tripId);
    // Use the trip's operatorId to reduce their crowd count
    const trip = trips.find((t: any) => t.tripId === tripId);
    if (trip) {
      await completeTrip(tripId, trip.operatorId);
    }
    setFinishingTrip(null);
  };

  const tripActivities = useMemo(
    () =>
      trips.map((t: any) => ({
        id: t.tripId,
        kind: "trip" as const,
        title: t.routeName,
        subtitle: `${t.from} → ${t.to}`,
        date: t.timestamp,
        meta: t.passId,
        status: "granted",
      })),
    [trips]
  );

  const walletActivities = useMemo(
    () =>
      (walletData?.transactions ?? []).map((t: any) => ({
        id: t.id,
        kind: t.type === "credit" ? ("credit" as const) : ("debit" as const),
        title: t.description,
        subtitle: t.status,
        date: t.date,
        amount: t.amount,
      })),
    [walletData]
  );

  const applicationActivities = useMemo(
    () =>
      applications.map((a) => ({
        id: a.applicationId,
        kind: "application" as const,
        title: a.type,
        subtitle: `Application ${a.status}`,
        date: a.reviewedAt || a.appliedAt,
        status: a.status,
      })),
    [applications]
  );

  const activities = useMemo(
    () => [...walletActivities, ...tripActivities, ...applicationActivities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [applicationActivities, tripActivities, walletActivities]
  );

  if (loading) {
    return (
      <div className="min-h-screen gradient-dark">
        <Navbar />
        <main className="container mx-auto px-4 md:px-8 py-6 pb-24 space-y-6">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-3xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[420px] w-full rounded-3xl" />
            <Skeleton className="h-[420px] w-full rounded-3xl" />
          </div>
        </main>
      </div>
    );
  }

  const lowBalance = (walletData?.balance ?? 0) < 300;
  const activePasses = passes.filter((e) => e.status === "active");
  const pendingApplications = applications.filter((e) => e.status === "pending");
  const activeTrips = trips.filter((t: any) => t.status === "active");
  const expiringPass = activePasses.find((e) => {
    const diff = (new Date(e.expiryDate).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  const statCards = [
    { icon: Navigation, label: "Trips", value: dashData?.trips ?? 0 },
    { icon: MapPin, label: "Distance", value: dashData?.distance ?? "0 km" },
    { icon: Clock3, label: "Time Saved", value: dashData?.timeSaved ?? "0 hrs" },
    { icon: Zap, label: "Carbon Saved", value: dashData?.carbonSaved ?? "0 kg" },
  ];

  if (phase !== "hidden") return <TransportLoader fading={phase === "fading"} />;

  return (
    <div className="min-h-screen gradient-dark">
      <Navbar />
      <main className="container mx-auto px-4 md:px-8 py-6 pb-24 space-y-8">
        {error && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">{error}</div>
        )}

        {/* Active Trips */}
        {activeTrips.length > 0 && (
          <div className="space-y-4 animate-fade-in-up">
            {activeTrips.map((trip: any) => {
              const boardedAt = new Date(trip.timestamp);
              const estMinutes = parseInt(trip.estimatedTime) || 30;
              const arrivalTime = new Date(boardedAt.getTime() + estMinutes * 60000);
              const now = new Date();
              const remainingMs = Math.max(0, arrivalTime.getTime() - now.getTime());
              const remainingMin = Math.ceil(remainingMs / 60000);
              const arrived = remainingMin <= 0;

              return (
                <div key={trip.tripId} className="rounded-3xl border border-primary/40 bg-primary/5 p-5 md:p-6 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary blur-3xl" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-xl gradient-blue-orange flex items-center justify-center">
                        <Bus className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Trip In Progress</p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-display text-xl md:text-2xl font-bold">{trip.from} → {trip.to}</p>
                        <p className="text-sm text-muted-foreground mt-1">{trip.routeName}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{trip.distance}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />
                            <span>Est. {trip.estimatedTime}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5 text-primary" />
                            <span className={`font-semibold ${arrived ? "text-success" : "text-primary"}`}>
                              {arrived ? "Arrived at destination" : `~${remainingMin} min remaining`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleFinishTrip(trip.tripId)}
                        disabled={finishingTrip === trip.tripId}
                        className="px-5 py-3 rounded-2xl gradient-blue-orange text-primary-foreground font-semibold text-sm hover-lift disabled:opacity-50 flex items-center gap-2 shrink-0"
                      >
                        {finishingTrip === trip.tripId
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Check className="h-4 w-4" />}
                        Finish Trip
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full gradient-blue-orange rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, ((estMinutes * 60000 - remainingMs) / (estMinutes * 60000)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pendingApplications.length > 0 && (
          <div className="rounded-3xl border border-primary/30 bg-primary/10 px-5 py-4 flex items-start gap-4 animate-fade-in-up">
            <Award className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{pendingApplications.length} application awaiting admin approval</p>
              <p className="text-xs text-muted-foreground mt-1">Your latest request for {pendingApplications[0].type} will activate in real time once the admin approves it.</p>
            </div>
            <button onClick={() => navigate("/user/plans")} className="px-4 py-2 rounded-2xl gradient-blue-orange text-primary-foreground text-sm font-semibold hover-lift">View Plans</button>
          </div>
        )}

        {expiringPass && (
          <div className="rounded-3xl border border-warning/30 bg-warning/10 px-5 py-4 flex items-center gap-4 animate-fade-in-up">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Pass expiring soon</p>
              <p className="text-xs text-muted-foreground">{expiringPass.type} expires on {expiringPass.expiryDate}.</p>
            </div>
            <button onClick={() => navigate("/user/plans")} className="px-4 py-2 rounded-2xl bg-warning text-warning-foreground text-sm font-semibold hover-lift">Renew</button>
          </div>
        )}

        {lowBalance && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/10 px-5 py-4 flex items-center gap-4 animate-fade-in-up">
            <Wallet className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Low wallet balance</p>
              <p className="text-xs text-muted-foreground">Your balance is ₹{(walletData?.balance ?? 0).toFixed(0)}. Add funds before your next approval or scan.</p>
            </div>
            <button onClick={() => handleAddMoney(500)} className="px-4 py-2 rounded-2xl gradient-blue-orange text-primary-foreground text-sm font-semibold hover-lift">Add ₹500</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
          <button onClick={() => navigate("/user/journey")} className="glass-card p-5 text-left hover-lift">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Quick Action</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-2xl font-bold">Plan Journey</p>
                <p className="text-sm text-muted-foreground mt-1">Search live routes and preview your next trip.</p>
              </div>
              <Navigation className="h-8 w-8 text-primary" />
            </div>
          </button>
          <button onClick={() => navigate("/user/plans")} className="glass-card p-5 text-left hover-lift">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Pass Workflow</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-2xl font-bold">Apply for Pass</p>
                <p className="text-sm text-muted-foreground mt-1">Submit a plan, wait for admin approval, then travel instantly.</p>
              </div>
              <Award className="h-8 w-8 text-secondary" />
            </div>
          </button>
        </div>

        <section className="space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Live Dashboard</h2>
            <div className="glass-card px-3 py-2 text-sm">
              Efficiency <span className="text-secondary font-semibold">{dashData?.efficiencyScore ?? 0}%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map(({ icon: Icon, label, value }) => (
              <div key={label} className="glass-card p-5 hover-lift">
                <Icon className="h-5 w-5 text-primary mb-3" />
                <p className="font-display text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold">My Passes</h2>
                <span className="text-xs text-muted-foreground">{activePasses.length} active</span>
              </div>
              {activePasses.length > 0 ? (
                <div className="space-y-4">
                  {activePasses.map((pass) => (
                    <PassCard key={pass.passId} pass={pass} />
                  ))}
                </div>
              ) : (
                <div className="glass-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">No active passes yet.</p>
                  <button onClick={() => navigate("/user/plans")} className="mt-3 text-primary text-sm hover:underline">
                    Apply for your first pass →
                  </button>
                </div>
              )}
            </section>
            <ServicesSection services={services} />
          </div>

          <div className="space-y-8">
            <WalletSection wallet={walletData} onAddMoney={handleAddMoney} />
            <RecentActivity activities={activities} />
          </div>
        </div>
      </main>
      <FloatingActionButton />
    </div>
  );
};

export default UserDashboard;
