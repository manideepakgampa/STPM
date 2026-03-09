import { Bus, TrainFront, Map } from "lucide-react";

interface ServicesSectionProps {
  services: Array<{
    id: string;
    name: string;
    icon: string;
    status: string;
    routes: number;
    crowdLevel?: string;
    description: string;
  }>;
}

const iconMap: Record<string, any> = { bus: Bus, metro: TrainFront, map: Map };

const crowdColors: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-success/10", text: "text-success" },
  moderate: { bg: "bg-warning/10", text: "text-warning" },
  high: { bg: "bg-destructive/10", text: "text-destructive" },
};

const ServicesSection = ({ services }: ServicesSectionProps) => {
  return (
    <section>
      <h2 className="font-display text-xl font-bold mb-4">Transport Services</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {services.map((s, i) => {
          const Icon = iconMap[s.icon] || Map;
          const crowd = s.crowdLevel ? crowdColors[s.crowdLevel] : null;
          return (
            <div key={s.id} className="glass-card p-5 cursor-pointer group hover-lift transition-all duration-300 border-primary/20 group-hover:border-primary/40"
              style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                {crowd && (
                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${crowd.bg} ${crowd.text} capitalize`}>
                    {s.crowdLevel}
                  </span>
                )}
              </div>
              <h3 className="font-display font-semibold mb-1">{s.name}</h3>
              <p className="text-sm text-muted-foreground">{s.description}</p>
              {s.routes > 0 && <p className="text-xs text-muted-foreground mt-2">{s.routes} routes active</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ServicesSection;
