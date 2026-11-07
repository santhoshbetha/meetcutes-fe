import { useState, useEffect, useRef } from "react";
import { X, MapPin, Navigation, RefreshCw, Target, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
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
import { Separator } from '@/components/ui/separator';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { coords } from '@/lib/defaultcoords'
import { fuzzCoordinates, isObjEmpty } from "../utils/util";
import { useUpdateProfileMutation } from "@/hooks/useProfileQueries";
import { useAuthStore } from "@/stores/authStore";
import dayjs from "dayjs";
import { haversine } from "../utils/util";
import { toast } from "sonner";

const delay = ms => new Promise(res => setTimeout(res, ms));

var toKilometers = function (miles) {
  return Math.round(miles * 1.609344);
};

const centerdefault = {
  lat: 43.6680928,
  lng: -92.9744896
};

const MANUAL_RADIUS_MILES = 50;
const DECIMAL_COORDINATE_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function isDecimalCoordinate(value) {
  return DECIMAL_COORDINATE_PATTERN.test(String(value ?? "").trim());
}

function parseCoordinate(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const MAP_CONTAINER_ID = "coordinates-map-new";
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_ASSET_ATTR = "data-meetcutes-leaflet";

let leafletRefCount = 0;
let leafletLoadPromise = null;
let leafletLoaded = false;

function ensureLeafletLink() {
  let link = document.querySelector(`link[${LEAFLET_ASSET_ATTR}="css"]`);

  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS_URL;
    link.setAttribute(LEAFLET_ASSET_ATTR, "css");
    document.head.appendChild(link);
  }

  return link;
}

function removeLeafletAssets() {
  document.querySelector(`link[${LEAFLET_ASSET_ATTR}="css"]`)?.remove();
  document.querySelector(`script[${LEAFLET_ASSET_ATTR}="js"]`)?.remove();
  leafletLoadPromise = null;
}

function acquireLeafletAssets() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet requires a browser"));
  }

  leafletRefCount += 1;
  ensureLeafletLink();

  if (window.L) {
    leafletLoaded = true;
    return Promise.resolve(window.L);
  }

  if (leafletLoadPromise) return leafletLoadPromise;

  let script = document.querySelector(`script[${LEAFLET_ASSET_ATTR}="js"]`);
  const createdScript = !script;

  if (!script) {
    script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.setAttribute(LEAFLET_ASSET_ATTR, "js");
  }

  leafletLoadPromise = new Promise((resolve, reject) => {
    if (window.L) {
      leafletLoaded = true;
      resolve(window.L);
      return;
    }

    script.addEventListener(
      "load",
      () => {
        if (window.L) {
          leafletLoaded = true;
          resolve(window.L);
        } else {
          reject(new Error("Leaflet loaded without exposing window.L"));
        }
      },
      { once: true },
    );

    script.addEventListener(
      "error",
      () => reject(new Error("Unable to load Leaflet")),
      { once: true },
    );
  }).finally(() => {
    // StrictMode can unmount while the script is still loading. Remove the
    // injected assets once it settles if no consumer has re-acquired them.
    if (leafletRefCount === 0) removeLeafletAssets();
  });

  if (createdScript) {
    document.body.appendChild(script);
  }

  return leafletLoadPromise;
}

function releaseLeafletAssets() {
  leafletRefCount = Math.max(0, leafletRefCount - 1);

  if (leafletRefCount === 0 && leafletLoaded) {
    removeLeafletAssets();
  }
}

export function LocationWorkspace({
  onClose,
  profiledata: profileProp,
}) {
  const storedProfile = useAuthStore((state) => state.profiledata);
  const profiledata = profileProp ?? storedProfile;
  const updateProfileMutation = useUpdateProfileMutation();
  const stateCoords = profiledata?.state ? coords[profiledata.state] : null;
  const cityCoords =
    stateCoords && profiledata?.city ? stateCoords[profiledata.city] : null;
  const center = cityCoords ?? centerdefault;
  const [coordinates, setCoordinates] = useState(center);
  const [markerPosition, setMarkerPosition] = useState(center);
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [confirmClick, setConfirmClick] = useState(false);
  const [showGeoConfirmDialog, setShowGeoConfirmDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allowCoordsChange, setAllowCoordsChange] = useState(false);
  const [resetCoordsConfirmClick, setResetCoordsConfirmClick] = useState(false);
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInitTimerRef = useRef(null);
  const markerPositionRef = useRef(markerPosition);
  const resetCoordsRef = useRef(null);
  const saveGeoCodesRef = useRef(null);

  useEffect(() => {
    //setLatlng(getcoords(profiledata?.city))
    //setCoordinates(coords[profiledata?.state][profiledata?.city]);
    //setLatlngdefault(getcoords(profiledata?.city))
    const datenow = new Date(Date.now());
    let dif = Math.abs(datenow - new Date(profiledata?.dateofcoordinates));
    let dayssincecoordschange = Math.floor(dif / (1000 * 3600 * 24));
    if (dayssincecoordschange > 30) {
      //1 month
      setAllowCoordsChange(true);
    } else {
      setAllowCoordsChange(false);
    }
  }, [profiledata?.dateofcoordinates]);

  const resetCoords = async (coords) => {
    console.log("resetCoords coords::", coords)
    const fuzzyCoordinates = fuzzCoordinates(coords.lat, coords.lng);
    let geodata = {
      latitude: fuzzyCoordinates.lat,
      longitude: fuzzyCoordinates.lng,
      defaultcoordsset: true,
      usercoordsset: false,
    };

    try {
      await updateProfileMutation.mutateAsync(geodata);
      toast.success('Approximate location reset successfully!', {
        position: 'top-center',
        duration: 4000,
      });
      onClose(); // Close dialog after success
    } catch (error) {
      toast.error(error?.message || 'Failed to reset location. Please try again.', {
        position: 'top-center',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    resetCoordsRef.current = resetCoords;
  });

  useEffect(() => {
    if (resetCoordsConfirmClick == true) {
      if (!isObjEmpty(profiledata?.dateofcoordinates)) {
        const datenow = new Date(Date.now());
        let dif = Math.abs(datenow - new Date(profiledata?.dateofcoordinates));
        let dayssincecoordschange = Math.floor(dif / (1000 * 3600 * 24));
        setLoading(true);
        if (dayssincecoordschange > 30) {
          //1 month
          delay(2000).then(async () => {
            await resetCoordsRef.current(
              coords?.[profiledata?.state]?.[profiledata?.city] ??
                centerdefault,
            );
            setShowResetConfirmDialog(false);
            setResetCoordsConfirmClick(false);
            setLoading(false);
          });
        } else {
          toast.error('Error! Only one reset per month is allowed!', {
            position: 'top-center',
            duration: 5000,
          });
          setLoading(false);
          setShowResetConfirmDialog(false);
          setResetCoordsConfirmClick(false);
        }
      } else {
        console.log('profiledata location empty');
      }
    }
  }, [
    resetCoordsConfirmClick,
    profiledata?.dateofcoordinates,
    profiledata?.state,
    profiledata?.city,
  ]);

  const saveGeoCodes = async (coords) => {
    let dateofcoordinates = new Date().toISOString().substring(0, 10).toString();
    const fuzzyCoordinates = fuzzCoordinates(coords[0], coords[1]);
    let geodata = {
      latitude: fuzzyCoordinates.lat,
      longitude: fuzzyCoordinates.lng,
      defaultcoordsset: false,
      usercoordsset: true,
      dateofcoordinates: dateofcoordinates,
    };

    try {
      await updateProfileMutation.mutateAsync(geodata);
      toast.success('Approximate location saved successfully!', {
        position: 'top-center',
        duration: 4000,
      });
      // Keep the workspace open so the success state and the new green
      // "Approximate Location Set" banner are immediately visible.
    } catch (error) {
      toast.error(error?.message || 'Failed to save coordinates. Please try again.', {
        position: 'top-center',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    saveGeoCodesRef.current = saveGeoCodes;
  });

  useEffect(() => {
    if (confirmClick == true) {
      setLoading(true);
      delay(4000).then(async () => {
        await saveGeoCodesRef.current([coordinates?.lat, coordinates?.lng]);
        setConfirmClick(false);
        setLoading(false);
        setShowGeoConfirmDialog(false);
      });
    }
  }, [confirmClick, coordinates?.lat, coordinates?.lng]);

  // Keep the map marker in sync when the browser geolocation hook or a map
  // interaction updates the selected point.
  useEffect(() => {
    markerPositionRef.current = markerPosition;

    if (markerRef.current) {
      markerRef.current.setLatLng([markerPosition.lat, markerPosition.lng]);
    }
  }, [markerPosition]);

  useEffect(() => {
    if (profiledata?.usercoordsset) return undefined;

    let cancelled = false;

    const clearMap = () => {
      if (mapInitTimerRef.current) {
        clearTimeout(mapInitTimerRef.current);
        mapInitTimerRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }

      markerRef.current = null;

      const container = document.getElementById(MAP_CONTAINER_ID);
      if (container) container.innerHTML = "";
    };

    const drawMap = (attempt = 0) => {
      if (cancelled) return;

      const container = document.getElementById(MAP_CONTAINER_ID);

      // The modal animates in, so the container may still have zero dimensions
      // on the first paint. Poll briefly until Leaflet has a real viewport.
      if (
        !container ||
        container.clientWidth === 0 ||
        container.clientHeight === 0
      ) {
        if (attempt < 40) {
          mapInitTimerRef.current = window.setTimeout(
            () => drawMap(attempt + 1),
            50,
          );
        }
        return;
      }

      if (!window.L) return;

      const L = window.L;
      clearMap();

      const customIcon = L.divIcon({
        html: `<div style="color: #3b82f6; width: 32px; height: 32px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742c1.002-.722 2.607-1.99 3.61-3.398 1.458-2.047 2.144-3.991 2.144-5.744 0-4.46-3.56-8.03-8-8.03s-8 3.57-8 8.03c0 1.753.686 3.697 2.144 5.744 1.003 1.408 2.608 2.676 3.61 3.398a16.943 16.943 0 001.144.742zm.46-10.351a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd" /></svg></div>`,
        className: "custom-leaflet-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const position = markerPositionRef.current;
      const map = L.map(container, { scrollWheelZoom: true }).setView(
        [position.lat, position.lng],
        13,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const marker = L.marker([position.lat, position.lng], {
        draggable: true,
        icon: customIcon,
      }).addTo(map);

      marker.bindPopup("<b>Your location</b>").openPopup();

      marker.on("dragend", (event) => {
        const next = event.target.getLatLng();
        setMarkerPosition({ lat: next.lat, lng: next.lng });
      });

      map.on("click", (event) => {
        const { lat, lng } = event.latlng;
        marker.setLatLng([lat, lng]);
        setMarkerPosition({ lat, lng });
      });

      mapRef.current = map;
      markerRef.current = marker;

      // Force Leaflet to recalculate after the modal animation and the first
      // tile/marker draw.
      map.invalidateSize();
      window.requestAnimationFrame(() => {
        if (!cancelled && mapRef.current === map) {
          map.invalidateSize();
        }
      });
    };

    acquireLeafletAssets()
      .then(() => {
        if (!cancelled) drawMap();
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("Unable to initialize the location map:", error);
        }
      });

    return () => {
      cancelled = true;
      clearMap();
      releaseLeafletAssets();
    };
  }, [profiledata?.usercoordsset]);

  function verifygeo(coordsIn) {
    const cityCoords = coords?.[profiledata?.state]?.[profiledata?.city];

    if (!cityCoords) return true;

    const distance = haversine(
      coordsIn.latitude,
      coordsIn.longitude,
      cityCoords.lat,
      cityCoords.lng,
    );

    return toKilometers(distance) < 250;
  }

  function successCallback(pos) {
    var coords = pos.coords;
    if (verifygeo(coords)) {
      const newCoords = {
        lat: coords?.latitude,
        lng: coords?.longitude,
      };

      setMarkerPosition(newCoords);
      setCoordinates(newCoords);
      setIsGettingLocation(false);
      setShowGeoConfirmDialog(true);
    } else {
      toast.error('Location error: Coordinates are far from your city. Please try again or set location manually.', {
        position: 'top-center',
        duration: 5000,
      });
      setIsGettingLocation(false);
    }
  }

  function errorsCallback(error) {
    console.warn(`ERROR(${error.code}): ${error.message}`);
    let errorMessage = 'Unable to get your location. ';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage += 'Location access denied. Please enable location permissions.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage += 'Location information is unavailable.';
        break;
      case error.TIMEOUT:
        errorMessage += 'Location request timed out.';
        break;
      default:
        errorMessage += 'Please mark your location manually on the map.';
        break;
    }
    toast.error(errorMessage, {
      position: 'top-center',
      duration: 5000,
    });
    setIsGettingLocation(false);
  }

  var options = {
    enableHighAccuracy: true,
    timeout: 27000,
    maximumAge: 0,
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then(function (result) {
        if (result.state === 'granted') {
          //If granted then you can directly call your function here
          navigator.geolocation.getCurrentPosition(successCallback);
        } else if (result.state === 'prompt') {
          navigator.geolocation.getCurrentPosition(successCallback, errorsCallback, options);
        } else if (result.state === 'denied') {
          //If denied then you have to show instructions to enable location
          toast.error('Location access denied. Please enable location permissions in your browser settings.', {
            position: 'top-center',
            duration: 5000,
          });
        }
        result.onchange = function () {
          //console.log(result.state);
        };
      });
    } else {
      toast.error('Geolocation is not supported by your browser. Please mark your location manually on the map.', {
        position: 'top-center',
        duration: 5000,
      });
    }
  };

  const resolveRegisteredCityCoordinates = () => {
    if (
      parseCoordinate(cityCoords?.lat) !== null &&
      parseCoordinate(cityCoords?.lng) !== null
    ) {
      return { lat: Number(cityCoords.lat), lng: Number(cityCoords.lng) };
    }

    const cityLatitude = parseCoordinate(
      profiledata?.city_latitude ?? profiledata?.citylatitude,
    );
    const cityLongitude = parseCoordinate(
      profiledata?.city_longitude ?? profiledata?.citylongitude,
    );

    if (cityLatitude !== null && cityLongitude !== null) {
      return { lat: cityLatitude, lng: cityLongitude };
    }

    return {
      lat: parseCoordinate(profiledata?.latitude) ?? centerdefault.lat,
      lng: parseCoordinate(profiledata?.longitude) ?? centerdefault.lng,
    };
  };

  const handleManualCoordinateApply = (event) => {
    event.preventDefault();

    if (
      !isDecimalCoordinate(manualLatitude) ||
      !isDecimalCoordinate(manualLongitude)
    ) {
      toast.error(
        "Invalid input format. Please enter correct numeric coordinate parameters.",
        { position: "top-center", duration: 5000 },
      );
      return;
    }

    const latitude = Number(manualLatitude);
    const longitude = Number(manualLongitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      toast.error(
        "Invalid input format. Please enter correct numeric coordinate parameters.",
        { position: "top-center", duration: 5000 },
      );
      return;
    }

    const registeredCity = resolveRegisteredCityCoordinates();
    const distance = haversine(
      latitude,
      longitude,
      registeredCity.lat,
      registeredCity.lng,
    );

    if (distance > MANUAL_RADIUS_MILES) {
      setManualLatitude("");
      setManualLongitude("");
      toast.error(
        "Location rejected! Manually entered coordinates must fall within a 50-mile radius of your registered city to prevent profile manipulation.",
        { position: "top-center", duration: 6000 },
      );
      return;
    }

    const nextCoordinates = { lat: latitude, lng: longitude };
    markerPositionRef.current = nextCoordinates;
    markerRef.current?.setLatLng([latitude, longitude]);
    setMarkerPosition(nextCoordinates);
    setCoordinates(nextCoordinates);

    const map = mapRef.current;
    if (map) {
      if (typeof map.flyTo === "function") {
        map.flyTo([latitude, longitude], 13);
      } else if (typeof map.setView === "function") {
        map.setView([latitude, longitude], 13);
      }
    }

    toast.success("Manual coordinates validated and applied to the map.", {
      position: "top-center",
      duration: 4000,
    });
  };

  const handleSetCoordinates = () => {
    setCoordinates(markerPosition);
    //alert(
    //  `Coordinates set to: ${markerPosition.lat.toFixed(4)}, ${markerPosition.lng.toFixed(4)}`,
    //);
  };

  const getCoordinateStatus = () => {
    if (profiledata?.usercoordsset) {
      return { type: 'custom', label: 'Approximate Location Set', color: 'bg-green-500' };
    } else if (profiledata?.defaultcoordsset) {
      return { type: 'default', label: 'Default Approximate Location', color: 'bg-blue-500' };
    }
    return { type: 'none', label: 'No Location Set', color: 'bg-gray-500' };
  };

  const status = getCoordinateStatus();

  return (
    <Card className="relative w-full overflow-hidden rounded-3xl border border-border/50 bg-card shadow-2xl">
          {/* Global Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="text-center">
                <Spinner size="xlarge" className="mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Updating your location...</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="bg-linear-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-border/50 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:h-12 sm:w-12">
                  <Target className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">Set GPS Coordinates</h2>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Set an approximate location for better matches and privacy</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className={`${status.color} text-white text-xs px-2 py-1`}>
                      {status.label}
                    </Badge>
                    {profiledata?.usercoordsset && (
                      <span className="text-xs text-muted-foreground">
                        ({profiledata.latitude?.toFixed(4)}, {profiledata.longitude?.toFixed(4)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-2 hover:bg-muted rounded-lg transition-colors group"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
              </button>
            </div>
          </div>

          {/* Alert Dialogs */}
          <AlertDialog open={showResetConfirmDialog} onOpenChange={setShowResetConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-orange-500" />
                  Reset to Default Location
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>This will reset your coordinates to the default location for your city.</p>
                  {!allowCoordsChange && (
                    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/10">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 dark:text-orange-200">
                        Last changed: {dayjs(profiledata?.dateofcoordinates).format('MMM D, YYYY')}
                        <br />
                        You can reset again after 30 days.
                      </AlertDescription>
                    </Alert>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    setResetCoordsConfirmClick(true);
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Reset Location
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={showGeoConfirmDialog} onOpenChange={setShowGeoConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Confirm Location
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Use this point as the basis for your saved location:
                  <span className="font-mono text-green-600 dark:text-green-400 ml-2">
                    ({markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)})
                  </span>
                  <br />
                  Your stored coordinates will be blurred by roughly 5 to 10 miles for safety.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    setConfirmClick(true);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Confirm Location
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Content */}
          <div className="flex flex-col">
            {/* Status and Actions */}
            {profiledata?.usercoordsset && (
              <div className="px-6 py-4 border-b border-border/50">
                <Alert className="border-green-200 bg-green-50 dark:bg-green-900/10">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Custom location set:</strong> Your coordinates are manually configured.
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-3 h-7"
                      onClick={() => setShowResetConfirmDialog(true)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Main Content Area */}
            <div>
              <div className="px-4 pt-4 sm:px-6">
                <Alert className="border-primary/20 bg-primary/5">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm text-foreground">
                    Only approximate coordinates will be stored in the database. Never the exact coordinates.
                  </AlertDescription>
                </Alert>
              </div>

              {!profiledata?.usercoordsset && (
                <div className="space-y-6 p-4 sm:p-6">
                  {/* Quick Location Button */}
                  <div className="text-center">
                    <Button
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      size="lg"
                      className="w-full bg-blue-600 px-6 py-6 text-white font-semibold shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl sm:w-auto sm:px-8"
                    >
                      <Navigation className="w-5 h-5 mr-3" />
                      {isGettingLocation ? 'Getting Your Location...' : 'Use My Current Location'}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Detect your location, then store an approximate version for privacy
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-border"></div>
                    <span className="text-sm text-muted-foreground font-medium">OR</span>
                    <div className="flex-1 h-px bg-border"></div>
                  </div>

                  {/* Manual Location Setting */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-foreground mb-2">Set Location Manually</h3>
                      <p className="text-sm text-muted-foreground">
                        Drag the marker near your location, then save an approximate coordinate set blurred by 5 to 10 miles
                      </p>
                    </div>

                    {/* Coordinate Display */}
                    <div className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <MapPin className="w-5 h-5 text-primary" />
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Current Marker Position</p>
                        <p className="font-mono text-lg font-semibold text-foreground">
                          {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Map Section */}
              {!profiledata?.usercoordsset && (
                <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                  <div className="relative rounded-xl overflow-hidden border border-border shadow-lg bg-muted/20">
                    <div
                      id="coordinates-map-new"
                      className="w-full h-64 sm:h-96 md:h-[500px] bg-muted"
                    ></div>

                    {/* Map Controls */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={() => {
                          const mapElement = document.getElementById("coordinates-map-new");
                          if (mapElement) {
                            if (document.fullscreenElement) {
                              document.exitFullscreen();
                            } else {
                              mapElement.requestFullscreen();
                            }
                          }
                        }}
                        className="bg-card dark:bg-gray-800 p-2 rounded-lg shadow-md hover:shadow-lg transition-all z-[1000]"
                        aria-label="Toggle fullscreen"
                      >
                        <svg
                          className="w-5 h-5 text-gray-700 dark:text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Map Instructions */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/10">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                          Click on the map or drag the marker to set your location
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Coordinate Entry */}
              {!profiledata?.usercoordsset && (
                <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          Manual Coordinate Entry
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Enter a latitude and longitude within 50 miles of your
                          registered city.
                        </p>
                      </div>
                    </div>

                    <form
                      onSubmit={handleManualCoordinateApply}
                      className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
                    >
                      <div className="space-y-2">
                        <Label
                          htmlFor="manual-latitude"
                          className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          Latitude
                        </Label>
                        <Input
                          id="manual-latitude"
                          name="manualLatitude"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="e.g. 30.2672"
                          value={manualLatitude}
                          onChange={(event) =>
                            setManualLatitude(event.target.value)
                          }
                          className="bg-background/70 font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="manual-longitude"
                          className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                        >
                          Longitude
                        </Label>
                        <Input
                          id="manual-longitude"
                          name="manualLongitude"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="e.g. -97.7431"
                          value={manualLongitude}
                          onChange={(event) =>
                            setManualLongitude(event.target.value)
                          }
                          className="bg-background/70 font-mono"
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full border-primary/30 bg-primary/5 font-semibold text-primary hover:bg-primary/10 sm:w-auto"
                      >
                        <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
                        Validate &amp; Apply
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {!profiledata?.usercoordsset && (
              <div className="border-t border-border/50 bg-muted/20 px-4 py-4 sm:px-6">
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      handleSetCoordinates();
                      setShowGeoConfirmDialog(true);
                    }}
                    className="bg-primary hover:bg-primary/90 px-6 font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Save Location
                  </Button>
                </div>
              </div>
            )}

            {/* Close button for set coordinates */}
            {profiledata?.usercoordsset && (
              <div className="border-t border-border/50 bg-muted/20 px-4 py-4 sm:px-6">
                <div className="flex justify-end">
                  <Button
                    onClick={onClose}
                    className="px-6"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
  );
}