const GEOAPIFY_AUTOCOMPLETE_URL =
  "https://api.geoapify.com/v1/geocode/autocomplete";

const GEOAPIFY_API_KEY =
  import.meta.env.VITE_REACT_APP_GEOAPIFY_API_KEY ||
  import.meta.env.REACT_APP_GEOAPIFY_API_KEY ||
  "";

const MIN_QUERY_LENGTH = 3;

/**
 * Maps a Geoapify feature into the legacy location shape used by
 * `CreateEvent` and the `"autocompletedata"` secure-storage payload.
 */
export function toLegacyAddress(feature) {
  const properties = feature?.properties ?? {};
  const coordinates = feature?.geometry?.coordinates ?? [];

  const address1 =
    properties.address_line1 ||
    properties.formatted ||
    properties.name ||
    "";

  if (!address1) return null;

  return {
    locationid: properties.place_id ?? null,
    address1,
    city: properties.city ?? properties.locality ?? "",
    state: properties.state ?? properties.region ?? "",
    zipcode: properties.postcode ?? properties.postal_code ?? "",
    latitude: properties.lat ?? coordinates[1] ?? null,
    longitude: properties.lon ?? coordinates[0] ?? null,
    name: properties.name ?? address1,
    formatted: properties.formatted ?? address1,
  };
}

/**
 * Looks up address suggestions for the debounced event-address input.
 *
 * The caller owns debounce/abort timing. Abort errors are re-thrown so the
 * hook can ignore stale keystrokes instead of surfacing them as failures.
 */
export async function searchAddressSuggestions(
  text,
  { signal, limit = 5 } = {},
) {
  const query = String(text ?? "").trim();

  if (query.length < MIN_QUERY_LENGTH) {
    return { success: true, data: [] };
  }

  const params = new URLSearchParams({
    text: query,
    filter: "countrycode:us",
    limit: String(limit),
    apiKey: GEOAPIFY_API_KEY,
  });

  try {
    const response = await fetch(
      `${GEOAPIFY_AUTOCOMPLETE_URL}?${params.toString()}`,
      { signal },
    );

    if (!response.ok) {
      return {
        success: false,
        data: [],
        msg: `Address lookup failed (${response.status})`,
      };
    }

    const payload = await response.json();
    const data = (payload?.features ?? [])
      .map(toLegacyAddress)
      .filter(Boolean);

    return { success: true, data };
  } catch (error) {
    if (error?.name === "AbortError") throw error;

    return {
      success: false,
      data: [],
      msg: error?.message || "Unable to load address suggestions",
    };
  }
}
