import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Clock, RefreshCw } from "lucide-react";

export function Maintenance() {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 border-border bg-linear-to-br from-card via-card to-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-linear-to-r from-orange-400 via-red-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-linear-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
            Under Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-3">
            <p className="text-muted-foreground text-lg">
              We're currently performing scheduled maintenance to improve your experience.
            </p>
            <p className="text-sm text-muted-foreground">
              MeetCutes will be back online shortly. Thank you for your patience!
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 p-4 bg-muted/30 rounded-xl border border-border/50">
            <Clock className="w-5 h-5 text-primary" />
            <div className="text-sm">
              <span className="font-semibold text-foreground">Auto-refresh in: </span>
              <span className="font-mono text-primary font-bold">{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleRefresh}
              className="w-full bg-linear-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status Now
            </Button>

            <p className="text-xs text-muted-foreground">
              Expected downtime: 15-30 minutes
            </p>
          </div>

          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              For urgent inquiries, contact{" "}
              <a
                href="mailto:hello@meetcutes.us"
                className="text-primary hover:text-primary/80 underline"
              >
                hello@meetcutes.us
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}