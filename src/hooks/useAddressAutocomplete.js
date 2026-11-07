import { useEffect, useRef, useState } from "react";
import { searchAddressSuggestions } from "@/services/geocoding.service";

export const ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS = 400;
export const ADDRESS_AUTOCOMPLETE_MIN_LENGTH = 3;

/**
 * Debounced address autocomplete.
 *
 * A single timer is kept for the latest query, and the previous request is
 * aborted when the user keeps typing. Rapid keystrokes therefore produce one
 * network request instead of one request per character.
 */
export function useAddressAutocomplete(
  query,
  {
    delay = ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS,
    minLength = ADDRESS_AUTOCOMPLETE_MIN_LENGTH,
  } = {},
) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const term = String(query ?? "").trim();

    if (term.length < minLength) {
      requestIdRef.current += 1;
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        const response = await searchAddressSuggestions(term, {
          signal: controller.signal,
        });

        if (requestIdRef.current !== requestId) return;

        setSuggestions(response.success ? response.data : []);

        if (!response.success) {
          setError(response.msg || "Unable to load address suggestions");
        }
      } catch (lookupError) {
        if (lookupError?.name === "AbortError") return;
        if (requestIdRef.current !== requestId) return;

        setSuggestions([]);
        setError(
          lookupError?.message || "Unable to load address suggestions",
        );
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, delay, minLength]);

  return { suggestions, isLoading, error };
}

export default useAddressAutocomplete;
