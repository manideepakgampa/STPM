import { ArrowDownLeft, ArrowUpRight, Clock3, Navigation, ShieldCheck } from "lucide-react";

interface ActivityItem {
  id: string;
  kind: "credit" | "debit" | "trip" | "application";
  title: string;
  subtitle: string;
  date: string;
  amount?: number;
  meta?: string;
  status?: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const RecentActivity = ({ activities }: RecentActivityProps) => {
  const iconForActivity = (activity: ActivityItem) => {
    if (activity.kind === "credit") return <ArrowDownLeft className="h-5 w-5 text-success" />;
    if (activity.kind === "debit") return <ArrowUpRight className="h-5 w-5 text-destructive" />;
    if (activity.kind === "trip") return <Navigation className="h-5 w-5 text-primary" />;
    return <ShieldCheck className="h-5 w-5 text-secondary" />;
  };

  const badgeClass = (activity: ActivityItem) => {
    if (activity.kind === "credit") return "bg-success/10";
    if (activity.kind === "debit") return "bg-destructive/10";
    if (activity.kind === "trip") return "bg-primary/10";
    return "bg-secondary/10";
  };

  return (
    <section>
      <h2 className="font-display text-xl font-bold mb-4">Live Activity</h2>
      {activities.length > 0 ? (
        <div className="glass-card divide-y divide-border/50 overflow-hidden">
          {activities.slice(0, 6).map((activity) => (
            <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${badgeClass(activity)}`}>
                {iconForActivity(activity)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{activity.subtitle}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock3 className="h-3 w-3" />
                  {new Date(activity.date).toLocaleString()}
                </p>
              </div>
              <div className="text-right shrink-0">
                {typeof activity.amount === "number" ? (
                  <span className={`text-sm font-semibold ${activity.kind === "credit" ? "text-success" : "text-destructive"}`}>
                    {activity.kind === "credit" ? "+" : "-"}₹{activity.amount}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground capitalize">{activity.status || activity.meta || "synced"}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No activity yet. New scans and approvals will appear here in real time.</p>
        </div>
      )}
    </section>
  );
};

export default RecentActivity;
