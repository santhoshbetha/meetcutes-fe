import { create } from "zustand";

function normalizeIds(ids) {
  return Array.from(
    new Set((ids ?? []).map((id) => String(id).trim()).filter(Boolean)),
  ).sort();
}

/**
 * Stores the Phoenix Presence keys for the `online_users` topic.
 *
 * A flat sorted array keeps selectors cheap and avoids handing component
 * renderers a mutable Set. UserCard subscribes to a boolean derived from this
 * list, so presence diffs only re-render the affected cards.
 */
export const usePresenceStore = create((set, get) => ({
  onlineUserIds: [],

  setOnlineUserIds: (ids) => {
    set({ onlineUserIds: normalizeIds(ids) });
  },

  clearPresence: () => set({ onlineUserIds: [] }),

  isUserOnline: (userId) =>
    userId != null && get().onlineUserIds.includes(String(userId)),
}));

export function useIsUserOnline(userId) {
  return usePresenceStore((state) =>
    userId == null ? false : state.onlineUserIds.includes(String(userId)),
  );
}

export default usePresenceStore;
