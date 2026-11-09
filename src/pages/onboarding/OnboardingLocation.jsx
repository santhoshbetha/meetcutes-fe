import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUpdateProfileMutation } from "@/hooks/useProfileQueries";
import { useAuthStore } from "@/stores/authStore";

/**
 * First onboarding step after credential registration.
 *
 * The address input is backed by Geoapify autocomplete. Selecting a suggestion
 * pins the account to that coordinate footprint and unlocks the questionnaire
 * step. The raw coordinates are sent to the API, which fuzzes them and stores
 * only the derived geohash.
 */
export function OnboardingLocation() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const updateProfileMutation = useUpdateProfileMutation({
    invalidateSearch: false,
  });
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    // Keep Home's signed-in redirect suppressed for the whole handoff. The
    // flag clears when onboarding unmounts (Next Step, Skip, or navigation).
    return () => {
      useAuthStore.getState().setOnboardingInProgress(false);
    };
  }, []);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const coordinateLabel = useMemo(() => {
    if (!selectedLocation) return null;

    const latitude = Number(selectedLocation.latitude);
    const longitude = Number(selectedLocation.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }, [selectedLocation]);

  if (!token) return null;

  const handleNextStep = async () => {
    if (!selectedLocation || updateProfileMutation.isPending) return;

    try {
      await updateProfileMutation.mutateAsync({
        city: selectedLocation.city,
        state: selectedLocation.state,
        raw_lat: selectedLocation.latitude,
        raw_lon: selectedLocation.longitude,
        defaultcoordsset: true,
        usercoordsset: false,
        exactcoordsset: false,
        dateoflocation: new Date().toISOString().slice(0, 10),
      });

      toast.success("Location pinned. Let's finish your profile.");
      navigate("/questionnaire");
    } catch (error) {
      toast.error(error?.message || "Could not save your location.");
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 px-4 py-10"
      data-testid="onboarding-location-step"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-r from-orange-500 via-red-500 to-pink-500 shadow-lg">
            <MapPin className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Pin your local area
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We use a fuzzed coordinate footprint, never your exact address, to
            find nearby events and connections.
          </p>
        </div>

        <Card className="border-border/70 bg-card/95 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Navigation className="h-4 w-4 text-primary" />
              Search for your city
            </CardTitle>
            <CardDescription>
              Start typing a city or address, then choose the matching
              suggestion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <label
                htmlFor="onboarding-address"
                className="text-sm font-medium text-foreground"
              >
                Location
              </label>
              <AddressAutocomplete
                id="onboarding-address"
                name="onboardingAddress"
                placeholder="Try “Austin, Texas”"
                value={selectedLocation?.address1 ?? ""}
                onChange={(value) => {
                  if (!value) setSelectedLocation(null);
                }}
                onSelect={(suggestion) => setSelectedLocation(suggestion)}
              />
            </div>

            {selectedLocation && (
              <div
                className="rounded-xl border border-primary/30 bg-primary/5 p-4"
                data-testid="onboarding-selected-location"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {selectedLocation.address1}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[selectedLocation.city, selectedLocation.state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {coordinateLabel && (
                      <p
                        className="mt-1 font-mono text-xs text-muted-foreground"
                        data-testid="onboarding-coordinates"
                      >
                        {coordinateLabel}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/dashboard")}
              >
                Skip for now
              </Button>
              <Button
                type="button"
                data-testid="onboarding-next-step"
                disabled={!selectedLocation || updateProfileMutation.isPending}
                onClick={handleNextStep}
                className="bg-primary text-primary-foreground"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Next Step"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default OnboardingLocation;
