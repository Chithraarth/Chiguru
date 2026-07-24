import { useEffect, useRef, useState } from "react";
import { Loader2, ScanLine, Keyboard, Sprout, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost, verifyCode } from "@/lib/api";
import { savePairing, type Pairing } from "@/lib/pairing";
import { QrScanner } from "@/components/qr-scanner";
import { ErrorBoundary } from "@/components/error-boundary";

interface VerifyResult {
  ok: boolean;
  farmName: string;
}

function codeFromText(text: string): string {
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    const c = url.searchParams.get("code");
    if (c) return c.trim().toUpperCase();
  } catch {
    // not a URL — treat as raw code
  }
  return trimmed.toUpperCase();
}

export function PairScreen({ onPaired }: { onPaired: (p: Pairing) => void }) {
  const [mode, setMode] = useState<"scan" | "manual">("manual");
  const [code, setCode] = useState("");
  const [managerName, setManagerName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const autoTried = useRef(false);

  async function attemptPair(rawCode: string, name: string) {
    const finalCode = codeFromText(rawCode);
    if (!finalCode) {
      setError("Please enter the farm code");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name first");
      setMode("manual");
      setCode(finalCode);
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const verdict = await verifyCode(finalCode);
      if (verdict === "valid") {
        const res = await apiPost<VerifyResult>("/manager/verify", { code: finalCode });
        const pairing: Pairing = { code: finalCode, farmName: res.farmName, managerName: name.trim() };
        savePairing(pairing);
        onPaired(pairing);
      } else if (verdict === "plan") {
        setMode("manual");
        setError("This farm's plan doesn't include manager devices. Ask the owner to upgrade to Gold or Platinum.");
      } else if (verdict === "invalid") {
        setMode("manual");
        setError("That code did not work. Check with the farm owner.");
      } else {
        setMode("manual");
        setError("Couldn't reach the farm. Check your connection and try again.");
      }
    } catch {
      // Drop back to manual so the (now-frozen) scanner doesn't look stuck;
      // the scanned/entered code stays editable for a retry.
      setMode("manual");
      setError("Invalid code. Ask the owner to show the QR again.");
    } finally {
      setVerifying(false);
    }
  }

  // Auto-pair from ?code= in URL (still needs a name)
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("code");
    if (urlCode) {
      setCode(urlCode.toUpperCase());
      setMode("manual");
    }
  }, []);

  function handleScan(text: string) {
    const finalCode = codeFromText(text);
    setCode(finalCode);
    if (managerName.trim()) {
      attemptPair(finalCode, managerName);
    } else {
      setMode("manual");
      setError("Scanned! Now enter your name to finish.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-white flex flex-col">
      <div className="flex flex-col items-center pt-12 pb-6 px-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <Sprout className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mt-4">Manager Device</h1>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-xs">
          Pair with your farm to mark attendance and post daily work updates.
        </p>
      </div>

      <div className="flex-1 px-5 pb-8 space-y-4">
        {/* Name field — always visible */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Your name</label>
          <Input
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder="e.g. Ramesh"
            className="rounded-xl"
          />
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setMode("scan")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${
              mode === "scan" ? "bg-white text-primary shadow-sm" : "text-gray-500"
            }`}
          >
            <ScanLine className="h-4 w-4" /> Scan QR
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${
              mode === "manual" ? "bg-white text-primary shadow-sm" : "text-gray-500"
            }`}
          >
            <Keyboard className="h-4 w-4" /> Enter code
          </button>
        </div>

        {mode === "scan" ? (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            {cameraError ? (
              <div className="flex flex-col items-center text-center py-6 gap-2">
                <Camera className="h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">Camera not available.</p>
                <p className="text-xs text-gray-400">{cameraError}</p>
                <Button variant="outline" className="mt-2 rounded-xl" onClick={() => setMode("manual")}>
                  Enter code instead
                </Button>
              </div>
            ) : (
              <>
                <ErrorBoundary
                  fallback={
                    <div className="flex flex-col items-center text-center py-6 gap-2">
                      <Camera className="h-8 w-8 text-gray-300" />
                      <p className="text-sm text-gray-500">Camera could not start.</p>
                      <Button variant="outline" className="mt-2 rounded-xl" onClick={() => setMode("manual")}>
                        Enter code instead
                      </Button>
                    </div>
                  }
                >
                  <QrScanner onScan={handleScan} onError={(m) => setCameraError(m)} />
                </ErrorBoundary>
                <p className="text-xs text-gray-400 text-center mt-3">
                  Point the camera at the QR code shown in the owner's app
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Farm code</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="6-character code"
                className="rounded-xl text-center text-lg font-bold tracking-[0.2em] uppercase"
                maxLength={12}
              />
            </div>
            <Button
              className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl text-base"
              disabled={verifying}
              onClick={() => attemptPair(code, managerName)}
            >
              {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Pair this device"}
            </Button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
