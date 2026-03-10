import { useState, useRef, useEffect } from "react";
import TransportLoader from "@/components/TransportLoader";
import { usePageLoader } from "@/hooks/use-page-loader";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Mail,
  Phone,
  Shield,
  Eye,
  EyeOff,
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import CameraCapture from "@/components/CameraCapture";
import FaceAuthDialog from "@/components/FaceAuthDialog";

const COUNTRY_CODES = [
  { code: "+91", country: "IN" },
  { code: "+1", country: "US" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "AU" },
  { code: "+81", country: "JP" },
];

const Signup = () => {
  const navigate = useNavigate();
  const { signup, generateOtp, verifyOtp } = useAuth();
  const phase = usePageLoader();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<"student" | "employee">("student");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpVerified, setOtpVerified] = useState(false);
  const [currentOtp, setCurrentOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [generatedId, setGeneratedId] = useState("");
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [showFaceAuth, setShowFaceAuth] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const mobileValid = /^\d{7,15}$/.test(mobile);
  const step1Valid = fullName.trim().length >= 2 && mobileValid && emailValid;

  useEffect(() => {
    if (step === 2 && otpTimer > 0 && !otpVerified) {
      const t = setTimeout(() => setOtpTimer((v) => v - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [step, otpTimer, otpVerified]);

  const sendOtp = () => {
    const code = generateOtp();
    setCurrentOtp(code);
    setShowOtpPopup(true);
    setTimeout(() => setShowOtpPopup(false), 6000);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setOtpError("");
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = () => {
    setLoading(true);
    setTimeout(() => {
      const inputOtp = otp.join("");
      if (verifyOtp(inputOtp, currentOtp)) {
        setOtpVerified(true);
        setLoading(false);
        setTimeout(() => setStep(3), 800);
      } else {
        setOtpError("Invalid OTP. Please try again.");
        setLoading(false);
      }
    }, 1000);
  };

  const resendOtp = () => {
    setOtp(["", "", "", "", "", ""]);
    setOtpTimer(60);
    setOtpVerified(false);
    setOtpError("");
    sendOtp();
  };

  const getStrength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strength = getStrength(password);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = [
    "",
    "bg-destructive",
    "bg-warning",
    "bg-primary",
    "bg-success",
  ][strength];
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const step3Valid = strength >= 2 && passwordsMatch && termsAccepted;

  const handleCreateAccount = () => {
    if (!photoPreview) {
      setShowCamera(true);
      return;
    }
    if (!faceVerified) {
      setShowFaceAuth(true);
      return;
    }
    doSignup();
  };

  const doSignup = async () => {
    setLoading(true);
    const result = await signup({
      fullName,
      email,
      mobile: `${countryCode}${mobile}`,
      userType,
      password,
      photoUrl: photoPreview,
      faceDescriptor,
    });
    setLoading(false);
    if (result.success && result.userId) {
      setGeneratedId(result.userId);
      setSuccessModal(true);
    }
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (phase !== "hidden")
    return <TransportLoader fading={phase === "fading"} />;

  return (
    <div className="min-h-screen gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-secondary/5 blur-3xl animate-float"
          style={{ animationDelay: "3s" }}
        />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-3">
            {["Basic Info", "Verify Email", "Security"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                    step > i + 1
                      ? "gradient-blue-orange text-primary-foreground"
                      : step === i + 1
                        ? "border-2 border-primary text-primary glow-subtle"
                        : "border border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-xs hidden sm:block ${step >= i + 1 ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          <Progress value={(step / 3) * 100} className="h-1" />
        </div>

        <div className="glass-card p-8">
          <h1 className="font-display text-2xl font-bold text-gradient mb-1">
            Create Account
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Join the Smart Transport Network
          </p>

          {step === 1 && (
            <div className="space-y-4 animate-fade-in-up">
              <div>
                <Label className="text-xs mb-1.5 block">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="pl-10 bg-surface-2 border-border"
                  />
                </div>
                {fullName.length > 0 && fullName.trim().length < 2 && (
                  <p className="text-destructive text-xs mt-1">
                    Name must be at least 2 characters
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Mobile Number</Label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-surface-2 border border-border rounded-md px-2 text-sm text-foreground focus:outline-none w-20"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} {c.country}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={mobile}
                      onChange={(e) =>
                        setMobile(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Mobile number"
                      className="pl-10 bg-surface-2 border-border"
                    />
                  </div>
                </div>
                {mobile.length > 0 && !mobileValid && (
                  <p className="text-destructive text-xs mt-1">
                    Enter a valid mobile number
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="pl-10 bg-surface-2 border-border"
                    type="email"
                  />
                </div>
                {email.length > 0 && !emailValid && (
                  <p className="text-destructive text-xs mt-1">
                    Enter a valid email address
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">User Type</Label>
                <div className="flex gap-2">
                  {(["student", "employee"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setUserType(t)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 capitalize ${
                        userType === t
                          ? "gradient-blue-orange text-primary-foreground glow-subtle"
                          : "bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">
                  Face Photo <span className="text-destructive">*</span>
                </Label>
                <div
                  onClick={() => setShowCamera(true)}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {photoPreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={photoPreview}
                        alt="Face"
                        className="w-20 h-20 object-cover rounded-full mx-auto ring-2 ring-primary/30"
                      />
                      <p className="text-xs text-primary">Tap to retake</p>
                    </div>
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Tap to open camera & capture face
                      </p>
                    </>
                  )}
                </div>
              </div>
              <Button
                onClick={() => {
                  setStep(2);
                  setOtpTimer(60);
                  sendOtp();
                }}
                disabled={!step1Valid}
                className="w-full gradient-blue-orange text-primary-foreground"
              >
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in-up text-center">
              <div>
                <Mail className="w-12 h-12 text-primary mx-auto mb-3 animate-pulse-glow rounded-full p-2" />
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit code to
                </p>
                <p className="text-sm font-semibold text-foreground">{email}</p>
              </div>
              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    value={digit}
                    maxLength={1}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    disabled={otpVerified}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all duration-300 bg-surface-2 text-foreground focus:outline-none ${
                      otpVerified
                        ? "border-success glow-subtle"
                        : "border-border focus:border-primary focus:glow-subtle"
                    }`}
                  />
                ))}
              </div>
              {otpError && (
                <p className="text-destructive text-xs animate-fade-in-up">
                  {otpError}
                </p>
              )}
              {otpVerified ? (
                <div className="flex items-center justify-center gap-2 text-success animate-fade-in-up">
                  <CheckCircle2 className="w-5 h-5" />{" "}
                  <span className="font-medium">Verified!</span>
                </div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground">
                    {otpTimer > 0 ? (
                      <span>
                        Resend in{" "}
                        <span className="text-primary font-bold">
                          {otpTimer}s
                        </span>
                      </span>
                    ) : (
                      <button
                        onClick={resendOtp}
                        className="text-primary hover:underline font-medium"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <Button
                    onClick={handleVerifyOtp}
                    disabled={otp.join("").length < 6 || loading}
                    className="w-full gradient-blue-orange text-primary-foreground"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Verify"
                    )}
                  </Button>
                </>
              )}
              <button
                onClick={() => setStep(1)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in-up">
              <div>
                <Label className="text-xs mb-1.5 block">Password</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password"
                    className="pl-10 pr-10 bg-surface-2 border-border"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-500 ${strength >= i ? strengthColor : "bg-muted"}`}
                        />
                      ))}
                    </div>
                    <p
                      className={`text-xs ${strength <= 1 ? "text-destructive" : strength === 2 ? "text-warning" : strength === 3 ? "text-primary" : "text-success"}`}
                    >
                      {strengthLabel}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Confirm Password</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="pl-10 pr-10 bg-surface-2 border-border"
                  />
                  <button
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-destructive text-xs mt-1">
                    Passwords do not match
                  </p>
                )}
              </div>
              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  checked={termsAccepted}
                  onCheckedChange={(v) => setTermsAccepted(!!v)}
                />
                <label className="text-xs text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <span className="text-primary hover:underline cursor-pointer">
                    Terms & Conditions
                  </span>{" "}
                  and{" "}
                  <span className="text-primary hover:underline cursor-pointer">
                    Privacy Policy
                  </span>
                </label>
              </div>
              <Button
                onClick={handleCreateAccount}
                disabled={!step3Valid || loading}
                className="w-full gradient-blue-orange text-primary-foreground"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : !photoPreview ? (
                  "Capture Face & Create"
                ) : !faceVerified ? (
                  "Verify Face & Create"
                ) : (
                  "Create Account"
                )}
              </Button>
              <button
                onClick={() => setStep(2)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-primary hover:underline font-medium"
            >
              Login
            </button>
          </p>
        </div>
      </div>

      {/* OTP Popup */}
      {showOtpPopup && (
        <div className="fixed top-6 right-6 z-[100] animate-fade-in-up">
          <div className="glass-card border border-primary/30 p-4 rounded-2xl shadow-2xl max-w-xs glow-subtle">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 gradient-blue-orange rounded-full flex items-center justify-center">
                <Mail className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs font-semibold">OTP Notification</p>
                <p className="text-[10px] text-muted-foreground">
                  Smart Transport System
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              Your verification code is:
            </p>
            <p className="text-2xl font-display font-bold text-gradient tracking-[0.3em]">
              {currentOtp}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              OTP (randomly generated for simulation)
            </p>
          </div>
        </div>
      )}

      {/* Camera Capture */}
      {showCamera && (
        <CameraCapture
          title="Capture Your Face"
          subtitle="This photo will be used for face authentication"
          onCapture={(img, desc) => {
            setPhotoPreview(img);
            if (desc) setFaceDescriptor(desc);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Face Auth Verification */}
      <FaceAuthDialog
        open={showFaceAuth}
        onClose={() => setShowFaceAuth(false)}
        onAuthenticated={() => {
          setFaceVerified(true);
          setShowFaceAuth(false);
          doSignup();
        }}
        userName={fullName}
        storedDescriptor={faceDescriptor}
      />

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
          <div className="relative glass-card w-full max-w-sm p-8 text-center animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">
              Account Created!
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your unique User ID:
            </p>
            <div className="py-3 px-6 rounded-xl bg-surface-2 border border-border mb-4">
              <p className="text-2xl font-display font-bold text-gradient tracking-wider">
                {generatedId}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Your User ID and Password have been sent to your registered email.
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full gradient-blue-orange text-primary-foreground"
            >
              Proceed to Login
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Signup;
