import { useState, useEffect } from "react";
import TransportLoader from "@/components/TransportLoader";
import { usePageLoader } from "@/hooks/use-page-loader";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { searchJourney } from "@/lib/api";
import { getAppState } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Navigation, MapPin, Clock, Gauge, Route, Bus, TrainFront, Loader2, ChevronDown, ChevronUp
} from "lucide-react";

const PlanJourney = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const phase = usePageLoader();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [transportType, setTransportType] = useState<"all" | "bus" | "metro">("all");
  const [searching, setSearching] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

  const [allRoutes, setAllRoutes] = useState<any[]>([]);

  useEffect(() => {
    setAllRoutes(getAppState().routes);
  }, []);
  useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);

  const handleSearch = async () => {
    setSearching(true);
    setSearched(true);
    const results = await searchJourney(from, to, transportType === "all" ? "" : transportType);
    setRoutes(results);
    setSearching(false);
  };

  const trafficColors: Record<string, string> = {
    low: "text-success bg-success/10 border-success/30",
    moderate: "text-warning bg-warning/10 border-warning/30",
    high: "text-destructive bg-destructive/10 border-destructive/30",
  };

  const filteredAvailableRoutes = allRoutes.filter(
    (r) => transportType === "all" || r.type === transportType
  );

  if (phase !== "hidden") return <TransportLoader fading={phase === "fading"} />;

  return (
    <div className="min-h-screen gradient-dark">
      <header className="glass sticky top-0 z-50 px-4 py-3 md:px-8">
        <div className="container mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/user/dashboard")} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-lg">Plan Journey</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-6 max-w-2xl space-y-6">
        {/* Search Form */}
        <div className="glass-card p-6 space-y-4 animate-fade-in-up">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">From</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Enter starting point..." className="pl-10 bg-surface-2 border-border" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">To</label>
            <div className="relative">
              <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Enter destination..." className="pl-10 bg-surface-2 border-border" />
            </div>
          </div>

          {/* Transport type */}
          <div className="flex gap-2">
            {[
              { key: "all", label: "All", icon: Route },
              { key: "bus", label: "Bus", icon: Bus },
              { key: "metro", label: "Metro", icon: TrainFront },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTransportType(key as any)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                  transportType === key
                    ? "gradient-blue-orange text-primary-foreground glow-subtle"
                    : "bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          <Button onClick={handleSearch} disabled={searching || (!from && !to)} className="w-full gradient-blue-orange text-primary-foreground">
            {searching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Navigation className="w-4 h-4 mr-2" />}
            {searching ? "Finding Routes..." : "Search Routes"}
          </Button>
        </div>

        {/* Search Results */}
        {searched && !searching && (
          <div className="space-y-3 animate-fade-in-up">
            <h2 className="font-display text-lg font-bold">
              {routes.length} Route{routes.length !== 1 ? "s" : ""} Found
            </h2>
            {routes.map((r) => (
              <RouteCard
                key={r.id}
                route={r}
                trafficColors={trafficColors}
                expanded={expandedRoute === r.id}
                onToggle={() => setExpandedRoute(expandedRoute === r.id ? null : r.id)}
              />
            ))}
          </div>
        )}

        {/* Available Routes & Transport Modes */}
        {!searched && (
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card p-4 text-center">
                <Route className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold">{allRoutes.length}</p>
                <p className="text-[10px] text-muted-foreground">Total Routes</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Bus className="w-5 h-5 mx-auto mb-1 text-warning" />
                <p className="text-xl font-bold">{allRoutes.filter((r) => r.type === "bus").length}</p>
                <p className="text-[10px] text-muted-foreground">Bus Routes</p>
              </div>
              <div className="glass-card p-4 text-center">
                <TrainFront className="w-5 h-5 mx-auto mb-1 text-secondary" />
                <p className="text-xl font-bold">{allRoutes.filter((r) => r.type === "metro").length}</p>
                <p className="text-[10px] text-muted-foreground">Metro Lines</p>
              </div>
            </div>

            <h2 className="font-display text-lg font-bold">
              Available Routes
              {transportType !== "all" && (
                <span className="text-sm font-normal text-muted-foreground ml-2 capitalize">({transportType})</span>
              )}
            </h2>

            {filteredAvailableRoutes.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Route className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No routes available for this transport type.</p>
              </div>
            ) : (
              filteredAvailableRoutes.map((r) => (
                <RouteCard
                  key={r.id}
                  route={r}
                  trafficColors={trafficColors}
                  expanded={expandedRoute === r.id}
                  onToggle={() => setExpandedRoute(expandedRoute === r.id ? null : r.id)}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

function RouteCard({
  route: r,
  trafficColors,
  expanded,
  onToggle,
}: {
  route: any;
  trafficColors: Record<string, string>;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="glass-card p-5 hover-lift transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {r.type === "bus" ? (
            <div className="w-7 h-7 rounded-lg bg-warning/15 flex items-center justify-center">
              <Bus className="w-4 h-4 text-warning" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-secondary/15 flex items-center justify-center">
              <TrainFront className="w-4 h-4 text-secondary" />
            </div>
          )}
          <div>
            <span className="text-xs font-semibold">{r.name}</span>
            <span className="text-[10px] uppercase text-muted-foreground ml-2 border border-border rounded px-1.5 py-0.5">
              {r.type}
            </span>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border ${trafficColors[r.trafficLevel]}`}>
          {r.trafficLevel} traffic
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-3 h-3 text-primary shrink-0" />
        <p className="text-sm font-semibold">{r.from}</p>
        <span className="text-muted-foreground">→</span>
        <Navigation className="w-3 h-3 text-secondary shrink-0" />
        <p className="text-sm font-semibold">{r.to}</p>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.estimatedTime}</span>
        <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> {r.distance}</span>
        <span className="font-semibold text-foreground">₹{r.fare}</span>
      </div>

      {/* Stops accordion */}
      {r.stops && r.stops.length > 0 && (
        <>
          <button
            onClick={onToggle}
            className="w-full mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{r.stops.length} stops</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expanded && (
            <div className="mt-3 ml-1 space-y-0">
              {r.stops.map((stop: any, i: number) => (
                <div key={i} className="flex items-start gap-3 relative">
                  {/* Vertical line */}
                  {i < r.stops.length - 1 && (
                    <div className="absolute left-[5px] top-3 bottom-0 w-px bg-border" />
                  )}
                  <div className={`w-[11px] h-[11px] rounded-full border-2 shrink-0 mt-0.5 z-10 ${
                    i === 0 ? "border-primary bg-primary" :
                    i === r.stops.length - 1 ? "border-secondary bg-secondary" :
                    "border-muted-foreground bg-background"
                  }`} />
                  <div className="flex-1 pb-3">
                    <p className="text-xs font-medium">{stop.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {stop.distanceFromStart} km · {stop.timeFromStart} min
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PlanJourney;
