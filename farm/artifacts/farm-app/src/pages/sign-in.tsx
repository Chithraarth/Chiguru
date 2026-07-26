import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BrandLogo } from "@/components/brand-logo";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithFacebook,
  sendPhoneOtp,
  type ConfirmationResult,
} from "@/lib/firebase";

type Mode = "signin" | "signup";
type Tab = "email" | "phone";

// The auth-state listener in App.tsx swaps this page out for the app itself
// the moment any of these methods succeeds — no explicit redirect needed here.
export default function SignInPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("email");
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);

  function handleError(err: unknown) {
    const message = err instanceof Error ? err.message.replace(/^Firebase:\s*/, "") : "Something went wrong";
    toast({ title: message, variant: "destructive" });
  }

  async function handleEmailSubmit() {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      if (mode === "signin") await signInWithEmail(email.trim(), password);
      else await signUpWithEmail(email.trim(), password);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFacebook() {
    setLoading(true);
    try {
      await signInWithFacebook();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    const digits = phone.trim();
    if (!digits) return;
    setLoading(true);
    try {
      const phoneNumber = digits.startsWith("+") ? digits : `+91${digits}`;
      const result = await sendPhoneOtp(phoneNumber, "recaptcha-container");
      setConfirmation(result);
      toast({ title: "OTP sent" });
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!confirmation || !otp.trim()) return;
    setLoading(true);
    try {
      await confirmation.confirm(otp.trim());
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-5">
        <div className="text-center space-y-1">
          <BrandLogo className="h-12 w-12 mx-auto" />
          <h1 className="text-lg font-bold text-gray-800">
            {mode === "signin" ? "Welcome back to Chiguru" : "Create your Chiguru account"}
          </h1>
          <p className="text-sm text-gray-500">
            {mode === "signin" ? "Sign in to manage your farm" : "Your farm data stays safe even if you lose your phone"}
          </p>
        </div>

        <div className="space-y-2.5">
          <Button onClick={handleGoogle} disabled={loading} variant="outline" className="w-full h-11 rounded-xl">
            Continue with Google
          </Button>
          <Button onClick={handleFacebook} disabled={loading} variant="outline" className="w-full h-11 rounded-xl">
            Continue with Facebook
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab("email")}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${tab === "email" ? "bg-white text-primary shadow-sm" : "text-gray-500"}`}
          >
            Email
          </button>
          <button
            onClick={() => setTab("phone")}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${tab === "phone" ? "bg-white text-primary shadow-sm" : "text-gray-500"}`}
          >
            Phone
          </button>
        </div>

        {tab === "email" ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl h-11 mt-1"
                autoComplete="email"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl h-11 mt-1"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            <Button
              onClick={handleEmailSubmit}
              disabled={loading || !email.trim() || !password}
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Sign up"}
            </Button>
            <button
              onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
              className="w-full text-center text-sm text-primary font-medium"
            >
              {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {!confirmation ? (
              <>
                <div>
                  <Label className="text-xs text-gray-500">Mobile number</Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98765 43210"
                    className="rounded-xl h-11 mt-1"
                  />
                </div>
                <Button
                  onClick={handleSendOtp}
                  disabled={loading || !phone.trim()}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
                </Button>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs text-gray-500">Enter the OTP sent to {phone}</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="rounded-xl h-11 mt-1"
                  />
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={loading || !otp.trim()}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & continue"}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Invisible reCAPTCHA anchor required by Firebase's phone-auth flow. */}
        <div id="recaptcha-container" />
      </div>
    </div>
  );
}
