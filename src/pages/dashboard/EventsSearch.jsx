/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect, useMemo } from "react";
import { format } from "date-fns";
import dayjs from "dayjs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MapPin, Clock, Users, Filter, Search, RefreshCw, SlidersHorizontal, CheckCircle, ChevronsUpDown, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EventList } from "@/components/EventList";
import { useFormik } from "formik";
import { cn } from "@/lib/utils";
import { useInfiniteQuery } from "@tanstack/react-query"
import { searchEvents } from "@/services/search.service";
import { isObjEmpty } from "@/utils/util";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PremiumPaywallAlert } from "@/components/PremiumPaywallAlert";
import { useCheckoutSessionMutation } from "@/hooks/useBilling";
import { useRefreshThrottle } from "@/hooks/useRefreshThrottle";
import {
  aroundUserCount,
  isPremiumPaywallActive,
} from "@/lib/paywall";
import { isAgeEligibleForEvent } from "@/lib/eventAgeRestriction";

let distanceMap = new Map([
  ["5", 8046],
  ["10", 16093],
  ["25", 40233],
  ["50", 80467],
  ["75", 120699],
  ["100", 160934],
  ["200", 321869],
]);

function getEventDateRange(dayFilter, selectedDate) {
  const today = dayjs();

  switch (dayFilter) {
    case "today": {
      const date = today.format("YYYY-MM-DD");
      return { startdate: date, enddate: date };
    }

    case "tomorrow": {
      const date = today.add(1, "day").format("YYYY-MM-DD");
      return { startdate: date, enddate: date };
    }

    case "saturday": {
      const date = today.day(6).format("YYYY-MM-DD");
      return { startdate: date, enddate: date };
    }

    case "sunday": {
      const date = today.day(7).format("YYYY-MM-DD");
      return { startdate: date, enddate: date };
    }

    case "weekend":
      return {
        startdate: today.day(6).format("YYYY-MM-DD"),
        enddate: today.day(7).format("YYYY-MM-DD"),
      };

    case "all":
      return {
        startdate: today.format("YYYY-MM-DD"),
        enddate: today.add(60, "days").format("YYYY-MM-DD"),
      };

    case "pickdate":
    default: {
      const date = dayjs(selectedDate).format("YYYY-MM-DD");
      return { startdate: date, enddate: date };
    }
  }
}

var deg2rad = function (value) {
  return value * 0.017453292519943295;
};

function haversine(latIn1, lonIn1, latIn2, lonIn2) {
  // Retuns the great circle distance between two coordinate points in miles
  var dLat = deg2rad(latIn2 - latIn1);
  var dLon = deg2rad(lonIn2 - lonIn1);
  var lat1 = deg2rad(latIn1);
  var lat2 = deg2rad(latIn2);

  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 3960 * c;
}

let searchinfo = null;

const STORAGE_KEYS = {
  SEARCH_PARAMS: 'eventsSearchParams',
  SEARCH_RESULTS: 'eventsSearchResults',
  SEARCH_SUCCESS: 'eventsSearchSuccess',
  SEARCH_DATE: 'eventsSearchDate',
  FORM_VALUES: 'eventsSearchFormValues'
};

const EVENTS_SCROLL_KEY = 'meetcutes:events-scroll-top';

export function EventsSearch({
  profiledata,
  userhandle,
  latitude,
  longitude,
  questionairevaluesset,
  userstate,
  onetimepaymentrequired
}) {
  const [searchDate, setSearchDate] = useState(() => dayjs().toDate());
  const [open, setOpen] = useState(false)
  const [searchAll, setSearchAll] = useState(false);
  const [disabledDate, setDisabledDate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchsuccess = useRef(false);
  const isRestoredSearch = useRef(false);
  const [sortmsg, setSortmsg] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");

  const [searchResults, setSearchResults] = useState();
  const resultsRef = useRef(null);
  const [hasScrolledForSearch, setHasScrolledForSearch] = useState(false);
  const [showNoEventsDialog, setShowNoEventsDialog] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const checkoutMutation = useCheckoutSessionMutation();
  const refreshThrottle = useRefreshThrottle({ seconds: 30 });
  const paywallActive = isPremiumPaywallActive(profiledata);
  const nearbyMatchCount = aroundUserCount(profiledata);

  // Utility functions for localStorage persistence
  const saveToStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  };

  const loadFromStorage = (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return defaultValue;
    }
  };

  const clearSearchStorage = () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  };

  const handleDateSelect = (date) => {
    if (date) {
      setSearchDate(date);
    }
    setDatePopoverOpen(false);
  };

  // Restore search state on component mount
  useEffect(() => {
    const storedSearchSuccess = loadFromStorage(STORAGE_KEYS.SEARCH_SUCCESS, false);
    const storedSearchResults = loadFromStorage(STORAGE_KEYS.SEARCH_RESULTS);
    const storedSearchParams = loadFromStorage(STORAGE_KEYS.SEARCH_PARAMS);
    const storedSearchDate = loadFromStorage(STORAGE_KEYS.SEARCH_DATE);
    const storedFormValues = loadFromStorage(STORAGE_KEYS.FORM_VALUES);

    if (storedSearchSuccess) {
      searchsuccess.current = true;
      isRestoredSearch.current = true;
      if (storedSearchResults) {
        setSearchResults(storedSearchResults);
      }
      if (storedSearchParams) {
        searchinfo = storedSearchParams;
      }
      if (storedSearchDate) {
        setSearchDate(dayjs(storedSearchDate).toDate());
      }
      if (storedFormValues) {
        // Restore form values
        formik.setValues(storedFormValues);
        // Restore UI state based on form values
        if (storedFormValues.day) {
          const dayValue = storedFormValues.day;
          if (['today', 'tomorrow', 'saturday', 'sunday', 'weekend', 'all'].includes(dayValue)) {
            setDisabledDate(true);
            setSearchAll(dayValue === 'all');
          } else if (dayValue === 'pickdate') {
            setDisabledDate(false);
            setSearchAll(false);
          }
        }
      }
    }
    // formik is declared below so it cannot be a dependency of this mount-only
    // restore effect without changing hook order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventsSearchQueryKey = () => ["eventssearch"];

  const {
    status,
    data: infiniteData,
    error: fetcherror,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: eventsSearchQueryKey(),
    queryFn: async ({ pageParam = 0 }) => {
      if (isObjEmpty(searchinfo)) {
        return { data: [], nextPage: undefined };
      }

      const response = await searchEvents(searchinfo, pageParam);

      if (!response?.success) {
        return { data: [], nextPage: undefined };
      }

      return {
        data: response.data ?? [],
        nextPage: response.nextPage,
      };
    },
    getNextPageParam: (lastPage) => lastPage?.nextPage,
    enabled: !isObjEmpty(searchinfo),
    refetchOnMount: false
  });

  // Flatten the infinite query data into the flat grid list.
  const querydata = useMemo(() => {
    return infiniteData?.pages?.flatMap((page) => page?.data ?? []) || [];
  }, [infiniteData?.pages]);

  // Prefer the live TanStack cache whenever it has rows. The state copy is
  // only a fallback for restored searches, so registration mutations repaint
  // the cards immediately after invalidation.
  const displayedSearchEvents = useMemo(() => {
    const source = !isObjEmpty(querydata)
      ? querydata
      : Array.isArray(searchResults)
        ? searchResults
        : [];

    return source.map((event) => {
      const storedDistance = Number(event?.distance);
      return {
        ...event,
        distance: Number.isFinite(storedDistance)
          ? storedDistance
          : haversine(latitude, longitude, event.latitude, event.longitude),
      };
    }).filter((event) => isAgeEligibleForEvent(event, profiledata));
  }, [querydata, searchResults, latitude, longitude, profiledata]);

  const handleRefresh = async () => {
    if (isObjEmpty(searchinfo)) {
      setSuccessMessage("Run a search first, then refresh the results.");
      setTimeout(() => setSuccessMessage(""), 5000);
      return;
    }

    if (!refreshThrottle.start()) return;

    setIsLoading(true);
    try {
      await refetch();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isObjEmpty(querydata)) {
      // Calculate distances and set search data
      const dataWithDistances = querydata.map(event => ({
        ...event,
        distance: haversine(latitude, longitude, event.latitude, event.longitude)
      }));
      setSearchResults(dataWithDistances);
      // Save search results to localStorage
      saveToStorage(STORAGE_KEYS.SEARCH_RESULTS, dataWithDistances);
    }
  }, [querydata, latitude, longitude]);

  useEffect(() => {
    if (searchsuccess.current && !isObjEmpty(searchResults) && resultsRef.current && !hasScrolledForSearch) {
      const pendingScroll = (() => {
        try {
          return sessionStorage.getItem(EVENTS_SCROLL_KEY);
        } catch {
          return null;
        }
      })();

      if (!pendingScroll) {
        // Scroll to results section with smooth behavior
        resultsRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        setHasScrolledForSearch(true);
      }
    } else if (searchsuccess.current && isObjEmpty(searchResults) && !isRestoredSearch.current) {
      // Show no events found dialog only for fresh searches, not restored ones
      setShowNoEventsDialog(true);
    }
  }, [searchResults, hasScrolledForSearch]);

  useEffect(() => {
    if (displayedSearchEvents.length === 0) return;

    let stored = null;

    try {
      stored = sessionStorage.getItem(EVENTS_SCROLL_KEY);
    } catch {
      return;
    }

    if (stored == null) return;

    try {
      sessionStorage.removeItem(EVENTS_SCROLL_KEY);
    } catch {
      // Ignore storage failures and still restore the scroll position.
    }

    const scrollTop = Number(stored);
    if (!Number.isFinite(scrollTop) || scrollTop <= 0) return;

    const frame = requestAnimationFrame(() => {
      const scroller = document.querySelector('main');

      if (scroller) {
        scroller.scrollTop = scrollTop;
      } else {
        window.scrollTo({ top: scrollTop });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [displayedSearchEvents.length]);

  useEffect(() => {
    //if (!questionairevaluesset) {
    //  setError("Finish questinaire to start searching")
    //} else
    if (onetimepaymentrequired) {
      //if (verified) {
      setError("One time fees required, click on 'SERVICE FEES' button")
      //}
    } else
      if (isObjEmpty(userhandle)) {
        setError("Set handle to start searching")
      } else if (isObjEmpty(latitude)) {
        setError("Set co-ordinates to start searching")
      } else if (userstate != 'active') {
        setError("Activate your Profile")
      } else {
        setError("")
      }
  }, [userhandle, latitude, questionairevaluesset, userstate, onetimepaymentrequired]);

  const formik = useFormik({
    initialValues: {
      day: "",
      searchdistance: 0,
      sortby: "",
    },

    onSubmit: async (values) => {
      if (paywallActive) return;

      console.log("onSubmit call..")
      // Reset restored search flag for fresh searches
      isRestoredSearch.current = false;
      // Reset scroll flag for new search
      setHasScrolledForSearch(false);
      // Close the mobile sheet when search is initiated
      setOpen(false);

      // Scroll to results area immediately when search starts
      setTimeout(() => {
        if (resultsRef.current && !hasScrolledForSearch) {
          resultsRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          setHasScrolledForSearch(true);
        }
      }, 100);

      const { startdate, enddate } = getEventDateRange(values.day, searchDate);

      searchinfo = {
        lat: latitude,
        long: longitude,
        startdate,
        enddate,
        searchdistance: distanceMap.get(formik.values.searchdistance),
      };

      // Save search parameters to localStorage
      saveToStorage(STORAGE_KEYS.SEARCH_PARAMS, searchinfo);
      saveToStorage(STORAGE_KEYS.SEARCH_DATE, searchDate);
      saveToStorage(STORAGE_KEYS.FORM_VALUES, values);

      setIsLoading(true);

      const res = await refetch();

      if (res.status == "success") {
        //setSearchResults(res.data);
        if ((res.data.pages[0]?.data?.length ?? 0) == 0) {
          setSearchResults([]);
          setSuccessMessage("Search completed! No events found in your area.");
        } else {
          // Don't show success message when events are found to avoid flicker
          // searchResults will be set by the querydata useEffect
        }
      } else {
        setSearchResults([]);
        setSuccessMessage("Search completed, but no events were found.");
      }

      searchsuccess.current = true;

      // Save search success state
      saveToStorage(STORAGE_KEYS.SEARCH_SUCCESS, true);

      setIsLoading(false);

      // Scroll to results section immediately after search completes
      setTimeout(() => {
        if (resultsRef.current && !hasScrolledForSearch) {
          resultsRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          setHasScrolledForSearch(true);
        }
      }, 100); // Small delay to ensure DOM is updated

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(""), 5000);
    },
  });

  const handleDayFilterChange = (value) => {
    formik.setFieldValue("day", value);

    if (value === "pickdate") {
      setSearchAll(false);
      setDisabledDate(false);
      setSearchDate(dayjs().toDate());
      return;
    }

    if (value === "all") {
      setSearchAll(true);
      setDisabledDate(true);
      setSearchDate(dayjs().toDate());
      return;
    }

    setSearchAll(false);
    setDisabledDate(
      ["today", "tomorrow", "saturday", "sunday", "weekend"].includes(value),
    );

    if (value === "today") {
      setSearchDate(dayjs().toDate());
    } else if (value === "tomorrow") {
      setSearchDate(dayjs().add(1, "day").toDate());
    } else if (value === "saturday" || value === "weekend") {
      setSearchDate(dayjs().day(6).toDate());
    } else if (value === "sunday") {
      setSearchDate(dayjs().day(7).toDate());
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarIcon className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Discover Events
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Find amazing events and meetups in your area. Connect with people who share your interests.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || refreshThrottle.isLocked}
              className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              {refreshThrottle.isLocked
                ? `Refresh (${refreshThrottle.remaining}s)`
                : "Refresh Results"}
            </Button>
            {searchsuccess.current && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearSearchStorage();
                  searchinfo = null;
                  searchsuccess.current = false;
                  setSearchResults(null);
                  setSuccessMessage("");
                  formik.resetForm();
                  setSearchDate(dayjs().toDate());
                  setDisabledDate(false);
                  setSearchAll(false);
                }}
                className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
              >
                <Search className="w-4 h-4 mr-2" />
                New Search
              </Button>
            )}
          </div>

          {/* Success Message */}
          {successMessage && (
            <Alert className="border-green-500/50 bg-green-50 dark:bg-green-900/10 mb-6 max-w-2xl mx-auto backdrop-blur-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Banner */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/5 mb-6 max-w-2xl mx-auto backdrop-blur-sm">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 text-destructive">
                  <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold">!</span>
                  </div>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {paywallActive && (
            <div className="mb-6 max-w-3xl mx-auto">
              <PremiumPaywallAlert
                aroundUserCount={nearbyMatchCount}
                onUnlock={() => checkoutMutation.mutate()}
                isUnlocking={checkoutMutation.isPending}
              />
            </div>
          )}
        </div>

        {/* Search Form */}
        <Card className="mb-8 shadow-lg bg-card/50 dark:bg-card/40 backdrop-blur-sm border-2 border-border">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Find Your Perfect Event</CardTitle>
                  <p className="text-sm text-muted-foreground">Discover events in your area</p>
                </div>
              </div>
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="md:hidden bg-white/50 dark:bg-gray-700/50"
                    onClick={() => setFormError("")}
                  >
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Search Filters
                    </SheetTitle>
                    <SheetDescription>
                      Customize your event search preferences to find the perfect matches
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div className="space-y-4">
                      {/* Mobile Date and Distance Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Date</Label>
                          <Select
                            value={formik.values.day}
                            onValueChange={handleDayFilterChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select date" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="today">Today</SelectItem>
                              <SelectItem value="tomorrow">Tomorrow</SelectItem>
                              <SelectItem value="saturday">This Saturday</SelectItem>
                              <SelectItem value="sunday">This Sunday</SelectItem>
                              <SelectItem value="weekend">This Weekend</SelectItem>
                              <SelectItem value="pickdate">Pick Date</SelectItem>
                              <SelectItem value="all">All (from today)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Distance</Label>
                          <Select
                            value={formik.values.searchdistance}
                            onValueChange={(value) => {
                              formik.setFieldValue('searchdistance', value);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select distance" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 Miles</SelectItem>
                              <SelectItem value="10">10 Miles</SelectItem>
                              <SelectItem value="25">25 Miles</SelectItem>
                              <SelectItem value="50">50 Miles</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {!disabledDate && (
                        <div>
                          <Label className="text-sm font-medium">Pick Date</Label>
                          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !searchDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {searchDate ? format(searchDate, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-50" side="bottom" align="start" sideOffset={8}>
                              <Calendar
                                mode="single"
                                selected={searchDate}
                                onSelect={handleDateSelect}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}

                      <Button onClick={() => formik.handleSubmit()} className="w-full" disabled={isLoading || !!error || paywallActive}>
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Find Events
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!formik.values.day || !formik.values.searchdistance) {
                setFormError("Please select both date and distance filters before searching.");
                return;
              }
              setFormError("");
              formik.handleSubmit(e);
            }} className="space-y-6">
              {/* Form Error Display */}
              {formError && (
                <Alert className="border-destructive/50 bg-destructive/5">
                  <AlertDescription className="text-destructive">
                    {formError}
                  </AlertDescription>
                </Alert>
              )}
              {/* Desktop Filters */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Date Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Date
                  </Label>
                  <Select
                    required
                    name="day"
                    value={formik.values.day}
                    onValueChange={handleDayFilterChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="tomorrow">Tomorrow</SelectItem>
                      <SelectItem value="saturday">This Saturday</SelectItem>
                      <SelectItem value="sunday">This Sunday</SelectItem>
                      <SelectItem value="weekend">This Weekend</SelectItem>
                      <SelectItem value="pickdate">Pick a Date</SelectItem>
                      <SelectItem value="all">All (from today)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Picker */}
                {!disabledDate && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Pick a Date</Label>
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-10",
                            !searchDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {searchDate ? format(searchDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50" side="bottom" align="start" sideOffset={8}>
                        <Calendar
                          mode="single"
                          selected={searchDate}
                          onSelect={handleDateSelect}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {/* Distance Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Distance
                  </Label>
                  <Select
                    required
                    name="searchdistance"
                    value={formik.values.searchdistance}
                    onValueChange={(value) => {
                      formik.setFieldValue('searchdistance', value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select distance" />
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

                {/* Search Button */}
                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                  <Label className="text-sm font-medium opacity-0">Search</Label>
                  <Button type="submit" className="w-full h-10" disabled={isLoading || !!error || paywallActive}>
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Find Events
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Mobile Search Button */}
              <div className="md:hidden">
                {formError && (
                  <Alert className="border-destructive/50 bg-destructive/5 mb-4">
                    <AlertDescription className="text-destructive">
                      {formError}
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  onClick={() => {
                    if (!formik.values.day || !formik.values.searchdistance) {
                      setFormError("Please select both date and distance filters before searching.");
                      return;
                    }
                    setFormError("");
                    formik.handleSubmit();
                  }}
                  className="w-full"
                  disabled={isLoading || !!error || paywallActive}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Find Events
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div ref={resultsRef} className="space-y-6">
          {/* Loading Progress Bar */}
          {(isLoading || isFetchingNextPage) && (
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-sm font-medium text-foreground">
                      {isLoading ? "Searching for events..." : "Loading more events..."}
                    </span>
                  </div>
                  <Progress value={undefined} className="w-full max-w-md" />
                </div>
              </CardContent>
            </Card>
          )}

          {searchsuccess.current && (
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <CalendarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="pb-4">
                      <h2 className="text-xl font-semibold text-foreground">Search Results</h2>
                      <p className="text-sm text-muted-foreground">Events found in your area</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20">
                      {displayedSearchEvents.length} events found
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event List */}
          {displayedSearchEvents.length > 0 && (
            <div className="min-h-100">
              <EventList
                events={displayedSearchEvents}
                userhandle={userhandle}
                userlatitude={latitude}
                userlongitude={longitude}
                setIsLoading={setIsLoading}
                profiledata={profiledata}
              />
            </div>
          )}

          {/* Load More Button */}
          {hasNextPage && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="outline"
                aria-live="polite"
                className="w-full rounded-full border-border/60 bg-card/70 px-6 shadow-xs hover:bg-card md:w-auto"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  <>
                    <ChevronsUpDown className="w-4 h-4 mr-2" />
                    Load More Events
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Showing {displayedSearchEvents.length} events
              </p>
            </div>
          )}

          {/* Empty State - Hidden when using dialog */}
          {searchsuccess.current && displayedSearchEvents.length === 0 && (
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="pt-12 pb-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Events Found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search criteria or expanding your search radius.
                </p>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isLoading || refreshThrottle.isLocked}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                  />
                  {refreshThrottle.isLocked
                    ? `Try Again (${refreshThrottle.remaining}s)`
                    : "Try Again"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* No Events Found Dialog */}
        <AlertDialog open={showNoEventsDialog} onOpenChange={setShowNoEventsDialog}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <AlertDialogTitle className="text-center text-xl">No Events Found</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                We couldn't find any events matching your search criteria. Try adjusting your search parameters or expanding your search radius.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">
                Close
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => setShowNoEventsDialog(false)}
                className="w-full sm:w-auto"
              >
                Try Different Search
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
