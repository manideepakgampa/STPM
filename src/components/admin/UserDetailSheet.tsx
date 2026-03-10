import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Mail, Phone, Calendar, User, Wallet, Clock3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppUser, TransportPass } from "@/lib/app-state";

interface UserDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: (AppUser & { walletBalance?: number; activePasses?: number }) | null;
  passes: TransportPass[];
  onDeleteUser?: (userId: string) => void;
  deletingUser?: boolean;
}

const UserDetailSheet = ({ open, onOpenChange, user, passes, onDeleteUser, deletingUser = false }: UserDetailSheetProps) => {
  if (!user) return null;

  const userPasses = passes.filter((p) => p.userId === user.id);
  const initials = user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background border-border">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display text-xl">User Profile</SheetTitle>
        </SheetHeader>

        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="w-16 h-16">
            {user.photoUrl && <AvatarImage src={user.photoUrl} alt={user.fullName} />}
            <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-display text-lg font-bold">{user.fullName}</h3>
            <p className="text-sm text-muted-foreground">{user.id}</p>
            <div className="flex gap-2 mt-1.5">
              <Badge className="bg-primary/10 text-primary border-primary/30 capitalize">{user.userType}</Badge>
              <Badge className={user.status === "active" ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"}>{user.status}</Badge>
            </div>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Contact Details */}
        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{user.mobile || "Not provided"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Joined {user.createdAt}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="capitalize">{user.userType}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span>Wallet Balance: ₹{user.walletBalance ?? 0}</span>
            </div>
          </div>
        </div>

        <Separator className="mb-4" />

        <div className="mb-6">
          <Button
            variant="destructive"
            className="w-full"
            disabled={deletingUser}
            onClick={() => onDeleteUser?.(user.id)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deletingUser ? "Deleting user..." : "Delete User Account"}
          </Button>
        </div>

        <Separator className="mb-4" />

        {/* Passes */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Passes ({userPasses.length})
          </h4>
          {userPasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No passes found for this user.</p>
          ) : (
            <div className="space-y-3">
              {userPasses.map((pass) => (
                <div key={pass.passId} className="rounded-2xl border border-border bg-surface-2/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{pass.type}</p>
                    <Badge className={
                      pass.status === "active" ? "bg-success/10 text-success border-success/30" :
                      pass.status === "expired" ? "bg-muted text-muted-foreground" :
                      "bg-destructive/10 text-destructive border-destructive/30"
                    }>{pass.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><CreditCard className="w-3 h-3 inline mr-1.5" />Pass ID: {pass.passId}</p>
                    <p><Calendar className="w-3 h-3 inline mr-1.5" />{pass.startDate} → {pass.expiryDate}</p>
                    <p><Wallet className="w-3 h-3 inline mr-1.5" />Fare: ₹{pass.fare}</p>
                    <p>Routes: {pass.routes.join(", ")}</p>
                    <p>Vehicle Types: {pass.vehicleTypes.join(", ")}</p>
                  </div>
                  {pass.history.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs font-medium mb-1.5">Recent Trips ({pass.history.length})</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {pass.history.slice(0, 5).map((h) => (
                          <div key={h.historyId} className="text-xs text-muted-foreground flex items-center gap-2">
                            <Clock3 className="w-3 h-3" />
                            <span>{h.routeName}: {h.from} → {h.to}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{h.access}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UserDetailSheet;
