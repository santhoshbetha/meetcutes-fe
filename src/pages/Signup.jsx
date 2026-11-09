import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useFormik } from "formik";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MeetCutesSpinner } from "@/components/ui/MeetCutesSpinner";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import * as Yup from "yup";
import usePasswordToggle from "@/hooks/usePasswordToggle";
import { toast } from "sonner";
import { coords } from "@/lib/defaultcoords";
import { cities } from "@/lib/cities";
import { useRegisterMutation } from "@/hooks/useAuthQueries";
import { useAuthStore } from "@/stores/authStore";
import { describeApiError } from "@/lib/api";
import { Eye, Users, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function isEmpty(val) {
  return val === undefined || val == null || val.length <= 0;
}

function calcAge(birthDate) {
  const birthday = +new Date(birthDate);
  return ~~((Date.now() - birthday) / 31557600000);
}

/**
 * Standalone public signup page.
 *
 * The form owns its Formik/Yup state and is intentionally rendered outside of
 * any dialog or backdrop overlay. The route is public; a fresh visitor can
 * land directly on `/signup` and complete registration.
 */
export function Signup() {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState("");
  const [PasswordInputType, ToggleIcon] = usePasswordToggle();
  const [dobDate, setDobDate] = useState(() => {
    const today = new Date();
    const twentyYearsBack = new Date(today);
    twentyYearsBack.setFullYear(today.getFullYear() - 20);
    return twentyYearsBack;
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");

  const stateComboboxOptions = useMemo(
    () => [
      "Alabama",
      "Alaska",
      "Arizona",
      "Arkansas",
      "California",
      "Colorado",
      "Connecticut",
      "Delaware",
      "Florida",
      "Georgia",
      "Hawaii",
      "Idaho",
      "Illinois",
      "Indiana",
      "Iowa",
      "Kansas",
      "Kentucky",
      "Louisiana",
      "Maine",
      "Maryland",
      "Massachusetts",
      "Michigan",
      "Minnesota",
      "Mississippi",
      "Missouri",
      "Montana",
      "Nebraska",
      "Nevada",
      "New Hampshire",
      "New Jersey",
      "New Mexico",
      "New York",
      "North Carolina",
      "North Dakota",
      "Ohio",
      "Oklahoma",
      "Oregon",
      "Pennsylvania",
      "Rhode Island",
      "South Carolina",
      "South Dakota",
      "Tennessee",
      "Texas",
      "Utah",
      "Vermont",
      "Virginia",
      "Washington",
      "West Virginia",
      "Wisconsin",
      "Wyoming",
      "Washington DC",
    ].map((value) => ({ value, label: value })),
    [],
  );

  const cityComboboxOptions = useMemo(() => {
    if (!isEmpty(state) && cities[state]) {
      return cities[state].map((city) => ({ value: city, label: city }));
    }
    return [];
  }, [state]);

  const doRegister = async (values, actions) => {
    try {
      setLoading(true);
      // Prevent the landing page's signed-in redirect from racing the
      // registration -> onboarding handoff. The onboarding step clears it.
      useAuthStore.getState().setOnboardingInProgress(true);

      const selectedBirthDate =
        dobDate === "" ? new Date("2002-01-01") : new Date(dobDate);
      const age = calcAge(selectedBirthDate);
      const birthday = selectedBirthDate.toISOString().slice(0, 10);
      const cityCoordinates = coords[values.state.trim()]?.[values.city.trim()];

      const payload = {
        email: values.email.trim().toLowerCase(),
        password: values.password.trim(),
        password_confirmation: values.passwordConfirmation.trim(),
        first_name: values.firstname.trim(),
        last_name: values.lastname.trim(),
        phone_number: values.phonenumber.trim(),
        gender: values.gender,
        ethnicity: values.ethnicity,
        birthday,
        age,
        city: values.city,
        state: values.state,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        settings: {
          visibility_preference: values.visibilityPreference,
        },
      };

      // The backend fuzzes these coordinates before storing the geohash.
      if (cityCoordinates) {
        payload.raw_lat = cityCoordinates.lat;
        payload.raw_lon = cityCoordinates.lng;
      }

      const result = await registerMutation.mutateAsync(payload);

      // When the API issues a session immediately, continue straight into the
      // onboarding wizard. Confirmation-first environments still land on the
      // registration-success screen.
      if (result.token) {
        navigate("/onboarding/location");
      } else {
        useAuthStore.getState().setOnboardingInProgress(false);
        navigate("/registration-success", { state: { email: result.email } });
        toast.success("Check your email to confirm your account.");
      }

      toast.success("Signup successful!");
    } catch (error) {
      useAuthStore.getState().setOnboardingInProgress(false);
      toast.error(describeApiError(error, "Signup failed. Please try again."));
    } finally {
      actions.setSubmitting(false);
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      firstname: "",
      lastname: "",
      gender: "",
      dob: "",
      state: "",
      city: "",
      ethnicity: "",
      phonenumber: "",
      email: "",
      password: "",
      passwordConfirmation: "",
      visibilityPreference: "both",
    },
    validationSchema: Yup.object({
      firstname: Yup.string()
        .required("First name is required")
        .min(3, "First name must be at least 3 characters")
        .max(20, "First name must be at most 20 characters"),
      lastname: Yup.string()
        .required("Last name is required")
        .min(3, "Last name must be at least 3 characters")
        .max(40, "Last name must be at most 40 characters"),
      phonenumber: Yup.string()
        .required("Phone number is required")
        .matches(/^\d{0,10}$/, "Phone number must contain only digits")
        .test(
          "len",
          "Phone number must be exactly 10 digits",
          (value) => value && value.length === 10,
        ),
      email: Yup.string()
        .email("Enter a valid email address")
        .required("Email is required"),
      password: Yup.string()
        .min(8, "Password must be at least 8 characters")
        .required("Password is required"),
      passwordConfirmation: Yup.string()
        .required("Please confirm your password")
        .oneOf([Yup.ref("password"), null], "Passwords must match"),
      gender: Yup.string().required("Gender is required"),
      state: Yup.string().required("State is required"),
      city: Yup.string().required("City is required"),
      ethnicity: Yup.string().required("Ethnicity is required"),
    }),
    onSubmit: doRegister,
    validateOnBlur: false,
  });

  // Reset the form when the page mounts.
  useEffect(() => {
    formik.resetForm();
    setState("");
    setSelectedCity("");
    setDobDate(() => {
      const today = new Date();
      const twentyYearsBack = new Date(today);
      twentyYearsBack.setFullYear(today.getFullYear() - 20);
      return twentyYearsBack;
    });
    setCalendarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background/50 px-4 py-12">
      {loading && (
        <MeetCutesSpinner
          className="fixed top-[50%] left-[50%] z-50 cursor-pointer"
          size="large"
        />
      )}

      <div className="w-full max-w-2xl space-y-8 bg-card border border-muted/70 p-10 sm:p-12 rounded-3xl shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-black tracking-tight text-foreground text-center mb-2">
            Create Your Account
          </h1>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-primary underline-offset-4 hover:text-primary/80 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form
          noValidate
          onSubmit={formik.handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          <div className="grid gap-2">
            <Label htmlFor="firstname">First name</Label>
            <Input
              name="firstname"
              id="firstname"
              type="text"
              required
              value={formik.values.firstname}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {(formik.touched.firstname || formik.submitCount > 0) &&
            formik.errors.firstname ? (
              <p className="text-sm text-red-700">{formik.errors.firstname}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lastname">Last name</Label>
            <Input
              name="lastname"
              id="lastname"
              type="text"
              required
              value={formik.values.lastname}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {(formik.touched.lastname || formik.submitCount > 0) &&
            formik.errors.lastname ? (
              <p className="text-sm text-red-700">{formik.errors.lastname}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              name="email"
              required
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {(formik.touched.email || formik.submitCount > 0) &&
            formik.errors.email ? (
              <p className="text-sm text-red-700">{formik.errors.email}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phonenumber">Phone number</Label>
            <Input
              id="phonenumber"
              name="phonenumber"
              type="text"
              required
              value={formik.values.phonenumber}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {(formik.touched.phonenumber || formik.submitCount > 0) &&
            formik.errors.phonenumber ? (
              <p className="text-sm text-red-700">
                {formik.errors.phonenumber}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgotpassword"
                className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                required
                className="pr-9"
                type={PasswordInputType}
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <span className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 bg-background">
                {ToggleIcon}
              </span>
            </div>
            {(formik.touched.password || formik.submitCount > 0) &&
            formik.errors.password ? (
              <p className="text-sm text-red-700">{formik.errors.password}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="passwordConfirmation">Confirm password</Label>
            <Input
              id="passwordConfirmation"
              name="passwordConfirmation"
              type={PasswordInputType}
              required
              value={formik.values.passwordConfirmation}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {(formik.touched.passwordConfirmation || formik.submitCount > 0) &&
            formik.errors.passwordConfirmation ? (
              <p className="text-sm text-red-700">
                {formik.errors.passwordConfirmation}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              required
              value={formik.values.gender}
              onValueChange={(value) =>
                formik.setFieldValue("gender", value, true)
              }
            >
              <SelectTrigger id="gender" className="w-full">
                <SelectValue placeholder="Select your gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {(formik.touched.gender || formik.submitCount > 0) &&
            formik.errors.gender ? (
              <p className="text-sm text-red-700">{formik.errors.gender}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ethnicity">Ethnicity</Label>
            <Select
              name="ethnicity"
              required
              value={formik.values.ethnicity}
              onValueChange={(value) =>
                formik.setFieldValue("ethnicity", value, true)
              }
            >
              <SelectTrigger id="ethnicity" className="w-full">
                <SelectValue placeholder="Select your ethnicity" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Asian">Asian</SelectItem>
                  <SelectItem value="Black / African American">
                    Black / African American
                  </SelectItem>
                  <SelectItem value="Hispanic / Latino">
                    Hispanic / Latino
                  </SelectItem>
                  <SelectItem value="Middle Eastern">Middle Eastern</SelectItem>
                  <SelectItem value="Native American">
                    Native American
                  </SelectItem>
                  <SelectItem value="Pacific Islander">
                    Pacific Islander
                  </SelectItem>
                  <SelectItem value="White / Caucasian">
                    White / Caucasian
                  </SelectItem>
                  <SelectItem value="East Indian">East Indian</SelectItem>
                  <SelectItem value="East Asian">East Asian</SelectItem>
                  <SelectItem value="Mixed Race">Mixed Race</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {(formik.touched.ethnicity || formik.submitCount > 0) &&
            formik.errors.ethnicity ? (
              <p className="text-sm text-red-700">{formik.errors.ethnicity}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="state">State</Label>
            <Combobox
              options={stateComboboxOptions}
              value={state}
              onValueChange={(value) => {
                formik.setFieldValue("state", value, true);
                formik.setFieldTouched("state", true);
                formik.setFieldValue("city", "");
                setSelectedCity("");
                setState(value);
              }}
              onOpenChange={(open) => {
                if (open) formik.setFieldTouched("state", true);
              }}
              placeholder="Select your state"
              searchPlaceholder="Search states..."
              emptyMessage="No states found."
              className="w-full"
            />
            {(formik.touched.state || formik.submitCount > 0) &&
            formik.errors.state ? (
              <p className="text-sm text-red-700">{formik.errors.state}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="city">City</Label>
            <Combobox
              options={cityComboboxOptions}
              value={selectedCity}
              onValueChange={(value) => {
                setSelectedCity(value);
                formik.setFieldValue("city", value, true);
                formik.setFieldTouched("city", true);
              }}
              onOpenChange={(open) => {
                if (open) formik.setFieldTouched("city", true);
              }}
              placeholder="Select your city"
              searchPlaceholder="Search cities..."
              emptyMessage="Select a state first"
              className="w-full"
              disabled={!state}
            />
            {(formik.touched.city || formik.submitCount > 0) &&
            formik.errors.city ? (
              <p className="text-sm text-red-700">{formik.errors.city}</p>
            ) : null}
          </div>

          <div className="relative col-span-1 grid gap-2 sm:col-span-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  data-testid="dob-trigger"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background border-input hover:bg-accent hover:text-accent-foreground",
                    !dobDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {dobDate ? (
                    dobDate.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="relative w-auto p-0 bg-card border-2 border-primary/20 shadow-2xl"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={dobDate}
                  onSelect={(date) => {
                    const today = new Date();
                    const twentyYearsBack = new Date(today);
                    twentyYearsBack.setFullYear(today.getFullYear() - 20);
                    setDobDate(date || twentyYearsBack);
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => {
                    const today = new Date();
                    const twentyYearsBack = new Date(today);
                    twentyYearsBack.setFullYear(today.getFullYear() - 20);
                    return (
                      date > twentyYearsBack || date < new Date("1973-01-01")
                    );
                  }}
                  defaultMonth={(() => {
                    const today = new Date();
                    const twentyYearsBack = new Date(today);
                    twentyYearsBack.setFullYear(today.getFullYear() - 20);
                    return twentyYearsBack;
                  })()}
                  initialFocus
                  className="rounded-md border-0 bg-gradient-to-br from-card via-card to-card/95"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="col-span-1 grid gap-2 sm:col-span-2">
            <Label htmlFor="visibilityPreference">
              Visibility Preference (
              <span className="font-semibold opacity-50 text-red-600">
                can be changed later
              </span>
              )
            </Label>
            <Select
              name="visibilityPreference"
              value={formik.values.visibilityPreference}
              onValueChange={(value) =>
                formik.setFieldValue("visibilityPreference", value)
              }
            >
              <SelectTrigger id="visibilityPreference" className="w-full">
                <SelectValue placeholder="Select visibility preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>How others can find you</SelectLabel>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <span>Visible Everywhere</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="online-only">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span>Online Only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="events-only">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-primary" />
                      <span>Events Only</span>
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose how others can discover your profile: in searches, events,
              or both.
            </p>
          </div>

          <Button
            type="submit"
            className="col-span-1 w-full h-12 rounded-xl bg-linear-to-r from-orange-500 via-red-500 to-pink-500 text-white font-semibold shadow-lg transition-all duration-200 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 hover:shadow-xl hover:scale-[1.02] sm:col-span-2"
          >
            Create Account
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Signup;
