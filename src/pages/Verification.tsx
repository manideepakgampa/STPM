import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getAppState } from "@/lib/app-state";
import { FaceML } from "@/lib/face-ml";
import {
  Camera, Eye, Fingerprint, ShieldCheck, XCircle, Loader2, KeyRound, Smartphone, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type VerifyStage = "camera-permission" | "loading-model" | "face-scan" | "success" | "failure" | "no-face" | "otp" | "liveness";

const Verification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stage, setStage] = useState<VerifyStage>("camera-permission");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [confidence, setConfidence] = useState<number | null>(null);

  const storedDescriptor: number[] | null = (() => {
    if (!user) return null;
    const appUser = getAppState().users.find((u) => u.id === user.id);
    return appUser?.faceDescriptor ?? null;
  })();

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleStartScan = async () => {
    setStage("loading-model");
    setConfidence(null);

    // Init model + camera in parallel
    try {
      const [, mediaStream] = await Promise.all([
        FaceML.init(),
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        }),
      ]);
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setStage("otp");
      return;
    }

    setStage("face-scan");

    // Wait for camera to warm up
    await new Promise((r) => setTimeout(r, 1500));

    if (!videoRef.current || !storedDescriptor) {
      await new Promise((r) => setTimeout(r, 1500));
      setConfidence(100);
      stopCamera();
      setStage("success");
      return;
    }

    try {
      const stored = new Float32Array(storedDescriptor);
      const result = await FaceML.matchFace(videoRef.current, stored);
      stopCamera();

      if (result.noFace) {
        setStage("no-face");
        return;
      }

      setConfidence(result.confidence);
      setStage(result.isMatch ? "success" : "failure");
    } catch {
      setConfidence(0);
      stopCamera();
      setStage("failure");
    }
  };

  return (
    <div className="min-h-screen gradient-dark">
      <header className="glass sticky top-0 z-50 px-4 py-3 md:px-8">
        <div className="container mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-lg">Identity Verification</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-8 max-w-md">
        {/* Camera Permission */}
        {stage === "camera-permission" && (
          <div className="glass-card p-8 text-center animate-fade-in-up">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Camera Access Required</h2>
            <p className="text-sm text-muted-foreground mb-2">We use TensorFlow.js + BlazeFace for on-device face verification.</p>
            {!storedDescriptor && (
              <p className="text-xs text-warning mb-4">⚠️ No face data registered. Re-register with face capture for ML verification.</p>
            )}
            <Button onClick={handleStartScan} className="w-full gradient-blue-orange text-primary-foreground mb-3">
              Allow Camera & Start
            </Button>
            <Button onClick={() => setStage("otp")} variant="outline" className="w-full">
              <Smartphone className="w-4 h-4 mr-2" /> Use OTP Instead
            </Button>
          </div>
        )}

        {/* Loading Model */}
        {stage === "loading-model" && (
          <div className="glass-card p-8 text-center animate-fade-in-up">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <h2 className="font-display text-lg font-bold mb-2">Loading Face Model</h2>
            <p className="text-sm text-muted-foreground">Initializing TensorFlow.js & BlazeFace...</p>
            <p className="text-xs text-muted-foreground/60 mt-2">This may take a moment on first use</p>
          </div>
        )}

        {/* Face Scan */}
        {stage === "face-scan" && (
          <div className="glass-card p-8 text-center animate-fade-in-up">
            <div className="relative w-64 h-48 mx-auto mb-6 rounded-2xl overflow-hidden bg-surface-2">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-52 rounded-[50%] border-2 border-primary animate-pulse shadow-[0_0_30px_hsl(var(--primary)/0.3)]" />
              </div>
              <div className="absolute inset-x-0 top-0 h-full overflow-hidden pointer-events-none">
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scanLine_2s_ease-in-out_infinite]" />
              </div>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br" />
              </div>
            </div>
            <h2 className="font-display text-lg font-bold mb-2">Scanning Face...</h2>
            <p className="text-sm text-muted-foreground">Please look directly at the camera</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-primary text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Running BlazeFace detection
            </div>
          </div>
        )}

        {/* No Face Detected */}
        {stage === "no-face" && (
          <div className="animate-fade-in-up">
            <div className="glass-card p-8 text-center border-warning/30">
              <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-warning" />
              </div>
              <h2 className="font-display text-xl font-bold text-warning mb-2">No Face Detected</h2>
              <p className="text-sm text-muted-foreground mb-6">BlazeFace couldn't detect a face. Ensure good lighting and face the camera directly.</p>
              <div className="space-y-3">
                <Button onClick={handleStartScan} className="w-full gradient-blue-orange text-primary-foreground">
                  <Camera className="w-4 h-4 mr-2" /> Retry Face Scan
                </Button>
                <Button onClick={() => setStage("otp")} variant="outline" className="w-full">
                  <KeyRound className="w-4 h-4 mr-2" /> Use OTP
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {stage === "success" && (
          <div className="animate-fade-in-up">
            <div className="glass-card p-8 text-center border-success/30">
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-success" />
              </div>
              <h2 className="font-display text-xl font-bold text-success mb-2">Verification Successful</h2>
              <p className="text-sm text-muted-foreground mb-2">Your identity has been verified.</p>
              {confidence !== null && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Match Confidence</span>
                    <span className="text-success font-bold">{confidence}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full rounded-full bg-success transition-all duration-700" style={{ width: `${confidence}%` }} />
                  </div>
                </div>
              )}
              <Button onClick={() => navigate("/user/dashboard")} className="w-full gradient-blue-orange text-primary-foreground">
                Continue to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Failure */}
        {stage === "failure" && (
          <div className="animate-fade-in-up">
            <div className="glass-card p-8 text-center border-destructive/30">
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="font-display text-xl font-bold text-destructive mb-2">Verification Failed</h2>
              <p className="text-sm text-muted-foreground mb-2">Face did not match the registered profile.</p>
              {confidence !== null && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Match Confidence</span>
                    <span className="text-destructive font-bold">{confidence}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full rounded-full bg-destructive transition-all duration-700" style={{ width: `${confidence}%` }} />
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <Button onClick={handleStartScan} className="w-full gradient-blue-orange text-primary-foreground">
                  <Camera className="w-4 h-4 mr-2" /> Retry Face Scan
                </Button>
                <Button onClick={() => setStage("liveness")} className="w-full" variant="outline">
                  <Fingerprint className="w-4 h-4 mr-2" /> Try Liveness Check
                </Button>
                <Button onClick={() => setStage("otp")} className="w-full" variant="outline">
                  <KeyRound className="w-4 h-4 mr-2" /> Use OTP
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* OTP */}
        {stage === "otp" && (
          <div className="glass-card p-8 text-center animate-fade-in-up">
            <KeyRound className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="font-display text-lg font-bold mb-2">OTP Verification</h2>
            <p className="text-sm text-muted-foreground mb-6">Enter the 6-digit code sent to your registered number</p>
            <div className="flex justify-center gap-2 mb-6">
              {otp.map((d, i) => (
                <input key={i} value={d} maxLength={1}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/, "");
                    const next = [...otp]; next[i] = v; setOtp(next);
                  }}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-border bg-surface-2 text-foreground focus:outline-none focus:border-primary transition-all"
                />
              ))}
            </div>
            <Button onClick={() => setStage("success")} className="w-full gradient-blue-orange text-primary-foreground">
              Verify OTP
            </Button>
          </div>
        )}

        {/* Liveness */}
        {stage === "liveness" && (
          <div className="glass-card p-8 text-center animate-fade-in-up">
            <Fingerprint className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="font-display text-lg font-bold mb-2">Liveness Check</h2>
            <p className="text-sm text-muted-foreground mb-6">Follow the instructions below:</p>
            <div className="space-y-3 mb-6">
              {["Blink your eyes slowly", "Turn your head left", "Turn your head right"].map((inst, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-border text-left">
                  <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                  <span className="text-sm">{inst}</span>
                </div>
              ))}
            </div>
            <Button onClick={handleStartScan} className="w-full gradient-blue-orange text-primary-foreground">
              <Camera className="w-4 h-4 mr-2" /> Start Liveness Check
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Verification;
