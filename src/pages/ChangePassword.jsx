import { useState } from "react";
import { useFormik } from "formik";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as Yup from "yup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Lock, Shield, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useResetPasswordMutation } from "@/hooks/useAuthQueries";
import { describeApiError } from "@/lib/api";

export function ChangePassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const resetMutation = useResetPasswordMutation();
  const [loading, setLoading] = useState(false);
  const [customerror, setCustomError] = useState("");
  const [success, setSuccess] = useState(false);

  const formik = useFormik({
    initialValues: {
      password: "",
      passwordconfirm: "",
    },
    validationSchema: Yup.object({
      password: Yup.string()
        .min(8, "Password must be at least 8 characters")
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          "Password must contain at least one uppercase letter, one lowercase letter, and one number"
        )
        .required("Password is required"),
      passwordconfirm: Yup.string()
        .oneOf([Yup.ref("password"), null], "Passwords must match")
        .required("Please confirm your password"),
    }),
    onSubmit: async (values) => {
      if (!token) {
        setCustomError(
          "This password reset link is missing or invalid. Please request a new one.",
        );
        return;
      }

      try {
        setLoading(true);
        setCustomError("");

        await resetMutation.mutateAsync({
          token,
          password: values.password,
          passwordConfirmation: values.passwordconfirm,
        });

        setSuccess(true);
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      } catch (error) {
        setCustomError(
          describeApiError(
            error,
            "Password change failed. Please try again.",
          ),
        );
      } finally {
        setLoading(false);
      }
    },
  });

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Password Changed!</h2>
            <p className="text-muted-foreground mb-4">
              Your password has been successfully updated.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Change Password</h1>
          <p className="text-muted-foreground">
            Enter your new password below to secure your account
          </p>
        </div>

        {/* Error Alert */}
        {customerror && (
          <Alert className="mb-6 border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{customerror}</AlertDescription>
          </Alert>
        )}

        {!token && !customerror && (
          <Alert className="mb-6 border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This password reset link is missing or invalid. Please request a
              new one from the{" "}
              <button
                type="button"
                onClick={() => navigate("/forgotpassword")}
                className="font-semibold underline underline-offset-4"
              >
                forgot password
              </button>{" "}
              page.
            </AlertDescription>
          </Alert>
        )}

        {/* Form Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              New Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={formik.handleSubmit} className="space-y-6">
              {/* Current Password Field (if needed, but not in original) */}
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your new password"
                  name="password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={formik.touched.password && formik.errors.password ? "border-destructive" : ""}
                />
                {formik.touched.password && formik.errors.password && (
                  <p className="text-sm text-destructive">{formik.errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="passwordconfirm" className="text-sm font-medium">
                  Confirm New Password
                </Label>
                <Input
                  id="passwordconfirm"
                  type="password"
                  placeholder="Confirm your new password"
                  name="passwordconfirm"
                  value={formik.values.passwordconfirm}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={formik.touched.passwordconfirm && formik.errors.passwordconfirm ? "border-destructive" : ""}
                />
                {formik.touched.passwordconfirm && formik.errors.passwordconfirm && (
                  <p className="text-sm text-destructive">{formik.errors.passwordconfirm}</p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Password requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>At least 8 characters long</li>
                  <li>One uppercase letter</li>
                  <li>One lowercase letter</li>
                  <li>One number</li>
                </ul>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="flex-1"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading || !token || !formik.isValid || !formik.dirty}
                >
                  {loading ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Need help? Contact our{" "}
            <button
              onClick={() => navigate("/contact")}
              className="text-primary hover:underline"
            >
              support team
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}