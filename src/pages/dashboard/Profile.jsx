import { lazy, Suspense, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Edit2, Eye, Link2, Mail, MapPin, Phone, RotateCcw, Save, Settings, Calendar, ShieldAlert, ShieldCheck, Sparkles, Users } from "lucide-react";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Spinner } from '@/components/ui/Spinner';
import { Editable } from "@/components/Editable";
import { EditableBio } from "@/components/EditableBio";
import { useAuth } from "@/context/AuthContext";
import { isObjEmpty } from "@/utils/util";
import { useUpdateProfileMutation } from "@/hooks/useProfileQueries";
import { toProfileFormData } from "@/services/profile.service";
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { toast } from "sonner";
import maleDefaultAvatar from "@/assets/maleDefault.png";
import femaleDefaultAvatar from "@/assets/femaleDefault.png";

const CreateEvent = lazy(() => import("@/components/CreateEvent").then((module) => ({ default: module.CreateEvent })));
const ImageUploader = lazy(() => import("@/components/ImageUploader").then((module) => ({ default: module.ImageUploader })));

const ProfileModalFallback = ({ text = "Loading visual component..." }) => (
  <div className="p-6 text-sm text-center font-medium text-muted-foreground animate-pulse">{text}</div>
);

const glassCardClass =
  "border-white/10 bg-card/40 shadow-xl backdrop-blur-lg dark:border-border/40";
const glassPanelClass =
  "border-white/10 bg-background/30 backdrop-blur-sm dark:border-border/40";

function GlassCardHeader({
  icon,
  title,
  description,
  tileClassName = "from-primary/25 via-primary/10 to-transparent text-primary",
}) {
  const Icon = icon;

  return (
    <CardHeader className="flex flex-row items-center gap-3 pb-3">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br shadow-sm ${tileClassName}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <CardTitle className="text-base font-bold tracking-tight">
          {title}
        </CardTitle>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </CardHeader>
  );
}

function ProfileStatusBlock({ icon, label, value, tileClassName }) {
  const Icon = icon;

  return (
    <div
      className={`group flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/50 ${glassPanelClass}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm ${tileClassName}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

function SocialChannelChip({
  label,
  icon,
  value,
  placeholder,
  linkedClasses,
  onChange,
}) {
  const Icon = icon;
  const linked = Boolean(String(value || "").trim());

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-3.5 transition-all duration-300 ${
        linked
          ? `shadow-lg ${linkedClasses}`
          : `${glassPanelClass} border-dashed text-muted-foreground hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5`
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
            linked
              ? "bg-white/15 text-white"
              : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-sm font-bold ${
                linked ? "text-white" : "text-foreground"
              }`}
            >
              {label}
            </span>
            {linked ? (
              <Check className="h-3.5 w-3.5 text-white/90" />
            ) : (
              <Link2 className="h-3.5 w-3.5 opacity-50" />
            )}
          </div>

          <Editable
            text={value}
            placeholder={placeholder}
            type="input"
            className={`mt-0.5 block truncate text-xs ${
              linked ? "text-white/80" : "text-muted-foreground"
            }`}
          >
            <input
              type="text"
              placeholder={placeholder}
              value={value}
              autoFocus
              onChange={(event) => onChange(event.target.value)}
              className={`w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none ${
                linked
                  ? "border-white/30 bg-white/15 text-white placeholder:text-white/60"
                  : "border-border/60 bg-background/80 text-foreground placeholder:text-muted-foreground"
              }`}
            />
          </Editable>
        </div>
      </div>
    </div>
  );
}

export function Profile() {
  const { userSession, profiledata } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const updateProfileMutation = useUpdateProfileMutation();

  // State Declarations
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [editingProfileImage, setEditingProfileImage] = useState(false);

  // Field Form Controls
  const [phone, setPhone] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedIn] = useState("");

  // Populate form states safely when profile data resolves
  useEffect(() => {
    if (!isObjEmpty(profiledata)) {
      setPhone(profiledata.phonenumber || "");
      setFacebook(profiledata.facebook || "");
      setInstagram(profiledata.instagram || "");
      setLinkedIn(profiledata.linkedin || "");
    }
  }, [profiledata]);

  // Unified Central Change Evaluator
  const checkUnsavedChanges = (updatedPhone, updatedFb, updatedInsta, updatedLn) => {
    const isPhoneChanged = String(updatedPhone) !== String(profiledata?.phonenumber || "");
    const isFbChanged = String(updatedFb) !== String(profiledata?.facebook || "");
    const isInstaChanged = String(updatedInsta) !== String(profiledata?.instagram || "");
    const isLnChanged = String(updatedLn) !== String(profiledata?.linkedin || "");

    setHasUnsavedChanges(isPhoneChanged || isFbChanged || isInstaChanged || isLnChanged);
  };

  const handleSocialSubmit = async (e) => {
    if (e) e.preventDefault();
    setHasUnsavedChanges(false);

    const phoneregex = /^\d{10}$/;
    if (phone && !phone.match(phoneregex)) {
      toast.error("Invalid phone number! Please ensure it is exactly 10 digits.");
      return;
    }

    if (!isOnline) {
      toast.error('You are currently offline. Please check your network connection.');
      return;
    }

    if (!userSession) {
      toast.error("Session identity expired. Please log out and sign in again.");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfileMutation.mutateAsync({
        phonenumber: phone,
        facebook: facebook,
        instagram: instagram,
        linkedin: linkedin
      });

      toast.success('Profile contact channels synchronized successfully!');
    } catch (err) {
      toast.error(err?.message || 'Failed to update remote directory. Try again later.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBioSave = async (val) => {
    if (String(val) === String(profiledata?.bio || "")) return;

    if (!isOnline) {
      toast.error('Connection state validation failed. Action canceled.');
      return;
    }

    if (!userSession) {
      toast.error("Authentication session token missing.");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfileMutation.mutateAsync({ bio: val });
      toast.success('Biography details saved to data layer.');
    } catch (err) {
      toast.error(err?.message || 'Failed to submit user biography properties.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileImageCropped = async (blob) => {
    if (!isOnline) {
      toast.error('Cannot transfer binary blobs while operating offline.');
      return;
    }

    setIsSaving(true);
    try {
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      await updateProfileMutation.mutateAsync(
        toProfileFormData({ avatar: file })
      );

      setEditingProfileImage(false);
      toast.success('Profile avatar updated successfully!');
    } catch (err) {
      toast.error(err?.message || 'An unhandled exception occurred during media asset transmission.');
    } finally {
      setIsSaving(false);
    }
  };

  // Safe Dynamic Image Fallback Resolution Chain
  const avatarFallback = useMemo(() => {
    const gender = String(profiledata?.gender ?? "").trim().toLowerCase();

    if (gender === "male") return maleDefaultAvatar;
    if (gender === "female") return femaleDefaultAvatar;

    return "/placeholder-user.jpg";
  }, [profiledata?.gender]);

  const avatarImageSrc = useMemo(() => {
    return (
      profiledata?.avatar_url ||
      profiledata?.image_urls?.[0] ||
      avatarFallback
    );
  }, [profiledata, avatarFallback]);

  const fullName = `${profiledata?.firstname || "Kollective"} ${
    profiledata?.lastname || "User"
  }`;
  const locationLabel =
    profiledata?.city || profiledata?.state
      ? `${profiledata?.city || "Unknown"}, ${profiledata?.state || "NA"}`
      : "Location not set";

  const visibilityPreference = profiledata?.visibilityPreference;
  const visibilityMeta =
    visibilityPreference === "events-only"
      ? {
          label: "Events only",
          description: "Visible to event attendees",
          icon: Calendar,
          tileClassName: "from-amber-500/25 to-orange-500/10 text-amber-500",
        }
      : visibilityPreference === "online-only"
        ? {
            label: "Online only",
            description: "Visible while browsing",
            icon: Users,
            tileClassName: "from-sky-500/25 to-blue-500/10 text-sky-500",
          }
        : {
            label: "Online and events",
            description: "Discoverable everywhere",
            icon: Eye,
            tileClassName: "from-fuchsia-500/25 to-pink-500/10 text-fuchsia-500",
          };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <form
        onSubmit={handleSocialSubmit}
        className={`mx-auto max-w-[1600px] space-y-6 px-4 py-6 md:px-8 md:py-10 ${
          hasUnsavedChanges ? "pb-32" : ""
        }`}
      >
        {/* Premium cover banner */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-card/40 shadow-xl backdrop-blur-lg dark:border-border/40">
          <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/35 via-fuchsia-500/20 to-sky-400/25 sm:h-60">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute -bottom-24 left-16 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_35%,rgba(255,255,255,0.06))]" />

            <div className="relative flex h-full flex-col justify-between p-5 sm:p-8">
              <div className="pr-28 sm:pr-40">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-foreground/60">
                  MeetCutes profile
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  Your Profile
                </h1>
              </div>

              <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
                <Badge className="border-white/20 bg-background/30 text-foreground backdrop-blur-md">
                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  Active profile
                </Badge>
              </div>
            </div>
          </div>

          <div className="relative px-5 pb-6 sm:px-8">
            <div className="flex flex-col gap-5 sm:-mt-20 sm:flex-row sm:items-end sm:gap-7">
              <div className="relative -mt-14 w-fit shrink-0 sm:mt-0">
                <div className="absolute inset-0 scale-105 rounded-full bg-gradient-to-br from-primary via-fuchsia-500 to-sky-400 opacity-70 blur-md" />
                <div className="relative h-28 w-28 overflow-hidden rounded-full bg-muted ring-4 ring-background shadow-2xl sm:h-32 sm:w-32">
                  <img
                    src={avatarImageSrc}
                    alt="Profile avatar"
                    onError={(event) => {
                      event.currentTarget.src = avatarFallback;
                    }}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProfileImage(true)}
                  className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground shadow-lg transition-transform active:scale-95"
                  aria-label="Upload custom image attachment"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                    {fullName}
                  </h2>
                  {profiledata?.userhandle && (
                    <Badge
                      variant="secondary"
                      className="border-primary/20 bg-primary/10 font-mono text-xs text-primary"
                    >
                      @{profiledata.userhandle}
                    </Badge>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {locationLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    Open to new connections
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pb-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProfileImage(true)}
                  className="border-white/20 bg-background/30 backdrop-blur-md"
                >
                  <Edit2 className="mr-2 h-3.5 w-3.5" />
                  Edit photo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Master responsive grid */}
        <div className="grid grid-cols-1 items-start gap-6 md:gap-8 lg:grid-cols-[350px_minmax(0,1fr)]">
          {/* Left column: profile signals */}
          <div className="space-y-6 lg:sticky lg:top-24">
            <Card className={glassCardClass}>
              <GlassCardHeader
                icon={Sparkles}
                title="Profile signals"
                description="How you appear to the community"
                tileClassName="from-fuchsia-500/25 via-pink-500/10 to-transparent text-fuchsia-500"
              />
              <CardContent className="space-y-3 px-6 pb-6">
                <ProfileStatusBlock
                  icon={MapPin}
                  label="Location"
                  value={locationLabel}
                  tileClassName="from-emerald-500/25 to-teal-500/10 text-emerald-500"
                />
                <ProfileStatusBlock
                  icon={visibilityMeta.icon}
                  label="Visibility"
                  value={visibilityMeta.label}
                  tileClassName={visibilityMeta.tileClassName}
                />
                <ProfileStatusBlock
                  icon={ShieldCheck}
                  label="Profile state"
                  value={
                    profiledata?.userstate
                      ? profiledata.userstate === "active"
                        ? "Active and discoverable"
                        : profiledata.userstate
                      : "Awaiting profile data"
                  }
                  tileClassName="from-sky-500/25 to-indigo-500/10 text-sky-500"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right column: detailed information stacks */}
          <div className="space-y-6">

            {/* Context Card: Contact Information inputs */}
            <Card className={glassCardClass}>
              <GlassCardHeader
                icon={Mail}
                title="Contact Directory"
                description="Personal contact routing references"
                tileClassName="from-sky-500/25 via-cyan-400/10 to-transparent text-sky-500"
              />
              <CardContent className="grid grid-cols-1 gap-3 px-6 pb-6 md:grid-cols-2">
                <div
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 ${glassPanelClass}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/25 to-cyan-500/10 text-sky-500 shadow-sm">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        Registered email
                      </p>
                      <Badge
                        variant="secondary"
                        className="border-sky-500/20 bg-sky-500/10 text-[10px] text-sky-600 dark:text-sky-300"
                      >
                        Primary
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                      {profiledata?.email || "No secure email set"}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 ${glassPanelClass}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 text-emerald-500 shadow-sm">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        Phone link
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          phone
                            ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                            : "border-dashed text-muted-foreground"
                        }`}
                      >
                        {phone ? "Linked" : "Optional"}
                      </Badge>
                    </div>
                    <Editable
                      text={phone}
                      placeholder="Add a 10-digit number"
                      type="input"
                      className={`mt-0.5 block truncate text-sm font-semibold ${
                        phone ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <input
                        type="text"
                        placeholder="e.g. 5125550199"
                        value={phone}
                        autoFocus
                        onChange={(e) => {
                          setPhone(e.target.value);
                          checkUnsavedChanges(
                            e.target.value,
                            facebook,
                            instagram,
                            linkedin,
                          );
                        }}
                        className="w-full rounded-lg border border-border/60 bg-background/80 px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                      />
                    </Editable>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Context Card: Social Media Hooks */}
            <Card className={glassCardClass}>
              <GlassCardHeader
                icon={Users}
                title="Social Architecture"
                description="Connect the channels that feel like you (click on 'connect' to link)"
                tileClassName="from-fuchsia-500/25 via-pink-500/10 to-transparent text-fuchsia-500"
              />
              <CardContent className="grid grid-cols-1 gap-3 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-3">
                <SocialChannelChip
                  label="Facebook"
                  icon={FaFacebook}
                  value={facebook}
                  placeholder="Connect"
                  linkedClasses="border-blue-400/30 bg-gradient-to-br from-[#1877F2] via-[#1877F2]/90 to-[#0a4fbd] text-white"
                  onChange={(value) => {
                    setFacebook(value);
                    checkUnsavedChanges(
                      phone,
                      value,
                      instagram,
                      linkedin,
                    );
                  }}
                />

                <SocialChannelChip
                  label="Instagram"
                  icon={FaInstagram}
                  value={instagram}
                  placeholder="Connect"
                  linkedClasses="border-pink-400/30 bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white"
                  onChange={(value) => {
                    setInstagram(value);
                    checkUnsavedChanges(
                      phone,
                      facebook,
                      value,
                      linkedin,
                    );
                  }}
                />

                <SocialChannelChip
                  label="LinkedIn"
                  icon={FaLinkedin}
                  value={linkedin}
                  placeholder="Connect"
                  linkedClasses="border-sky-400/30 bg-gradient-to-br from-[#0A66C2] via-[#0A66C2]/90 to-[#004182] text-white"
                  onChange={(value) => {
                    setLinkedIn(value);
                    checkUnsavedChanges(
                      phone,
                      facebook,
                      instagram,
                      value,
                    );
                  }}
                />
              </CardContent>
            </Card>

            {/* Context Card: Biography Editor Panel */}
            <Card className={glassCardClass}>
              <GlassCardHeader
                icon={Edit2}
                title="About you"
                description="Your story, in your own words"
                tileClassName="from-amber-500/25 via-orange-500/10 to-transparent text-amber-500"
              />
              <CardContent className="px-6 pb-6">
                <EditableBio
                  value={!isObjEmpty(profiledata?.bio) ? profiledata?.bio : ""}
                  onSave={handleBioSave}
                  placeholder="Tell others about your interests, technical stack specialties, or creative domains..."
                />
              </CardContent>
            </Card>

            {/* Floating action bar for unsaved changes */}
            {hasUnsavedChanges && (
              <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2">
                <div className="animate-bounce-in flex flex-col gap-3 rounded-2xl border border-white/20 bg-background/80 p-4 shadow-2xl backdrop-blur-xl dark:border-border/50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/25 to-orange-500/10 text-amber-500 shadow-sm">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Unsaved alterations detected
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Review your contact channels before leaving.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPhone(profiledata?.phonenumber || "");
                        setFacebook(profiledata?.facebook || "");
                        setInstagram(profiledata?.instagram || "");
                        setLinkedIn(profiledata?.linkedin || "");
                        setHasUnsavedChanges(false);
                      }}
                      className="border-white/20 bg-background/50 backdrop-blur-md"
                    >
                      <RotateCcw className="mr-2 h-3.5 w-3.5" />
                      Discard
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-gradient-to-r from-primary to-fuchsia-500 shadow-lg shadow-primary/20"
                    >
                      <Save className="mr-2 h-3.5 w-3.5" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* BOTTOM SECTION: Navigation Actions & Account Preferences */}
        <div className="mt-4 grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-2">
          <Card className={glassCardClass}>
            <GlassCardHeader
              icon={Settings}
              title="Account Configurations"
              description="Fine-tune your experience"
              tileClassName="from-slate-500/20 via-slate-400/10 to-transparent text-slate-500"
            />
            <CardContent className="grid grid-cols-1 gap-2 px-6 pb-6 sm:grid-cols-3">
              <Button
                type="button"
                onClick={() => navigate('/dashboard?tab=settings')}
                variant="outline"
                className="w-full justify-start border-white/10 bg-background/30 text-xs font-bold backdrop-blur-md"
              >
                <Settings className="mr-2 h-3.5 w-3.5" /> Settings
              </Button>
              <Button
                type="button"
                onClick={() => navigate('/changepassword')}
                variant="outline"
                className="w-full justify-start border-white/10 bg-background/30 text-xs font-bold backdrop-blur-md"
              >
                <Edit2 className="mr-2 h-3.5 w-3.5" /> Change Password
              </Button>
              <Button
                type="button"
                onClick={() => navigate('/dashboard?tab=settings&tab=preferences')}
                variant="outline"
                className="w-full justify-start border-white/10 bg-background/30 text-xs font-bold backdrop-blur-md"
              >
                <Edit2 className="mr-2 h-3.5 w-3.5" /> Preferences
              </Button>
            </CardContent>
          </Card>

          <Card className={glassCardClass}>
            <GlassCardHeader
              icon={Sparkles}
              title="Quick Routes"
              description="Jump back into the community"
              tileClassName="from-primary/25 via-fuchsia-500/10 to-transparent text-primary"
            />
            <CardContent className="grid grid-cols-1 gap-2 px-6 pb-6 sm:grid-cols-3">
              <Button
                type="button"
                onClick={() => navigate('/dashboard?tab=events')}
                variant="ghost"
                className="w-full justify-start text-xs font-bold hover:bg-primary/5 hover:text-primary"
              >
                <Calendar className="mr-2 h-3.5 w-3.5" /> My Events
              </Button>
              <Button
                type="button"
                onClick={() => navigate('/dashboard?tab=users')}
                variant="ghost"
                className="w-full justify-start text-xs font-bold hover:bg-primary/5 hover:text-primary"
              >
                <Mail className="mr-2 h-3.5 w-3.5" /> Search Users
              </Button>

              <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
                <Button
                  type="button"
                  onClick={() => setCreateEventOpen(true)}
                  variant="ghost"
                  className="w-full justify-start text-xs font-bold hover:bg-primary/5 hover:text-primary"
                >
                  <Edit2 className="mr-2 h-3.5 w-3.5" /> Create Event
                </Button>
                <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-y-auto">
                  {createEventOpen && (
                    <Suspense fallback={<ProfileModalFallback text="Initializing event manifest framework..." />}>
                      <CreateEvent onClose={() => setCreateEventOpen(false)} />
                    </Suspense>
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Dynamic Dedicated Image Editor Modal Window Context Layer */}
      <Dialog open={editingProfileImage} onOpenChange={setEditingProfileImage}>
        <DialogContent className="max-w-md bg-card border border-border">
          <DialogTitle>Update Profile Avatar</DialogTitle>
          <DialogDescription>Select and crop an absolute square aspect-ratio viewport frame alignment.</DialogDescription>
          <div className="mt-2 min-h-[260px] flex items-center justify-center bg-muted/20 border border-dashed border-border/60 rounded-xl p-4">
            {editingProfileImage && (
              <Suspense fallback={<ProfileModalFallback text="Compiling asset manipulation views..." />}>
                <ImageUploader onImageCropped={handleProfileImageCropped} minimal className="w-full" />
              </Suspense>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Processing State Screen Overlay blocking interaction grids */}
      {isSaving && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
          <div className="bg-card border border-border rounded-xl p-6 shadow-2xl max-w-xs w-full text-center">
            <Spinner size={40} withText text="Committing alterations..." className="mx-auto" />
          </div>
        </div>
      )}
    </div>
  );
}