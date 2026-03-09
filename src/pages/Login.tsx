import { useState, useEffect } from "react";
import TransportLoader from "@/components/TransportLoader";
import { usePageLoader } from "@/hooks/use-page-loader";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { resetAppState } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, Shield, User, Loader2, Radio, RotateCcw } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const phase = usePageLoader();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginAs, setLoginAs] = useState<"user" | "operator" | "admin">("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === "admin") navigate("/admin/dashboard");
      else if (user.role === "operator") navigate("/operator/dashboard");
      else navigate("/user/dashboard");
    }
  }, [user, navigate]);

  const isAdminId = userId.toLowerCase().startsWith("admin") || userId.toLowerCase().includes("admin");
  const isOperatorId = userId.toLowerCase().startsWith("opr-");
  const detectedRole = userId.length > 3
    ? isAdminId ? "Admin" : isOperatorId ? "Operator" : "User"
    : null;

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const result = await login(userId, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Invalid credentials.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  const handleResetData = () => {
    if (window.confirm("Reset all data to initial empty state?")) {
      resetAppState();
      window.location.reload();
    }
  };

  if (phase !== "hidden") return <TransportLoader fading={phase === "fading"} />;

  return (
    <div className="min-h-screen gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-secondary/5 blur-3xl animate-float" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/5 animate-pulse-glow" />
      </div>

      <div className={`w-full max-w-md relative z-10 transition-transform ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 gradient-blue-orange rounded-2xl flex items-center justify-center mx-auto mb-4 glow-subtle">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gradient">Welcome Back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to Smart Transport Pass</p>
          </div>

          {/* Role Toggle */}
          <div className="flex gap-2 mb-6">
            {(["user", "operator", "admin"] as const).map((role) => (
              <button
                key={role}
                onClick={() => setLoginAs(role)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 capitalize ${
                  loginAs === role
                    ? "gradient-blue-orange text-primary-foreground glow-subtle"
                    : "bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {role === "user" ? <User className="w-4 h-4 inline mr-1" /> : role === "operator" ? <Radio className="w-4 h-4 inline mr-1" /> : <Shield className="w-4 h-4 inline mr-1" />}
                {role}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-1.5 block">User ID or Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={userId}
                  onChange={(e) => { setUserId(e.target.value); setError(""); }}
                  placeholder={loginAs === "admin" ? "admin@smarttransport.com" : loginAs === "operator" ? "OPR-xxx or email" : "STPM-XXX-XXXX or email"}
                  className="pl-10 bg-surface-2 border-border"
                />
              </div>
              {detectedRole && (
                <p className="text-xs mt-1 text-primary animate-fade-in-up">
                  {detectedRole === "Admin" ? "🔐" : detectedRole === "Operator" ? "📡" : "👤"} {detectedRole} Account Detected
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Password</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter password"
                  className="pl-10 pr-10 bg-surface-2 border-border"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-destructive text-xs text-center animate-fade-in-up">{error}</p>
            )}

            <Button onClick={handleLogin} disabled={!userId || !password || loading} className="w-full gradient-blue-orange text-primary-foreground">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogIn className="w-4 h-4 mr-1" /> Sign In</>}
            </Button>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-surface-2/50 border border-border">
            <p className="text-[10px] text-muted-foreground mb-2 font-medium">Getting Started:</p>
            <div className="space-y-1 text-[10px] text-muted-foreground">
              <p>🔐 Admin: <span className="text-foreground">admin@smarttransport.com</span> / <span className="text-foreground">admin123</span></p>
              <p>👤 User: Sign up to create a new account</p>
              <p>📡 Operator: Admin creates operator accounts</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-muted-foreground">
              Don't have an account?{" "}
              <button onClick={() => navigate("/signup")} className="text-primary hover:underline font-medium">Sign Up</button>
            </p>
            <button onClick={handleResetData} className="text-xs text-muted-foreground hover:text-warning flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
