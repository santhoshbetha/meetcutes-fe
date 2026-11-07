import { api } from "@/lib/api";

const DEFAULT_DISTANCE_METRES = 241401; // 150 miles

function toLegacyLocation(location) {
  return {
    locationid: location.id,
    address1: location.street ?? "",
    city: location.city ?? location.locality ?? "",
    state: location.state ?? "",
    zipcode: location.postal_code ?? "",
    latitude: location.latitude,
    longitude: location.longitude,
    name: location.name,
  };
}

/**
 * Loads event locations near a point.
 *
 * The legacy RPC took `distance` in metres, so the new endpoint keeps that
 * contract and the response is mapped back to the shape `CreateEvent` expects.
 */
export const getAutoCompleteData = async (dataIn = {}) => {
  const params = new URLSearchParams({
    lat: String(dataIn.lat ?? ""),
    lng: String(dataIn.lng ?? ""),
    distance: String(dataIn.distance ?? DEFAULT_DISTANCE_METRES),
  });

  try {
    const payload = await api.get(
      `/api/v1/locations/autocomplete?${params.toString()}`,
    );

    return {
      success: true,
      data: (payload?.data?.locations ?? []).map(toLegacyLocation),
    };
  } catch (error) {
    return {
      success: false,
      msg: error?.message || "Unable to load nearby locations",
    };
  }
};
