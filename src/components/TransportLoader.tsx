import { Bus, TrainFront } from "lucide-react";

interface TransportLoaderProps {
  fading?: boolean;
}

const TransportLoader = ({ fading = false }: TransportLoaderProps) => {
  return (
    <div
      className={`fixed inset-0 bg-background flex flex-col items-center justify-center z-50 transition-opacity duration-400 ${fading ? "opacity-0" : "opacity-100"}`}
    >
      {/* Scene container */}
      <div className="relative mb-10">
        {/* Floating bus silhouette - left */}
        <div className="absolute -left-24 top-1/2 -translate-y-1/2 opacity-15 animate-[float-left_3s_ease-in-out_infinite]">
          <Bus className="w-14 h-14 text-primary" strokeWidth={1.2} />
        </div>

        {/* Floating metro silhouette - right */}
        <div className="absolute -right-24 top-1/2 -translate-y-1/2 opacity-15 animate-[float-right_3s_ease-in-out_0.5s_infinite]">
          <TrainFront className="w-14 h-14 text-secondary" strokeWidth={1.2} />
        </div>

        {/* Wheel / tyre */}
        <div className="relative w-20 h-20 animate-[spin_1.2s_linear_infinite]">
          <div className="absolute inset-0 rounded-full border-4 border-primary" />
          <div className="absolute inset-[30%] rounded-full bg-primary/20 border-2 border-primary/60" />
          {[0, 45, 90, 135].map((deg) => (
            <div
              key={deg}
              className="absolute top-1/2 left-1/2 w-[2px] h-[40%] bg-primary/50 origin-bottom -translate-x-1/2"
              style={{ transform: `translate(-50%, -100%) rotate(${deg}deg)`, transformOrigin: "bottom center" }}
            />
          ))}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <div
              key={`t-${deg}`}
              className="absolute w-[3px] h-[6px] bg-primary rounded-full"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translate(0, -36px) translate(-50%, -50%)`,
              }}
            />
          ))}
        </div>

        {/* Glow ring behind wheel */}
        <div className="absolute inset-0 -m-4 rounded-full bg-primary/5 blur-xl animate-pulse" />
      </div>

      {/* Road with dashes */}
      <div className="w-52 h-[2px] bg-muted-foreground/10 rounded-full overflow-hidden mb-6 relative">
        <div className="absolute inset-y-0 flex gap-3 animate-[road-scroll_1.2s_linear_infinite]">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-5 h-full bg-primary/30 rounded-full flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Pulsing route dots */}
      <div className="flex items-center gap-2 mb-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            style={{ animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>

      <p className="text-muted-foreground text-sm font-medium tracking-wider uppercase animate-pulse">
        Loading your transit…
      </p>

      <style>{`
        @keyframes road-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes float-left {
          0%, 100% { transform: translateY(-50%) translateX(0); opacity: 0.12; }
          50% { transform: translateY(-60%) translateX(-4px); opacity: 0.2; }
        }
        @keyframes float-right {
          0%, 100% { transform: translateY(-50%) translateX(0); opacity: 0.12; }
          50% { transform: translateY(-40%) translateX(4px); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
};

export default TransportLoader;
