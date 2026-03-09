import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CreditCard, MapPin, Wallet, X, FileText } from "lucide-react";

const FloatingActionButton = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { icon: CreditCard, label: "Apply for Pass", action: () => navigate("/user/plans") },
    { icon: MapPin, label: "Plan Journey", action: () => navigate("/user/journey") },
    { icon: Wallet, label: "Add Money", action: () => { /* scroll to wallet or open modal */ document.getElementById("wallet-section")?.scrollIntoView({ behavior: "smooth" }); } },
    { icon: FileText, label: "My Activity", action: () => navigate("/user/activity") },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <>
          <div className="fixed inset-0 bg-background/40 backdrop-blur-sm z-[-1]" onClick={() => setOpen(false)} />
          <div className="flex flex-col gap-2 animate-slide-up">
            {actions.map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                onClick={() => { action(); setOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl glass-card hover-lift glow-subtle"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={`h-14 w-14 rounded-2xl gradient-blue-orange flex items-center justify-center shadow-lg hover-lift transition-transform duration-300 ${open ? "rotate-45" : ""}`}
      >
        {open ? <X className="h-6 w-6 text-foreground" /> : <Plus className="h-6 w-6 text-foreground" />}
      </button>
    </div>
  );
};

export default FloatingActionButton;
