import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "@/lib/auth";
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  CreditCard,
  Download,
  RefreshCw,
  Shield,
  TrainFront,
  X,
} from "lucide-react";

interface PassCardProps {
  pass: {
    passId: string;
    userId: string;
    type: string;
    startDate: string;
    expiryDate: string;
    status: string;
    routes: string[];
    vehicleTypes?: string[];
    fare: number;
    issuedAt: string;
    history?: Array<{
      historyId: string;
      routeId: string;
      routeName: string;
      from: string;
      to: string;
      operatorId: string;
      scannedAt: string;
      access: string;
    }>;
  };
}

const PassCard = ({ pass }: PassCardProps) => {
  const { user } = useAuth();
  const [detailOpen, setDetailOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const isExpired = new Date(pass.expiryDate) < new Date();
  const daysLeft = Math.ceil(
    (new Date(pass.expiryDate).getTime() - Date.now()) / 86400000,
  );
  const qrPayload = useMemo(
    () =>
      JSON.stringify({
        userId: pass.userId,
        passId: pass.passId,
        expiryDate: pass.expiryDate,
        passType: pass.type,
      }),
    [pass],
  );

  useEffect(() => {
    QRCode.toDataURL(qrPayload, {
      width: 440,
      margin: 2,
      color: { dark: "#0b1220", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [qrPayload]);

  useEffect(() => {
    if (detailOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [detailOpen]);

  const handleDownloadQR = async () => {
    if (!qrDataUrl || isExpired || downloading) return;

    setDownloading(true);
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `QR-${pass.passId}.png`;
    link.click();
    setDownloading(false);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2200);
  };

  return (
    <>
      <div
        onClick={() => setDetailOpen(true)}
        className="relative w-full max-w-xl cursor-pointer group"
      >
        <div className="absolute inset-0 gradient-blue-orange rounded-3xl opacity-70 blur-2xl group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative gradient-blue-orange rounded-3xl p-6 md:p-8 overflow-hidden hover-lift">
          <div className="absolute inset-0 opacity-15">
            <div className="absolute -top-12 right-0 h-40 w-40 rounded-full border border-foreground/20" />
            <div className="absolute -bottom-12 left-0 h-32 w-32 rounded-full border border-foreground/20" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-foreground/80" />
                <span className="text-xs font-medium tracking-[0.3em] uppercase text-foreground/70">
                  Smart Transport Pass
                </span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${isExpired ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-success/20 text-success-foreground border-success/30"}`}
              >
                {isExpired ? "Expired" : "Active"}
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-display font-bold tracking-wider">
              {pass.passId}
            </p>
            <p className="text-sm text-foreground/70 mt-1">{pass.type}</p>
            <div className="flex flex-wrap gap-6 mt-8 text-sm text-foreground/85">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/50 mb-1">
                  Issued
                </p>
                <p className="font-semibold">{pass.issuedAt}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/50 mb-1">
                  Expires
                </p>
                <p className="font-semibold">{pass.expiryDate}</p>
              </div>
              {!isExpired && daysLeft <= 7 && (
                <div className="ml-auto text-right">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/50 mb-1">
                    Alert
                  </p>
                  <p className="font-semibold text-warning">
                    {daysLeft} days left
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {detailOpen && (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain"
          onClick={() => setDetailOpen(false)}
        >
          <div className="fixed inset-0 gradient-blue-orange opacity-25 pointer-events-none" />
          <div className="fixed inset-0 bg-background/85 backdrop-blur-2xl pointer-events-none" />
          <div className="fixed -top-20 right-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl animate-float pointer-events-none" />
          <div className="fixed -bottom-24 left-0 h-96 w-96 rounded-full bg-secondary/15 blur-3xl animate-float pointer-events-none" />

          <div className="relative z-10 min-h-full p-4 md:p-10 flex items-start justify-center">
            <div
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-5xl my-8 rounded-[2rem] border border-border/40 bg-background/40 backdrop-blur-2xl shadow-2xl overflow-hidden animate-slide-up"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] min-h-[80vh]">
                <div className="relative gradient-blue-orange p-8 md:p-10 text-primary-foreground overflow-hidden">
                  <button
                    onClick={() => setDetailOpen(false)}
                    className="absolute top-6 right-6 p-2 rounded-2xl bg-background/15 hover:bg-background/20 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="relative z-10 flex flex-col h-full">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-primary-foreground/70 mb-2">
                        Immersive Pass View
                      </p>
                      <h2 className="font-display text-3xl md:text-4xl font-bold">
                        {pass.type}
                      </h2>
                      <p className="text-sm text-primary-foreground/75 mt-2">
                        Use this QR if live scanning is unavailable.
                      </p>
                    </div>

                    <div className="my-10 flex justify-center">
                      <div
                        className={`rounded-[2rem] p-5 bg-background/90 border ${isExpired ? "border-destructive/30" : "border-primary/20 glow-subtle"}`}
                      >
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt={`QR code for ${pass.passId}`}
                            className="w-56 h-56 rounded-2xl bg-white"
                          />
                        ) : (
                          <div className="w-56 h-56 rounded-2xl bg-white/80 animate-pulse" />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mt-auto">
                      <div className="rounded-3xl bg-background/10 border border-background/10 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-primary-foreground/60 mb-2">
                          User Name
                        </p>
                        <p className="font-semibold">
                          {user?.fullName ?? pass.userId}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-background/10 border border-background/10 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-primary-foreground/60 mb-2">
                          Pass ID
                        </p>
                        <p className="font-semibold">{pass.passId}</p>
                      </div>
                      <div className="rounded-3xl bg-background/10 border border-background/10 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-primary-foreground/60 mb-2">
                          Issued
                        </p>
                        <p className="font-semibold">{pass.issuedAt}</p>
                      </div>
                      <div className="rounded-3xl bg-background/10 border border-background/10 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-primary-foreground/60 mb-2">
                          Expires
                        </p>
                        <p className="font-semibold">{pass.expiryDate}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-10 bg-background/55 text-foreground overflow-y-auto">
                  <div className="flex items-center gap-2 mb-4">
                    {!isExpired && (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    )}
                    <span
                      className={`text-sm font-medium ${isExpired ? "text-destructive" : "text-success"}`}
                    >
                      {isExpired
                        ? "Pass expired · QR disabled"
                        : "Verified QR · Duplicate-scan protection enabled"}
                    </span>
                  </div>

                  <div className="space-y-4 mb-6">
                    {[
                      { label: "User ID", value: pass.userId },
                      { label: "Pass Type", value: pass.type },
                      {
                        label: "Status",
                        value: isExpired ? "Expired" : "Active",
                      },
                      { label: "Fare", value: `₹${pass.fare}` },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between py-3 border-b border-border/60"
                      >
                        <span className="text-sm text-muted-foreground">
                          {item.label}
                        </span>
                        <span className="text-sm font-medium">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-3">
                      Vehicle eligibility
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {pass.vehicleTypes?.map((vehicle) => (
                        <div
                          key={vehicle}
                          className="px-4 py-3 rounded-2xl bg-surface-2 border border-border flex items-center gap-2 text-sm"
                        >
                          {vehicle === "Bus" ? (
                            <Bus className="w-4 h-4 text-primary" />
                          ) : (
                            <TrainFront className="w-4 h-4 text-secondary" />
                          )}
                          {vehicle}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-3">
                      Valid routes
                    </p>
                    <div className="space-y-2">
                      {pass.routes.map((route) => (
                        <div
                          key={route}
                          className="px-4 py-3 rounded-2xl bg-surface-2 border border-border flex items-center gap-2 text-sm"
                        >
                          <Shield className="w-4 h-4 text-primary" />
                          {route}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-3">
                      Pass history
                    </p>
                    {pass.history && pass.history.length > 0 ? (
                      <div className="space-y-2">
                        {pass.history.slice(0, 5).map((entry) => (
                          <div
                            key={entry.historyId}
                            className="px-4 py-3 rounded-2xl bg-surface-2 border border-border text-sm"
                          >
                            <p className="font-medium">{entry.routeName}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {entry.from} → {entry.to}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(entry.scannedAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-4 rounded-2xl bg-surface-2 border border-border text-sm text-muted-foreground">
                        No trip history yet.
                      </div>
                    )}
                  </div>

                  {isExpired && (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4" />
                      This pass is expired, so QR download is blocked.
                    </div>
                  )}

                  <button
                    onClick={handleDownloadQR}
                    disabled={isExpired || !qrDataUrl || downloading}
                    className="w-full py-4 rounded-2xl bg-surface-2 border border-border text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                  >
                    {downloaded ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-success" />{" "}
                        Downloaded
                      </>
                    ) : downloading ? (
                      "Preparing QR..."
                    ) : (
                      <>
                        <Download className="w-4 h-4" /> Download QR
                      </>
                    )}
                  </button>
                  <p className="text-xs text-muted-foreground text-center mb-6">
                    Use this QR if live scanning is unavailable.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PassCard;
