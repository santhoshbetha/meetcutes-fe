import { useEffect } from "react";
import { Presence } from "phoenix";
import { acquireSocket, releaseSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/authStore";
import { usePresenceStore } from "@/stores/presenceStore";

/**
 * Maintains the global `online_users` Phoenix Presence subscription.
 *
 * The hook runs for the lifetime of the authenticated shell. It acquires the
 * shared socket ref-count once, joins the presence channel, and tears both down
 * when the token disappears or the provider unmounts.
 */
export function usePresenceTracking() {
  const token = useAuthStore((state) => state.token);
  const setOnlineUserIds = usePresenceStore((state) => state.setOnlineUserIds);
  const clearPresence = usePresenceStore((state) => state.clearPresence);

  useEffect(() => {
    if (!token) {
      clearPresence();
      return undefined;
    }

    const socket = acquireSocket(token);
    if (!socket) {
      clearPresence();
      return undefined;
    }

    const channel = socket.channel("online_users", {});
    let presenceState = {};

    const syncPresence = () => {
      setOnlineUserIds(Object.keys(presenceState));
    };

    const handleState = (state) => {
      presenceState = Presence.syncState(presenceState, state);
      syncPresence();
    };

    const handleDiff = (diff) => {
      presenceState = Presence.syncDiff(presenceState, diff);
      syncPresence();
    };

    channel.on("presence_state", handleState);
    channel.on("presence_diff", handleDiff);

    channel.join().receive("error", (reason) => {
      console.warn("Unable to join online presence channel", reason);
    });

    return () => {
      channel.off("presence_state");
      channel.off("presence_diff");
      channel.leave();
      releaseSocket();
      clearPresence();
    };
  }, [token, setOnlineUserIds, clearPresence]);
}

export default usePresenceTracking;
