import { Suspense, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SyncProvider } from "@/lib/sync-manager";
import { LanguageProvider } from "@/lib/i18n";
import { EstateProvider } from "@/lib/use-estate";
import { ErrorBoundary } from "@/components/error-boundary";
import { DeviceGate } from "@/components/device-gate";
import { lazyWithReload } from "@/lib/lazy-with-reload";
import NotFound from "@/pages/not-found";

const Dashboard = lazyWithReload(() => import("@/pages/dashboard"));
const HelpPage = lazyWithReload(() => import("@/pages/help"));
const Onboarding = lazyWithReload(() => import("@/pages/onboarding"));
const Workers = lazyWithReload(() => import("@/pages/workers"));
const LabourRecords = lazyWithReload(() => import("@/pages/labour-records"));
const WorkGroups = lazyWithReload(() => import("@/pages/work-groups"));
const AttendancePage = lazyWithReload(() => import("@/pages/attendance"));
const Expenses = lazyWithReload(() => import("@/pages/expenses"));
const Sprays = lazyWithReload(() => import("@/pages/sprays"));
const Harvests = lazyWithReload(() => import("@/pages/harvests"));
const Crops = lazyWithReload(() => import("@/pages/crops"));
const Loans = lazyWithReload(() => import("@/pages/loans"));
const Reports = lazyWithReload(() => import("@/pages/reports"));
const AgriAI = lazyWithReload(() => import("@/pages/agri-ai"));
const Disease = lazyWithReload(() => import("@/pages/disease"));
const Shop = lazyWithReload(() => import("@/pages/shop"));
const DailyUpdate = lazyWithReload(() => import("@/pages/daily-update"));
const NurseryAdmin = lazyWithReload(() => import("@/pages/nursery-admin"));
const NurseryShop = lazyWithReload(() => import("@/pages/nursery"));
const AgriDoctor = lazyWithReload(() => import("@/pages/agri-doctor"));
const Subscription = lazyWithReload(() => import("@/pages/subscription"));
const Marketplace = lazyWithReload(() => import("@/pages/marketplace"));
const MandiPrices = lazyWithReload(() => import("@/pages/mandi"));
const Equipment = lazyWithReload(() => import("@/pages/equipment"));
const ManagerDevices = lazyWithReload(() => import("@/pages/manager-devices"));
const SyncLog = lazyWithReload(() => import("@/pages/sync-log"));
const FarmAccounts = lazyWithReload(() => import("@/pages/farm-accounts"));
const AccountsScan = lazyWithReload(() => import("@/pages/accounts-scan"));
const SettingsPage = lazyWithReload(() => import("@/pages/settings"));
const BinPage = lazyWithReload(() => import("@/pages/bin"));
const MyAdsPage = lazyWithReload(() => import("@/pages/my-ads"));
const ProfilePage = lazyWithReload(() => import("@/pages/profile"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: (failureCount) => {
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
    },
  },
});

// REQUIRED — copy verbatim per Clerk proxy setup. Resolves the key from the
// hostname so the same build serves multiple domains.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// Empty in dev (Clerk hits dev FAPI directly), auto-set in prod. Never gate on env.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Clerk passes full paths to routerPush/routerReplace, but wouter's setLocation
// prepends the base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/pwa-192.png`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "hsl(240, 59%, 31%)",
    colorForeground: "#1f2937",
    colorMutedForeground: "#6b7280",
    colorDanger: "#dc2626",
    colorBackground: "#ffffff",
    colorInput: "#f9fafb",
    colorInputForeground: "#1f2937",
    colorNeutral: "#374151",
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[420px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-gray-800 font-bold",
    headerSubtitle: "text-gray-500",
    socialButtonsBlockButtonText: "text-gray-700 font-medium",
    formFieldLabel: "text-gray-700",
    footerActionLink: "text-primary font-semibold",
    footerActionText: "text-gray-500",
    dividerText: "text-gray-400",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-emerald-700",
    alertText: "text-gray-700",
    logoBox: "justify-center",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border border-gray-200 rounded-xl h-12",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11",
    formFieldInput: "rounded-xl h-11",
    footerAction: "justify-center",
    dividerLine: "bg-gray-200",
    alert: "rounded-xl",
    otpCodeFieldInput: "rounded-lg",
    formFieldRow: "gap-2",
    main: "gap-4",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-4">
      {/* path must be the full browser path — Clerk reads window.location.pathname */}
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

// Keeps the query cache from leaking data across account switches.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-primary text-sm animate-pulse">Loading…</div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/workers" component={Workers} />
        <Route path="/labour-records" component={LabourRecords} />
        <Route path="/work-groups" component={WorkGroups} />
        <Route path="/work-groups/:id/attendance" component={AttendancePage} />
        <Route path="/crops" component={Crops} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/sprays" component={Sprays} />
        <Route path="/harvests" component={Harvests} />
        <Route path="/loans" component={Loans} />
        <Route path="/reports" component={Reports} />
        <Route path="/agri-ai" component={AgriAI} />
        <Route path="/disease" component={Disease} />
        <Route path="/shop" component={Shop} />
        <Route path="/daily-update" component={DailyUpdate} />
        <Route path="/bin" component={BinPage} />
        <Route path="/my-ads" component={MyAdsPage} />
        <Route path="/nursery-admin" component={NurseryAdmin} />
        <Route path="/nursery" component={NurseryShop} />
        <Route path="/agri-doctor" component={AgriDoctor} />
        <Route path="/subscription" component={Subscription} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/mandi" component={MandiPrices} />
        <Route path="/equipment" component={Equipment} />
        <Route path="/manager-devices" component={ManagerDevices} />
        <Route path="/sync-log" component={SyncLog} />
        <Route path="/farm-accounts" component={FarmAccounts} />
        <Route path="/accounts-scan" component={AccountsScan} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/help" component={HelpPage} />
        <Route path="/profile" component={ProfilePage} />
        {/* REQUIRED — "/sign-in/*?" and "/sign-up/*?" verbatim: the /*? optional
            wildcard matches both the bare URL and Clerk's OAuth sub-paths. */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back to Chiguru",
            subtitle: "Sign in to keep your farm safe & backed up",
          },
        },
        signUp: {
          start: {
            title: "Create your Chiguru account",
            subtitle: "Your farm data stays safe even if you lose your phone",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      <ErrorBoundary>
        <DeviceGate>
          <Router />
        </DeviceGate>
      </ErrorBoundary>
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <EstateProvider>
            <SyncProvider>
              <WouterRouter base={basePath}>
                <ClerkProviderWithRoutes />
              </WouterRouter>
              <Toaster />
            </SyncProvider>
          </EstateProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
