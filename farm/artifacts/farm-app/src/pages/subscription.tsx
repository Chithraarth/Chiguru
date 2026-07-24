import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Check, Gift, Loader2, Lock, Sprout, Smartphone, Landmark } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { UpiPlanSheet } from "@/components/upi-plan-sheet";
import { apiFetch, apiMutate } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { fmtMoney, curSymbol } from "@/lib/currency";

interface Plan {
  id: string;
  name: string;
  price: number;
  billing: "yearly" | "monthly";
  tagline: string;
  sells: boolean;
  managerDevices: boolean;
  durationMonths: number;
}
interface AppSettings {
  trialActive: boolean;
  trialDaysLeft: number;
  trialDays: number;
  subscriptionPlan: string | null;
  subscriptionActive: boolean;
  isSubscribed: boolean;
  activePlan: Plan | null;
  plans: Plan[];
  addOnDevicePrice: number;
  estateAddonPrice: number;
  subscriptionExpiresAt?: string | null;
  managerDeviceAddonActive?: boolean;
  managerDeviceAddonExpiresAt?: string | null;
  extraEstates?: number;
  estateCount?: number;
  maxEstates?: number;
  canAddEstate?: boolean;
  subscriptionAutoPay?: boolean;
  managerDeviceAutoPay?: boolean;
  estateAddonAutoPay?: boolean;
}

// A simple, thumb-friendly auto-pay toggle row used under each price button.
function AutoPayToggle({ checked, onChange, accent }: { checked: boolean; onChange: (v: boolean) => void; accent: string }) {
  return (
    <label className="mt-3 flex items-center gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`h-5 w-5 rounded border-gray-300 ${accent}`}
      />
      <span className="text-sm text-gray-700">
        <span className="font-semibold">Auto-pay</span> — renews automatically every month
      </span>
    </label>
  );
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`; // plans are billed in INR
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const FARMER_FEATURES = [
  "Work attendance with AI head counting",
  "Advances, loans & final settlement",
  "Daily work updates with photo & video",
  "Expenses & harvest with automatic profit/loss",
  "Disease detection & Agri Doctor consults",
  "Sell produce, run a nursery shop & list equipment",
  "Works offline — syncs when you're back online",
];

export default function Subscription() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ["app-settings"],
    queryFn: () => apiFetch("/app-settings"),
  });

  const [planAutoPay, setPlanAutoPay] = useState(true);
  const [deviceAutoPay, setDeviceAutoPay] = useState(true);
  const [estateAutoPay, setEstateAutoPay] = useState(true);
  // Persist which sheet is open: tapping the upi:// link can background/reload
  // the PWA while the UPI app opens, and the sheet must survive that round-trip.
  const PAYING_KEY = "upiPlanPaying";
  const [paying, setPayingState] = useState<"plan" | "estate" | "device" | null>(() => {
    try {
      const v = sessionStorage.getItem(PAYING_KEY);
      return v === "plan" || v === "estate" || v === "device" ? v : null;
    } catch {
      return null;
    }
  });
  const setPaying = (v: "plan" | "estate" | "device" | null) => {
    setPayingState(v);
    try {
      if (v) sessionStorage.setItem(PAYING_KEY, v);
      else sessionStorage.removeItem(PAYING_KEY);
    } catch { /* ignore */ }
  };

  const subscribe = useMutation({
    mutationFn: (planId: string) => apiMutate("POST", "/subscription/subscribe", { plan: planId, autoPay: planAutoPay }),
    onSuccess: (res) => {
      toast(res
        ? { title: "Plan activated", description: "Thank you for supporting Chiguru!" }
        : { title: "Saved offline", description: "Your plan will apply when you're back online." });
      setPaying(null);
      qc.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: () => toast({ title: "Could not activate plan", variant: "destructive" }),
  });

  const addManagerDevice = useMutation({
    mutationFn: () => apiMutate("POST", "/subscription/manager-device-addon", { autoPay: deviceAutoPay }),
    onSuccess: (res) => {
      toast(res
        ? { title: "Manager device added", description: "You can now pair a manager's phone." }
        : { title: "Saved offline", description: "Your add-on will apply when you're back online." });
      setPaying(null);
      qc.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: () => toast({ title: "Could not add manager device", variant: "destructive" }),
  });

  const addEstate = useMutation({
    mutationFn: () => apiMutate("POST", "/subscription/estate-addon", { autoPay: estateAutoPay }),
    onSuccess: (res) => {
      toast(res
        ? { title: "Extra estate unlocked", description: "You can now add one more estate in the switcher." }
        : { title: "Saved offline", description: "Your add-on will apply when you're back online." });
      setPaying(null);
      qc.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: () => toast({ title: "Could not add estate", variant: "destructive" }),
  });

  const plans = settings?.plans ?? [];
  const farmer = useMemo(() => plans.find((p) => p.id === "farmer_monthly") ?? plans[0], [plans]);

  const trialDays = settings?.trialDays ?? 30;
  const isSubscribed = !!settings?.subscriptionActive;
  const trialActive = !!settings?.trialActive;
  const farmerActive = isSubscribed;

  const estatePrice = settings?.estateAddonPrice ?? 299;
  const extraEstates = settings?.extraEstates ?? 0;
  const maxEstates = settings?.maxEstates ?? 1;

  return (
    <PageShell title="Plans & pricing" back="/">
      <div className="p-4 space-y-4 w-full max-w-5xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Status banner */}
            {isSubscribed ? (
              <div className="bg-primary rounded-2xl p-4 text-primary-foreground">
                <div className="flex items-center gap-2"><Crown className="h-5 w-5" /><h2 className="font-bold">Farmer plan active</h2></div>
                <p className="text-primary-foreground/80 text-sm mt-1">
                  Your farm is fully active — everything is unlocked, including selling on Chiguru.
                </p>
                {settings?.subscriptionExpiresAt && (
                  <p className="text-primary-foreground/60 text-xs mt-2">
                    {settings?.subscriptionAutoPay
                      ? `Auto-pay on — renews automatically on ${fmtDate(settings.subscriptionExpiresAt)}`
                      : `Renews on ${fmtDate(settings.subscriptionExpiresAt)}`}
                  </p>
                )}
              </div>
            ) : trialActive ? (
              <div className="bg-accent rounded-2xl p-4 text-accent-foreground">
                <div className="flex items-center gap-2"><Gift className="h-5 w-5" /><h2 className="font-bold">{trialDays}-day free trial</h2></div>
                <p className="text-accent-foreground/90 text-sm mt-1">
                  {settings?.trialDaysLeft} days left. Everything is free — no payment needed yet.
                </p>
              </div>
            ) : (
              <div className="bg-primary rounded-2xl p-4 text-primary-foreground">
                <div className="flex items-center gap-2"><Lock className="h-5 w-5" /><h2 className="font-bold">Choose a plan to continue</h2></div>
                <p className="text-primary-foreground/80 text-sm mt-1">Your free trial is over. Pick a plan to keep using Chiguru.</p>
              </div>
            )}

            {/* Honest promise */}
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 text-center">
              <p className="text-base font-bold text-primary">One simple, honest price</p>
              <p className="text-sm text-primary/80 mt-1 leading-relaxed">
                Chiguru calculates your labour cost and profit correctly. One plan runs your whole farm — everything included.
              </p>
            </div>

            {/* Three plan cards — swipeable on mobile, one row on wider screens */}
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible">

              {/* Farmer plan */}
              {farmer && (
                <div className={`snap-center shrink-0 w-[80%] max-w-[340px] md:max-w-none md:w-auto flex flex-col rounded-2xl p-4 border-2 ${farmerActive ? "border-primary bg-primary/5" : "border-primary bg-white shadow-md"}`}>
                  <span className="self-start text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground rounded-full px-2.5 py-1">
                    {farmerActive ? "Current" : "Best"}
                  </span>
                  <div className="mt-3 flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sprout className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900">Farmer</p>
                      <p className="text-xs text-gray-500">Whole farm</p>
                    </div>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-gray-900">{inr(farmer.price)}</p>
                  <p className="text-sm text-gray-500">per month</p>
                  <ul className="mt-3 space-y-1.5 flex-1">
                    {["Attendance + AI count", "Advances + loans", "Profit / loss", "Agri Doctor", "Sell + works offline"].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {!farmerActive && (
                    <AutoPayToggle checked={planAutoPay} onChange={setPlanAutoPay} accent="accent-primary" />
                  )}
                  <Button
                    className="w-full h-11 mt-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl"
                    disabled={subscribe.isPending || farmerActive}
                    onClick={() => setPaying("plan")}
                  >
                    {farmerActive
                      ? "Current plan"
                      : subscribe.isPending
                        ? <Loader2 className="h-5 w-5 animate-spin" />
                        : "Choose"}
                  </Button>
                </div>
              )}

              {/* Zamindar estate add-on */}
              <div className="snap-center shrink-0 w-[80%] max-w-[340px] md:max-w-none md:w-auto flex flex-col rounded-2xl p-4 border-2 border-amber-200 bg-white shadow-sm">
                <span className="self-start text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 rounded-full px-2.5 py-1">
                  Add-on
                </span>
                <div className="mt-3 flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Landmark className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">Zamindar</p>
                    <p className="text-xs text-gray-500">Many estates</p>
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900">{inr(estatePrice)}</p>
                <p className="text-sm text-gray-500">per estate / mo</p>
                <ul className="mt-3 space-y-1.5 flex-1">
                  {[
                    "Unlimited estates",
                    "Add any time",
                    extraEstates > 0 ? `${maxEstates} active now` : "1 estate included",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <AutoPayToggle checked={estateAutoPay} onChange={setEstateAutoPay} accent="accent-amber-600" />
                <Button
                  variant="outline"
                  className="w-full h-11 mt-3 border-amber-500 text-amber-700 hover:bg-amber-50 text-sm font-bold rounded-xl"
                  disabled={addEstate.isPending}
                  onClick={() => setPaying("estate")}
                >
                  {addEstate.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Add estate"}
                </Button>
              </div>

              {/* Manager device add-on */}
              <div className="snap-center shrink-0 w-[80%] max-w-[340px] md:max-w-none md:w-auto flex flex-col rounded-2xl p-4 border-2 border-gray-200 bg-white shadow-sm">
                <span className="self-start text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
                  Optional
                </span>
                <div className="mt-3 flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">Manager</p>
                    <p className="text-xs text-gray-500">Their phone</p>
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-gray-900">{inr(settings?.addOnDevicePrice ?? 199)}</p>
                <p className="text-sm text-gray-500">per month</p>
                <ul className="mt-3 space-y-1.5 flex-1">
                  {["Marks attendance", "Uploads work", "Flows to owner"].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {settings?.managerDeviceAddonActive && (
                  <p className="mt-2 text-xs font-semibold text-primary">
                    Active{settings?.managerDeviceAddonExpiresAt ? ` — ${settings?.managerDeviceAutoPay ? "auto-pay on, renews" : "renews"} ${fmtDate(settings.managerDeviceAddonExpiresAt)}` : ""}
                  </p>
                )}
                <AutoPayToggle checked={deviceAutoPay} onChange={setDeviceAutoPay} accent="accent-primary" />
                <Button
                  variant="outline"
                  className="w-full h-11 mt-3 border-gray-300 text-gray-800 hover:bg-gray-50 text-sm font-bold rounded-xl"
                  disabled={addManagerDevice.isPending}
                  onClick={() => setPaying("device")}
                >
                  {addManagerDevice.isPending
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : settings?.managerDeviceAddonActive ? "Renew" : "Manage"}
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed text-center">
              {trialActive
                ? `Everything is free for your first ${trialDays} days. The Farmer plan (₹399/month) runs your whole farm — selling included. Add-ons are optional, and auto-pay renews everything for you.`
                : "The Farmer plan runs your whole farm — selling included. The Zamindar and manager-device add-ons are optional."}
            </p>
          </>
        )}
      </div>

      {paying === "plan" && farmer && (
        <UpiPlanSheet
          title="Farmer plan"
          subtitle={`${inr(farmer.price)} per month · whole farm, everything included`}
          amount={farmer.price}
          note="Chiguru Farmer plan"
          confirmLabel="I've paid — Activate plan"
          pending={subscribe.isPending}
          onConfirm={() => subscribe.mutate(farmer.id)}
          onClose={() => setPaying(null)}
        />
      )}
      {paying === "estate" && (
        <UpiPlanSheet
          title="Zamindar estate add-on"
          subtitle={`${inr(estatePrice)} per estate per month`}
          amount={estatePrice}
          note="Chiguru estate add-on"
          confirmLabel="I've paid — Unlock estate"
          pending={addEstate.isPending}
          onConfirm={() => addEstate.mutate()}
          onClose={() => setPaying(null)}
        />
      )}
      {paying === "device" && (
        <UpiPlanSheet
          title="Manager device"
          subtitle={`${inr(settings?.addOnDevicePrice ?? 199)} per month`}
          amount={settings?.addOnDevicePrice ?? 199}
          note="Chiguru manager device"
          confirmLabel={settings?.managerDeviceAddonActive ? "I've paid — Renew device" : "I've paid — Add device"}
          pending={addManagerDevice.isPending}
          onConfirm={() => addManagerDevice.mutate()}
          onClose={() => setPaying(null)}
        />
      )}
    </PageShell>
  );
}
