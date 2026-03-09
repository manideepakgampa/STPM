import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { usePageLoader } from "@/hooks/use-page-loader";
import TransportLoader from "@/components/TransportLoader";
import Navbar from "@/components/Navbar";
import { fetchTrips, fetchWallet, fetchUserApplications } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownLeft, ArrowUpRight, Bus, FileText, Navigation } from "lucide-react";

const UserActivity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const phase = usePageLoader();
  const [trips, setTrips] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "trips" | "wallet" | "applications">("all");

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    Promise.all([
      fetchTrips(user.id),
      fetchWallet(user.id),
      fetchUserApplications(user.id),
    ]).then(([t, w, a]) => {
      setTrips(t);
      setWallet(w);
      setApplications(a);
      setLoading(false);
    });
  }, [user, navigate]);

  const activities = useMemo(() => {
    const items: any[] = [];

    if (tab === "all" || tab === "trips") {
      trips.forEach((t) => items.push({ id: t.tripId, kind: "trip", title: t.routeName, subtitle: `${t.from} → ${t.to}`, date: t.timestamp, icon: Navigation, color: "text-primary" }));
    }
    if (tab === "all" || tab === "wallet") {
      (wallet?.transactions ?? []).forEach((t: any) => items.push({
        id: t.id, kind: t.type, title: t.description, subtitle: `₹${t.amount} · ${t.status}`, date: t.date,
        icon: t.type === "credit" ? ArrowDownLeft : ArrowUpRight,
        color: t.type === "credit" ? "text-success" : "text-destructive",
      }));
    }
    if (tab === "all" || tab === "applications") {
      applications.forEach((a) => items.push({ id: a.applicationId, kind: "application", title: a.type, subtitle: `Application ${a.status}`, date: a.reviewedAt || a.appliedAt, icon: FileText, color: a.status === "approved" ? "text-success" : a.status === "rejected" ? "text-destructive" : "text-primary" }));
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trips, wallet, applications, tab]);

  if (phase !== "hidden") return <TransportLoader fading={phase === "fading"} />;

  if (loading) {
    return (
      <div className="min-h-screen gradient-dark">
        <Navbar />
        <main className="container mx-auto px-4 md:px-8 py-8 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </main>
      </div>
    );
  }

  const tabs = [
    { key: "all", label: "All" },
    { key: "trips", label: "Trips" },
    { key: "wallet", label: "Wallet" },
    { key: "applications", label: "Applications" },
  ] as const;

  return (
    <div className="min-h-screen gradient-dark">
      <Navbar />
      <main className="container mx-auto px-4 md:px-8 py-8 pb-24 space-y-6 animate-fade-in-up">
        <h1 className="font-display text-3xl font-bold">My Activity</h1>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key ? "gradient-blue-orange text-primary-foreground" : "glass-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activities.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">No activity found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="glass-card p-4 flex items-center gap-4 hover-lift">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(item.date).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default UserActivity;
