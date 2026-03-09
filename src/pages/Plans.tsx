import { useCallback, useEffect, useMemo, useState } from "react";
import TransportLoader from "@/components/TransportLoader";
import { usePageLoader } from "@/hooks/use-page-loader";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { applyForPlan, renewPass, fetchPlans, fetchUserApplications, fetchUserPasses, fetchWallet } from "@/lib/api";
import { subscribeToAppState } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, Clock3, Loader2, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import FaceAuthDialog from "@/components/FaceAuthDialog";

const Plans = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const phase = usePageLoader();
  const [plans, setPlans] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingPlanId, setSubmittingPlanId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successApplication, setSuccessApplication] = useState<any>(null);
  const [showFaceAuth, setShowFaceAuth] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"apply" | "renew">("apply");
  const [renewingPlanId, setRenewingPlanId] = useState<string | null>(null);

  const loadPlans = useCallback(
    async (showLoader = false) => {
      if (!user) return;
      if (showLoader) setLoading(true);

      try {
        const [planList, walletInfo, userApplications, userPasses] = await Promise.all([
          fetchPlans(user.userType),
          fetchWallet(user.id),
          fetchUserApplications(user.id),
          fetchUserPasses(user.id),
        ]);

        setPlans(planList);
        setWallet(walletInfo);
        setApplications(userApplications);
        setPasses(userPasses);
      } catch {
        setError("Failed to load plan data.");
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

    void loadPlans(true);
    const unsubscribe = subscribeToAppState(() => void loadPlans(false));
    return unsubscribe;
  }, [user, navigate, loadPlans]);

  const applicationStatusByPlan = useMemo(() => {
    const map = new Map<string, string>();
    applications.forEach((application) => map.set(application.planId, application.status));
    passes.filter((pass) => pass.status === "active").forEach((pass) => map.set(pass.planId, "active"));
    return map;
  }, [applications, passes]);

  const handleApplyClick = (planId: string) => {
    setPendingPlanId(planId);
    setPendingAction("apply");
    setShowFaceAuth(true);
  };

  const handleRenewClick = (planId: string) => {
    setPendingPlanId(planId);
    setPendingAction("renew");
    setShowFaceAuth(true);
  };

  const handleFaceAuthenticated = async () => {
    setShowFaceAuth(false);
    if (!pendingPlanId || !user) return;
    setError("");

    if (pendingAction === "renew") {
      setRenewingPlanId(pendingPlanId);
      const result = await renewPass(user.id, pendingPlanId);
      setRenewingPlanId(null);
      setPendingPlanId(null);
      if (result.success) {
        setSuccessApplication({ applicationId: "Renewal", renewed: true, newExpiry: result.newExpiry });
      } else {
        setError(result.error || "Unable to renew the pass.");
      }
    } else {
      setSubmittingPlanId(pendingPlanId);
      const result = await applyForPlan(user.id, pendingPlanId);
      setSubmittingPlanId(null);
      setPendingPlanId(null);
      if (result.success) {
        setSuccessApplication(result.application);
      } else {
        setError(result.error || "Unable to submit the application.");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-dark p-6 space-y-6">
        <Skeleton className="h-16 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (phase !== "hidden") return <TransportLoader fading={phase === "fading"} />;

  return (
    <div className="min-h-screen gradient-dark">
      <header className="glass sticky top-0 z-50 px-4 py-3 md:px-8">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/user/dashboard")} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display text-lg font-bold">Transport Plans</h1>
              <p className="text-xs text-muted-foreground capitalize">Plans for {user?.userType} accounts</p>
            </div>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-secondary" />
            <span className="text-sm font-semibold">₹{wallet?.balance?.toFixed(0) ?? 0}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-6 space-y-8">
        {error && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan: any, index) => {
            const status = applicationStatusByPlan.get(plan.id);
            const disabled = status === "pending" || status === "active" || (wallet?.balance ?? 0) < plan.price;
            const isFeatured = index === 1 || index === plans.length - 1;

            return (
              <div key={plan.id} className={`glass-card p-6 hover-lift relative ${isFeatured ? "glow-subtle border-primary/30" : ""}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-display text-xl font-bold">{plan.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{plan.duration}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {plan.routeLimit === -1 ? "Unlimited" : `${plan.routeLimit} routes`}
                  </Badge>
                </div>

                <p className="font-display text-3xl font-bold mb-4">₹{plan.price}</p>

                <div className="space-y-2 mb-6">
                  {plan.benefits.map((benefit: string) => (
                    <div key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleApplyClick(plan.id)}
                  disabled={disabled || submittingPlanId === plan.id}
                  className="w-full gradient-blue-orange text-primary-foreground"
                >
                  {submittingPlanId === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : status === "pending" ? (
                    "Pending Approval"
                  ) : status === "active" ? (
                    "Already Active"
                  ) : (wallet?.balance ?? 0) < plan.price ? (
                    "Insufficient Balance"
                  ) : (
                    "Apply for Pass"
                  )}
                </Button>

                {status === "active" && (
                  <Button
                    onClick={() => handleRenewClick(plan.id)}
                    disabled={renewingPlanId === plan.id || (wallet?.balance ?? 0) < plan.price}
                    variant="outline"
                    className="w-full mt-2 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    {renewingPlanId === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-1" />
                    )}
                    {(wallet?.balance ?? 0) < plan.price ? "Insufficient Balance" : `Renew Pass (₹${plan.price})`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <section className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">My Applications</h2>
            <span className="text-xs text-muted-foreground">Updates sync instantly across admin and user tabs</span>
          </div>

          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {applications.map((application) => (
                <div key={application.applicationId} className="rounded-2xl border border-border bg-surface-2/60 px-4 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{application.type}</p>
                    <p className="text-xs text-muted-foreground">Applied on {application.appliedAt}</p>
                  </div>
                  <Badge
                    className={
                      application.status === "approved"
                        ? "bg-success/10 text-success border-success/30"
                        : application.status === "rejected"
                          ? "bg-destructive/10 text-destructive border-destructive/30"
                          : "bg-primary/10 text-primary border-primary/30"
                    }
                  >
                    {application.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {successApplication && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setSuccessApplication(null)} />
          <div className="relative glass-card w-full max-w-sm p-8 text-center animate-slide-up">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${successApplication.renewed ? "bg-success/20" : "bg-primary/10"}`}>
              {successApplication.renewed ? <RefreshCw className="w-8 h-8 text-success" /> : <ShieldCheck className="w-8 h-8 text-primary" />}
            </div>
            <h2 className="font-display text-xl font-bold mb-2">
              {successApplication.renewed ? "Pass Renewed!" : "Application Submitted"}
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              {successApplication.renewed ? `Extended until ${successApplication.newExpiry}` : `ID: ${successApplication.applicationId}`}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {successApplication.renewed ? "The renewal duration has been added to your existing pass." : "Admin approval will activate your pass and deduct the wallet automatically."}
            </p>
            <Button onClick={() => setSuccessApplication(null)} className="w-full gradient-blue-orange text-primary-foreground">
              {successApplication.renewed ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Done</> : <><Clock3 className="w-4 h-4 mr-2" /> Wait for Approval</>}
            </Button>
          </div>
        </div>
      )}

      <FaceAuthDialog
        open={showFaceAuth}
        onClose={() => { setShowFaceAuth(false); setPendingPlanId(null); }}
        onAuthenticated={handleFaceAuthenticated}
        userName={user?.fullName}
        storedDescriptor={user?.faceDescriptor}
      />
    </div>
  );
};

export default Plans;
