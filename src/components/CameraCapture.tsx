import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check, X, Loader2 } from "lucide-react";
import { FaceML } from "@/lib/face-ml";
import * as faceapi from "face-api.js";

interface CameraCaptureProps {
  onCapture: (imageData: string, descriptor?: number[]) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

const CameraCapture = ({ onCapture, onClose, title = "Capture Photo", subtitle = "Position your face in the frame" }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [modelLoading, setModelLoading] = useState(!FaceML.isReady);
  const [error, setError] = useState<string | null>(null);
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
    }
  }, []);

  // Bind stream to video element when it becomes available in the DOM
  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, captured]);

  // Real-time face detection loop
  useEffect(() => {
    if (captured || !stream || !FaceML.isReady) return;

    let active = true;
    const detect = async () => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) {
        if (active) detectionLoopRef.current = requestAnimationFrame(detect);
        return;
      }
      try {
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        );
        if (active) setFaceDetected(!!detection);
      } catch {
        // ignore detection errors
      }
      // Poll every ~500ms to avoid perf issues
      if (active) {
        detectionLoopRef.current = window.setTimeout(() => {
          if (active) detect();
        }, 500) as unknown as number;
      }
    };
    detect();

    return () => {
      active = false;
      if (detectionLoopRef.current) {
        clearTimeout(detectionLoopRef.current);
      }
    };
  }, [captured, stream, modelLoading]);

  useEffect(() => {
    const setup = async () => {
      await startCamera();
      if (!FaceML.isReady) {
        setModelLoading(true);
        try {
          await FaceML.init();
        } catch {
          // Model load failed — we can still capture photos, just no descriptor
        }
        setModelLoading(false);
      }
    };
    setup();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    // Extract face descriptor using TF.js
    let desc: number[] | null = null;
    try {
      if (FaceML.isReady) {
        const faceDesc = await FaceML.getDescriptor(canvas);
        if (faceDesc) {
          desc = Array.from(faceDesc); // Convert Float32Array to number[] for JSON storage
        }
      }
    } catch {
      // Descriptor extraction failed — still save the photo
    }

    setDescriptor(desc);
    setCaptured(dataUrl);
    setProcessing(false);
    stream?.getTracks().forEach((t) => t.stop());
  };

  const retake = async () => {
    setCaptured(null);
    setDescriptor(null);
    await startCamera();
  };

  const confirm = () => {
    if (captured) onCapture(captured, descriptor ?? undefined);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative glass-card w-full max-w-sm p-6 animate-slide-up">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <h3 className="font-display text-lg font-bold text-gradient">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {modelLoading && (
            <p className="text-xs text-primary mt-1 flex items-center justify-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading face model...
            </p>
          )}
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-surface-2 aspect-[4/3] mb-4">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          ) : captured ? (
            <img src={captured} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
          )}

          {/* Face guide overlay */}
          {!captured && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-48 h-60 rounded-[50%] border-2 transition-colors duration-300 ${
                faceDetected === null ? "border-primary/50 border-dashed animate-pulse" :
                faceDetected ? "border-success shadow-[0_0_20px_hsl(var(--success)/0.3)]" :
                "border-destructive/60 border-dashed"
              }`} />
            </div>
          )}

          {/* Live face detection badge */}
          {!captured && !error && faceDetected !== null && (
            <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              faceDetected ? "bg-success/80 text-success-foreground" : "bg-destructive/80 text-destructive-foreground"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${faceDetected ? "bg-success-foreground animate-pulse" : "bg-destructive-foreground"}`} />
              {faceDetected ? "Face Detected" : "No Face Detected"}
            </div>
          )}

          {/* Descriptor status badge on captured photo */}
          {captured && (
            <div className={`absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              descriptor ? "bg-success/80 text-success-foreground" : "bg-warning/80 text-warning-foreground"
            }`}>
              {descriptor ? "✓ Face Encoded" : "⚠ No face detected"}
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-2">
          {captured ? (
            <>
              <Button variant="outline" onClick={retake} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-1" /> Retake
              </Button>
              <Button onClick={confirm} className="flex-1 gradient-blue-orange text-primary-foreground">
                <Check className="w-4 h-4 mr-1" /> Confirm
              </Button>
            </>
          ) : (
            <Button onClick={capturePhoto} disabled={!!error || processing} className="w-full gradient-blue-orange text-primary-foreground">
              {processing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Analyzing Face...</> : <><Camera className="w-4 h-4 mr-1" /> Capture</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
