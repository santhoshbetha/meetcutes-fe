import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, Mail, ArrowRight } from "lucide-react";

export function RegistrationSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const userEmail = location.state?.email;

  useEffect(() => {
    // Auto-redirect to login after 5 seconds
    const timer = setTimeout(() => {
      navigate('/login');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleContinueToVerification = () => {
    navigate('/email-verification', { state: { email: userEmail } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card/95 backdrop-blur-sm border-0">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-linear-to-r from-green-400 via-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-linear-to-r from-green-500 via-green-500 to-emerald-500 bg-clip-text text-transparent">
            Registration Successful!
          </CardTitle>
          <CardDescription className="text-center text-base">
            Welcome to MeetCutes! Your account has been created successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <Mail className="w-5 h-5" />
              <span className="text-sm">Check your email for verification</span>
            </div>
            <p className="text-sm text-muted-foreground">
              We've sent a verification link to your email address. Please click the link to activate your account and start connecting with amazing people.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleContinueToVerification}
              className="w-full bg-linear-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white font-semibold"
            >
              Continue to Email Verification
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <Button asChild className="w-full bg-linear-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-semibold">
              <Link to="/login">
                Continue to Login
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              You will be redirected automatically in 5 seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}