import { useMemo } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  CalendarDays,
  Clock,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateEvent } from "@/hooks/useEvents";

const validationSchema = Yup.object({
  title: Yup.string().trim().required("Event title is required"),
  location: Yup.string().trim().required("Venue/Location is required"),
  address1: Yup.string().trim().required("Street address is required"),
  city: Yup.string().trim().required("City is required"),
  state: Yup.string().trim().required("State is required"),
  zip: Yup.string().trim(),
  date: Yup.string().required("Event date is required"),
  startTime: Yup.string().required("Start time is required"),
  endTime: Yup.string().required("End time is required"),
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
        .max(99, "Maximum age is 99"),
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
        .max(99, "Maximum age is 99"),
    otherwise: (schema) => schema.nullable(),
  }),
});

function dateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function timeInputValue(value, fallback) {
  const match = String(value ?? "").match(/^(\d{2}:\d{2})/);
  return match ? match[1] : fallback;
}

export function EditEventDialog({ event, onClose }) {
  const updateMutation = useUpdateEvent();
  const location = event?.locationdata ?? {};

  const initialValues = useMemo(
    () => ({
      title: event?.title ?? "",
      location: location.locationname ?? event?.location ?? "",
      address1: location.address1 ?? "",
      city: location.city ?? "",
      state: location.state ?? "",
      zip: location.zipcode ?? "",
      date: dateInputValue(event?.eventdate ?? event?.event_date ?? event?.start_at),
      startTime: timeInputValue(event?.starttime ?? event?.start_at, "08:00"),
      endTime: timeInputValue(event?.endtime ?? event?.end_at, "09:00"),
      description: event?.description ?? event?.content ?? "",
      has_age_restriction: Boolean(event?.has_age_restriction),
      men_min_age: event?.men_min_age ?? 21,
      men_max_age: event?.men_max_age ?? 45,
      women_min_age: event?.women_min_age ?? 21,
      women_max_age: event?.women_max_age ?? 45,
    }),
    [
      event?.title,
      event?.location,
      event?.eventdate,
      event?.event_date,
      event?.start_at,
      event?.starttime,
      event?.endtime,
      event?.end_at,
      event?.description,
      event?.content,
      event?.has_age_restriction,
      event?.men_min_age,
      event?.men_max_age,
      event?.women_min_age,
      event?.women_max_age,
      location.locationname,
      location.address1,
      location.city,
      location.state,
      location.zipcode,
    ],
  );

  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    validationSchema,
    validateOnChange: false,
    validateOnBlur: true,
    onSubmit: async (values) => {
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

      const result = await updateMutation.mutateAsync({
        eventId: event?.eventid || event?.id,
        data: {
          title: values.title.trim(),
          location: values.location.trim(),
          locationid: event?.locationid ?? location.locationid,
          address1: values.address1.trim(),
          city: values.city.trim(),
          state: values.state.trim(),
          zip: values.zip.trim(),
          eventlat: event?.latitude ?? location.latitude,
          eventlng: event?.longitude ?? location.longitude,
          eventdate: values.date,
          start_time: values.startTime,
          end_time: values.endTime,
          description: values.description.trim(),
          ...ageRestrictions,
        },
      });

      if (result?.success) {
        toast.success("Event updated. Attendees have been notified.");
        onClose?.();
      } else {
        toast.error(result?.msg || "Could not update this event.");
      }
    },
  });

  const fieldError = (field) =>
    formik.touched[field] && formik.errors[field] ? (
      <p className="text-xs text-destructive">{formik.errors[field]}</p>
    ) : null;

  return (
    <form
      onSubmit={formik.handleSubmit}
      data-testid="edit-event-form"
      className="flex max-h-[90vh] flex-col"
    >
      <div className="border-b border-border/60 px-6 py-5">
        <DialogTitle className="text-xl font-bold tracking-tight">
          Edit event
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-muted-foreground">
          Update the logistics below. Every registered attendee will be notified
          automatically.
        </DialogDescription>
      </div>

      <div className="space-y-5 overflow-y-auto px-6 py-5">
        <div className="space-y-2">
          <Label htmlFor="edit-title">Event Title</Label>
          <Input
            id="edit-title"
            name="title"
            value={formik.values.title}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="e.g. Coffee & Conversation"
            className="h-10"
          />
          {fieldError("title")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-location">Venue/Location Name</Label>
          <Input
            id="edit-location"
            name="location"
            data-testid="edit-event-venue"
            value={formik.values.location}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="e.g. Starbucks, Central Park"
            className="h-10"
          />
          {fieldError("location")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-address1">Street Address</Label>
          <Input
            id="edit-address1"
            name="address1"
            value={formik.values.address1}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="100 Main St"
            className="h-10"
          />
          {fieldError("address1")}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="edit-city">City</Label>
            <Input
              id="edit-city"
              name="city"
              value={formik.values.city}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-10"
            />
            {fieldError("city")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-state">State</Label>
            <Input
              id="edit-state"
              name="state"
              value={formik.values.state}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-10"
            />
            {fieldError("state")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-zip">ZIP</Label>
            <Input
              id="edit-zip"
              name="zip"
              value={formik.values.zip}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-10"
            />
            {fieldError("zip")}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="edit-date" className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Event Date
            </Label>
            <Input
              id="edit-date"
              name="date"
              type="date"
              value={formik.values.date}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-10"
            />
            {fieldError("date")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-start" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Start Time
            </Label>
            <Input
              id="edit-start"
              name="startTime"
              type="time"
              value={formik.values.startTime}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-10"
            />
            {fieldError("startTime")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-end" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              End Time
            </Label>
            <Input
              id="edit-end"
              name="endTime"
              type="time"
              value={formik.values.endTime}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-10"
            />
            {fieldError("endTime")}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            name="description"
            value={formik.values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            rows={3}
          />
        </div>

        <div className="space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label
                htmlFor="edit-age-restriction"
                className="flex items-center gap-1.5"
              >
                <ShieldCheck className="h-4 w-4 text-primary" />
                Enforce Age Restrictions
              </Label>
              <p className="text-xs text-muted-foreground">
                Keep separate age ranges for men and women attending this event.
              </p>
            </div>
            <Switch
              id="edit-age-restriction"
              checked={formik.values.has_age_restriction}
              onCheckedChange={(checked) =>
                formik.setFieldValue("has_age_restriction", checked)
              }
            />
          </div>

          {formik.values.has_age_restriction && (
            <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Men
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-men-min" className="text-xs">
                      Min age
                    </Label>
                    <Input
                      id="edit-men-min"
                      name="men_min_age"
                      type="number"
                      min={18}
                      max={99}
                      value={formik.values.men_min_age}
                      onChange={formik.handleChange}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-men-max" className="text-xs">
                      Max age
                    </Label>
                    <Input
                      id="edit-men-max"
                      name="men_max_age"
                      type="number"
                      min={18}
                      max={99}
                      value={formik.values.men_max_age}
                      onChange={formik.handleChange}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Women
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-women-min" className="text-xs">
                      Min age
                    </Label>
                    <Input
                      id="edit-women-min"
                      name="women_min_age"
                      type="number"
                      min={18}
                      max={99}
                      value={formik.values.women_min_age}
                      onChange={formik.handleChange}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-women-max" className="text-xs">
                      Max age
                    </Label>
                    <Input
                      id="edit-women-max"
                      name="women_max_age"
                      type="number"
                      min={18}
                      max={99}
                      value={formik.values.women_max_age}
                      onChange={formik.handleChange}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border/60 px-6 py-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={updateMutation.isPending}
          data-testid="edit-event-cancel"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={updateMutation.isPending}
          data-testid="edit-event-submit"
          className="bg-primary text-primary-foreground"
        >
          {updateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

export default EditEventDialog;
