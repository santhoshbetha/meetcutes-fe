import { create } from "zustand";

export const EMPTY_RELATIONSHIPS = Object.freeze({
  likes: [],
  blocks: [],
  mutes: [],
  matches: [],
});

function normalizeRelationships(relationships = {}) {
  return {
    likes: relationships.likes ?? [],
    blocks: relationships.blocks ?? [],
    mutes: relationships.mutes ?? [],
    matches: relationships.matches ?? [],
  };
}

export function hasRelationship(relationships, kind, targetId) {
  if (!relationships || !targetId) return false;
  return (relationships[kind] ?? []).includes(targetId);
}

export function isLiked(relationships, targetId) {
  return hasRelationship(relationships, "likes", targetId);
}

export function isBlocked(relationships, targetId) {
  return hasRelationship(relationships, "blocks", targetId);
}

export function isMuted(relationships, targetId) {
  return hasRelationship(relationships, "mutes", targetId);
}

export function isMatched(relationships, targetId) {
  return hasRelationship(relationships, "matches", targetId);
}

/**
 * Client-side mirror of the server relationship summary.
 *
 * The server remains the source of truth; this store keeps the UI responsive
 * and lets feed cards disappear immediately after a block or mute.
 */
export const useProfileStore = create((set, get) => ({
  relationships: EMPTY_RELATIONSHIPS,
  selectedUserId: null,

  setRelationships: (relationships) =>
    set({ relationships: normalizeRelationships(relationships) }),

  resetRelationships: () => set({ relationships: EMPTY_RELATIONSHIPS }),

  setSelectedUserId: (selectedUserId) => set({ selectedUserId }),

  hasRelationship: (kind, targetId) =>
    hasRelationship(get().relationships, kind, targetId),

  isLiked: (targetId) => isLiked(get().relationships, targetId),

  isBlocked: (targetId) => isBlocked(get().relationships, targetId),

  isMuted: (targetId) => isMuted(get().relationships, targetId),

  isMatched: (targetId) => isMatched(get().relationships, targetId),

  /**
   * Applies a relationship locally. Blocking removes likes in both directions
   * and the actor's mute, mirroring the server rules.
   */
  applyRelationship: (kind, targetId) =>
    set((state) => {
      const next = normalizeRelationships(state.relationships);

      if (kind === "block") {
        next.likes = next.likes.filter((id) => id !== targetId);
        next.mutes = next.mutes.filter((id) => id !== targetId);
        next.matches = next.matches.filter((id) => id !== targetId);
      }

      if (kind === "mute") {
        next.likes = next.likes.filter((id) => id !== targetId);
        next.matches = next.matches.filter((id) => id !== targetId);
      }

      if (!next[kind]) next[kind] = [];

      if (!next[kind].includes(targetId)) {
        next[kind] = [...next[kind], targetId];
      }

      return { relationships: next };
    }),

  removeRelationship: (kind, targetId) =>
    set((state) => {
      const next = normalizeRelationships(state.relationships);

      if (next[kind]) {
        next[kind] = next[kind].filter((id) => id !== targetId);
      }

      if (kind === "like") {
        next.matches = next.matches.filter((id) => id !== targetId);
      }

      return { relationships: next };
    }),
}));

export default useProfileStore;
