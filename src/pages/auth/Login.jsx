import { useState, useEffect } from "react";
import { DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/Spinner";
import { MeetCutesSpinner } from "@/components/ui/MeetCutesSpinner";
import * as Yup from "yup";
import { Formik } from "formik";
import { Link, useNavigate } from "react-router-dom";
import usePasswordToggle from "@/hooks/usePasswordToggle";
import secureLocalStorage from "react-secure-storage";
import { useLoginMutation } from "@/hooks/useAuthQueries";
import { describeApiError } from "@/lib/api";

export function Login({ setOpenLogin, setOpenSignup }) {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [PasswordInputType, ToggleIcon] = usePasswordToggle();
  const [formKey, setFormKey] = useState(0);

  // Reset form when component mounts (every time login dialog opens)
  useEffect(() => {
    setFormKey(prev => prev + 1);
    setError("");
  }, []);

  const forgotPassword = () => {
    setOpenLogin(false);
  };

  const onSignupClick = () => {
    setOpenLogin(false);
    setOpenSignup(true)
  };

  const doLogin = async (values) => {
    try {
      setLoading(true);
      setError("");

      await loginMutation.mutateAsync({
        email: values.email.trim(),
        password: values.password.trim(),
      });

      navigate('/dashboard');
    } catch (loginError) {
      if (
        loginError?.code === "email_not_confirmed" ||
        loginError?.status === 403
      ) {
        navigate('/email-not-verified', {
          state: { email: values.email.trim() },
        });
        return;
      }

      setError(describeApiError(loginError));
    } finally {
      setLoading(false);
    }
  }

  const UserloginFormSchema = Yup.object().shape({
    email: Yup.string().email().required("Required"),
    password: Yup.string()
      .min(8, "Too Short! (min 8 characters)")
      .required("Required"),
  });

  return (
    <DialogContent className="w-[90%] sm:max-w-106.25 border-0 shadow-2xl bg-linear-to-br from-card via-card to-card/95 backdrop-blur-sm">
      {loading && (
        <div className='absolute top-[50%] left-[50%] z-50 -translate-x-1/2 -translate-y-1/2'>
          <MeetCutesSpinner size="large" />
        </div>
      )}
      <DialogTitle className="sr-only">Log In to MeetCutes</DialogTitle>
      <DialogDescription className="sr-only">Log in to your MeetCutes account to see events, view matches, and update your profile.</DialogDescription>
      <CardHeader className="pb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-linear-to-r from-orange-400 via-red-500 to-pink-500 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        <CardTitle className="text-3xl font-bold text-center bg-linear-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-center text-base">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <Formik
          key={formKey}
          initialValues={{
            email: "",
            password: "",
          }}
          validationSchema={UserloginFormSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              //alert(JSON.stringify(values, null, 2));
              actions.setSubmitting(false);
            }, 1000);
            localStorage.clear();
            secureLocalStorage.clear();
            secureLocalStorage.clear();
            // setAutoCompletedata([])
            doLogin(values, actions);
          }}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            isSubmitting,
          }) => (
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.email}
                    className="h-12 border-2 border-border/50 rounded-xl focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 bg-background/50 backdrop-blur-sm"
                    required
                  />
                  <p className="text-red-500 text-sm">
                    {errors.email && touched.email && errors.email}
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                      Password
                    </Label>
                    <Link
                      to="/forgotpassword"
                      className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
                      onClick={forgotPassword}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={PasswordInputType}
                      placeholder="Enter your password"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.password}
                      className="h-12 pr-12 border-2 border-border/50 rounded-xl focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 bg-background/50 backdrop-blur-sm"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {ToggleIcon}
                    </button>
                  </div>
                  <p className="text-red-500 text-sm">
                    {errors.password && touched.password && errors.password}
                  </p>
                </div>
                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm text-center">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-12 bg-linear-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </div>
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Don&apos;t have an account? </span>
                <Link
                  to="/"
                  onClick={onSignupClick}
                  className="text-primary hover:text-primary/80 font-semibold underline-offset-4 hover:underline transition-colors"
                >
                  Sign up here
                </Link>
              </div>
            </form>
          )}
        </Formik>
      </CardContent>
    </DialogContent>
  );
}
