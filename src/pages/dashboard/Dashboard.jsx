import { lazy, Suspense, useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { isObjEmpty } from "../../utils/util";
import { logoutUser } from "../../services/user.service";
import { useUpdateProfileMutation } from "@/hooks/useProfileQueries";
import { getAutoCompleteData } from '@/services/location.service';
import { useSearchStore } from "@/stores/searchStore";
import { useAutocompleteStore } from "@/stores/autocompleteStore";
import { successAlert } from "@/services/alert.service";
import { useQueryClient } from "@tanstack/react-query";
import secureLocalStorage from "react-secure-storage";
import { useTokenExpiration } from "../../hooks/useTokenExpiration";
import {
  Search,
  Calendar,
  User,
  Users,
  Menu,
  X,
  Home,
  Settings as SettingsIcon,
  LogOut,
  Camera,
  CalendarSearch,
  MapPin,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MeetCutesSpinner } from '@/components/ui/MeetCutesSpinner';

const loadUsersSearch = () => import("./UsersSearch");
const loadUserEventsMain = () => import("./UserEvents/UserEventsMain");
const loadProfile = () => import("./Profile");
const loadEventsSearch = () => import("./EventsSearch");
const loadSettings = () => import("../Settings");
const loadPhotos = () => import("../Photos");
const loadLocationPage = () => import("./LocationPage");
const loadShortlist = () => import("./Shortlist");
const loadUserProfile = () => import("../UserProfile");

const UsersSearch = lazy(() => loadUsersSearch().then((module) => ({ default: module.UsersSearch })));
const UserEventsMain = lazy(() => loadUserEventsMain().then((module) => ({ default: module.UserEventsMain })));
const Profile = lazy(() => loadProfile().then((module) => ({ default: module.Profile })));
const EventsSearch = lazy(() => loadEventsSearch().then((module) => ({ default: module.EventsSearch })));
const Settings = lazy(() => loadSettings().then((module) => ({ default: module.Settings })));
const Photos = lazy(() => loadPhotos().then((module) => ({ default: module.Photos })));
const LocationPage = lazy(() => loadLocationPage().then((module) => ({ default: module.LocationPage })));
const Shortlist = lazy(() => loadShortlist().then((module) => ({ default: module.Shortlist })));
const UserProfile = lazy(() => loadUserProfile().then((module) => ({ default: module.UserProfile })));

const dashboardTabPreloaders = {
  profile: loadProfile,
  photos: loadPhotos,
  events: loadUserEventsMain,
  search: loadEventsSearch,
  users: loadUsersSearch,
  settings: loadSettings,
  location: loadLocationPage,
  shortlist: loadShortlist,
};

const DashboardTabFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center px-4 py-12">
    <div className="text-center">
      <MeetCutesSpinner size="large" />
      <p className="mt-4 text-sm text-muted-foreground">Loading section...</p>
    </div>
  </div>
);

export function Dashboard({ userProfileMode = false }) {
  const { user, profiledata, profileLoading } = useAuth();
  const updateProfileMutation = useUpdateProfileMutation({ invalidateSearch: false });
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname, state } = useLocation();
  const isLocationRoute = pathname === "/dashboard/location";
  const isShortlistRoute = pathname === "/dashboard/shortlist";
  const isUserProfileRoute = userProfileMode || pathname.startsWith("/user/");
  const fromShortlist = state?.from === "shortlist";
  // Friendly path aliases used by direct links and the paywall E2E suite.
  const pathTab =
    pathname === "/dashboard/users"
      ? "users"
      : pathname === "/dashboard/events"
        ? "search"
        : null;
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') || pathTab || "profile",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const profiledataupdate = useRef(0);
  const autocompleteBootstrapRef = useRef(false);
  const queryClient = useQueryClient();
  const logininitsDone = useSearchStore((state) => state.logininitsDone);
  const setLogininitsDone = useSearchStore((state) => state.setLogininitsDone);
  const resetSearchState = useSearchStore((state) => state.reset);
  const autocompletedata = useAutocompleteStore(
    (state) => state.autocompletedata,
  );
  const setAutoCompletedata = useAutocompleteStore(
    (state) => state.setAutocompletedata,
  );
  const resetAutocompleteData = useAutocompleteStore((state) => state.reset);

  // Use token expiration hook to automatically log out when token expires
  useTokenExpiration();

  // Stripe redirects back here after a successful hosted checkout. Refresh the
  // profile caches so the new subscription_active flag unlocks search without
  // a hard reload.
  useEffect(() => {
    if (searchParams.get("payment") !== "success") return;

    queryClient.invalidateQueries({ queryKey: ["auth"] });
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    successAlert("", "Premium membership activated. Your matches are unlocked.");

    const next = new URLSearchParams(searchParams);
    next.delete("payment");
    next.delete("session_id");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, queryClient]);

  const navigationItems = [
    {
      id: "users",
      label: "Search Users",
      icon: Users,
      description: "Find and connect with users"
    },
    {
      id: "search",
      label: "Search Events",
      icon: Search,
      description: "Find and discover events"
    },
    {
      id: "events",
      label: "My Events",
      icon: CalendarSearch,
      description: "Manage your created events"
    },
    {
      id: "shortlist",
      label: "My Shortlist",
      icon: Heart,
      description: "Likes and mutual matches",
      path: "/dashboard/shortlist"
    },
    {
      id: "profile",
      label: "My Profile",
      icon: User,
      description: "Manage your profile information"
    },
    {
      id: "photos",
      label: "My Photos",
      icon: Camera,
      description: "Upload and manage your photos"
    },
    {
      id: "location",
      label: "My Location",
      icon: MapPin,
      description: "Set your approximate coordinates",
      path: "/dashboard/location"
    },
    {
      id: "settings",
      label: "Settings",
      icon: SettingsIcon,
      description: "Account and privacy settings"
    }
  ];

  const hasPathActive = navigationItems.some(
    (item) => item.path && pathname === item.path,
  );

  const activeNavigationItem = isUserProfileRoute
    ? { label: "User Profile" }
    : hasPathActive
      ? navigationItems.find((item) => item.path && pathname === item.path)
      : navigationItems.find((item) => !item.path && activeTab === item.id);

  useEffect(() => {
    if (!user) {
      // A missing session means either a signed-out visit or an expired bearer
      // token. Both belong on the login page, not the marketing home page.
      navigate('/login', { replace: true })
    }
  }, [user, navigate]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'photos', 'events', 'search', 'users', 'settings', 'location', 'shortlist'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const warmDashboardTabs = () => {
      Object.entries(dashboardTabPreloaders).forEach(([tabId, preload]) => {
        if (tabId !== activeTab) {
          preload().catch(() => {
            // Ignore opportunistic prefetch failures.
          });
        }
      });
    };

    let idleHandle;
    let timeoutHandle;

    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(warmDashboardTabs, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleHandle);
    }

    timeoutHandle = window.setTimeout(warmDashboardTabs, 400);
    return () => window.clearTimeout(timeoutHandle);
  }, [activeTab]);

  const preloadTab = useCallback((tabId) => {
    dashboardTabPreloaders[tabId]?.().catch(() => {
      // Ignore opportunistic prefetch failures.
    });
  }, []);

  const handleTabChange = (tabId) => {
    const target = navigationItems.find((item) => item.id === tabId);

    // Route-backed tabs must navigate to their real path so the page component
    // renders on every breakpoint instead of falling through to a fallback.
    if (target?.path) {
      setSidebarOpen(false);
      navigate(target.path);
      return;
    }

    setActiveTab(tabId);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', tabId);
    navigate(`/dashboard?${newSearchParams.toString()}`, { replace: true });
  };

  const loadAutoCompletedata = useCallback(async (latitude, longitude) => {
    const distance = 241401; // 150 miles
    const res = await getAutoCompleteData({
      lat: latitude,
      lng: longitude,
      distance: distance
    });

    const fallback = res.success
      ? res.data.length === 0
        ? ['123 Address']
        : res.data
      : [];

    // Never clobber an address the user just selected while this request was
    // in flight. The functional update also prevents an empty response from
    // re-triggering the bootstrap effect in a loop.
    setAutoCompletedata((current) => {
      if (Array.isArray(current) && current.length > 0) return current;
      return fallback;
    });
  }, [setAutoCompletedata]);

  const updateTimeOfLogin = useCallback(async (logintimedata) => {
    try {
      await updateProfileMutation.mutateAsync(logintimedata);
    } catch (error) {
      console.log(error?.message);
    }
  }, [updateProfileMutation]);

  const handleLogout = async () => {
    const res = await logoutUser();
    if (res.success) {
      localStorage.clear();
      resetSearchState();
      secureLocalStorage.clear();
      resetAutocompleteData();
      navigate('/');
      successAlert('', 'Logout Successful');
    } else {
      localStorage.clear();
      resetSearchState();
      secureLocalStorage.clear();
      resetAutocompleteData();
      navigate('/');
    }
    queryClient.clear();
  };

  useEffect(() => {
    const loginInits = async () => {
      if (!isObjEmpty(profiledata) && (!logininitsDone)) {
        updateTimeOfLogin({ timeoflogin: new Date().toISOString() });

        setLogininitsDone(true)
      }
    }

    loginInits();
  }, [profiledata, logininitsDone, setLogininitsDone, updateTimeOfLogin]);

  useEffect(() => {
    const datenow = new Date(Date.now());
    const loadAutodata = async () => {
      await loadAutoCompletedata(profiledata?.latitude, profiledata?.longitude)
    }

    async function resetPrevious() {
      const newdateofprevious = (new Date()).toLocaleDateString('en-US', { timeZone: 'America/New_York' });

      try {
        await updateProfileMutation.mutateAsync({
          previouseventsattendeeslist: null,
          previouseventsattendeesdate: newdateofprevious
        });
      } catch (error) {
        console.log(error?.message);
      }
    }

    if (!isObjEmpty(profiledata)) {
      profiledataupdate.current = profiledataupdate.current + 1
      //setRerender(true)
      //
      //
      //
      if (
        !autocompleteBootstrapRef.current &&
        isObjEmpty(autocompletedata)
      ) {
        autocompleteBootstrapRef.current = true;
        loadAutodata();
      }

      //
      // Clear previouseventsattendeeslist and update previouseventsattendeesdate
      //
      if (!isObjEmpty(profiledata?.previouseventsattendeesdate)) {
        let dif = Math.abs(datenow - new Date(profiledata?.previouseventsattendeesdate))
        let dayssinceprevious = Math.floor(dif / (1000 * 3600 * 24));

        if (dayssinceprevious > 123) { //4 months
          resetPrevious();
        }
      }
    }
  }, [profiledata, autocompletedata, loadAutoCompletedata, updateProfileMutation]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Loading Spinner for Profile Data */}
      {(profileLoading || (user && !profiledata)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <MeetCutesSpinner size="large" />
            <p className="mt-4 text-lg font-medium text-foreground">Loading your profile...</p>
            <p className="text-sm text-muted-foreground">Please wait while we set up your dashboard</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Home className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
                <p className="text-xs text-muted-foreground">Welcome back!</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isUserProfileRoute
                ? fromShortlist && item.id === "shortlist"
                : item.path
                  ? pathname === item.path
                  : !hasPathActive && activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onMouseEnter={() => preloadTab(item.id)}
                  onFocus={() => preloadTab(item.id)}
                  onClick={() => {
                    if (item.path) {
                      navigate(item.path);
                    } else {
                      handleTabChange(item.id);
                    }
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className={`text-xs mt-0.5 ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}>
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border space-y-2">
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">Logout</div>
                <div className="text-xs mt-0.5 text-muted-foreground">
                  Sign out of your account
                </div>
              </div>
            </button>

            {/* User Info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {profiledata?.userhandle || user?.email || 'User'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {profiledata?.userstate || 'Online'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">
              {activeNavigationItem?.label || 'Dashboard'}
            </h1>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto lg:pb-0 pb-20">
          <Suspense fallback={<DashboardTabFallback />}>
            {isUserProfileRoute ? (
              <UserProfile />
            ) : isLocationRoute || activeTab === "location" ? (
              <LocationPage />
            ) : isShortlistRoute || activeTab === "shortlist" ? (
              <Shortlist />
            ) : activeTab === "search" ? (
              <EventsSearch
                profiledata={profiledata}
                userhandle={profiledata?.userhandle}
                latitude={profiledata?.latitude}
                longitude={profiledata?.longitude}
                questionairevaluesset={profiledata?.questionairevaluesset}
                userstate={profiledata?.userstate}
                onetimepaymentrequired={profiledata?.onetimefeesrequired && !profiledata?.onetimefeespaid}
              />
            ) : activeTab === "events" ? (
              <UserEventsMain
                profiledata={profiledata}
                userhandle={profiledata?.userhandle}
                latitude={profiledata?.latitude}
                longitude={profiledata?.longitude}
                questionairevaluesset={profiledata?.questionairevaluesset}
                userstate={profiledata?.userstate}
                onetimepaymentrequired={profiledata?.onetimefeesrequired && !profiledata?.onetimefeespaid}
              />
            ) : activeTab === "users" ? (
              <UsersSearch
                user={user}
                profiledata={profiledata}
                userhandle={profiledata?.userhandle}
                gender={profiledata?.gender}
                latitude={profiledata?.latitude}
                longitude={profiledata?.longitude}
                questionairevaluesset={profiledata?.questionairevaluesset}
                userstate={profiledata?.userstate}
                onetimepaymentrequired={profiledata?.onetimefeesrequired && !profiledata?.onetimefeespaid}
              />
            ) : activeTab === "photos" ? (
              <Photos />
            ) : activeTab === "profile" ? (
              <Profile />
            ) : activeTab === "settings" ? (
              <Settings />
            ) : (
              <Profile />
            )}
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex items-center justify-around px-2 py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path
              ? pathname === item.path
              : !hasPathActive && activeTab === item.id;

            return (
              <button
                key={item.id}
                onMouseEnter={() => preloadTab(item.id)}
                onFocus={() => preloadTab(item.id)}
                onClick={() => handleTabChange(item.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-0 flex-1 ${isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium truncate hidden sm:block">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
