import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete";

/**
 * Debounced, controlled address input backed by Geoapify autocomplete.
 *
 * It exposes stable test ids so E2E can assert both the debounce behavior and
 * the selected address that gets written to secure storage.
 */
export function AddressAutocomplete({
  id = "streetAddress",
  name = "address1",
  value = "",
  placeholder = "Enter address here",
  onChange,
  onSelect,
  onBlur,
  disabled = false,
  className,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const { suggestions, isLoading, error } = useAddressAutocomplete(query);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (event) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    setIsOpen(true);
    onChange?.(nextValue);
  };

  const handleSelect = (suggestion) => {
    setQuery("");
    setIsOpen(false);
    onChange?.(suggestion.address1 ?? "");
    onSelect?.(suggestion);
  };

  const showSuggestions = isOpen && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        name={name}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showSuggestions}
        aria-controls={`${id}-suggestions`}
        aria-label="Street Address"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        onBlur={onBlur}
        disabled={disabled}
        data-testid="address-autocomplete-input"
        className={cn("pr-10", className)}
      />

      {isLoading && (
        <Loader2
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary"
          data-testid="address-autocomplete-loading"
          aria-hidden="true"
        />
      )}

      {showSuggestions && (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.locationid ?? `${suggestion.address1}-${index}`}
              role="option"
              aria-selected={false}
            >
              <button
                type="button"
                className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(suggestion)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {suggestion.address1}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[suggestion.city, suggestion.state, suggestion.zipcode]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-1 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default AddressAutocomplete;
