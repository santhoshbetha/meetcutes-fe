import { create } from "zustand";

export const DEFAULT_SEARCH_TAB = "searchevents";
export const DEFAULT_EVENTS_TAB = "createdevents";

const initialState = {
  defaultTab1: DEFAULT_SEARCH_TAB,
  defaultTab2: DEFAULT_EVENTS_TAB,
  logininitsDone: false,
};

/**
 * Atomic client state for the search/events workspace.
 *
 * Server data (people search results, events) lives in TanStack Query. This
 * store only owns transient UI state, so selecting a single field does not
 * re-render every consumer of the old context object.
 */
export const useSearchStore = create((set) => ({
  ...initialState,

  setDefaultTab1: (defaultTab1) => set({ defaultTab1 }),
  setDefaultTab2: (defaultTab2) => set({ defaultTab2 }),
  setLogininitsDone: (logininitsDone) => set({ logininitsDone }),

  reset: () => set({ ...initialState }),
}));

export const useDefaultTab1 = () => useSearchStore((state) => state.defaultTab1);
export const useDefaultTab2 = () => useSearchStore((state) => state.defaultTab2);
export const useLoginInitsDone = () =>
  useSearchStore((state) => state.logininitsDone);

export default useSearchStore;
