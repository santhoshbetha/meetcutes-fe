import { create } from "zustand";
import secureLocalStorage from "react-secure-storage";

/**
 * Kept for backwards compatibility with the previous React context. The
 * secure storage contract is intentionally unchanged: the payload is a JSON
 * array of legacy location objects under `"autocompletedata"`.
 */
export const AUTOCOMPLETE_STORAGE_KEY = "autocompletedata";

function parseStoredValue(raw) {
  if (raw == null || raw === "undefined") return null;

  if (typeof raw !== "string") return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function readStoredAutocompleteData() {
  try {
    const parsed = parseStoredValue(
      secureLocalStorage.getItem(AUTOCOMPLETE_STORAGE_KEY),
    );

    if (parsed == null) return null;
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return null;
  }
}

function persistAutocompleteData(value) {
  try {
    secureLocalStorage.setItem(
      AUTOCOMPLETE_STORAGE_KEY,
      JSON.stringify(Array.isArray(value) ? value : []),
    );
  } catch {
    // Storage can be unavailable (private mode, quota). The in-memory store
    // still powers the current tab.
  }
}

function locationKey(location) {
  return [
    location?.address1,
    location?.city,
    location?.state,
    location?.zipcode,
  ]
    .map((part) => String(part ?? "").trim().toLowerCase())
    .join("|");
}

function normalizeValue(value, previous) {
  const next = typeof value === "function" ? value(previous) : value;
  if (next == null) return null;
  return Array.isArray(next) ? next : [next];
}

export const useAutocompleteStore = create((set, get) => ({
  autocompletedata: readStoredAutocompleteData(),

  setAutocompletedata: (value) => {
    const next = normalizeValue(value, get().autocompletedata);
    persistAutocompleteData(next);
    set({ autocompletedata: next });
  },

  /**
   * Adds a freshly selected address to the front of the cached list while
   * de-duplicating by address/city/state/zip. This is what lets the event form
   * reuse the selected location id and coordinates on a later visit.
   */
  upsertAutocompletedata: (location) => {
    if (!location) return;

    const current = get().autocompletedata;
    const existing = Array.isArray(current) ? current : [];
    const key = locationKey(location);
    const next = [
      location,
      ...existing.filter((item) => locationKey(item) !== key),
    ];

    persistAutocompleteData(next);
    set({ autocompletedata: next });
  },

  reset: () => {
    persistAutocompleteData(null);
    set({ autocompletedata: null });
  },
}));

export const useAutocompletedata = () =>
  useAutocompleteStore((state) => state.autocompletedata);

export default useAutocompleteStore;
