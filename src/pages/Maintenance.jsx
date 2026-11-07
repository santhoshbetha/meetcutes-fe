import { RefreshCw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Global maintenance screen. Rendered before the router when either the static
 * VITE_MAINTENANCE_MODE flag or the backend profile flag is active.
 */
export function Maintenance() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-xl rounded-2xl border border-border/60 bg-card/60 p-6 text-center shadow-xs">
        <CardContent className="space-y-4 p-0">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground ring-1 ring-border/50">
            <Wrench className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Scheduled maintenance
            </h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
              MeetCutes is briefly down for scheduled server maintenance.
              We&apos;ll be right back up shortly!
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            className="bg-background/60"
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Check again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default Maintenance;
