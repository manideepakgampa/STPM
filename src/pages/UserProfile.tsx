import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { usePageLoader } from "@/hooks/use-page-loader";
import TransportLoader from "@/components/TransportLoader";
import Navbar from "@/components/Navbar";
import { fetchUserPasses, fetchWallet, getUserProfile } from "@/lib/api";
import { User, Mail, Phone, IdCard, Calendar, CreditCard, Shield, Wallet, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const UserProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const phase = usePageLoader();
  const [profile, setProfile] = useState<any>(null);
  const [passes, setPasses] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    Promise.all([
      getUserProfile(user.id),
      fetchUserPasses(user.id),
      fetchWallet(user.id),
    ]).then(([p, ps, w]) => {
      setProfile(p);
      setPasses(ps);
      setWallet(w);
      setLoading(false);
    });
  }, [user, navigate]);

  if (phase !== "hidden") return <TransportLoader fading={phase === "fading"} />;

  if (loading) {
    return (
      <div className="min-h-screen gradient-dark">
        <Navbar />
        <main className="container mx-auto px-4 md:px-8 py-8 space-y-6">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </main>
      </div>
    );
  }

  const infoItems = [
    { icon: User, label: "Full Name", value: profile?.fullName },
    { icon: Mail, label: "Email", value: profile?.email },
    { icon: Phone, label: "Mobile", value: profile?.mobile },
    { icon: IdCard, label: "User ID", value: profile?.id },
    { icon: Shield, label: "User Type", value: profile?.userType },
    { icon: Calendar, label: "Joined", value: profile?.createdAt },
  ];

  const activePasses = passes.filter((p) => p.status === "active");
  const expiredPasses = passes.filter((p) => p.status !== "active" || new Date(p.expiryDate) < new Date());

  return (
    <div className="min-h-screen gradient-dark">
      <Navbar />
      <main className="container mx-auto px-4 md:px-8 py-8 pb-24 space-y-8 animate-fade-in-up">
        {/* Header */}
        <div className="glass-card p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="h-20 w-20 rounded-2xl overflow-hidden shrink-0">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full gradient-blue-orange flex items-center justify-center">
                <span className="text-2xl font-display font-bold text-foreground">
                  {profile?.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </span>
              </div>
            )}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="font-display text-3xl font-bold">{profile?.fullName}</h1>
            <p className="text-muted-foreground text-sm mt-1">{profile?.email}</p>
            <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30 capitalize">{profile?.userType}</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-success/20 text-success-foreground border border-success/30 capitalize">{profile?.status}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card p-5 text-center hover-lift">
            <Wallet className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="font-display text-xl font-bold">₹{(wallet?.balance ?? 0).toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Wallet</p>
          </div>
          <div className="glass-card p-5 text-center hover-lift">
            <Award className="h-5 w-5 text-secondary mx-auto mb-2" />
            <p className="font-display text-xl font-bold">{activePasses.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active Passes</p>
          </div>
          <div className="glass-card p-5 text-center hover-lift">
            <CreditCard className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <p className="font-display text-xl font-bold">{passes.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Passes</p>
          </div>
        </div>

        {/* Personal Info */}
        <section className="glass-card p-6 md:p-8">
          <h2 className="font-display text-xl font-bold mb-6">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {infoItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/40 border border-border">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{value ?? "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Passes */}
        <section className="glass-card p-6 md:p-8">
          <h2 className="font-display text-xl font-bold mb-6">My Passes</h2>
          {passes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No passes yet.</p>
          ) : (
            <div className="space-y-3">
              {passes.map((pass) => {
                const expired = new Date(pass.expiryDate) < new Date();
                return (
                  <div key={pass.passId} className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border">
                    <div className="flex items-center gap-4">
                      <CreditCard className={`h-5 w-5 ${expired ? "text-destructive" : "text-primary"}`} />
                      <div>
                        <p className="text-sm font-semibold">{pass.type}</p>
                        <p className="text-xs text-muted-foreground">{pass.passId} · {pass.startDate} → {pass.expiryDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">₹{pass.fare}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${expired ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success-foreground"}`}>
                        {expired ? "Expired" : "Active"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default UserProfile;
