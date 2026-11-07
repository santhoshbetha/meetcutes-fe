import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationWorkspace } from "@/components/LocationWorkspace";
import { useAuthStore } from "@/stores/authStore";

/**
 * Standalone My Location workspace.
 *
 * The operational UI lives in LocationDialog so the modal and this route share
 * the same map, geolocation hooks, save flow and 30-day reset guard. Both read
 * the active profile directly from the Zustand auth store.
 */
export function LocationPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const profiledata = useAuthStore((state) => state.profiledata);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  if (!token) return null;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="self-start pl-0"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">
            {profiledata?.city
              ? `${profiledata.city}, ${profiledata.state}`
              : "Approximate location"}
          </span>
        </div>
      </div>

      <LocationWorkspace onClose={() => navigate("/dashboard")} />
    </div>
  );
}

export default LocationPage;
