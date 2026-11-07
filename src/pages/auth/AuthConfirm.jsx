import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, RefreshCw, Key, Shield } from "lucide-react";
import {
  useConfirmEmailChangeMutation,
  useValidatePasswordResetTokenMutation,
} from "@/hooks/useAuthQueries";
import { useAuthStore } from "@/stores/authStore";
import { describeApiError } from "@/lib/api";
import { toast } from "sonner";

const UNSUPPORTED_MESSAGE =
  "This confirmation link is no longer supported. Please use the most recent email from MeetCutes, or request a new password reset link.";

function withToken(path, token) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}token=${encodeURIComponent(token)}`;
}

export function AuthConfirm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const validateToken = useValidatePasswordResetTokenMutation();
  const confirmEmailChange = useConfirmEmailChangeMutation();
  const started = useRef(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [actionType, setActionType] = useState(null);
  const next = searchParams.get("next") || "/changepassword";

  useEffect(() => {
    // React 18 StrictMode runs effects twice in development. The ref keeps the
    // token validation from firing twice.
    if (started.current) return;
    started.current = true;

    const processAuthAction = async () => {
      // Accept both the legacy `token_hash` parameter and the plain `token`
      // parameter used by the Elixir reset-password emails.
      const token = searchParams.get("token") || searchParams.get("token_hash");
      const type = searchParams.get("type");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (errorParam) {
        setError(errorDescription || "An authentication error occurred.");
        return;
      }

      if (!token || !type) {
        setError("Invalid or missing authentication parameters.");
        return;
      }

      setActionType(type);

      if (type === "recovery") {
        setProcessing(true);

        try {
          await validateToken.mutateAsync(token);

          setSuccess(true);
          toast.success("Password reset confirmed! Redirecting to change password...");

          setTimeout(() => {
            navigate(withToken(next, token), { replace: true });
          }, 2000);
        } catch (err) {
          const message = describeApiError(
            err,
            "This password reset link is invalid or has expired.",
          );
          setError(message);
          toast.error(`Authentication failed: ${message}`);
        } finally {
          setProcessing(false);
        }

        return;
      }

      if (type === "email_change") {
        setProcessing(true);

        try {
          await confirmEmailChange.mutateAsync(token);

          setSuccess(true);
          toast.success("Email address updated successfully!");

          setTimeout(() => {
            const signedIn = Boolean(useAuthStore.getState().token);
            navigate(signedIn ? "/dashboard" : "/login", { replace: true });
          }, 2000);
        } catch (err) {
          const message = describeApiError(
            err,
            "This email change link is invalid or has expired.",
          );
          setError(message);
          toast.error(`Authentication failed: ${message}`);
        } finally {
          setProcessing(false);
        }

        return;
      }

      // Invitations have no matching backend flow.
      setError(UNSUPPORTED_MESSAGE);
    };

    processAuthAction();
  }, [searchParams, navigate, next, validateToken, confirmEmailChange]);

  const getActionDisplayInfo = (type) => {
    switch (type) {
      case "recovery":
        return {
          title: "Password Reset",
          description: "Confirming your password reset request...",
          icon: Key,
          successMessage:
            "Password reset confirmed! Redirecting to change password...",
          color: "blue",
        };
      case "invite":
        return {
          title: "Account Invitation",
          description: "Confirming your account invitation...",
          icon: Shield,
          successMessage: "Invitation accepted! Welcome to MeetCutes.",
          color: "green",
        };
      case "email_change":
        return {
          title: "Email Change",
          description: "Confirming your email address change...",
          icon: CheckCircle,
          successMessage: "Email address updated successfully!",
          color: "green",
        };
      default:
        return {
          title: "Authentication",
          description: "Processing your authentication request...",
          icon: Shield,
          successMessage: "Authentication completed successfully!",
          color: "blue",
        };
    }
  };

  const actionInfo = getActionDisplayInfo(actionType);
  const IconComponent = actionInfo.icon;

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md shadow-2xl bg-card/95 backdrop-blur-sm border-0">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{actionInfo.title}</h2>
            <p className="text-muted-foreground">{actionInfo.description}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md shadow-2xl bg-card/95 backdrop-blur-sm border-0">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 rounded-full bg-linear-to-r from-${actionInfo.color}-400 via-${actionInfo.color}-500 to-${actionInfo.color}-600 flex items-center justify-center shadow-lg`}>
                <IconComponent className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-center bg-linear-to-r from-green-500 via-green-500 to-emerald-500 bg-clip-text text-transparent">
              Success!
            </CardTitle>
            <CardDescription className="text-center text-base">
              {actionInfo.successMessage}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md shadow-2xl bg-card/95 backdrop-blur-sm border-0">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-linear-to-r from-red-400 via-red-500 to-pink-500 flex items-center justify-center shadow-lg">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-center bg-linear-to-r from-red-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
              Authentication Failed
            </CardTitle>
            <CardDescription className="text-center text-base">
              We couldn't complete your authentication request.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {error || "The authentication link may be expired or invalid. Please try again."}
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full bg-linear-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-semibold">
                <Link to="/login">Back to Login</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Go to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card/95 backdrop-blur-sm border-0">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-linear-to-r from-orange-400 via-red-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-linear-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
            Authentication Confirmation
          </CardTitle>
          <CardDescription className="text-center text-base">
            Processing your authentication request...
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Please wait while we confirm your authentication details.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
