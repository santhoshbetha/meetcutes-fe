import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

async function fetchGlobalAnnouncement() {
  const payload = await api.get("/api/v1/public/global-announcement");
  const message = payload?.message ?? payload?.data?.message ?? "";

  return typeof message === "string" ? message.trim() : "";
}

/**
 * Public landing-page announcement. Returns null when no announcement is
 * configured so the banner leaves no wrapper, gap, or DOM footprint behind.
 */
export function GlobalAnnouncementBanner() {
  const { data } = useQuery({
    queryKey: ["public", "global-announcement"],
    queryFn: fetchGlobalAnnouncement,
    staleTime: 60 * 1000,
    retry: false,
  });

  const message = typeof data === "string" ? data.trim() : "";

  if (!message) return null;

  return (
    <div
      data-testid="global-announcement-banner"
      className="mx-auto my-4 max-w-3xl animate-fade-in rounded-2xl border border-amber-200/50 bg-amber-50/60 p-4 text-center shadow-xs dark:border-amber-900/30 dark:bg-amber-950/10"
    >
      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
        {message}
      </p>
    </div>
  );
}

export default GlobalAnnouncementBanner;
