import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, AlertTriangle, RefreshCw, LogOut, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useResendConfirmationMutation } from "@/hooks/useAuthQueries";
import { describeApiError } from "@/lib/api";

export function EmailNotVerified() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const resendMutation = useResendConfirmationMutation();
  const [email] = useState(location.state?.email || '');
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [emailsent, setEmailsent] = useState(false);

  useEffect(() => {
    // If no email provided, redirect to login
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  // Countdown timer effect
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0 && countdown !== null) {
      // Countdown finished - only redirect if not on email-not-verified route
      if (emailsent) {
        navigate('/login');
      }
    }
    return () => clearTimeout(timer);
  }, [countdown, navigate, emailsent]);

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Email address not found. Please try logging in again.');
      navigate('/login');
      return;
    }
    setResending(true);
    try {
      await resendMutation.mutateAsync(email);

      // Start countdown timer for security
      setCountdown(10);
      toast.success('Verification email sent! This page will close in 10 seconds for security.');
      setEmailsent(true);
    } catch (error) {
      toast.error(
        describeApiError(error, 'Unable to resend verification email.'),
      );
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/');
      toast.success('Signed out successfully.');
    } catch {
      toast.error('An error occurred while signing out.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card/95 backdrop-blur-sm border-0">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-linear-to-r from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-linear-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
            Email Not Verified
          </CardTitle>
          <CardDescription className="text-center text-base">
            Please verify your email address to access MeetCutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <Mail className="w-5 h-5" />
              <span className="text-sm">Verification required</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your email address hasn't been verified yet. To ensure account security and provide you with the best experience, we need to confirm your email before you can access your account.
            </p>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground">
                Check your email for the verification link. If you can't find it, we can send you a new one.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleResendVerification}
              disabled={resending}
              className="w-full bg-linear-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-semibold"
            >
              {resending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>

            <div className="flex space-x-2">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/login">Back to Login</Link>
              </Button>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="flex-1 text-destructive hover:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {countdown !== null && countdown > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-300 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Verification Email Sent!</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                Please check your inbox and click the verification link.
              </p>
              <p className="text-xs text-green-500 dark:text-green-500">
                This page will automatically close in <span className="font-bold text-lg">{countdown}</span> seconds for security.
              </p>
            </div>
          )}

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Need help? Contact our support team for assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}