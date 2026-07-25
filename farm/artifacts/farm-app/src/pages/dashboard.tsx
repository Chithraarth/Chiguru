import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Leaf, UserCheck, Camera,
  MapPin, Plus, BotMessageSquare, ScanLine, ShoppingCart,
  Stethoscope, Handshake,
  RefreshCw, ChevronDown, ChevronUp, BookOpen, Store,
  Tractor, Wrench, Users, ChevronRight,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { GuidedTour } from "@/components/guided-tour";
import { shouldShowTour, markTourShown } from "@/lib/tour-utils";
import { apiFetch } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useEstate } from "@/lib/use-estate";
import { fmtMoney, curSymbol } from "@/lib/currency";

interface DashboardSummary {
  totalCrops: number;
  totalExpensesThisMonth: number;
  totalIncomeThisMonth: number;
  todayLabourCost: number;
  recentActivities: Array<{ type: string; description: string; date: string; amount: number }>;
}

interface FarmProfile {
  farmName: string;
  village: string;
  district: string;
  totalAcres: number;
}

interface RecentAd {
  id: string;
  board: "hire_job" | "hire_rental" | "equipment" | "produce";
  title: string;
  place: string;
  createdAt: string;
  href: string;
}

const AD_STYLE: Record<RecentAd["board"], { icon: typeof Tractor; bg: string; fg: string }> = {
  hire_job: { icon: Users, bg: "bg-primary/10", fg: "text-primary" },
  hire_rental: { icon: Tractor, bg: "bg-primary/10", fg: "text-primary" },
  equipment: { icon: Wrench, bg: "bg-primary/10", fg: "text-primary" },
  produce: { icon: ShoppingCart, bg: "bg-primary/10", fg: "text-primary" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

function fmt(n: number) {
  return fmtMoney(n, 0);
}

const PRIMARY = [
  { href: "/work-groups", icon: UserCheck, key: "home.attendance", chip: "bg-[#E9E6FB] text-[#6C5DD3]" },
  { href: "/daily-update", icon: Camera, key: "home.workUpdates", chip: "bg-[#D5F1EE] text-[#1F9E92]" },
  { href: "/farm-accounts", icon: BookOpen, key: "home.farmAccounts", chip: "bg-[#F3DBF5] text-[#B45BC7]" },
];

const MORE = [
  { href: "/workers", icon: Handshake, key: "more.farmManager", color: "bg-primary/10 text-primary" },
  { href: "/shop", icon: ShoppingCart, key: "more.shop", color: "bg-primary/10 text-primary" },
  { href: "/agri-doctor", icon: Stethoscope, key: "more.agriDoctor", color: "bg-primary/10 text-primary" },
  { href: "/disease", icon: ScanLine, key: "more.diseaseDetect", color: "bg-primary/10 text-primary" },
  { href: "/agri-ai", icon: BotMessageSquare, key: "more.agriAdvisor", color: "bg-primary/10 text-primary" },
  { href: "/crops", icon: Leaf, key: "more.myFarms", color: "bg-primary/10 text-primary" },
  { href: "/sync-log", icon: RefreshCw, key: "more.syncLog", color: "bg-slate-100 text-slate-700" },
];

export default function Dashboard() {
  const { t } = useT();
  const { estates, activeEstateId, activeEstate, setActiveEstate } = useEstate();
  const [showMore, setShowMore] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showEstates, setShowEstates] = useState(false);

  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch("/dashboard/summary"),
    refetchOnWindowFocus: true,
  });

  const { data: profile } = useQuery<FarmProfile>({
    queryKey: ["farm-profile"],
    queryFn: () => apiFetch("/farm/profile"),
    retry: false,
  });

  const { data: recentAds, isLoading: adsLoading } = useQuery<RecentAd[]>({
    queryKey: ["recent-ads"],
    queryFn: () => apiFetch("/ads/recent?limit=6"),
    refetchOnWindowFocus: true,
  });

  // Training tour: full-screen, shown only on the first app open (after a farm profile exists).
  useEffect(() => {
    if (profile && shouldShowTour()) {
      markTourShown();
      setShowTour(true);
    }
  }, [profile]);

  return (
    <PageShell
      title={t("app.name")}
      centerTitle
      leftAction={
        <Link href="/mandi">
          <button
            aria-label="Market Prices"
            className="flex flex-col items-center justify-center -ml-1 px-1.5 py-0.5 rounded-lg hover:bg-foreground/5 active:bg-foreground/5 transition-colors"
          >
            <Store className="h-5 w-5" />
            <span className="text-[9px] font-semibold leading-none mt-0.5">Market</span>
          </button>
        </Link>
      }
    >
      <div className="p-4 space-y-4">
        {/* Farm identity / setup */}
        {profile ? (
          <div className="relative">
            <div className="bg-card rounded-3xl p-4 text-foreground shadow-sm border border-border/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold truncate capitalize">{profile.farmName}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground text-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{profile.village}, {profile.district}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mt-1">{profile.totalAcres} {t("onb.acres")} · {summary?.totalCrops ?? 0} {t("more.crops")}</p>
                </div>
                {estates.length > 0 && (
                  <button
                    onClick={() => setShowEstates((s) => !s)}
                    className="shrink-0 flex items-center gap-1 bg-[#E9E6FB] hover:bg-[#DDD8F7] active:bg-[#DDD8F7] rounded-xl px-3 py-2 text-sm font-medium text-[#6C5DD3]"
                  >
                    <span>{t("estate.switch")}</span>
                    {showEstates ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>

            {showEstates && estates.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {estates.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      setActiveEstate(e.id);
                      setShowEstates(false);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between border-b border-gray-50 last:border-0 ${
                      e.id === activeEstateId ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-gray-800 truncate capitalize">{e.farmName}</span>
                      {(e.village || e.district) && (
                        <span className="block text-xs text-gray-400 truncate">
                          {[e.village, e.district].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </span>
                    {e.id === activeEstateId && (
                      <span className="text-primary text-sm font-semibold shrink-0">✓</span>
                    )}
                  </button>
                ))}
                <Link href="/crops?new=1">
                  <div
                    onClick={() => setShowEstates(false)}
                    className="px-4 py-3 flex items-center gap-2 text-primary font-medium bg-primary/10"
                  >
                    <Plus className="h-4 w-4" /> {t("estate.add")}
                  </div>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <Link href="/onboarding" className="block">
            <div className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl p-5 text-center">
              <Plus className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-semibold text-primary">{t("home.setupFarm")}</p>
              <p className="text-sm text-primary/80 mt-0.5">{t("home.setupFarmSub")}</p>
            </div>
          </Link>
        )}

        {/* Primary actions — 2x2 grid of white tiles with soft colored icon chips */}
        <div className="grid grid-cols-2 min-[481px]:grid-cols-4 gap-3">
          {PRIMARY.map(({ href, icon: Icon, key, chip }) => (
            <Link key={href} href={href}>
              <div className="bg-card rounded-3xl p-4 h-full shadow-sm border border-border/60 flex flex-col items-start gap-3 active:scale-95 transition-transform">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${chip}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-base font-bold leading-tight block text-foreground">{t(key)}</span>
                  {href === "/work-groups" && (
                    <span className="text-xs text-muted-foreground font-medium leading-tight block mt-0.5">
                      {t("home.createGroup")}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
          <button
            onClick={() => setShowMore((s) => !s)}
            className="bg-card rounded-3xl p-4 h-full shadow-sm border border-border/60 flex flex-col items-start gap-3 active:scale-95 transition-transform text-left"
          >
            <div className="h-12 w-12 rounded-full flex items-center justify-center bg-[#E2E8FA] text-[#4F63D2]">
              {showMore ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
            </div>
            <span className="text-base font-bold leading-tight block text-foreground">{t("home.more")}</span>
          </button>
        </div>

        {/* More section */}
        <div>
          {showMore && (
            <div className="grid grid-cols-3 gap-3 mt-3">
              {MORE.map(({ href, icon: Icon, key, color }) => (
                <Link key={href} href={href}>
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col items-center gap-2 active:scale-95 transition-transform">
                    <div className={`rounded-xl p-2.5 ${color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{t(key)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent ads posted by people across the community boards */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">{t("home.recentAds")}</h3>
          {recentAds && recentAds.length > 0 ? (
            <div className="flex flex-col gap-3">
              {recentAds.map((ad) => {
                const style = AD_STYLE[ad.board] ?? AD_STYLE.produce;
                const Icon = style.icon;
                return (
                  <Link key={ad.id} href={ad.href}>
                    <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors">
                      <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${style.bg}`}>
                        <Icon className={`h-5 w-5 ${style.fg}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{ad.title}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{ad.place}</span>
                          <span className="text-gray-300">·</span>
                          <span className="shrink-0">{timeAgo(ad.createdAt)}</span>
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : adsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-gray-100 animate-pulse" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-2/3 rounded bg-gray-100 animate-pulse" />
                    <div className="h-2.5 w-1/3 rounded bg-gray-100 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl px-4 py-6 text-center text-sm text-gray-400 shadow-sm border border-gray-100">
              {t("home.noAdsYet")}
            </div>
          )}
        </div>
      </div>

      {showTour && <GuidedTour onClose={() => setShowTour(false)} />}
    </PageShell>
  );
}
