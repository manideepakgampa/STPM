import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { fetchUserNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api";
import { subscribeToAppState } from "@/lib/app-state";
import { Bell, User, Settings, LogOut, Activity, ChevronDown, Home, Check, CheckCheck, X } from "lucide-react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const data = await fetchUserNotifications(user.id);
    setNotifications(data);
  }, [user]);

  useEffect(() => {
    loadNotifications();
    const unsub = subscribeToAppState(() => loadNotifications());
    return unsub;
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
  };

  const handleMarkAllRead = async () => {
    if (user) await markAllNotificationsRead(user.id);
  };

  const handleLogout = () => { logout(); navigate("/login"); };
  const initials = user?.fullName?.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "?";

  return (
    <nav className="glass sticky top-0 z-50 px-4 py-3 md:px-8">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl gradient-blue-orange flex items-center justify-center">
            <span className="text-foreground font-display font-bold text-sm">ST</span>
          </div>
          <span className="font-display font-bold text-lg hidden sm:block">
            Smart Transport <span className="text-gradient">ID</span>
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => navigate("/user/dashboard")} className="p-2 rounded-xl hover:bg-muted transition-colors" title="Home">
            <Home className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
              className="relative p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-secondary text-[10px] font-bold flex items-center justify-center text-secondary-foreground px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 glass-card p-0 animate-slide-up z-50 max-h-[70vh] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="font-display font-bold text-sm">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <CheckCheck className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                    <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 max-h-[55vh]">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-sm text-muted-foreground">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${!n.read ? "bg-primary/5" : ""}`}
                        onClick={() => handleMarkRead(n.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.read ? "bg-primary" : "bg-transparent"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-sm font-medium truncate ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                              <span className="text-[10px] text-muted-foreground shrink-0">{n.date}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                            {n.type === "broadcast" && (
                              <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary">Broadcast</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <button onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }} className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-muted transition-colors">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt={user.fullName} className="h-8 w-8 rounded-xl object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-xl gradient-blue-orange flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground">{initials}</span>
                </div>
              )}
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 glass-card p-2 animate-slide-up z-50">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-sm font-medium">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.id}</p>
                </div>
                {[
                  { icon: User, label: "Profile", action: () => navigate("/user/profile") },
                  { icon: Activity, label: "My Activity", action: () => navigate("/user/activity") },
                  { icon: Settings, label: "Settings", action: () => navigate("/user/settings") },
                  { icon: LogOut, label: "Logout", action: handleLogout },
                ].map(({ icon: Icon, label, action }) => (
                  <button key={label} onClick={() => { action(); setProfileOpen(false); }}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors ${
                      label === "Logout" ? "text-destructive" : "text-muted-foreground hover:text-foreground"
                    }`}>
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
