import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/Spinner";
import { MeetCutesSpinner } from "@/components/ui/MeetCutesSpinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { postNewEvent } from "@/utils/util";
import { format } from "date-fns"
import { useFormik } from "formik";
import * as Yup from "yup";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { userEvents1QueryKey } from "@/hooks/useEvents";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { useAutocompleteStore } from "@/stores/autocompleteStore";
import { cn } from "@/lib/utils"
import { LoadingButton } from '@/components/ui/loading-button';
import { DialogTitle, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

// Custom styles for GeoapifyGeocoderAutocomplete to match app theme
const geoapifyStyles = `
  .geoapify-custom-autocomplete .geoapify-autocomplete-input {
    background-color: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 0.375rem !important;
    color: #111827 !important;
    font-size: 0.875rem !important;
    line-height: 1.25rem !important;
    padding: 0.5rem 0.75rem !important;
    width: 100% !important;
    height: 2.5rem !important;
    transition: all 0.2s ease-in-out !important;
  }

  .geoapify-custom-autocomplete .geoapify-autocomplete-input:focus {
    outline: none !important;
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
  }

  .geoapify-custom-autocomplete .geoapify-autocomplete-input::placeholder {
    color: #6b7280 !important;
  }

  /* Clear/Reset button (X) styling */
  .geoapify-custom-autocomplete .geoapify-autocomplete-input ~ button,
  .geoapify-custom-autocomplete button[class*="clear"],
  .geoapify-custom-autocomplete button[class*="reset"],
  .geoapify-custom-autocomplete .geoapify-autocomplete-clear,
  .geoapify-custom-autocomplete .geoapify-clear-button,
  .geoapify-autocomplete-clear,
  .geoapify-clear-button {
    color: #6b7280 !important;
    background: transparent !important;
    border: none !important;
    cursor: pointer !important;
    padding: 0 !important;
    font-size: 1.2rem !important;
    line-height: 1 !important;
    opacity: 0.7 !important;
    transition: opacity 0.2s ease-in-out !important;
  }

  .geoapify-custom-autocomplete .geoapify-autocomplete-input ~ button:hover,
  .geoapify-custom-autocomplete button[class*="clear"]:hover,
  .geoapify-custom-autocomplete button[class*="reset"]:hover,
  .geoapify-custom-autocomplete .geoapify-autocomplete-clear:hover,
  .geoapify-custom-autocomplete .geoapify-clear-button:hover,
  .geoapify-autocomplete-clear:hover,
  .geoapify-clear-button:hover {
    opacity: 1 !important;
    color: #374151 !important;
  }

  /* Dark mode clear button */
  .dark .geoapify-custom-autocomplete .geoapify-autocomplete-input ~ button,
  .dark .geoapify-custom-autocomplete button[class*="clear"],
  .dark .geoapify-custom-autocomplete button[class*="reset"],
  .dark .geoapify-custom-autocomplete .geoapify-autocomplete-clear,
  .dark .geoapify-custom-autocomplete .geoapify-clear-button,
  .dark .geoapify-autocomplete-clear,
  .dark .geoapify-clear-button {
    color: #9ca3af !important;
  }

  .dark .geoapify-custom-autocomplete .geoapify-autocomplete-input ~ button:hover,
  .dark .geoapify-custom-autocomplete button[class*="clear"]:hover,
  .dark .geoapify-custom-autocomplete button[class*="reset"]:hover,
  .dark .geoapify-custom-autocomplete .geoapify-autocomplete-clear:hover,
  .dark .geoapify-custom-autocomplete .geoapify-clear-button:hover,
  .dark .geoapify-autocomplete-clear:hover,
  .dark .geoapify-clear-button:hover {
    color: #d1d5db !important;
  }

  /* Universal input styling within our wrapper - highest priority */
  .geoapify-custom-autocomplete input {
    background-color: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 0.375rem !important;
    color: #111827 !important;
    font-size: 0.875rem !important;
    line-height: 1.25rem !important;
    padding: 0.5rem 0.75rem !important;
    width: 100% !important;
    height: 2.5rem !important;
    transition: all 0.2s ease-in-out !important;
    box-sizing: border-box !important;
  }

  .geoapify-custom-autocomplete input:focus {
    outline: none !important;
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
  }

  .geoapify-custom-autocomplete input::placeholder {
    color: #6b7280 !important;
  }

  /* Dark mode universal input styling */
  .dark .geoapify-custom-autocomplete input {
    background-color: #1f2937 !important;
    color: #f9fafb !important;
    border-color: #374151 !important;
  }

  .dark .geoapify-custom-autocomplete input:focus {
    border-color: #60a5fa !important;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2) !important;
  }

  .dark .geoapify-custom-autocomplete input::placeholder {
    color: #6b7280 !important;
  }

  /* Dark mode styles */
  .dark .geoapify-custom-autocomplete .geoapify-autocomplete-input {
    background-color: #1f2937 !important;
    color: #f9fafb !important;
    border-color: #374151 !important;
  }

  /* Dropdown styles */
  .geoapify-custom-autocomplete .geoapify-autocomplete-dropdown,
  .geoapify-autocomplete-dropdown {
    background-color: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 0.375rem !important;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
    margin-top: 0.25rem !important;
  }

  .dark .geoapify-custom-autocomplete .geoapify-autocomplete-dropdown,
  .dark .geoapify-autocomplete-dropdown {
    background-color: #1f2937 !important;
    border-color: #374151 !important;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3) !important;
  }

  .geoapify-custom-autocomplete .geoapify-autocomplete-item,
  .geoapify-autocomplete-item {
    color: #111827 !important;
    padding: 0.5rem 0.75rem !important;
    cursor: pointer !important;
    transition: background-color 0.15s ease-in-out !important;
  }

  .dark .geoapify-custom-autocomplete .geoapify-autocomplete-item,
  .dark .geoapify-autocomplete-item {
    color: #f9fafb !important;
  }

  .geoapify-custom-autocomplete .geoapify-autocomplete-item:hover,
  .geoapify-autocomplete-item:hover {
    background-color: #f3f4f6 !important;
  }

  .dark .geoapify-custom-autocomplete .geoapify-autocomplete-item:hover,
  .dark .geoapify-autocomplete-item:hover {
    background-color: #374151 !important;
  }

  .geoapify-custom-autocomplete .geoapify-autocomplete-item-selected,
  .geoapify-autocomplete-item-selected {
    background-color: #3b82f6 !important;
    color: #ffffff !important;
  }

  /* Dark theme styling for .geoapify-autocomplete-items */
  .geoapify-custom-autocomplete .geoapify-autocomplete-items,
  .geoapify-autocomplete-items {
    background-color: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 0.375rem !important;
    color: #111827 !important;
  }

  .dark .geoapify-custom-autocomplete .geoapify-autocomplete-items,
  .dark .geoapify-autocomplete-items {
    background-color: #1f2937 !important;
    border-color: #374151 !important;
    color: #f9fafb !important;
  }

  /* Individual items within .geoapify-autocomplete-items */
  .geoapify-custom-autocomplete .geoapify-autocomplete-items > *,
  .geoapify-autocomplete-items > * {
    color: #111827 !important;
    padding: 0.5rem 0.75rem !important;
    cursor: pointer !important;
    transition: background-color 0.15s ease-in-out !important;
    border-bottom: 1px solid #f3f4f6 !important;
  }

  .geoapify-custom-autocomplete .geoapify-autocomplete-items > *:last-child,
  .geoapify-autocomplete-items > *:last-child {
    border-bottom: none !important;
  }

  .geoapify-custom-autocomplete .geoapify-autocomplete-items > *:hover,
  .geoapify-autocomplete-items > *:hover {
    background-color: #f3f4f6 !important;
  }

  .dark .geoapify-custom-autocomplete .geoapify-autocomplete-items > *,
  .dark .geoapify-autocomplete-items > * {
    color: #f9fafb !important;
    border-bottom-color: #374151 !important;
  }

  .dark .geoapify-custom-autocomplete .geoapify-autocomplete-items > *:hover,
  .dark .geoapify-autocomplete-items > *:hover {
    background-color: #374151 !important;
  }

  /* Scrollbar styles for dropdown */
  .geoapify-custom-autocomplete .geoapify-autocomplete-dropdown::-webkit-scrollbar,
  .geoapify-autocomplete-dropdown::-webkit-scrollbar {
    width: 6px !important;
  }

  .geoapify-custom-autocomplete .geoapify-autocomplete-dropdown::-webkit-scrollbar-track,
  .geoapify-autocomplete-dropdown::-webkit-scrollbar-track {
    background: #f9fafb !important;
    border-radius: 3px !important;
  }

  .dark .geoapify-custom-autocomplete .geoapify-autocomplete-dropdown::-webkit-scrollbar-track,
  .dark .geoapify-autocomplete-dropdown::-webkit-scrollbar-track {
    background: #111827 !important;
  }

  .geoapify-custom-autocomplete .geoapify-autocomplete-dropdown::-webkit-scrollbar-thumb,
  .geoapify-autocomplete-dropdown::-webkit-scrollbar-thumb {
    background: #d1d5db !important;
    border-radius: 3px !important;
  }

  .dark .geoapify-custom-autocomplete .geoapify-autocomplete-dropdown::-webkit-scrollbar-thumb,
  .dark .geoapify-autocomplete-dropdown::-webkit-scrollbar-thumb {
    background: #4b5563 !important;
  }

  .geoapify-custom-autocomplete .geoapify-autocomplete-dropdown::-webkit-scrollbar-thumb:hover,
  .geoapify-autocomplete-dropdown::-webkit-scrollbar-thumb:hover {
    background: #9ca3af !important;
  }

  /* Additional dropdown container styles */
  .geoapify-custom-autocomplete div[class*="dropdown"],
  .geoapify-custom-autocomplete [class*="dropdown"],
  div[class*="geoapify"][class*="dropdown"],
  [class*="geoapify"][class*="dropdown"] {
    background-color: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 0.375rem !important;
  }

  .dark .geoapify-custom-autocomplete div[class*="dropdown"],
  .dark .geoapify-custom-autocomplete [class*="dropdown"],
  .dark div[class*="geoapify"][class*="dropdown"],
  .dark [class*="geoapify"][class*="dropdown"] {
    background-color: #1f2937 !important;
    border-color: #374151 !important;
  }

  /* Additional universal selectors for maximum coverage */
  .geoapify-custom-autocomplete * {
    box-sizing: border-box !important;
  }

  /* Force styling on any element that might be the dropdown */
  .geoapify-custom-autocomplete > div > div:last-child,
  .geoapify-custom-autocomplete > div > [class]:last-child {
    background-color: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 0.375rem !important;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
  }

  .dark .geoapify-custom-autocomplete > div > div:last-child,
  .dark .geoapify-custom-autocomplete > div > [class]:last-child {
    background-color: #1f2937 !important;
    border-color: #374151 !important;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3) !important;
  }
`;
if (typeof document !== 'undefined') {
  const injectStyles = () => {
    const existingStyle = document.getElementById('geoapify-custom-styles');
    if (!existingStyle) {
      const styleSheet = document.createElement("style");
      styleSheet.id = 'geoapify-custom-styles';
      styleSheet.type = "text/css";
      styleSheet.innerText = geoapifyStyles;
      document.head.appendChild(styleSheet);
      //console.log('Geoapify styles injected:', geoapifyStyles);
    }
  };

  // Run immediately or on DOM content loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles);
  } else {
    injectStyles();
  }
}

const validationSchema = Yup.object({
  title: Yup.string().required("Event title is required"),
  location: Yup.string().required("Location name is required"),
  address1: Yup.string().required("Street address is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  zip: Yup.string().required("Zipcode is required").matches(/^\d{5}$/, "Must be 5 digits"),
  date: Yup.date().required("Date is required").min(new Date(new Date().setHours(0, 0, 0, 0)), "Date must be today or later"),
  startTime: Yup.string().required("Start time is required"),
  endTime: Yup.string().required("End time is required").test("is-after-start", "End time must be after start time", function (value) {
    const { startTime } = this.parent;
    if (!startTime || !value) return true;
    return value > startTime;
  }),
  description: Yup.string(),
  has_age_restriction: Yup.boolean(),
  men_min_age: Yup.number().when("has_age_restriction", {
    is: true,
    then: (schema) =>
      schema
        .typeError("Men's minimum age must be a number")
        .required("Men's minimum age is required")
        .min(18, "Minimum age is 18")
        .max(99, "Maximum age is 99"),
    otherwise: (schema) => schema.nullable(),
  }),
  men_max_age: Yup.number().when("has_age_restriction", {
    is: true,
    then: (schema) =>
      schema
        .typeError("Men's maximum age must be a number")
        .required("Men's maximum age is required")
        .min(18, "Minimum age is 18")
        .max(99, "Maximum age is 99")
        .test(
          "men-age-order",
          "Men's maximum age must be at least the minimum age",
          function (value) {
            const { men_min_age } = this.parent;
            if (value == null || men_min_age == null || men_min_age === "") {
              return true;
            }
            return Number(value) >= Number(men_min_age);
          },
        ),
    otherwise: (schema) => schema.nullable(),
  }),
  women_min_age: Yup.number().when("has_age_restriction", {
    is: true,
    then: (schema) =>
      schema
        .typeError("Women's minimum age must be a number")
        .required("Women's minimum age is required")
        .min(18, "Minimum age is 18")
        .max(99, "Maximum age is 99"),
    otherwise: (schema) => schema.nullable(),
  }),
  women_max_age: Yup.number().when("has_age_restriction", {
    is: true,
    then: (schema) =>
      schema
        .typeError("Women's maximum age must be a number")
        .required("Women's maximum age is required")
        .min(18, "Minimum age is 18")
        .max(99, "Maximum age is 99")
        .test(
          "women-age-order",
          "Women's maximum age must be at least the minimum age",
          function (value) {
            const { women_min_age } = this.parent;
            if (value == null || women_min_age == null || women_min_age === "") {
              return true;
            }
            return Number(value) >= Number(women_min_age);
          },
        ),
    otherwise: (schema) => schema.nullable(),
  }),
});

export function CreateEvent({ onClose }) {
  const isOnline = useOnlineStatus();
  const { userSession, profiledata } = useAuth();
  const queryClient = useQueryClient();
  const autocompletedata =
    useAutocompleteStore((state) => state.autocompletedata) ?? [];
  const upsertAutocompletedata = useAutocompleteStore(
    (state) => state.upsertAutocompletedata,
  );
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false);
  const [successLoading, setSuccessLoading] = useState(false);
  const [eventlat, setEventLat] = useState(null);
  const [eventlng, setEventLng] = useState(null);

  const formik = useFormik({
    initialValues: {
      title: "",
      location: "",
      address1: "",
      state: "",
      city: "",
      zip: "",
      date: undefined,
      startTime: "08:00",
      endTime: "09:00",
      description: "",
      men_min_age: 21,
      men_max_age: 45,
      women_min_age: 21,
      women_max_age: 45,
      has_age_restriction: false,
    },
    validationSchema,
    validateOnChange: false, // Only validate on blur and submit
    validateOnBlur: true,

    onSubmit: async (values) => {
      if (!isOnline) {
        toast({
          title: "Offline",
          description: "You are offline. Check your internet connection.",
          variant: "destructive",
        });
        return;
      }
      if (!userSession) {
        toast({
          title: "Error",
          description: "Error, logout and login again",
          variant: "destructive",
        });
        return;
      }

      let locationid = null;
      autocompletedata.forEach((each) => {
        if (each.address1 == values.address1 && each.state == values.state && each.city == values.city && each.zipcode == values.zip) {
          locationid = each.locationid
        }
      });

      const ageRestrictions = values.has_age_restriction
        ? {
            has_age_restriction: true,
            men_min_age: Number(values.men_min_age),
            men_max_age: Number(values.men_max_age),
            women_min_age: Number(values.women_min_age),
            women_max_age: Number(values.women_max_age),
          }
        : {
            has_age_restriction: false,
            men_min_age: null,
            men_max_age: null,
            women_min_age: null,
            women_max_age: null,
          };

      const postresp = await postNewEvent(
        values.title,
        values.location,
        values.address1, //addressOne
        values.state,
        values.city,
        values.zip,
        eventlat,
        eventlng,
        values.date.toISOString().substring(0, 10).toString(),
        values.startTime,
        values.endTime,
        values.description,
        profiledata?.userid,
        profiledata?.latitude,
        profiledata?.longitude,
        locationid,
        setLoading,
        ageRestrictions,
      )

      console.log("Post New Event Response:", postresp);

      if (postresp == -2) {
        setLoading(false)
        toast.error("Far from your area. try within 150 miles!!");
      }
      if (postresp == 0) {
        toast.success("Create Event Successful");
        setLoading(false);
        setSuccessLoading(true);

        // Refresh every cache that can surface the new event, then close the
        // modal so the created list updates in place.
        await queryClient.invalidateQueries({
          queryKey: userEvents1QueryKey(),
        });
        queryClient.invalidateQueries({ queryKey: ["eventssearch"] });
        queryClient.invalidateQueries({ queryKey: ["notifyevents"] });

        setTimeout(() => {
          setSuccessLoading(false);
          onClose();
        }, 600);
      } else if (postresp == -1) {
        setLoading(false)
        toast.error("Create Event Failed. Try again");
      } else if (postresp == -3) {
        setLoading(false)
        toast.error("Event timing conflicts at the given location. try different time!!");
      }
    }
  });

  const onAddressSelect = (location) => {
    if (!location) return;

    const lat = location.latitude ?? null;
    const lng = location.longitude ?? null;

    setEventLat(lat);
    setEventLng(lng);

    // Update formik values from the selected suggestion.
    formik.setFieldValue("address1", location.address1 ?? "");
    formik.setFieldValue("city", location.city ?? "");
    formik.setFieldValue("state", location.state ?? "");
    formik.setFieldValue("zip", location.zipcode ?? "");

    // Persist the selected address + coordinates for later event creation and
    // for the secure-storage contract consumed by the E2E suite.
    upsertAutocompletedata({ ...location, latitude: lat, longitude: lng });

    // Don't mark fields as touched when filled by autocomplete. This prevents
    // validation errors from showing immediately.
  };

  //console.log("formik.errors.state", formik.errors.state);
  //console.log("formik.errors.city", formik.errors.city);

  const ageFieldError = (field) =>
    formik.touched[field] && formik.errors[field] ? (
      <p className="text-red-500 text-xs">{formik.errors[field]}</p>
    ) : null;

  return (
    <DialogContent className='flex max-h-[min(900px,80vh)] min-w-[calc(70vw-2rem)] flex-col gap-0 p-0 sm:max-w-md bg-linear-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800'>
      <ScrollArea className='flex max-h-full flex-col overflow-hidden'>
        <div className="relative">
          {loading && (
            <MeetCutesSpinner
              className='absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-50'
              size="xlarge"
            />
          )}
          <div className="flex flex-col">
            <DialogTitle></DialogTitle>
            <div
              className="w-full max-w-3xlX overflow-y-auto bg-transparent border-none rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                {/* Header */}
                <div className="text-center pt-4 sm:pt-6 pb-3 sm:pb-4 px-4 sm:px-8 bg-linear-to-r from-primary/10 via-primary/5 to-primary/10 rounded-t-2xl">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                  </div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
                    Create New Event 🎉
                  </h2>
                  <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto px-4">
                    Share your event with the community and connect with like-minded people
                  </p>
                </div>

                {/* Form */}
                <form
                  className="px-4 sm:px-6 md:px-8 lg:px-12 pb-8 sm:pb-12 space-y-4 sm:space-y-6 bg-white dark:bg-gray-900 rounded-b-2xl mt-4"
                  onSubmit={formik.handleSubmit}
                >
                  {/* Event Title */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="title"
                      className="text-sm font-medium text-foreground flex items-center gap-2"
                    >
                      <CalendarIcon className="w-4 h-4" />
                      Event Title
                    </Label>
                    <Input
                      id='title'
                      name='title'
                      type='text'
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.title}
                      className="bg-background border-border focus:border-primary focus:ring-primary/20 h-10"
                      placeholder="e.g., Coffee Meetup or Age range based title"
                      required
                    />
                    {formik.errors.title && formik.touched.title && (
                      <p className="text-red-500 text-sm">{formik.errors.title}</p>
                    )}
                  </div>

                  {/* Location Name */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="location"
                      className="text-sm font-medium text-foreground flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Venue/Location Name
                    </Label>
                    <Input
                      id='location'
                      name='location'
                      type='text'
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.location}
                      className="bg-background border-border focus:border-primary focus:ring-primary/20 h-10"
                      placeholder="e.g., TARGET, Starbucks, Central Park"
                      required
                    />
                    {formik.errors.location && formik.touched.location && (
                      <p className="text-red-500 text-sm">{formik.errors.location}</p>
                    )}
                  </div>

                  {/* Street Address */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="streetAddress"
                      className="text-sm font-medium text-foreground flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Street Address
                    </Label>
                    <AddressAutocomplete
                      id="streetAddress"
                      name="address1"
                      value={formik.values.address1}
                      placeholder="Enter address here"
                      onChange={(nextValue) =>
                        formik.setFieldValue("address1", nextValue)
                      }
                      onSelect={onAddressSelect}
                      onBlur={formik.handleBlur}
                    />
                    {formik.errors.address1 && formik.touched.address1 && (
                      <p className="text-red-500 text-sm">{formik.errors.address1}</p>
                    )}
                  </div>

                  {/* State, City, Zipcode Row 
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" hidden>
                      <div className="space-y-2">
                        <Label
                          htmlFor="state"
                          className="text-sm font-medium text-foreground"
                        >
                          State
                        </Label>
                        <Combobox
                          options={stateOptions}
                          value={formik.values.state}
                          onValueChange={(value) => {
                            formik.setFieldValue('state', value);
                            formik.setFieldValue('city', '');
                            formik.setFieldTouched('state', true);
                            // Don't reset city touched state - let validation show when touched
                          }}
                          placeholder="Select state"
                          searchPlaceholder="Search states..."
                          emptyMessage="No state found."
                          className="bg-card dark:bg-slate-800 dark:text-white border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-primary/20"
                        />
                        {formik.errors.state && formik.touched.state && (
                          <p className="text-red-500 text-sm">{formik.errors.state}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="city"
                          className="text-sm font-medium text-gray-700"
                        >
                          City
                        </Label>
                        <Combobox
                          options={getCityOptions(formik.values.state)}
                          value={formik.values.city}
                          onValueChange={(value) => {
                            formik.setFieldValue('city', value);
                            formik.setFieldTouched('city', true);
                          }}
                          placeholder="Select city"
                          searchPlaceholder="Search cities..."
                          emptyMessage="No city found."
                          disabled={!formik.values.state}
                          className="bg-card dark:bg-slate-800 dark:text-white border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-primary/20"
                        />
                        {formik.errors.city && formik.touched.city && (
                          <p className="text-red-500 text-sm">{formik.errors.city}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="zipcode"
                          className="text-sm font-medium text-gray-700"
                        >
                          Zipcode
                        </Label>
                        <Input
                          id='zip'
                          name='zip'
                          type='text'
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          value={formik.values.zip}
                          className="bg-card dark:bg-slate-800 dark:text-white border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-primary/20 w-full h-10"
                          placeholder="95630"
                          maxLength={5}
                          required
                        />
                        {formik.errors.zip && formik.touched.zip && (
                          <p className="text-red-500 text-sm">{formik.errors.zip}</p>
                        )}
                      </div>
                    </div>
                    */}

                  {/* Date and Time Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="eventDate"
                        className="text-sm font-medium text-gray-700"
                      >
                        Event Date
                      </Label>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal h-10",
                              !formik.values.date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon />
                            {formik.values.date ? format(formik.values.date, "PPP") : <span>Event date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formik.values.date}
                            onSelect={(date) => {
                              formik.setFieldValue('date', date);
                              setOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {formik.errors.date && formik.touched.date && (
                        <p className="text-red-500 text-sm">{formik.errors.date}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="startTime"
                        className="text-sm font-medium text-gray-700"
                      >
                        Start Time
                      </Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id='startTime'
                          name='startTime'
                          type='time'
                          onChange={(e) => {
                            formik.setFieldValue('startTime', e.target.value);
                          }}
                          onBlur={formik.handleBlur}
                          value={formik.values.startTime}
                          className="bg-card dark:bg-slate-800 dark:text-white border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-primary/20 pl-10 w-full h-10"
                          required
                        />
                      </div>
                      {formik.errors.startTime && formik.touched.startTime && (
                        <p className="text-red-500 text-sm">{formik.errors.startTime}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="endTime"
                        className="text-sm font-medium text-gray-700"
                      >
                        End Time
                      </Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id='endTime'
                          name='endTime'
                          type='time'
                          onChange={(e) => {
                            formik.setFieldValue('endTime', e.target.value);
                          }}
                          onBlur={formik.handleBlur}
                          value={formik.values.endTime}
                          className="bg-card dark:bg-slate-800 dark:text-white border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-primary/20 pl-10 w-full h-10"
                          required
                        />
                      </div>
                      {formik.errors.endTime && formik.touched.endTime && (
                        <p className="text-red-500 text-sm">{formik.errors.endTime}</p>
                      )}
                    </div>
                  </div>

                  {/* Age Restrictions */}
                  <div className="space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <Label
                          htmlFor="has_age_restriction"
                          className="text-sm font-medium text-foreground"
                        >
                          Enforce Age Restrictions
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Set separate age ranges for men and women attending this event.
                        </p>
                      </div>
                      <Switch
                        id="has_age_restriction"
                        checked={formik.values.has_age_restriction}
                        onCheckedChange={(checked) =>
                          formik.setFieldValue("has_age_restriction", checked)
                        }
                      />
                    </div>

                    {formik.values.has_age_restriction && (
                      <div className="grid grid-cols-1 gap-4 border-t border-border/40 pt-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            For Men
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label htmlFor="men_min_age" className="text-xs text-muted-foreground">
                                Min age
                              </Label>
                              <Input
                                id="men_min_age"
                                name="men_min_age"
                                type="number"
                                min={18}
                                max={99}
                                inputMode="numeric"
                                value={formik.values.men_min_age}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                className="h-9 bg-background"
                              />
                              {ageFieldError("men_min_age")}
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="men_max_age" className="text-xs text-muted-foreground">
                                Max age
                              </Label>
                              <Input
                                id="men_max_age"
                                name="men_max_age"
                                type="number"
                                min={18}
                                max={99}
                                inputMode="numeric"
                                value={formik.values.men_max_age}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                className="h-9 bg-background"
                              />
                              {ageFieldError("men_max_age")}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            For Women
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label htmlFor="women_min_age" className="text-xs text-muted-foreground">
                                Min age
                              </Label>
                              <Input
                                id="women_min_age"
                                name="women_min_age"
                                type="number"
                                min={18}
                                max={99}
                                inputMode="numeric"
                                value={formik.values.women_min_age}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                className="h-9 bg-background"
                              />
                              {ageFieldError("women_min_age")}
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="women_max_age" className="text-xs text-muted-foreground">
                                Max age
                              </Label>
                              <Input
                                id="women_max_age"
                                name="women_max_age"
                                type="number"
                                min={18}
                                max={99}
                                inputMode="numeric"
                                value={formik.values.women_max_age}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                className="h-9 bg-background"
                              />
                              {ageFieldError("women_max_age")}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <p className="text-muted-foreground/70 italic text-sm mb-2">
                      💡 Hint: You can tailor your event's theme or focus around specific interest groups, age boundaries, or cultural backgrounds in your description (e.g., '20s &amp; 30s Mixer', 'Cultural Heritage Meetup').
                    </p>
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium text-gray-700"
                    >
                      Description/Special Instructions (if any)
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formik.values.description}
                      onChange={(e) => {
                        formik.setFieldValue('description', e.target.value);
                      }}
                      onBlur={formik.handleBlur}
                      className="bg-card dark:bg-slate-800 dark:text-white border-gray-300 dark:border-gray-700 focus:border-primary focus:ring-primary/20 min-h-[120px] resize-none"
                      placeholder="Provide details about the event"
                    />
                    {formik.errors.description && formik.touched.description && (
                      <p className="text-red-500 text-sm">{formik.errors.description}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  {!loading &&
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-base shadow-lg hover:shadow-xl transition-all"
                    >
                      CREATE EVENT
                    </Button>
                  }
                  {
                    loading &&
                    <LoadingButton loading
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-base shadow-lg hover:shadow-xl transition-all">
                      Submitting Event...
                    </LoadingButton>
                  }
                </form>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      {successLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center z-50">
          <div className="text-center">
            <MeetCutesSpinner size="large" />
            <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">
              Event Created Successfully!
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      )}
    </DialogContent>
  );
}

