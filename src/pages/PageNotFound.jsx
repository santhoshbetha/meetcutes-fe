import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, AlertTriangle } from "lucide-react";

export function PageNotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="max-w-md mx-auto shadow-2xl border-2 border-border bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground mb-2">
            Page Not Found
          </CardTitle>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button
              onClick={() => navigate('/search')}
              variant="outline"
              className="w-full"
            >
              <Search className="w-4 h-4 mr-2" />
              Search Users
            </Button>
          </div>
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              If you believe this is an error, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}