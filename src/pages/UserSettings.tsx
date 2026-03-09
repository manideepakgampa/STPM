import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { usePageLoader } from "@/hooks/use-page-loader";
import TransportLoader from "@/components/TransportLoader";
import Navbar from "@/components/Navbar";
import { updateAppState, exportAppState, importAppState } from "@/lib/app-state";
import { toast } from "sonner";
import { Bell, Database, Download, Eye, EyeOff, Lock, Moon, Shield, Upload, User } from "lucide-react";

const UserSettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const phase = usePageLoader();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [mobile, setMobile] = useState(user?.mobile ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportAppState();
    toast.success("Data exported successfully");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = importAppState(ev.target?.result as string);
      if (result.success) {
        toast.success("Data imported successfully. Refreshing...");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(result.error ?? "Import failed");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!user) { navigate("/login"); return null; }
  if (phase !== "hidden") return <TransportLoader fading={phase === "fading"} />;

  const handleSaveProfile = () => {
    if (!fullName.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    updateAppState((draft) => {
      const u = draft.users.find((e) => e.id === user.id);
      if (u) {
        u.fullName = fullName.trim();
        u.mobile = mobile.trim();
      }
    });
    setTimeout(() => {
      setSaving(false);
      toast.success("Profile updated successfully");
    }, 400);
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) { toast.error("Fill in both password fields"); return; }
    if (newPassword.length < 6) { toast.error("New password must be at least 6 characters"); return; }

    const state = updateAppState((draft) => {
      const u = draft.users.find((e) => e.id === user.id);
      if (u && u.password === currentPassword) {
        u.password = newPassword;
      }
    });

    const u = state ? (state as any).users?.find((e: any) => e.id === user.id) : null;
    if (u && u.password === newPassword) {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
    } else {
      toast.error("Current password is incorrect");
    }
  };

  const handleDeleteAccount = () => {
    updateAppState((draft) => {
      draft.users = draft.users.filter((u) => u.id !== user.id);
      delete draft.wallets[user.id];
    });
    logout();
    navigate("/login");
    toast.success("Account deleted");
  };

  return (
    <div className="min-h-screen gradient-dark">
      <Navbar />
      <main className="container mx-auto px-4 md:px-8 py-8 pb-24 space-y-8 max-w-2xl animate-fade-in-up">
        <h1 className="font-display text-3xl font-bold">Settings</h1>

        {/* Profile */}
        <section className="glass-card p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold">Edit Profile</h2>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-2xl bg-muted border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mobile</label>
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} className="w-full rounded-2xl bg-muted border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <input value={user.email} disabled className="w-full rounded-2xl bg-muted/50 border border-border px-4 py-3 text-sm text-muted-foreground cursor-not-allowed" />
          </div>
          <button onClick={handleSaveProfile} disabled={saving} className="w-full py-3 rounded-2xl gradient-blue-orange text-primary-foreground font-semibold hover-lift disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </section>

        {/* Password */}
        <section className="glass-card p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold">Change Password</h2>
          </div>
          <div className="relative">
            <label className="text-xs text-muted-foreground mb-1 block">Current Password</label>
            <input type={showPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-2xl bg-muted border border-border px-4 py-3 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-primary" />
            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-8 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">New Password</label>
            <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-2xl bg-muted border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <button onClick={handleChangePassword} className="w-full py-3 rounded-2xl bg-muted border border-border text-sm font-semibold hover:bg-muted/80 transition-colors">
            Update Password
          </button>
        </section>

        {/* Data Management */}
        <section className="glass-card p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold">Data Management</h2>
          </div>
          <p className="text-sm text-muted-foreground">Export your app data as JSON or import a previously exported file.</p>
          <div className="flex gap-3">
            <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-muted border border-border text-sm font-semibold hover:bg-muted/80 transition-colors">
              <Download className="w-4 h-4" /> Export Data
            </button>
            <button onClick={() => importRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-muted border border-border text-sm font-semibold hover:bg-muted/80 transition-colors">
              <Upload className="w-4 h-4" /> Import Data
            </button>
            <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>
        </section>

        {/* Danger Zone */}
        <section className="glass-card p-6 md:p-8 border-destructive/30">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-destructive" />
            <h2 className="font-display text-lg font-bold text-destructive">Danger Zone</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
          <button onClick={handleDeleteAccount} className="px-6 py-3 rounded-2xl bg-destructive/20 border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/30 transition-colors">
            Delete Account
          </button>
        </section>
      </main>
    </div>
  );
};

export default UserSettings;
