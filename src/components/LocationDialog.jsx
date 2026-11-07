import { LocationWorkspace } from "@/components/LocationWorkspace";

/**
 * Modal shell for the location manager.
 *
 * The operational UI, Leaflet map, geolocation flow and reset protections live
 * in the shared LocationWorkspace. This wrapper only provides the modal
 * overlay and a scrollable viewport so the full workspace stays reachable.
 */
export function LocationDialog({ isOpen, onClose, profiledata }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl">
        <LocationWorkspace onClose={onClose} profiledata={profiledata} />
      </div>
    </div>
  );
}

export default LocationDialog;
