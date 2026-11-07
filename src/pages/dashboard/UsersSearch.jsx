import { useState, useEffect, useMemo } from "react";
import { useFormik } from "formik";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserList } from "@/components/UserList";
import {
  selectUsersSearchData,
  useUsersSearch,
} from "@/hooks/useUsersSearch";
import { isObjEmpty } from "../../utils/util";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, RefreshCw, Filter, Heart, MapPin, ChevronsUpDown, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PremiumPaywallAlert } from "@/components/PremiumPaywallAlert";
import { useCheckoutSessionMutation } from "@/hooks/useBilling";
import { useRefreshThrottle } from "@/hooks/useRefreshThrottle";
import {
  aroundUserCount,
  isPremiumPaywallActive,
} from "@/lib/paywall";

const distanceMap = new Map([
  ["5", 8046],
  ["10", 16093],
  ["25", 40233],
  ["50", 80467],
  ["75", 120699],
  ["100", 160934],
  ["200", 321869],
]);

const ETHNICITIES = [
  "Asian",
  "Black / African American",
  "Hispanic / Latino",
  "Middle Eastern",
  "Native American",
  "Pacific Islander",
  "White / Caucasian",
  "East Indian",
  "East Asian",
  "Mixed Race",
];

const STORAGE_KEYS = {
  SEARCH_RESULTS: "usersSearchResults",
  SEARCH_SUCCESS: "usersSearchSuccess",
  SEARCH_PARAMS: "usersSearchParams",
  FORM_VALUES: "usersSearchFormValues",
};

const DISCOVERY_SCROLL_KEY = "meetcutes:discovery-scroll-top";

function loadFromStorage(key, fallback = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn("Failed to load users search state:", error);
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to save users search state:", error);
  }
}

export function UsersSearch({ profiledata, userhandle, gender, latitude, longitude, questionairevaluesset, userstate, onetimepaymentrequired }) {
  const [error, setError] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const checkoutMutation = useCheckoutSessionMutation();
  const refreshThrottle = useRefreshThrottle({ seconds: 30 });
  const paywallActive = isPremiumPaywallActive(profiledata);
  const nearbyMatchCount = aroundUserCount(profiledata);

  const [searchParams, setSearchParams] = useState(null);
  const [ethnicityFilter, setEthnicityFilter] = useState([]);
  const [restoredResults, setRestoredResults] = useState([]);
  const [isRestoredSearch, setIsRestoredSearch] = useState(false);

  // Server state lives entirely in TanStack Query. The `["search", "users",
  // filters]` key deduplicates requests and survives tab/component remounts.
  const {
    data,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isQueryLoading,
    isSuccess: isQuerySuccess,
    refetch,
    isRefetching
  } = useUsersSearch(searchParams, { enabled: !error });

  const allUsers = useMemo(() => selectUsersSearchData(data), [data]);
  const hasSearched = Boolean(searchParams) || isRestoredSearch;

  // Profile configuration safety filters layer
  useEffect(() => {
    if (onetimepaymentrequired) {
      setError("One time fees required, click on 'SERVICE FEES' button");
    } else if (isObjEmpty(userhandle)) {
      setError("Set handle to start searching");
    } else if (isObjEmpty(latitude)) {
      setError("Set co-ordinates to start searching");
    } else if (userstate !== 'active') {
      setError("Activate your Profile");
    } else {
      setError("");
    }
  }, [userhandle, latitude, questionairevaluesset, userstate, onetimepaymentrequired]);

  useEffect(() => {
    if (queryError) {
      setSearchError(queryError?.message || 'Search failed');
    } else {
      setSearchError(null);
    }
  }, [queryError]);

  const normalizeAgeValue = (value, fallback = 21) => {
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) return fallback;
    return Math.min(99, Math.max(21, parsedValue));
  };

  const formik = useFormik({
    initialValues: {
      searchdistance: '',
      agefrom: 21,
      ageto: 35,
    },
    onSubmit: async (values) => {
      if (paywallActive) return;

      if (!values.searchdistance) {
        setSearchError("Please select a search radius distance before executing.");
        return;
      }

      setSearchError(null);

      let finalAgeFrom = normalizeAgeValue(values.agefrom, 21);
      let finalAgeTo = normalizeAgeValue(values.ageto, 99);

      // Safety correction: if min age is higher than max age, align them gracefully
      if (finalAgeFrom > finalAgeTo) {
        finalAgeTo = finalAgeFrom;
        formik.setFieldValue('ageto', finalAgeFrom);
      }

      const searchdata = {
        gender,
        agefrom: finalAgeFrom,
        ageto: finalAgeTo,
        latitude,
        longitude,
        searchdistance: distanceMap.get(values.searchdistance)
      };

      setIsRestoredSearch(false);
      setRestoredResults([]);
      saveToStorage(STORAGE_KEYS.SEARCH_RESULTS, []);
      saveToStorage(STORAGE_KEYS.SEARCH_SUCCESS, false);
      saveToStorage(STORAGE_KEYS.SEARCH_PARAMS, searchdata);
      saveToStorage(STORAGE_KEYS.FORM_VALUES, values);

      setSearchParams(searchdata);
    },
  });

  // Restore the last successful search when returning to this tab.
  useEffect(() => {
    const storedSuccess = loadFromStorage(STORAGE_KEYS.SEARCH_SUCCESS, false);
    const storedResults = loadFromStorage(STORAGE_KEYS.SEARCH_RESULTS, []);
    const storedParams = loadFromStorage(STORAGE_KEYS.SEARCH_PARAMS, null);
    const storedFormValues = loadFromStorage(STORAGE_KEYS.FORM_VALUES, null);

    if (storedSuccess) {
      setIsRestoredSearch(true);
      if (Array.isArray(storedResults)) setRestoredResults(storedResults);
      if (storedParams) setSearchParams(storedParams);
      if (storedFormValues) formik.setValues(storedFormValues);
    }
    // Mount-only restore; Formik is declared above this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist every successful result page so a remount can repaint instantly.
  useEffect(() => {
    if (!Array.isArray(allUsers) || allUsers.length === 0) return;

    setRestoredResults(allUsers);
    saveToStorage(STORAGE_KEYS.SEARCH_RESULTS, allUsers);
    saveToStorage(STORAGE_KEYS.SEARCH_SUCCESS, true);
  }, [allUsers]);

  // Clear search errors instantly when distance parameters transition
  useEffect(() => {
    if (formik.values.searchdistance) {
      setSearchError(null);
    }
  }, [formik.values.searchdistance]);

  const toggleEthnicityFilter = (eth) => {
    setEthnicityFilter((prev) => {
      if (eth === 'all') return ['all'];
      const nextFilters = prev.filter(item => item !== 'all');
      if (nextFilters.includes(eth)) {
        return nextFilters.filter((p) => p !== eth);
      }
      return [...nextFilters, eth];
    });
  };

  const displayedUsers = useMemo(() => {
    if (isQuerySuccess && searchParams) return allUsers;
    if (isRestoredSearch && restoredResults.length > 0) return restoredResults;
    return allUsers;
  }, [allUsers, isQuerySuccess, isRestoredSearch, restoredResults, searchParams]);

  // Defensive mirror of the server-side straight-matrix rule. The Elixir query
  // is authoritative, but this keeps a stale or mocked payload from painting
  // same-gender cards in the discovery grid.
  const oppositeGender = useMemo(() => {
    const viewerGender = String(gender ?? "").trim().toLowerCase();
    if (viewerGender === "male") return "female";
    if (viewerGender === "female") return "male";
    return null;
  }, [gender]);

  const scopedUsers = useMemo(() => {
    if (!Array.isArray(displayedUsers)) return [];
    if (!oppositeGender) return displayedUsers;

    return displayedUsers.filter(
      (user) =>
        String(user?.gender ?? "").trim().toLowerCase() === oppositeGender,
    );
  }, [displayedUsers, oppositeGender]);

  const filteredResults = useMemo(() => {
    if (!Array.isArray(scopedUsers)) return [];
    if (ethnicityFilter.length === 0 || ethnicityFilter.includes('all')) return scopedUsers;

    return scopedUsers.filter((u) => {
      const userEth = (u.ethnicity || u.ethnicity_text || "").toString().toLowerCase();
      return ethnicityFilter.some((sel) => userEth.includes(String(sel).toLowerCase()));
    });
  }, [scopedUsers, ethnicityFilter]);

  const isSearching = isQueryLoading || isRefetching;

  // Returning from the full profile route restores the discovery scroll
  // position once the cached result grid has painted.
  useEffect(() => {
    if (filteredResults.length === 0) return;

    let stored = null;

    try {
      stored = sessionStorage.getItem(DISCOVERY_SCROLL_KEY);
    } catch {
      return;
    }

    if (stored == null) return;

    try {
      sessionStorage.removeItem(DISCOVERY_SCROLL_KEY);
    } catch {
      // Ignore storage failures and still restore the scroll position.
    }

    const scrollTop = Number(stored);
    if (!Number.isFinite(scrollTop) || scrollTop <= 0) return;

    const frame = requestAnimationFrame(() => {
      const scroller = document.querySelector("main");

      if (scroller) {
        scroller.scrollTop = scrollTop;
      } else {
        window.scrollTo({ top: scrollTop });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [filteredResults.length]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">

      {/* Page Title Header Block */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
          Find Connections
        </h1>
        <p className="text-sm text-muted-foreground">
          Discover amazing people and build meaningful relationships
        </p>
      </div>

      {paywallActive && (
        <PremiumPaywallAlert
          aroundUserCount={nearbyMatchCount}
          onUnlock={() => checkoutMutation.mutate()}
          isUnlocking={checkoutMutation.isPending}
        />
      )}

      {/* Profile & Parameter Error Banners */}
      {(error || searchError) && (
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm animate-fadeIn">
          <CardContent className="p-4 flex items-center gap-3 text-destructive">
            <div className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center text-xs font-bold shrink-0">!</div>
            <p className="text-sm font-medium">{error || searchError}</p>
          </CardContent>
        </Card>
      )}

      {/* Shared Responsive Unified Filter Search Card Container */}
      <Card className="shadow-md bg-card/60 backdrop-blur-md border border-border/80">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Search Parameters</CardTitle>
              <p className="text-xs text-muted-foreground">Specify parameters to isolate network records</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={formik.handleSubmit} className="space-y-6">

            {/* Unified Input Grid - Perfectly splits across all mobile/desktop breakpoints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">

              {/* Radius Search Selection Area */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  Distance Radius
                </Label>
                <Select
                  name="searchdistance"
                  value={formik.values.searchdistance}
                  onValueChange={(value) => {
                    // Radix emits an empty synthetic change while remounting a
                    // controlled Select with no open item registry. Ignore it so
                    // a persisted distance value is not wiped on tab return.
                    if (value) formik.setFieldValue('searchdistance', value);
                  }}
                >
                  <SelectTrigger className="w-full bg-background/50">
                    <SelectValue placeholder="Select max range...">
                      {formik.values.searchdistance
                        ? `${formik.values.searchdistance} Miles`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Miles</SelectItem>
                    <SelectItem value="10">10 Miles</SelectItem>
                    <SelectItem value="25">25 Miles</SelectItem>
                    <SelectItem value="50">50 Miles</SelectItem>
                    <SelectItem value="75">75 Miles</SelectItem>
                    <SelectItem value="100">100 Miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Age Bounds Minimum */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="agefrom">
                  Age From
                </Label>
                <Input
                  id="agefrom"
                  type="number"
                  min="21"
                  max="99"
                  value={formik.values.agefrom}
                  onChange={formik.handleChange}
                  onBlur={() => formik.setFieldValue('agefrom', normalizeAgeValue(formik.values.agefrom, 21))}
                  className="bg-background/50"
                />
              </div>

              {/* Age Bounds Maximum */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="ageto">
                  Age To
                </Label>
                <Input
                  id="ageto"
                  type="number"
                  min="21"
                  max="99"
                  value={formik.values.ageto}
                  onChange={formik.handleChange}
                  onBlur={() => formik.setFieldValue('ageto', normalizeAgeValue(formik.values.ageto, 99))}
                  className="bg-background/50"
                />
              </div>

              {/* Form Trigger Button Cell */}
              <Button
                type="submit"
                className="w-full font-bold shadow-sm"
                disabled={isSearching || !!error || paywallActive}
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Querying Cluster...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Find Matches
                  </>
                )}
              </Button>

            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search Results Display Stacks */}
      <div className="space-y-4">

        {/* Indeterminate Loading Progress Bar Panel */}
        {(isSearching || isFetchingNextPage) && (
          <Card className="bg-card/40 backdrop-blur-sm border border-border/60 shadow-sm animate-pulse">
            <CardContent className="py-5">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  {isQueryLoading ? "Accessing registry layers..." : "Syncing secondary result blocks..."}
                </div>
                <Progress value={undefined} className="w-full max-w-sm h-1.5" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Info Actions Context Header bar */}
        {hasSearched && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-foreground">Search Results</h2>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold px-2.5 py-0.5 text-xs">
                {filteredResults.length} matches found
              </Badge>
            </div>

            {scopedUsers.length > 0 && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* Secondary Popover Filter Action Widget */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-card/50">
                      <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                      <span className="max-w-[140px] truncate">
                        {ethnicityFilter.length === 0 || ethnicityFilter.includes('all')
                          ? 'Ethnicity: All'
                          : `Filtered (${ethnicityFilter.length})`}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3 bg-card/95 backdrop-blur-md border border-border" align="end">
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      <div className="flex items-center gap-2 py-0.5">
                        <input
                          type="checkbox"
                          id="all-filter"
                          checked={ethnicityFilter.includes('all') || ethnicityFilter.length === 0}
                          onChange={() => toggleEthnicityFilter('all')}
                          className="h-4 w-4 rounded border-outline-variant bg-surface-container accent-primary cursor-pointer"
                        />
                        <Label htmlFor="all-filter" className="text-sm font-medium cursor-pointer select-none">All Options</Label>
                      </div>
                      <hr className="border-border/60" />
                      {ETHNICITIES.map((ethnicity) => (
                        <div key={ethnicity} className="flex items-center gap-2 py-0.5">
                          <input
                            type="checkbox"
                            id={`${ethnicity}-filter`}
                            checked={ethnicityFilter.includes(ethnicity)}
                            onChange={() => toggleEthnicityFilter(ethnicity)}
                            className="h-4 w-4 rounded border-outline-variant bg-surface-container accent-primary cursor-pointer"
                          />
                          <Label htmlFor={`${ethnicity}-filter`} className="text-sm cursor-pointer select-none">{ethnicity}</Label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!refreshThrottle.start()) return;
                    refetch();
                  }}
                  disabled={isSearching || refreshThrottle.isLocked}
                  className="bg-card/50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 mr-2 text-muted-foreground ${
                      isSearching ? "animate-spin" : ""
                    }`}
                  />
                  {refreshThrottle.isLocked
                    ? `Refresh (${refreshThrottle.remaining}s)`
                    : "Refresh"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Display Grid Matrix Mapping */}
        <div className="min-h-[200px] relative">
          {filteredResults.length > 0 ? (
            <UserList users={filteredResults} isLoading={isSearching} />
          ) : (
            hasSearched && !isSearching && (
              <div className="text-center py-12 border-2 border-dashed border-border/60 rounded-xl bg-card/20">
                <p className="text-sm font-medium text-muted-foreground">No records matched your filtering variables.</p>
              </div>
            )
          )}
        </div>

        {/* Infinite Paginated Cursor Trigger Control */}
        {hasNextPage && (
          <div className="flex justify-center pt-2">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              variant="outline"
              className="w-full sm:w-auto font-semibold"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
                  Loading supplementary items...
                </>
              ) : (
                <>
                  <ChevronsUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                  Load More Results
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}