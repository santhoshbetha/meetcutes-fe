import { useState, useMemo, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useFormik } from "formik";
import { DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner"
import { MeetCutesSpinner } from "@/components/ui/MeetCutesSpinner"
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import * as Yup from "yup";
import { ScrollArea } from "@/components/ui/scroll-area";
import usePasswordToggle from "@/hooks/usePasswordToggle";
import { toast } from "sonner";
import { coords } from "@/lib/defaultcoords";
import { cities } from "@/lib/cities"
import { useRegisterMutation } from "@/hooks/useAuthQueries";
import { describeApiError } from "@/lib/api";
import { Eye, Users, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function isEmpty(val) {
  return val === undefined || val == null || val.length <= 0 ? true : false;
}

function calcAge(birthDate) {
  var birthday = +new Date(birthDate);
  return ~~((Date.now() - birthday) / 31557600000);
}

export function Signup({ setOpenSignup, setOpenLogin }) {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState("");
  const [PasswordInputType, ToggleIcon] = usePasswordToggle();
  // Default to 20 years back from today
  const [dobDate, setDobDate] = useState(() => {
    const today = new Date();
    const twentyYearsBack = new Date(today);
    twentyYearsBack.setFullYear(today.getFullYear() - 20);
    return twentyYearsBack;
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");

  // Create combobox options for states
  const stateComboboxOptions = useMemo(() => [
    { value: "Alabama", label: "Alabama" },
    { value: "Alaska", label: "Alaska" },
    { value: "Arizona", label: "Arizona" },
    { value: "Arkansas", label: "Arkansas" },
    { value: "California", label: "California" },
    { value: "Colorado", label: "Colorado" },
    { value: "Connecticut", label: "Connecticut" },
    { value: "Delaware", label: "Delaware" },
    { value: "Florida", label: "Florida" },
    { value: "Georgia", label: "Georgia" },
    { value: "Hawaii", label: "Hawaii" },
    { value: "Idaho", label: "Idaho" },
    { value: "Illinois", label: "Illinois" },
    { value: "Indiana", label: "Indiana" },
    { value: "Iowa", label: "Iowa" },
    { value: "Kansas", label: "Kansas" },
    { value: "Kentucky", label: "Kentucky" },
    { value: "Louisiana", label: "Louisiana" },
    { value: "Maine", label: "Maine" },
    { value: "Maryland", label: "Maryland" },
    { value: "Massachusetts", label: "Massachusetts" },
    { value: "Michigan", label: "Michigan" },
    { value: "Minnesota", label: "Minnesota" },
    { value: "Mississippi", label: "Mississippi" },
    { value: "Missouri", label: "Missouri" },
    { value: "Montana", label: "Montana" },
    { value: "Nebraska", label: "Nebraska" },
    { value: "Nevada", label: "Nevada" },
    { value: "New Hampshire", label: "New Hampshire" },
    { value: "New Jersey", label: "New Jersey" },
    { value: "New Mexico", label: "New Mexico" },
    { value: "New York", label: "New York" },
    { value: "North Carolina", label: "North Carolina" },
    { value: "North Dakota", label: "North Dakota" },
    { value: "Ohio", label: "Ohio" },
    { value: "Oklahoma", label: "Oklahoma" },
    { value: "Oregon", label: "Oregon" },
    { value: "Pennsylvania", label: "Pennsylvania" },
    { value: "Rhode Island", label: "Rhode Island" },
    { value: "South Carolina", label: "South Carolina" },
    { value: "South Dakota", label: "South Dakota" },
    { value: "Tennessee", label: "Tennessee" },
    { value: "Texas", label: "Texas" },
    { value: "Utah", label: "Utah" },
    { value: "Vermont", label: "Vermont" },
    { value: "Virginia", label: "Virginia" },
    { value: "Washington", label: "Washington" },
    { value: "West Virginia", label: "West Virginia" },
    { value: "Wisconsin", label: "Wisconsin" },
    { value: "Wyoming", label: "Wyoming" },
    { value: "Washington DC", label: "Washington DC" },
  ], []);

  // Create combobox options for cities based on selected state
  const cityComboboxOptions = useMemo(() => {
    if (!isEmpty(state) && cities[state]) {
      return cities[state].map((city) => ({
        value: city,
        label: city,
      }));
    }
    return [];
  }, [state]);

  const forgotPassword = () => {
    setOpenSignup(false);
  };

  function handleAlready() {
    setOpenSignup(false);
    setOpenLogin(true);
  }

  const doRegister = async (values, actions) => {
    try {
      setLoading(true);

      const selectedBirthDate =
        dobDate === "" ? new Date("2002-01-01") : new Date(dobDate);
      const age = calcAge(selectedBirthDate);
      const birthday = selectedBirthDate.toISOString().slice(0, 10);
      const cityCoordinates =
        coords[values.state.trim()]?.[values.city.trim()];

      const payload = {
        email: values.email.trim().toLowerCase(),
        password: values.password.trim(),
        password_confirmation: values.password.trim(),
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

      navigate("/registration-success", { state: { email: result.email } });
      toast.success("Signup successful!");
      toast.success("Check your email to confirm your account.");
      setOpenSignup(false);
    } catch (error) {
      toast.error(
        describeApiError(error, "Signup failed. Please try again."),
      );
    } finally {
      actions.setSubmitting(false);
      setLoading(false);
    }
  }

  const onSubmit = async (values, actions) => {
    await doRegister(values, actions);
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
      visibilityPreference: "both",
    },
    validationSchema: Yup.object({
      firstname: Yup.string()
        .min(3, "Too Short! (min 3 characters)")
        .max(20, "Too Long! (max 20 characters)")
        .required("Required"),
      lastname: Yup.string()
        .min(3, "Too Short! (min 3 characters)")
        .max(40, "Too Long! (max 40 characters)")
        .required("Required"),
      phonenumber: Yup.string()
        .matches(/^\d{0,10}$/, "Must be only digits (10 digits required)")
        .test('len', 'Must be exactly 10 digits', val => val && val.length === 10)
        .required("required"),
      email: Yup.string().email().required("Required"),
      password: Yup.string()
        .min(12, "Too Short! (min 12 characters)")
        .required("Required"),
      state: Yup.string().required("Required"),
      city: Yup.string().required("Required"),
      ethnicity: Yup.string().required("Required"),
    }),

    onSubmit,
  });

  // Reset form when component mounts (every time signup dialog opens)
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
    // Reset only when the signup dialog mounts; Formik's identity changes each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DialogContent className="flex max-h-[min(900px,90vh)] min-w-87.5 flex-col gap-0 p-0 max-w-md border-0 shadow-2xl bg-linear-to-br from-card via-card to-card/95 backdrop-blur-sm">
      {loading && (
        <MeetCutesSpinner
          className="fixed top-[50%] left-[50%] z-50 cursor-pointer"
          size="large"
        />
      )}
      <DialogTitle className="sr-only">Sign Up for MeetCutes</DialogTitle>
      <DialogDescription className="sr-only">Create your new MeetCutes profile to join local events and make real-life connections.</DialogDescription>
      <ScrollArea className="h-[90vh] w-full">
        <CardHeader className="pb-6 px-8 pt-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-linear-to-r from-orange-400 via-red-500 to-pink-500 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-linear-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
            Join MeetCutes
          </CardTitle>
          <CardDescription className="text-center text-base">
            Create your account and start connecting
          </CardDescription>
        </CardHeader>
        <CardContent className="w-[95%] mt-4 px-8 pb-8">
          <form onSubmit={formik.handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="grid gap-2 w-full">
                  <Label htmlFor="firstname">First name</Label>
                  <Input
                    name="firstname"
                    id="firstname"
                    type="text"
                    placeholder=""
                    className=""
                    required
                    value={formik.values.firstname}
                    onChange={(e) => {
                      formik.handleChange(e);
                      //formik.values.firstname = e.target.value
                    }}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.firstname && formik.errors.firstname ? (
                    <p className="text-red-700">{formik.errors.firstname} </p>
                  ) : null}
                </div>
                <div className="grid gap-2 w-full">
                  <Label htmlFor="lastname">Last name</Label>
                  <Input
                    name="lastname"
                    id="lastname"
                    type="text"
                    placeholder=""
                    required
                    className=""
                    value={formik.values.lastname}
                    onChange={(e) => {
                      formik.handleChange(e);
                      //formik.values.lastname = e.target.value
                    }}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.lastname && formik.errors.lastname ? (
                    <p className="text-red-700">{formik.errors.lastname} </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="grid gap-2 w-full">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    required
                    onValueChange={(value) => {
                      formik.values.gender = value;
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 w-full">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background border-input hover:bg-accent hover:text-accent-foreground",
                          !dobDate && "text-muted-foreground"
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
                    <PopoverContent className="w-auto p-0 bg-card border-2 border-primary/20 shadow-2xl" align="start">
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
                          return date > twentyYearsBack || date < new Date("1973-01-01");
                        }}
                        defaultMonth={(() => {
                          const today = new Date();
                          const twentyYearsBack = new Date(today);
                          twentyYearsBack.setFullYear(today.getFullYear() - 20);
                          return twentyYearsBack;
                        })()}
                        initialFocus
                        className="rounded-md border-0 bg-gradient-to-br from-card via-card to-card/95"
                        classNames={{
                          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                          month: "space-y-4",
                          caption: "flex justify-center pt-1 relative items-center",
                          caption_label: "text-sm font-medium text-primary",
                          nav: "space-x-1 flex items-center",
                          nav_button: cn(
                            buttonVariants({ variant: "outline" }),
                            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-primary/30 hover:border-primary hover:bg-primary/10"
                          ),
                          nav_button_previous: "absolute left-1",
                          nav_button_next: "absolute right-1",
                          table: "w-full border-collapse space-y-1",
                          head_row: "flex",
                          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex-1 justify-center",
                          row: "flex w-full mt-2",
                          cell: "text-center text-sm p-0 relative flex-1 justify-center [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                          day: cn(
                            buttonVariants({ variant: "ghost" }),
                            "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/20 hover:text-primary-foreground aria-selected:bg-primary aria-selected:text-primary-foreground"
                          ),
                          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                          day_today: "bg-accent text-accent-foreground",
                          day_outside: "text-muted-foreground opacity-50",
                          day_disabled: "text-muted-foreground opacity-50",
                          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                          day_hidden: "invisible",
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="grid gap-2 w-full">
                  <Label htmlFor="state">State</Label>
                  <Combobox
                    options={stateComboboxOptions}
                    value={state}
                    onValueChange={(value) => {
                      formik.values.state = value;
                      formik.setFieldTouched('state', true);
                      formik.values.city = ""; // Clear city when state changes
                      setSelectedCity(""); // Clear local city state
                      setState(value);
                    }}
                    onOpenChange={(open) => {
                      if (open) formik.setFieldTouched('state', true);
                    }}
                    placeholder="Select your state"
                    searchPlaceholder="Search states..."
                    emptyMessage="No states found."
                    className="w-full"
                  />
                  {formik.touched.state && formik.errors.state ? (
                    <p className="text-red-700">{formik.errors.state}</p>
                  ) : null}
                </div>
                <div className="grid gap-2 w-full">
                  <Label htmlFor="city">City</Label>
                  <Combobox
                    options={cityComboboxOptions}
                    value={selectedCity}
                    onValueChange={(value) => {
                      setSelectedCity(value);
                      formik.values.city = value;
                      formik.setFieldTouched('city', true);
                    }}
                    onOpenChange={(open) => {
                      if (open) formik.setFieldTouched('city', true);
                    }}
                    placeholder="Select your city"
                    searchPlaceholder="Search cities..."
                    emptyMessage="Select a state first"
                    className="w-full"
                    disabled={!state}
                  />
                  {formik.touched.city && formik.errors.city ? (
                    <p className="text-red-700">{formik.errors.city}</p>
                  ) : null}
                </div>
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
                      <SelectItem value="Black / African American">Black / African American</SelectItem>
                      <SelectItem value="Hispanic / Latino">Hispanic / Latino</SelectItem>
                      <SelectItem value="Middle Eastern">Middle Eastern</SelectItem>
                      <SelectItem value="Native American">Native American</SelectItem>
                      <SelectItem value="Pacific Islander">Pacific Islander</SelectItem>
                      <SelectItem value="White / Caucasian">White / Caucasian</SelectItem>
                      <SelectItem value="East Indian">East Indian</SelectItem>
                      <SelectItem value="East Asian">East Asian</SelectItem>
                      <SelectItem value="Mixed Race">Mixed Race</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {formik.touched.ethnicity && formik.errors.ethnicity ? (
                  <p className="text-red-700">{formik.errors.ethnicity}</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phonenumber">Phone number</Label>
                <Input
                  id="phonenumber"
                  name="phonenumber"
                  type="text"
                  placeholder=""
                  className=""
                  required
                  value={formik.values.phonenumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.phonenumber && formik.errors.phonenumber ? (
                  <p className="text-red-700">{formik.errors.phonenumber} </p>
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
                {formik.touched.email && formik.errors.email ? (
                  <p className="text-red-700">{formik.errors.email} </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgotpassword"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    onClick={forgotPassword}
                  >
                    Forgot your password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    required
                    className="pr-9"
                    type={PasswordInputType}
                    value={formik.values.password}
                    onChange={(e) => {
                      formik.handleChange(e);
                    }}
                  />
                  <span
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-500
                                              hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 bg-background"
                  >
                    {ToggleIcon}
                  </span>
                </div>
                {formik.touched.password && formik.errors.password ? (
                  <p className="text-red-700">{formik.errors.password} </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="visibilityPreference">Visibility Preference (<span className="font-semibold opacity-50 text-red-600">can be changed later</span>)</Label>
                <Select
                  name="visibilityPreference"
                  onValueChange={(value) => {
                    formik.values.visibilityPreference = value;
                  }}
                  defaultValue="both"
                >
                  <SelectTrigger className="w-full">
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
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>Events Only</span>
                        </div>
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose how others can discover your profile: in searches, events, or both.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-linear-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                Create Account
              </Button>
            </div>
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <span
                className="text-primary hover:text-primary/80 font-semibold underline-offset-4 hover:underline transition-colors cursor-pointer"
                onClick={handleAlready}
              >
                Sign in here
              </span>
            </div>
          </form>
        </CardContent>
      </ScrollArea>
    </DialogContent>
  );
}
