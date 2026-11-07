import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Clock, Calendar, MapPin, Users, Heart, CheckCircle, AlertCircle, FileText, ArrowLeft, Lock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useRegisterToAnEvent, useUnregisterToAnEvent, eventDetailsQueryOptions, eventFatigueQueryKey, useEventFatigue } from '@/hooks/useEvents'
import { useEventChannel } from '@/hooks/useEventChannel'
import { EventDiscussion } from '@/components/EventDiscussion'
import { isAgeEligibleForEvent } from '@/lib/eventAgeRestriction'
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query'

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { userSession, profiledata } = useAuth();
  const queryClient = useQueryClient();
  const { data: eventdata } = useSuspenseQuery(eventDetailsQueryOptions(id));
  const event = eventdata ?? null;

  // Live attendee updates from the Phoenix event channel invalidate this query,
  // so the cached payload (including aggregate counts) stays authoritative.
  useEventChannel(id);

  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [showRegistrationConfirm, setShowRegistrationConfirm] = useState(false);
  const [attendanceOverride, setAttendanceOverride] = useState(null);

  const registerToAnEvent = useRegisterToAnEvent();
  const unregisterToAnEvent = useUnregisterToAnEvent();

  useEffect(() => {
    setAttendanceOverride(null);
  }, [id]);

  const isRegistered = useMemo(() => {
    if (attendanceOverride !== null) return attendanceOverride;

    const attendeeslist = event?.attendeeslist;
    if (!attendeeslist) return false;

    const handles = Array.isArray(attendeeslist)
      ? attendeeslist
      : String(attendeeslist).replace(/\{|\}/gm, "").split(",");
    const viewerHandle = String(
      profiledata?.userhandle ?? profiledata?.nickname ?? "",
    ).toLowerCase();

    return handles.some(
      (handle) => String(handle ?? "").toLowerCase() === viewerHandle,
    );
  }, [
    attendanceOverride,
    event?.attendeeslist,
    profiledata?.userhandle,
    profiledata?.nickname,
  ]);

  const ageMismatch = !isAgeEligibleForEvent(event, profiledata);
  const registrationBlocked = ageMismatch && !isRegistered;

  const fatigueQuery = useEventFatigue(id, {
    enabled: Boolean(userSession && id && !isRegistered && !registrationBlocked),
  });

  const maleCount = event?.male_count ?? event?.males ?? 0;
  const femaleCount = event?.female_count ?? event?.females ?? 0;
  const cameFromNotifications = location.state?.from === "/notifications";
  const cameFromDialog = location.state?.from === "dialog";

  const handleBackToEvents = () => {
    // Pop the history entry so the discovery route, its search params, and the
    // EventsSearch localStorage restore all return exactly as they were.
    navigate(-1);
  };

  const confirmRegistration = async () => {
    if (registrationBlocked) return;

    setShowRegistrationConfirm(false);
    setIsRegistering(true);
    setRegistrationMessage("");

    const wasRegistered = isRegistered;

    try {
      const mutation = wasRegistered ? unregisterToAnEvent : registerToAnEvent;
      const result = await mutation.mutateAsync({
        eventId: id,
        userhandle: profiledata?.userhandle ?? profiledata?.nickname,
      });

      if (!result?.success) {
        if (result?.code === "already_attending") {
          setAttendanceOverride(true);
          setRegistrationMessage(
            "You're already registered for this event. The button is now set to leave it.",
          );
          return;
        }

        if (result?.code === "not_attending") {
          setAttendanceOverride(false);
          setRegistrationMessage(
            "You're already unregistered from this event.",
          );
          return;
        }

        throw new Error(result?.msg || "Registration failed. Please try again.");
      }

      setAttendanceOverride(!wasRegistered);

      if (result.data?.event) {
        queryClient.setQueryData(
          eventDetailsQueryOptions(id).queryKey,
          result.data.event,
        );
      }

      queryClient.invalidateQueries({ queryKey: eventFatigueQueryKey(id) });
      queryClient.invalidateQueries({
        queryKey: eventDetailsQueryOptions(id).queryKey,
      });

      setRegistrationMessage(
        wasRegistered
          ? "You've been unregistered from this event."
          : "Successfully registered for this event!",
      );
    } catch (error) {
      const message =
        error?.message || "Registration failed. Please try again.";
      setRegistrationMessage(message);
      toast.error(message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegistration = async () => {
    if (!userSession) {
      setRegistrationMessage("Please log in to register for events.");
      return;
    }

    if (registrationBlocked) return;

    if (isRegistered) {
      await confirmRegistration();
      return;
    }

    try {
      const result = await fatigueQuery.refetch();

      if (result.data) {
        setShowRegistrationConfirm(true);
        return;
      }
    } catch {
      // A fatigue-check outage must not block registration.
    }

    await confirmRegistration();
  };

  const getEventIcon = (locationName) => {
    const name = locationName?.toLowerCase() || '';
    if (name.includes('target') || name.includes('store') || name.includes('shop')) return '🛍️';
    if (name.includes('ross') || name.includes('clothing')) return '👕';
    if (name.includes('music') || name.includes('concert')) return '🎵';
    if (name.includes('photo') || name.includes('camera')) return '📸';
    if (name.includes('coffee') || name.includes('cafe')) return '☕';
    if (name.includes('book') || name.includes('library')) return '📚';
    if (name.includes('park') || name.includes('walk')) return '🌳';
    if (name.includes('art') || name.includes('gallery')) return '🎨';
    if (name.includes('food') || name.includes('truck')) return '🍔';
    return '📅';
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-foreground mb-4">Event Not Found</h2>
          <p className="text-muted-foreground mb-6">The event you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/dashboard?tab=search')} className="w-full">
            Browse Events
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      {/* Global Loading Overlay for Operations */}
      {isRegistering && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <Spinner size="xlarge" className="mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              {isRegistered ? 'Unregistering from event...' : 'Registering for event...'}
            </p>
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 border-4 border-primary/20 rounded-lg bg-card shadow-lg">
        {/* Header */}
        <div className="mb-8">
          {cameFromDialog && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              onClick={handleBackToEvents}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          )}
          {cameFromNotifications && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              onClick={() => navigate("/notifications")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Notifications
            </Button>
          )}
          <div className="flex items-start gap-6">
            <div className="text-6xl">{getEventIcon(event?.locationdata?.locationname || event?.name)}</div>
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-primary mb-3">
                {event?.title || event?.name || 'Event Title'}
              </h1>
              <p className="text-xl font-medium text-muted-foreground mb-4">
                📍 {event?.locationdata?.locationname || event?.location}
              </p>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-lg px-4 py-2">
                  Event
                </Badge>
                {isRegistered && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-lg px-4 py-2">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Registered
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Info */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-primary mb-6">Details</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-background/50 rounded-xl border border-border/30">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <span className="text-lg font-medium text-foreground block">{event?.starttime?.substring(0, 5)} - {event?.endtime?.substring(0, 5)}</span>
                    <span className="text-sm text-muted-foreground">Duration</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-background/50 rounded-xl border border-border/30">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-lg font-medium text-foreground block">
                      {event?.eventdate ? new Date(event.eventdate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : event?.date}
                    </span>
                    <span className="text-sm text-muted-foreground">Date</span>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-background/50 rounded-xl border border-border/30">
                  <div className="p-3 bg-green-500/10 rounded-lg mt-1">
                    <MapPin className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-lg font-medium text-foreground block leading-relaxed">
                      {event?.locationdata?.address1 || event?.location}
                    </span>
                    <span className="text-sm text-muted-foreground">Location</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Attendees */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                People
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background/50 rounded-lg border border-border/30 text-center">
                  <p className="text-3xl font-bold text-blue-600">{maleCount}</p>
                  <p className="text-sm text-muted-foreground">Males</p>
                </div>
                <div className="p-4 bg-background/50 rounded-lg border border-border/30 text-center">
                  <p className="text-3xl font-bold text-pink-600">{femaleCount}</p>
                  <p className="text-sm text-muted-foreground">Females</p>
                </div>
              </div>
            </Card>

            {/* Registration */}
            <Card className="p-6">
              {registrationMessage && (
                <div className={`mb-4 p-4 rounded-lg border ${
                  registrationMessage.includes('Successfully') || registrationMessage.includes('unregistered')
                    ? 'bg-green-500/10 border-green-500/20 text-green-700'
                    : 'bg-red-500/10 border-red-500/20 text-red-700'
                }`}>
                  <div className="flex items-center gap-2">
                    {registrationMessage.includes('Successfully') || registrationMessage.includes('unregistered') ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">{registrationMessage}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleRegistration}
                disabled={isRegistering || registrationBlocked}
                variant={registrationBlocked ? "secondary" : "default"}
                className={`w-full font-semibold py-4 rounded-md transition-all ${
                  registrationBlocked
                    ? 'cursor-not-allowed bg-muted text-muted-foreground shadow-none hover:bg-muted hover:shadow-none hover:scale-100 active:scale-100'
                    : isRegistered
                      ? 'bg-red-500 hover:bg-red-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-green-500 hover:bg-green-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {registrationBlocked ? (
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Age Requirement Mismatch
                  </div>
                ) : isRegistering ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    {isRegistered ? 'Unregistering...' : 'Registering...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Heart className={`w-5 h-5 ${isRegistered ? 'fill-current' : ''}`} />
                    {isRegistered
                      ? 'UNREGISTER / LEAVE EVENT'
                      : 'REGISTER FOR THIS EVENT'}
                  </div>
                )}
              </Button>

              {registrationBlocked && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  This event is restricted to organizers&apos; specified age bounds.
                </p>
              )}
            </Card>

            {/* Registration Confirmation Dialog */}
            <AlertDialog open={showRegistrationConfirm} onOpenChange={setShowRegistrationConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    {isRegistered ? 'Unregister from Event' : 'Register for Event'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isRegistered
                      ? 'Are you sure you want to unregister from this event? You will no longer be listed as an attendee.'
                      : 'More than half of this event attendees are from your previous events. Press \'Register\' to continue to register for this event.'
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmRegistration}
                    className={isRegistered ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                  >
                    {isRegistered ? 'Unregister' : 'Register'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Event Description and Discussion Tabs - Full Width */}
        <Card className="p-6 mt-8">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="description" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Event Description
              </TabsTrigger>
              <TabsTrigger value="discussion" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Discussion
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">About This Event</h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                {event?.description ||
                  event?.details ||
                  "Join us for a wonderful meetup experience! This is a great opportunity to meet new people, share interests, and create lasting connections. We'll have plenty of activities planned to ensure everyone has a great time. Feel free to bring your enthusiasm and an open mind!"}
              </p>
            </TabsContent>

            <TabsContent value="discussion" className="mt-6">
              <EventDiscussion eventId={id} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}