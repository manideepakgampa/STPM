import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, ShieldCheck, X, Loader2, AlertTriangle } from "lucide-react";
import { FaceML, type FaceDescriptor } from "@/lib/face-ml";
import * as faceapi from "face-api.js";

interface FaceAuthDialogProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  userName?: string;
  /** Stored descriptor as number[] (from JSON). Converted to Float32Array internally. */
  storedDescriptor?: number[] | null;
}

const FaceAuthDialog = ({ open, onClose, onAuthenticated, userName, storedDescriptor }: FaceAuthDialogProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<"loading-model" | "ready" | "scanning" | "success" | "failed" | "error" | "no-face" | "mismatch">("loading-model");
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [modelReady, setModelReady] = useState(FaceML.isReady);
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);
  const detectionLoopRef = useRef<number | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
      setStatus("error");
    }
  }, []);

  // Bind stream to video element when it becomes available in the DOM
  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, status]);

  // Real-time face detection loop
  useEffect(() => {
    if (!open || !stream || !modelReady || status === "success" || status === "mismatch") return;

    let active = true;
    const detect = async () => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) {
        if (active) detectionLoopRef.current = window.setTimeout(detect, 500) as unknown as number;
        return;
      }
      try {
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        );
        if (active) setFaceDetected(!!detection);
      } catch {
        // ignore
      }
      if (active) detectionLoopRef.current = window.setTimeout(detect, 500) as unknown as number;
    };
    detect();

    return () => {
      active = false;
      if (detectionLoopRef.current) clearTimeout(detectionLoopRef.current);
    };
  }, [open, stream, modelReady, status]);

  useEffect(() => {
    if (!open) return;

    setConfidence(null);
    setError(null);

    // Initialize model + camera in parallel
    const setup = async () => {
      setStatus("loading-model");
      try {
        await Promise.all([FaceML.init(), startCamera()]);
        setModelReady(true);
        setStatus("ready");
      } catch {
        setError("Failed to load face recognition model.");
        setStatus("error");
      }
    };

    setup();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleScan = async () => {
    setStatus("scanning");
    setConfidence(null);

    await new Promise((r) => setTimeout(r, 600));

    if (!videoRef.current) {
      setStatus("error");
      setError("Camera not available.");
      return;
    }

    try {
      // Always require a live face to be detected
      const liveDescriptor = await FaceML.getDescriptor(videoRef.current);

      if (!liveDescriptor) {
        setStatus("no-face");
        setConfidence(null);
        return;
      }

      if (!storedDescriptor) {
        // No stored descriptor — just verify a real face is present
        setStatus("success");
        setConfidence(100);
        stream?.getTracks().forEach((t) => t.stop());
        setTimeout(() => onAuthenticated(), 1200);
        return;
      }

      const stored = new Float32Array(storedDescriptor);
      const result = FaceML.verify(liveDescriptor, stored);

      setConfidence(result.confidence);

      if (result.match) {
        setStatus("success");
        stream?.getTracks().forEach((t) => t.stop());
        setTimeout(() => onAuthenticated(), 1200);
      } else {
        // A face was detected but it doesn't match the registered user
        setStatus("mismatch");
      }
    } catch {
      setStatus("failed");
      setConfidence(0);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative glass-card w-full max-w-sm p-6 animate-slide-up">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full gradient-blue-orange flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <h3 className="font-display text-lg font-bold text-gradient">Face Authentication</h3>
          <p className="text-xs text-muted-foreground">
            {userName ? `Verify identity for ${userName}` : "Look at the camera to verify your identity"}
          </p>
        </div>

        {/* Model loading state */}
        {status === "loading-model" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading TensorFlow face model...</p>
            <p className="text-xs text-muted-foreground/60">This may take a moment on first use</p>
          </div>
        )}

        {status !== "loading-model" && (
          <>
            <div className="relative rounded-2xl overflow-hidden bg-surface-2 aspect-[4/3] mb-4">
              {error ? (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <p className="text-sm text-destructive text-center">{error}</p>
                </div>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
              )}

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-48 h-60 rounded-[50%] border-2 transition-all duration-500 ${
                  status === "scanning" ? "border-primary animate-pulse shadow-[0_0_30px_hsl(var(--primary)/0.4)]" :
                  status === "success" ? "border-success shadow-[0_0_30px_hsl(var(--success)/0.4)]" :
                  status === "failed" ? "border-destructive shadow-[0_0_20px_hsl(var(--destructive)/0.3)]" :
                  status === "mismatch" ? "border-destructive shadow-[0_0_30px_hsl(var(--destructive)/0.5)] animate-pulse" :
                  status === "no-face" ? "border-warning shadow-[0_0_20px_hsl(var(--warning)/0.3)]" :
                  faceDetected === true ? "border-success shadow-[0_0_20px_hsl(var(--success)/0.3)]" :
                  faceDetected === false ? "border-destructive/60 border-dashed" :
                  "border-primary/40 border-dashed"
                }`} />
              </div>

              {/* Live face detection badge */}
              {status === "ready" && faceDetected !== null && (
                <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  faceDetected ? "bg-success/80 text-success-foreground" : "bg-destructive/80 text-destructive-foreground"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${faceDetected ? "bg-success-foreground animate-pulse" : "bg-destructive-foreground"}`} />
                  {faceDetected ? "Face Detected" : "No Face Detected"}
                </div>
              )}

              {/* Scan line */}
              {status === "scanning" && (
                <div className="absolute inset-x-0 top-0 h-full overflow-hidden pointer-events-none">
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scanLine_2s_ease-in-out_infinite]" />
                </div>
              )}

              {/* Corner markers */}
              {status === "scanning" && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl" />
                  <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr" />
                  <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl" />
                  <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br" />
                </div>
              )}

              {/* Status overlays */}
              {status === "success" && (
                <div className="absolute inset-0 bg-success/10 flex items-center justify-center animate-fade-in-up">
                  <div className="bg-success/20 backdrop-blur-sm rounded-full p-4">
                    <ShieldCheck className="w-10 h-10 text-success" />
                  </div>
                </div>
              )}
              {status === "failed" && (
                <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center animate-fade-in-up">
                  <div className="bg-destructive/20 backdrop-blur-sm rounded-full p-4">
                    <AlertTriangle className="w-10 h-10 text-destructive" />
                  </div>
                </div>
              )}
              {status === "mismatch" && (
                <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center animate-fade-in-up">
                  <div className="bg-destructive/30 backdrop-blur-sm rounded-full p-4">
                    <AlertTriangle className="w-12 h-12 text-destructive animate-pulse" />
                  </div>
                </div>
              )}
            </div>

            {/* Confidence bar */}
            {confidence !== null && (
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Match Confidence</span>
                  <span className={status === "success" ? "text-success font-bold" : "text-destructive font-bold"}>
                    {confidence}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      status === "success" ? "bg-success" : "bg-destructive"
                    }`}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              </div>
            )}

            <div className="text-center mb-4">
              {status === "ready" && <p className="text-xs text-muted-foreground">Position your face within the oval frame</p>}
              {status === "scanning" && (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-sm font-medium">Analyzing with TensorFlow...</p>
                </div>
              )}
              {status === "success" && <p className="text-sm font-medium text-success">Identity Verified ✓</p>}
              {status === "failed" && <p className="text-sm font-medium text-destructive">Face mismatch detected. Try again.</p>}
              {status === "mismatch" && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mt-1">
                  <p className="text-sm font-bold text-destructive flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    ⚠️ Identity Mismatch Warning
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    The face detected does not match the registered user{userName ? ` (${userName})` : ""}. Only the account holder can authenticate. Unauthorized access attempts may be flagged.
                  </p>
                </div>
              )}
              {status === "no-face" && <p className="text-sm font-medium text-warning">No face detected. Position your face clearly.</p>}
            </div>

            {status !== "success" && (
              <Button
                onClick={status === "failed" || status === "no-face" || status === "mismatch" ? () => { setStatus("ready"); setConfidence(null); } : handleScan}
                disabled={status === "scanning" || status === "error"}
                className="w-full gradient-blue-orange text-primary-foreground"
              >
                {status === "scanning" ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Verifying...</>
                ) : (
                  <><Camera className="w-4 h-4 mr-1" /> {status === "failed" || status === "no-face" || status === "mismatch" ? "Retry Scan" : "Start Face Scan"}</>
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FaceAuthDialog;
