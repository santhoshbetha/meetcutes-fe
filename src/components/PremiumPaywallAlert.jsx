import { Crown, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Premium discovery gate shared by people search and event search.
 */
export function PremiumPaywallAlert({
  aroundUserCount,
  onUnlock,
  isUnlocking = false,
}) {
  return (
    <Card className="mx-auto w-full max-w-xl rounded-2xl border border-amber-200/60 bg-card/60 p-6 text-foreground shadow-xs dark:border-amber-900/30">
      <CardContent className="flex flex-col gap-5 p-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/60 dark:bg-amber-950/20 dark:text-amber-300 dark:ring-amber-900/30">
            <Crown className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Premium discovery
            </p>

            <h3 className="mt-1 text-base font-semibold tracking-tight text-foreground sm:text-lg">
              Unlock your full match network
            </h3>

            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                Premium Threshold Reached!
              </span>{" "}
              {aroundUserCount > 0
                ? `${aroundUserCount} potential matches are nearby. `
                : "More than 200 potential matches are waiting in your area. "}
              Unlock full discovery and event access for $50/year.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onUnlock}
          disabled={isUnlocking || !onUnlock}
          className="w-full shrink-0 border-amber-200/70 bg-background/60 font-semibold text-foreground hover:bg-amber-50/70 dark:border-amber-900/40 dark:hover:bg-amber-950/20 sm:w-auto"
        >
          {isUnlocking ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LockKeyhole className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          UNLOCK MY MATCHES
        </Button>
      </CardContent>
    </Card>
  );
}

export default PremiumPaywallAlert;
