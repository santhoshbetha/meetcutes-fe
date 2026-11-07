import { useEffect, useState, Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
const loadHome = () => import("@/pages/Home");
const loadAbout = () => import("@/pages/About");
const loadContact = () => import("@/pages/Contact");
const loadDonate = () => import("@/pages/Donate");
const loadSearch = () => import("@/pages/Search");
const loadPhotos = () => import("@/pages/Photos");
const loadQuestionaire = () => import("@/pages/Questionaire");
const loadDashboard = () => import("@/pages/dashboard/Dashboard");
const loadChangePassword = () => import("@/pages/ChangePassword");
const loadForgotPassword = () => import("@/pages/ForgotPassword");
const loadSettings = () => import("@/pages/Settings");
const loadEventDetails = () => import("@/pages/EventDetails");
const loadUserProfile = () => import("@/pages/UserProfile");
const loadPageNotFound = () => import("@/pages/PageNotFound");
const loadTerms = () => import("@/pages/Terms");
const loadPrivacy = () => import("@/pages/Privacy");
const loadTermsPopup = () => import("@/pages/TermsPopup");
const loadLoginPage = () => import("@/pages/auth/LoginPage");
const loadRegistrationSuccess = () => import("@/pages/auth/RegistrationSuccess");
const loadEmailVerification = () => import("@/pages/auth/EmailVerification");
const loadEmailNotVerified = () => import("@/pages/auth/EmailNotVerified");
const loadAuthConfirm = () => import("@/pages/auth/AuthConfirm");
const loadNotifications = () => import("@/pages/dashboard/Notifications");
const loadMaintenance = () => import("@/pages/Maintenance");
const loadNavBefore = () => import("@/components/NavBefore");
const loadNavAfter = () => import("@/components/NavAfter");

const Home = lazy(() => loadHome().then(module => ({ default: module.Home })));
const About = lazy(() => loadAbout().then(module => ({ default: module.About })));
const Contact = lazy(() => loadContact().then(module => ({ default: module.Contact })));
const Donate = lazy(() => loadDonate().then(module => ({ default: module.Donate })));
const Search = lazy(() => loadSearch().then(module => ({ default: module.Search })));
const Photos = lazy(() => loadPhotos());
const Questionaire = lazy(() => loadQuestionaire());
const Dashboard = lazy(() => loadDashboard().then(module => ({ default: module.Dashboard })));
const ChangePassword = lazy(() => loadChangePassword().then(module => ({ default: module.ChangePassword })));
const ForgotPassword = lazy(() => loadForgotPassword().then(module => ({ default: module.ForgotPassword })));
const Settings = lazy(() => loadSettings().then(module => ({ default: module.Settings })));
const EventDetails = lazy(() => loadEventDetails());
const PageNotFound = lazy(() => loadPageNotFound().then(module => ({ default: module.PageNotFound })));
const Terms = lazy(() => loadTerms().then(module => ({ default: module.Terms })));
const Privacy = lazy(() => loadPrivacy().then(module => ({ default: module.Privacy })));
const TermsPopup = lazy(() => loadTermsPopup().then(module => ({ default: module.TermsPopup })));
const LoginPage = lazy(() => loadLoginPage().then(module => ({ default: module.LoginPage })));
const RegistrationSuccess = lazy(() => loadRegistrationSuccess().then(module => ({ default: module.RegistrationSuccess })));
const EmailVerification = lazy(() => loadEmailVerification().then(module => ({ default: module.EmailVerification })));
const EmailNotVerified = lazy(() => loadEmailNotVerified().then(module => ({ default: module.EmailNotVerified })));
const AuthConfirm = lazy(() => loadAuthConfirm().then(module => ({ default: module.AuthConfirm })));
const Notifications = lazy(() => loadNotifications().then(module => ({ default: module.Notifications })));
const Maintenance = lazy(() => loadMaintenance().then(module => ({ default: module.Maintenance })));
const NavBefore = lazy(() => loadNavBefore());
const NavAfter = lazy(() => loadNavAfter());

const publicRoutePreloaders = [loadAbout, loadContact, loadDonate, loadSearch, loadLoginPage, loadTerms, loadPrivacy];
const signedInRoutePreloaders = [loadDashboard, loadNotifications, loadSettings, loadPhotos, loadEventDetails, loadUserProfile];
import { useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlobalLoadingProvider } from './context/GlobalLoadingContext';
import { Toaster, toast } from "sonner";
import GlobalLoadingSpinner from './components/GlobalLoadingSpinner';
import { InternetStatusBanner } from './components/InternetStatusBanner';

function App() {
  const { user, profiledata, justLoggedIn } = useAuth();
  const [openLogin, setOpenLogin] = useState(false);
  const [openSignup, setOpenSignup] = useState(false);

  const [theme, _setTheme] = useState("dark");

  // Check if maintenance mode is enabled
  const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true' ||
                           import.meta.env.VITE_MAINTENANCE_MODE === '1' ||
                           import.meta.env.VITE_MAINTENANCE_MODE === 'yes';

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection?.saveData) {
      return undefined;
    }

    const preloaders = user
      ? [...signedInRoutePreloaders, loadNavAfter, loadTermsPopup]
      : [...publicRoutePreloaders, loadNavBefore, loadRegistrationSuccess, loadForgotPassword, loadEmailVerification, loadEmailNotVerified, loadAuthConfirm];

    const warmRoutes = () => {
      preloaders.forEach((preload) => {
        preload().catch(() => {
          // Ignore opportunistic prefetch failures.
        });
      });
    };

    let idleHandle;
    let timeoutHandle;

    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(warmRoutes, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleHandle);
    }

    timeoutHandle = window.setTimeout(warmRoutes, 600);
    return () => window.clearTimeout(timeoutHandle);
  }, [user]);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      toast.info('A newer version is ready. Refresh when convenient to load it.');
    };

    window.addEventListener('meetcutes:update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('meetcutes:update-available', handleUpdateAvailable);
    };
  }, []);

  // If maintenance mode is enabled, show only the maintenance page
  if (isMaintenanceMode) {
    return (
      <Suspense fallback={
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }>
        <Maintenance />
      </Suspense>
    );
  }

  return (
    <>
      <GlobalLoadingProvider>
        <div className="App">
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              closeButton: true,
              style: {
                background: 'hsl(var(--color-card) / 0.95)',
                color: 'hsl(var(--color-card-foreground))',
                border: '2px solid hsl(var(--color-primary))',
                borderRadius: '0.75rem',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 10px 10px -5px rgb(0 0 0 / 0.2)',
                fontSize: '14px',
                fontWeight: '600',
                backdropFilter: 'blur(8px)',
                padding: '12px 16px',
              },
              success: {
                style: {
                  background: '#dcfce7',
                  color: '#166534',
                  border: '2px solid #16a34a',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 10px 10px -5px rgb(0 0 0 / 0.2)',
                },
                iconTheme: {
                  primary: '#16a34a',
                  secondary: '#dcfce7',
                },
              },
              error: {
                style: {
                  background: '#fef2f2',
                  color: '#991b1b',
                  border: '2px solid #dc2626',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 10px 10px -5px rgb(0 0 0 / 0.2)',
                },
                iconTheme: {
                  primary: '#dc2626',
                  secondary: '#fef2f2',
                },
              },
              loading: {
                style: {
                  background: 'hsl(var(--color-muted) / 0.95)',
                  color: 'hsl(var(--color-muted-foreground))',
                  border: '2px solid hsl(var(--color-border))',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 10px 10px -5px rgb(0 0 0 / 0.2)',
                },
              },
            }}
          />
          <InternetStatusBanner />
          <GlobalLoadingSpinner />
          <>
            <Suspense fallback={null}>
              {user ?
                <NavAfter /> :
                <NavBefore
                  openLogin={openLogin}
                  setOpenLogin={setOpenLogin}
                  openSignup={openSignup}
                  setOpenSignup={setOpenSignup}
                />
              }
            </Suspense>

            <Suspense fallback={
              <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-background/90 rounded-2xl shadow-2xl border border-border/50">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="text-lg font-medium text-foreground animate-pulse">
                    Loading page...
                  </p>
                </div>
              </div>
            }>
            <Routes>
              <Route path="/" element={<Home setOpenLogin={setOpenLogin}/>} />

              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/donate" element={<Donate />} />
              <Route path="/dashboard/*" element={<Dashboard />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/search" element={<Search />} />
              <Route path="/questionaire" element={<Questionaire />} />

              <Route path="/photos" element={<Photos />} />

              <Route path="/changepassword" element={<ChangePassword />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/forgotpassword" element={<ForgotPassword />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/login" element={<LoginPage />} />

              <Route path="/registration-success" element={<RegistrationSuccess />} />
              <Route path="/email-verification" element={<EmailVerification />} />
              <Route path="/email-not-verified" element={<EmailNotVerified />} />
              <Route path="/auth/confirm" element={<AuthConfirm />} />

              <Route path="/settings" element={<Settings />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/event/:id" element={<EventDetails />} />
              <Route
                path="/user/:userid"
                element={
                  <ProtectedRoute>
                    <Dashboard userProfileMode />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<PageNotFound />} />
            </Routes>
            </Suspense>
            
            {/* Terms Popup - shows after login if terms not accepted */}
            {user && profiledata && justLoggedIn && profiledata.termsaccepted == false && (
              <Suspense fallback={null}>
                <TermsPopup />
              </Suspense>
            )}
          </>
        </div>
      </GlobalLoadingProvider>
      <Toaster />
    </>
  );
}

export default App;
