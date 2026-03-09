import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Calendar, KeyRound, Map, Bus, Users, TrendingUp } from "lucide-react";
import type { AppUser, OperatorRecord } from "@/lib/app-state";

interface OperatorDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: AppUser | null;
  operatorData: OperatorRecord | null;
}

const OperatorDetailSheet = ({ open, onOpenChange, operator, operatorData }: OperatorDetailSheetProps) => {
  if (!operator) return null;

  const initials = operator.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background border-border">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display text-xl">Operator Profile</SheetTitle>
        </SheetHeader>

        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="text-lg font-bold bg-accent/20 text-accent-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-display text-lg font-bold">{operator.fullName}</h3>
            <p className="text-sm text-muted-foreground">{operator.id}</p>
            <Badge className={operator.status === "active" ? "bg-success/10 text-success border-success/30 mt-1.5" : "bg-destructive/10 text-destructive border-destructive/30 mt-1.5"}>{operator.status}</Badge>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Contact & Credentials */}
        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Account Details</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{operator.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{operator.mobile || "Not provided"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Created {operator.createdAt}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono bg-surface-2 px-2 py-0.5 rounded text-xs">{operator.password}</span>
            </div>
          </div>
        </div>

        {operatorData && (
          <>
            <Separator className="mb-4" />

            {/* Assignment Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Assignment Details</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <Map className="w-4 h-4 text-muted-foreground" />
                  <span>{operatorData.assignedRoute} ({operatorData.from} → {operatorData.to})</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Bus className="w-4 h-4 text-muted-foreground" />
                  <span>Vehicle: {operatorData.vehicleId} · Capacity: {operatorData.vehicleCapacity}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>Current Passengers: {operatorData.currentPassengers}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span>Today's Trips: {operatorData.todayTrips}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground text-xs">Crowd Level:</span>
                  <Badge variant="outline" className={
                    operatorData.crowdLevel === "high" ? "border-destructive/30 text-destructive" :
                    operatorData.crowdLevel === "moderate" ? "border-warning/30 text-warning" :
                    "border-success/30 text-success"
                  }>{operatorData.crowdLevel}</Badge>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default OperatorDetailSheet;
