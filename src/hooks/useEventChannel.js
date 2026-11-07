import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { acquireSocket, releaseSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/authStore";
import { eventDetailsQueryOptions } from "@/hooks/useEvents";

/**
 * Subscribes to live attendee changes for one event over the Phoenix socket.
 *
 * The channel is joined with the current bearer token; the backend only emits
 * `attendees_updated` (plus the legacy `user_joined`/`user_left`) after the
 * database write succeeds. We invalidate the event query so the existing
 * TanStack cache and the local EventDetails state stay authoritative.
 */
export function useEventChannel(eventId, { enabled = true } = {}) {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !token || !eventId) return undefined;

    const socket = acquireSocket(token);
    if (!socket) return undefined;

    const channel = socket.channel(`event:${eventId}`, {});

    const refresh = () => {
      queryClient.invalidateQueries({
        queryKey: eventDetailsQueryOptions(eventId).queryKey,
      });
      queryClient.invalidateQueries({ queryKey: ["userevents1"] });
      queryClient.invalidateQueries({ queryKey: ["userevents2"] });
      queryClient.invalidateQueries({ queryKey: ["eventssearch"] });
      queryClient.invalidateQueries({ queryKey: ["notifyevents"] });
    };

    channel.on("attendees_updated", refresh);
    channel.on("user_joined", refresh);
    channel.on("user_left", refresh);

    channel.join().receive("error", (reason) => {
      console.warn("Unable to join event channel", reason);
    });

    return () => {
      channel.leave();
      releaseSocket();
    };
  }, [enabled, eventId, token, queryClient]);
}

export default useEventChannel;
