import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Copy, Check, RefreshCw, Smartphone, ScanLine, ClipboardCheck, Lock } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { apiFetch, apiMutate, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PairCode {
  code: string;
  farmName: string;
}

function managerUrl(code: string) {
  const origin = window.location.origin;
  return `${origin}/manager/?code=${encodeURIComponent(code)}`;
}

export default function ManagerDevices() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const { data, isLoading, error } = useQuery<PairCode>({
    queryKey: ["manager-pair-code"],
    queryFn: () => apiFetch("/manager/pair-code"),
    retry: false,
  });

  // The pair-code endpoint returns 403 when the farm's plan doesn't include
  // manager devices (Silver / no active plan). Show an upgrade prompt instead
  // of a generic error in that case.
  const isGated = error instanceof ApiError && error.status === 403;

  const regenerate = useMutation({
    mutationFn: () => apiMutate<PairCode>("POST", "/manager/pair-code/regenerate"),
    onSuccess: (res) => {
      if (res) qc.setQueryData(["manager-pair-code"], res);
      qc.invalidateQueries({ queryKey: ["manager-pair-code"] });
      toast({ title: "New code generated", description: "Old devices will need to pair again." });
    },
    onError: () => toast({ title: "Could not regenerate code", variant: "destructive" }),
  });

  function copy(text: string, which: "code" | "link") {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const code = data?.code ?? "";
  const link = code ? managerUrl(code) : "";

  return (
    <PageShell title="Manager device" back="/">
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isGated ? (
          <div className="bg-white rounded-2xl p-5 border-2 border-amber-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              <h2 className="font-bold text-gray-900">Manager device add-on needed</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              The manager device is an optional add-on (₹199 per month) — it is not part
              of any plan. Add it to let a manager mark attendance and upload daily work from
              their own phone.
            </p>
            <Button
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setLocation("/subscription")}
            >
              <Smartphone className="h-4 w-4 mr-2" /> Add manager device
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-primary to-violet-500 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                <h2 className="font-bold">Set up a manager device</h2>
              </div>
              <p className="text-primary-foreground/80 text-sm mt-1 leading-relaxed">
                Let a manager mark attendance and upload daily work from their own phone.
                They will only see those two screens — everything flows back to you.
              </p>
            </div>

            {/* QR card */}
            <div className="bg-white rounded-2xl p-5 border-2 border-primary/20 shadow-sm flex flex-col items-center">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Scan to pair
              </p>
              {link && (
                <div className="bg-white p-3 rounded-xl border border-gray-100">
                  <QRCodeSVG value={link} size={200} level="M" includeMargin={false} />
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3 text-center">
                Open the Manager app on the other phone and scan this code
              </p>
            </div>

            {/* Manual code */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Or enter this code manually
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 rounded-xl py-3 text-center">
                  <span className="text-2xl font-bold tracking-[0.3em] text-gray-900">{code}</span>
                </div>
                <Button
                  variant="outline"
                  className="h-12 w-12 p-0 rounded-xl"
                  onClick={() => copy(code, "code")}
                >
                  {copied === "code" ? <Check className="h-5 w-5 text-primary" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
              <button
                onClick={() => copy(link, "link")}
                className="mt-2 text-xs text-primary font-semibold flex items-center gap-1"
              >
                {copied === "link" ? <Check className="h-3.5 w-3.5" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
                {copied === "link" ? "Link copied" : "Copy pairing link"}
              </button>
            </div>

            {/* How it works */}
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 space-y-2.5">
              <p className="text-sm font-semibold text-primary">How it works</p>
              <div className="flex gap-2.5 items-start">
                <ScanLine className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-primary/90 leading-relaxed">
                  The manager opens the Manager app and scans the QR (or types the code) to pair their phone with your farm.
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-primary/90 leading-relaxed">
                  They can mark daily attendance and post work updates. Everything appears in your farm records instantly.
                </p>
              </div>
            </div>

            {/* Regenerate */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <p className="text-sm font-semibold text-amber-800">Lost a phone or removing a manager?</p>
              <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
                Generate a new code. All current devices stop working and will need to pair again with the new code.
              </p>
              <Button
                variant="outline"
                className="w-full h-11 mt-3 border-amber-300 text-amber-800 hover:bg-amber-100"
                disabled={regenerate.isPending}
                onClick={() => regenerate.mutate()}
              >
                {regenerate.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Generate new code</>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
