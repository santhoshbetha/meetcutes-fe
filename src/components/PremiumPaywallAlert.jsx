import { AlertTriangle, Crown, Loader2, LockKeyhole } from "lucide-react";
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
    <Card className="relative overflow-hidden border-amber-400/40 bg-gradient-to-br from-amber-50 via-card/80 to-pink-50/70 shadow-lg dark:from-amber-950/30 dark:via-card/60 dark:to-pink-950/20">
      <div
        aria-hidden="true"
        className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-amber-400/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-pink-500/15 blur-3xl"
      />

      <CardContent className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/30 to-pink-500/20 text-amber-600 ring-1 ring-amber-400/30 dark:text-amber-300">
            <Crown className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">
                Premium Threshold Reached
              </p>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300">
                {aroundUserCount} nearby
              </span>
            </div>

            <h3 className="mt-1.5 flex items-start gap-2 text-base font-black tracking-tight text-foreground sm:text-lg">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              Unlock your full match network
            </h3>

            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Premium Threshold Reached! More than 200 potential matches are
              waiting in your area. Unlock full discovery and event access for
              $50/year.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={onUnlock}
          disabled={isUnlocking || !onUnlock}
          className="w-full shrink-0 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 font-black tracking-wide text-white shadow-lg shadow-orange-500/20 hover:from-amber-600 hover:via-orange-600 hover:to-pink-600 sm:w-auto"
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
