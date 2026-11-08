import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { useFormik } from "formik";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Settings as SettingsIcon,
  AlertTriangle,
  User,
  MapPin,
  Target,
  Brain,
  Edit,
  Users,
  Calendar,
  Search,
  Mail,
  Ban,
  BellOff,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/context/AuthContext";
import {
  useDeactivateAccountMutation,
  useRelationshipDirectoryQuery,
  useRelationshipMutation,
  useUpdateProfileMutation,
} from "@/hooks/useProfileQueries";
import { useRequestEmailChangeMutation } from "@/hooks/useAuthQueries";
import { usePortalSessionMutation } from "@/hooks/useBilling";
import { describeApiError } from "@/lib/api";
import { resolveUserImage } from "@/lib/userImage";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { HandleCard } from "@/components/HandleCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const LocationDialog = lazy(() => import("@/components/LocationDialog").then((module) => ({ default: module.LocationDialog })));
const ChangeLocation = lazy(() => import("@/components/ChangeLocation").then((module) => ({ default: module.ChangeLocation })));

const SettingsModalFallback = ({ text = "Loading..." }) => (
  <div className="p-6 text-sm text-muted-foreground">{text}</div>
);

function RelationshipDirectoryRow({ user, kind, onRemove, isRemoving }) {
  const name =
    [user.firstname, user.lastname].filter(Boolean).join(" ").trim() ||
    user.userhandle ||
    "Member";
  const handle = user.userhandle || user.nickname || "";
  const avatar = resolveUserImage(user);
  const initial = (user.firstname || user.userhandle || "?").charAt(0).toUpperCase();
  const isBlocked = kind === "blocked";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-background/50 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary ring-2 ring-muted/40 shadow-xs">
          {avatar ? (
            <img src={avatar} alt={name} loading="lazy" decoding="async" className="h-full w-full rounded-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {handle && (
            <p className="truncate text-xs text-muted-foreground">@{handle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={
            isBlocked
              ? "border-destructive/30 text-destructive"
              : "border-amber-500/30 text-amber-600 dark:text-amber-300"
          }
        >
          {isBlocked ? "Blocked" : "Muted"}
        </Badge>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onRemove(kind, user)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : isBlocked ? (
            <ShieldCheck className="mr-2 h-3.5 w-3.5" />
          ) : (
            <BellOff className="mr-2 h-3.5 w-3.5" />
          )}
          {isBlocked ? "Unblock" : "Unmute"}
        </Button>
      </div>
    </div>
  );
}

function RelationshipDirectoryCard({
  title,
  description,
  kind,
  icon,
  tone,
  query,
  onRemove,
  pendingTarget,
}) {
  const Icon = icon;
  const users = Array.isArray(query.data) ? query.data : [];
  const isEmpty = !query.isLoading && !query.error && users.length === 0;

  return (
    <Card className="border border-border/50 bg-card/60 shadow-lg">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Badge
            variant="secondary"
            className="border-border/60 bg-background/60 font-mono"
          >
            {users.length}
          </Badge>
        </div>

        {query.isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/40 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading directory...
          </div>
        ) : query.error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {query.error.message || "Unable to load directory."}
          </div>
        ) : isEmpty ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            No {kind} users.
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => {
              const targetId = user.userid || user.id;

              return (
                <RelationshipDirectoryRow
                  key={targetId}
                  user={user}
                  kind={kind}
                  onRemove={onRemove}
                  isRemoving={String(pendingTarget) === String(targetId)}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export function Settings() {
  const { profiledata, userSession } = useAuth();
  const updateProfileMutation = useUpdateProfileMutation();
  const blockedDirectoryQuery = useRelationshipDirectoryQuery("blocked");
  const mutedDirectoryQuery = useRelationshipDirectoryQuery("muted");
  const relationshipMutation = useRelationshipMutation();
  const pendingRelationshipTarget = relationshipMutation.isPending
    ? relationshipMutation.variables?.targetId
    : null;
  const blockedDirectoryUsers = Array.isArray(blockedDirectoryQuery.data)
    ? blockedDirectoryQuery.data
    : [];
  const mutedDirectoryUsers = Array.isArray(mutedDirectoryQuery.data)
    ? mutedDirectoryQuery.data
    : [];
  const deactivateMutation = useDeactivateAccountMutation();
  const requestEmailChangeMutation = useRequestEmailChangeMutation();
  const portalSessionMutation = usePortalSessionMutation();
  const isOnline = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [emailsearch, setEmailsearch] = useState(profiledata?.emailsearch ?? true);
  const [phonenumbersearch, setPhonenumbersearch] = useState(profiledata?.phonenumbersearch ?? false);
  const [userhandlesearch, setUserhandlesearch] = useState(profiledata?.userhandlesearch ?? false);
  const [onlyhundredmileevisiblity, setOnlyhundredmileevisiblity] = useState(profiledata?.onlyhundredmileevisiblity ?? true);
  const [hideLastName, setHideLastName] = useState(profiledata?.hide_last_name ?? false);
  const [visibilityPreference, setVisibilityPreference] = useState(profiledata?.visibilitypreference ?? 'both');
  const [changeLocationOpen, setChangeLocationOpen] = useState(false);
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [handleDialogOpen, setHandleDialogOpen] = useState(false);
  const [emailChangeValues, setEmailChangeValues] = useState({
    email: "",
    current_password: "",
  });
  const [settingsInitialized, setSettingsInitialized] = useState(false);

  // On a hard reload the profile query resolves after this component mounts.
  // Hydrate the form state once the profile arrives so saved settings are not
  // displayed as their defaults.
  useEffect(() => {
    if (!profiledata || settingsInitialized) return;

    setEmailsearch(profiledata.emailsearch ?? true);
    setPhonenumbersearch(profiledata.phonenumbersearch ?? false);
    setUserhandlesearch(profiledata.userhandlesearch ?? false);
    setOnlyhundredmileevisiblity(profiledata.onlyhundredmileevisiblity ?? true);
    setHideLastName(profiledata.hide_last_name ?? false);
    setVisibilityPreference(profiledata.visibilitypreference ?? 'both');
    setSettingsInitialized(true);
  }, [profiledata, settingsInitialized]);

  let [valueschanged, setValueschanged] = useState(false);
  const [confirmClick, setConfirmClick] = useState(false);
  const [confirmPopup, setConfirmPopup] = useState(false);

  // Modal states for profile actions
  const [isCoordinatesModalOpen, setIsCoordinatesModalOpen] = useState(false);

  const gotoQuestionaire = () => {
    navigate("/questionaire");
  };

  const clickDeleteConfirm = async () => {
    if (!isOnline) {
      toast.error('You are offline. Check your internet connection', {
        position: 'top-center',
      });
      return;
    }

    setConfirmClick(true);

    try {
      await deactivateMutation.mutateAsync();

      toast.success('Account deactivated successfully!', {
        position: 'top-center',
      });
      // The mutation clears the local session and query cache.
      navigate("/");
    } catch (error) {
      toast.error(error?.message || 'Failed to deactivate account', {
        position: 'top-center',
      });
    } finally {
      setConfirmClick(false);
      setConfirmPopup(false);
    }
  };

  const submitEmailChange = async (event) => {
    event.preventDefault();

    if (!isOnline) {
      toast.error('You are offline. Check your internet connection', {
        position: 'top-center',
      });
      return;
    }

    try {
      await requestEmailChangeMutation.mutateAsync({
        email: emailChangeValues.email,
        currentPassword: emailChangeValues.current_password,
      });

      toast.success('Confirmation link sent to your new email address.', {
        position: 'top-center',
      });
      setEmailChangeOpen(false);
      setEmailChangeValues({ email: "", current_password: "" });
    } catch (error) {
      toast.error(describeApiError(error, 'Failed to start email change'), {
        position: 'top-center',
      });
    }
  };

  const handleDirectoryRemove = (kind, user) => {
    const targetId = user?.userid || user?.id;
    if (!targetId) return;

    const relationshipKind = kind === "blocked" ? "block" : "mute";

    relationshipMutation.mutate(
      { action: "delete", kind: relationshipKind, targetId },
      {
        onSuccess: () => {
          toast.success(
            relationshipKind === "block" ? "User unblocked" : "User unmuted",
            { position: "top-center" },
          );
        },
        onError: (error) => {
          toast.error(error?.message || "Could not update relationship", {
            position: "top-center",
          });
        },
      },
    );
  };

  const formik = useFormik({
    initialValues: {},
    onSubmit: async () => {
      if (!isOnline) {
        toast.error('You are offline. Check your internet connection', {
          position: 'top-center',
        });
        return;
      }

      if (
        emailsearch === profiledata?.emailsearch &&
        phonenumbersearch === profiledata?.phonenumbersearch &&
        userhandlesearch === profiledata?.userhandlesearch &&
        onlyhundredmileevisiblity === profiledata?.onlyhundredmileevisiblity &&
        hideLastName === (profiledata?.hide_last_name ?? false) &&
        visibilityPreference === (profiledata?.visibilitypreference || 'both')
      ) {
        setValueschanged(false);
        return;
      }

      let settingsdata = {
        emailsearch: emailsearch,
        phonenumbersearch: phonenumbersearch,
        userhandlesearch: userhandlesearch,
        onlyhundredmileevisiblity: onlyhundredmileevisiblity,
        hide_last_name: hideLastName,
        visibilitypreference: visibilityPreference,
      };

      if (valueschanged) {
        setLoading(true);
        try {
          await updateProfileMutation.mutateAsync(settingsdata);

          toast.success('Settings updated successfully!', {
            position: 'top-center',
          });
        } catch (error) {
          toast.error(error?.message || 'Failed to update settings', {
            position: 'top-center',
          });
        } finally {
          setLoading(false);
          setValueschanged(false);
        }
      }
    },
  });

  // Render the controls only after the signed-in profile has hydrated. This
  // prevents a late profile response from overwriting a switch the user just
  // toggled, and avoids briefly showing default values on a hard reload.
  if (userSession && !settingsInitialized) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <Spinner size="medium" withText={true} text="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-muted/20 to-background">
      {loading && (
        <Spinner
          className="top-[50%] left-[50%] z-50 absolute"
          size="medium"
          withText={true}
          text="Saving..."
        />
      )}
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        <Card className="bg-background rounded-2xl shadow-xl border border-border overflow-hidden">
          <AlertDialog open={confirmPopup} onOpenChange={setConfirmPopup}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Deactivate Account
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will deactivate your account and hide your profile from other users. Your data will be preserved and you can contact support to reactivate your account if needed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={confirmClick}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clickDeleteConfirm}
                  disabled={confirmClick}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {confirmClick ? (
                    <>
                      <Spinner size="small" className="mr-2" />
                      Deactivating...
                    </>
                  ) : (
                    'Deactivate Account'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <CardHeader className="bg-linear-to-r from-primary/10 via-primary/5 to-primary/10 px-6 py-8 border-b border-border flex items-start justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <SettingsIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl text-primary">Settings</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Manage your privacy and account preferences</p>
              </div>
            </div>
            <button
              type="button"
              className="text-red-700 rounded bg-transparent border-0"
              onClick={() => navigate("/")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="20"
                width="14"
                viewBox="0 0 384 512"
                fill=""
              >
                <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
              </svg>
            </button>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Privacy Settings</h2>
              </div>

              <div className="space-y-4">
                <Card className="border border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium text-foreground">Email Search Visibility</h3>
                        <p className="text-sm text-muted-foreground">Allow others to find your profile via email search</p>
                      </div>
                      <Switch
                        checked={emailsearch}
                        onCheckedChange={(value) => {
                          setEmailsearch(value);
                          setValueschanged(true);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium text-foreground">Phone Search Visibility</h3>
                        <p className="text-sm text-muted-foreground">Allow others to find your profile via phone number search</p>
                      </div>
                      <Switch
                        checked={phonenumbersearch}
                        onCheckedChange={(value) => {
                          setPhonenumbersearch(value);
                          setValueschanged(true);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium text-foreground">UserHandle Search Visibility</h3>
                        <p className="text-sm text-muted-foreground">Allow others to find your profile via username search</p>
                      </div>
                      <Switch
                        checked={userhandlesearch}
                        onCheckedChange={(value) => {
                          setUserhandlesearch(value);
                          setValueschanged(true);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium text-foreground">Distance Visibility</h3>
                        <p className="text-sm text-muted-foreground">Only show your profile to people within 100 miles</p>
                      </div>
                      <Switch
                        checked={onlyhundredmileevisiblity}
                        onCheckedChange={(value) => {
                          setOnlyhundredmileevisiblity(value);
                          setValueschanged(true);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-medium text-foreground">Hide Last Name on Public Discovery</h3>
                        <p className="text-sm text-muted-foreground">When active, other members will only see your first name across search listings, shortlists, and events.</p>
                      </div>
                      <Switch
                        checked={hideLastName}
                        onCheckedChange={(value) => {
                          setHideLastName(value);
                          setValueschanged(true);
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator className="my-6" />

              <div className="flex items-center gap-3 mb-6">
                <Target className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Activity Preferences</h2>
              </div>

              <div className="space-y-4">
                <Card className="border border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <h3 className="font-medium text-foreground">Visibility Preference</h3>
                        <p className="text-sm text-muted-foreground">Choose how you want to interact on MeetCutes</p>
                      </div>
                      <Select
                        value={visibilityPreference}
                        onValueChange={(value) => {
                          setVisibilityPreference(value);
                          setValueschanged(true);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="events-only">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <div>
                                <div className="font-medium">Events Only</div>
                                <div className="text-xs text-muted-foreground">Attend events, not visible in user searches</div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="online-only">
                            <div className="flex items-center gap-2">
                              <Search className="w-4 h-4" />
                              <div>
                                <div className="font-medium">Online Only</div>
                                <div className="text-xs text-muted-foreground">Visible in searches, not interested in events</div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="both">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <div>
                                <div className="font-medium">Both Events & Online</div>
                                <div className="text-xs text-muted-foreground">Participate in events and be visible in searches</div>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {valueschanged && (
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEmailsearch(profiledata.emailsearch || false);
                      setPhonenumbersearch(profiledata.phonenumbersearch || false);
                      setUserhandlesearch(profiledata.userhandlesearch || false);
                      setOnlyhundredmileevisiblity(profiledata.onlyhundredmileevisiblity || false);
                      setHideLastName(profiledata.hide_last_name ?? false);
                      setVisibilityPreference(profiledata.visibilitypreference || 'both');
                      setValueschanged(false);
                    }}
                    disabled={!valueschanged}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    onClick={formik.handleSubmit}
                    disabled={!valueschanged || loading}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {loading ? (
                      <>
                        <Spinner size="small" className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              )}
            </div>

            <Separator className="my-8" />

            {/* Profile Actions Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Profile Actions</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Set Handle */}
                <Card className="border border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Edit className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-foreground">Set Handle</h3>
                        <p className="text-sm text-muted-foreground">
                          Create a unique username for your profile
                        </p>
                        {profiledata?.userhandle ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-green-600">
                              @{profiledata.userhandle}
                            </span>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              Set
                            </span>
                          </div>
                        ) : (
                          <Dialog
                            open={handleDialogOpen}
                            onOpenChange={setHandleDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" className="mt-2">
                                Set Handle
                              </Button>
                            </DialogTrigger>
                            {handleDialogOpen && (
                              <HandleCard
                                onClose={() => setHandleDialogOpen(false)}
                              />
                            )}
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Change Email */}
                <Card className="border border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-foreground">Change Email</h3>
                        <p className="text-sm text-muted-foreground">
                          Current email: {profiledata?.email || "Not set"}
                        </p>
                        <Dialog open={emailChangeOpen} onOpenChange={setEmailChangeOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="mt-2">
                              Change Email
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change Email Address</DialogTitle>
                              <DialogDescription>
                                We will send a confirmation link to the new address.
                                Your current email stays active until you confirm it.
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={submitEmailChange} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="new-email">New Email Address</Label>
                                <Input
                                  id="new-email"
                                  type="email"
                                  autoComplete="email"
                                  required
                                  value={emailChangeValues.email}
                                  onChange={(event) =>
                                    setEmailChangeValues((current) => ({
                                      ...current,
                                      email: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="current-password">Current Password</Label>
                                <Input
                                  id="current-password"
                                  type="password"
                                  autoComplete="current-password"
                                  required
                                  value={emailChangeValues.current_password}
                                  onChange={(event) =>
                                    setEmailChangeValues((current) => ({
                                      ...current,
                                      current_password: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <Button
                                type="submit"
                                className="w-full"
                                disabled={requestEmailChangeMutation.isPending}
                              >
                                {requestEmailChangeMutation.isPending
                                  ? "Sending..."
                                  : "Send Confirmation Link"}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Change Location */}
                <Card className="border border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-foreground">Change Location</h3>
                        <p className="text-sm text-muted-foreground">
                          Update your city and location information
                        </p>
                        <Dialog open={changeLocationOpen} onOpenChange={setChangeLocationOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="mt-2">
                              Change Location
                            </Button>
                          </DialogTrigger>
                          {changeLocationOpen && (
                            <Suspense fallback={<SettingsModalFallback text="Loading location options..." />}>
                              <ChangeLocation onClose={() => setChangeLocationOpen(false)} />
                            </Suspense>
                          )}
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Coordinates */}
                <Card className="border border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-foreground">Coordinates</h3>
                        <p className="text-sm text-muted-foreground">
                          View and manage your location coordinates
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsCoordinatesModalOpen(true)}
                          className="mt-2"
                        >
                          View Coordinates
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Mindset Questionnaire */}
                <Card className="border border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        <Brain className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-foreground">Mindset Questionnaire</h3>
                        <p className="text-sm text-muted-foreground">
                          Take our personality assessment to improve matches
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={gotoQuestionaire}
                          className="mt-2"
                        >
                          Take Questionnaire
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Billing & Invoices */}
                <Card className="relative overflow-hidden border border-blue-500/30 bg-blue-500/5 transition-colors hover:border-blue-500/50">
                  <div
                    aria-hidden="true"
                    className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-blue-500/15 blur-3xl"
                  />
                  <CardContent className="relative p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-300">
                        <CreditCard className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            Billing &amp; Invoices
                          </h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              profiledata?.subscription_active
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {profiledata?.subscription_active
                              ? "Premium active"
                              : "No active plan"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Manage your subscription, review payment history, and
                          download generated invoices.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => portalSessionMutation.mutate()}
                          disabled={portalSessionMutation.isPending}
                          className="mt-2 border-blue-500/40 text-blue-700 hover:bg-blue-500/10 dark:text-blue-300"
                        >
                          {portalSessionMutation.isPending ? (
                            <Loader2
                              className="mr-2 h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <CreditCard
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                          )}
                          {portalSessionMutation.isPending
                            ? "Opening billing portal..."
                            : "Manage Subscription & Invoices"}
                        </Button>
                      </div>
                    </div>

                    {portalSessionMutation.isPending && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/25 backdrop-blur-[1px]">
                        <Loader2
                          className="h-5 w-5 animate-spin text-blue-600"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Blocked & Muted Directory */}
            <div className="space-y-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem
                  value="privacy-directory"
                  className="overflow-hidden rounded-2xl border border-border/70 bg-card/40 shadow-lg backdrop-blur-md"
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors duration-200 hover:bg-muted/10">
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-slate-400/10 to-transparent text-primary ring-1 ring-primary/10">
                        <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-foreground">
                          Blocked &amp; Muted Directory
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Manage privacy exclusions • {blockedDirectoryUsers.length} blocked,{" "}
                          {mutedDirectoryUsers.length} muted
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-6 pb-6 pt-2 duration-200">
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <RelationshipDirectoryCard
                        title="Blocked users"
                        description="Completely hidden from searches, feeds, and attendee lists."
                        kind="blocked"
                        icon={Ban}
                        tone="from-destructive/20 via-red-500/10 to-transparent text-destructive"
                        query={blockedDirectoryQuery}
                        onRemove={handleDirectoryRemove}
                        pendingTarget={pendingRelationshipTarget}
                      />
                      <RelationshipDirectoryCard
                        title="Muted users"
                        description="Their content is hidden, but their profile stays reachable here."
                        kind="muted"
                        icon={BellOff}
                        tone="from-amber-500/20 via-orange-500/10 to-transparent text-amber-500"
                        query={mutedDirectoryQuery}
                        onRemove={handleDirectoryRemove}
                        pendingTarget={pendingRelationshipTarget}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <Separator className="my-8" />

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
              </div>

              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-destructive">Deactivate Account</h3>
                      <p className="text-sm text-muted-foreground">
                        Deactivate your account and hide your profile from other users. Your data will be preserved for potential reactivation.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmPopup(true)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Deactivate Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        {isCoordinatesModalOpen && (
          <Suspense fallback={<SettingsModalFallback text="Loading coordinates..." />}>
            <LocationDialog
              isOpen={isCoordinatesModalOpen}
              onClose={() => setIsCoordinatesModalOpen(false)}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}