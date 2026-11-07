import {
  X,
  MapPin,
  Phone,
  Mail,
  Flag,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User,
  Heart,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RelationshipActions } from "@/components/RelationshipActions";
import { formatMemberName } from "@/lib/displayName";

const MOBILE_PROFILE_QUERY = "(max-width: 1023px)";

export function UserProfileDialog({ user, userData, onClose }) {
  const navigate = useNavigate();
  // Filter out null/empty images and ensure we have valid images
  const source = userData ?? user;
  const imageUrls = (source?.image_urls ?? []).filter(
    (img) => img && typeof img === "string" && img.trim() !== "",
  );
  const validImages = imageUrls.length
    ? imageUrls
    : (source?.images ?? []).filter(
        (img) => typeof img === "string" && img.startsWith("http"),
      );
  const hasImages = validImages.length > 0;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    if (!validImages.length) return;
    setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
  };

  const prevImage = () => {
    if (!validImages.length) return;
    setCurrentImageIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  const goToImage = (index) => {
    setCurrentImageIndex(index);
  };

  // Helper function to check if a value is available and not empty
  const hasValue = (value) => value != null && typeof value === 'string' && value.trim() !== '';

  const fullName = formatMemberName(source || user);

  const headerNameWithAge = [
    source?.firstname || user?.firstname,
    source?.age ?? user?.age,
  ]
    .filter((value) => value != null && value !== "")
    .join(", ");

  const isMaleProfile = String(source?.gender || user?.gender || "")
    .trim()
    .toLowerCase()
    .startsWith("m");

  const reportUser = () => {
    // 1. Point explicitly to userData (the person being viewed)
    const targetUserId = userData?.userid || user?.userid || "Unknown ID";
    const targetUserName = `${userData?.firstname || user?.firstname || ''} ${userData?.lastname || user?.lastname || ''}`.trim();

    const supportEmail = "hello@meetcutes.us"; // 2. Explicit destination mail box
    const subject = encodeURIComponent(`Report User: ${targetUserName}`);

    // 3. Swapped \n for %0A to guarantee clean line breaking alignment across native mail apps
    const body = encodeURIComponent(
      `Reporting User Name: ${targetUserName}\n` +
      `Reporting User ID: ${targetUserId}\n\n` +
      `Please provide specific details about the violation or issue below:\n- `
    );

    const mailtoLink = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  };

  const openFullProfile = () => {
    const targetId =
      source?.userid || source?.id || user?.userid || user?.id;

    if (!targetId) return;

    const isMobileViewport =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia(MOBILE_PROFILE_QUERY).matches;

    if (isMobileViewport) {
      try {
        const scroller = document.querySelector("main");
        const scrollTop = scroller ? scroller.scrollTop : window.scrollY;
        window.sessionStorage.setItem(
          "meetcutes:discovery-scroll-top",
          String(scrollTop),
        );
      } catch {
        // Scroll restoration is best-effort; navigation must still proceed.
      }

      navigate(`/user/${targetId}`, { state: { from: "dialog" } });
      return;
    }

    window.open(`/user/${targetId}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-background/95 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 dark:border-border/50">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-white/10 bg-background/85 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 via-fuchsia-500/15 to-transparent text-primary shadow-sm">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {headerNameWithAge || 'User Profile'}
              </h2>
              {hasValue(user?.userhandle) && (
                <p className="text-sm text-muted-foreground">@{user.userhandle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RelationshipActions
              targetId={source?.userid || source?.id}
              targetName={fullName}
            />
            <button
              onClick={openFullProfile}
              className="p-2 hover:bg-muted rounded-md transition-colors group"
              title="Open profile"
              aria-label="Open full profile"
            >
              <ExternalLink className="w-5 h-5 text-muted-foreground hover:text-foreground group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              aria-label="Close profile"
            >
              <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Images Section - Only show if images are available */}
          {hasImages && (
            <div className="lg:w-1/3 p-5 sm:p-6">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-muted/40 via-background/20 to-primary/5 p-2 shadow-xl backdrop-blur-md">
                <div className="group relative h-56 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/30 via-muted/30 to-primary/10 shadow-inner ring-1 ring-white/10 md:h-72">
                  {/* Carousel Images */}
                  <div className="relative h-full w-full">
                    {validImages.map((image, index) => (
                      <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-500 ${
                          index === currentImageIndex ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${source?.firstname || user?.firstname || 'User'} - Photo ${index + 1}`}
                          className="h-full w-full object-contain lg:object-cover"
                          onError={(e) => {
                            e.target.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Navigation Arrows */}
                  {validImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/35 p-2 text-white opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-black/55 group-hover:opacity-100"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/35 p-2 text-white opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-black/55 group-hover:opacity-100"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {/* Dot Indicators */}
                  {validImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-md">
                      {validImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToImage(index)}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            index === currentImageIndex
                              ? "w-6 bg-white"
                              : "w-2 bg-white/45 hover:bg-white/70"
                          }`}
                          aria-label={`Go to image ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Glass image counter */}
                  {validImages.length > 1 && (
                    <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/35 px-3 py-1 font-mono text-xs font-semibold text-white shadow-lg backdrop-blur-md">
                      {currentImageIndex + 1} / {validImages.length}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Profile Details */}
          <div className={`${hasImages ? 'lg:flex-1' : 'w-full'} p-5 sm:p-6 space-y-6`}>
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight text-foreground">
                    {hasValue(user?.firstname) && hasValue(user?.age) ? `${user.firstname}, ${user.age}` : 'Profile'}
                  </h3>
                  {hasValue(user?.name) && user.name !== user?.firstname && (
                    <p className="text-sm font-medium text-muted-foreground">{user.name}</p>
                  )}
                </div>
                <button
                  onClick={reportUser}
                  className="rounded-xl border border-destructive/20 bg-destructive/5 p-2 transition-colors hover:bg-destructive/10 lg:order-last">
                  <Flag className="w-5 h-5 text-destructive transition-transform group-hover:scale-110" />
                </button>
              </div>

              {/* Full-name focal point (visibility controls live on the standalone profile) */}
              <div className="pt-3 border-t border-border/50">
                <p
                  className={`text-center text-2xl font-black tracking-tight bg-gradient-to-r bg-clip-text text-transparent sm:text-3xl ${
                    isMaleProfile
                      ? "from-sky-600 via-blue-500 to-indigo-500 dark:from-sky-300 dark:via-blue-400 dark:to-indigo-300"
                      : "from-primary via-fuchsia-500 to-sky-400"
                  }`}
                >
                  {fullName || "MeetCutes Member"}
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-fuchsia-500/10 text-primary">
                  <Heart className="w-4 h-4" />
                </span>
                Contact Information
              </h4>

              <div className="space-y-2">
                {/* Location */}
                {(hasValue(user?.city) || hasValue(user?.state)) && (
                  <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-muted/40 p-3 text-muted-foreground backdrop-blur-md transition-colors hover:bg-muted/60 hover:text-foreground">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">
                      {[user.city, user.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}

                {/* Phone */}
                {hasValue(user?.phonenumber) && (
                  <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-muted/40 p-3 text-muted-foreground backdrop-blur-md transition-colors hover:bg-muted/60 hover:text-foreground">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{user.phonenumber}</span>
                  </div>
                )}

                {/* Email */}
                {hasValue(user?.email) && (
                  <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-muted/40 p-3 text-muted-foreground backdrop-blur-md transition-colors hover:bg-muted/60 hover:text-foreground">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium break-all">{user.email}</span>
                  </div>
                )}

                {/* Social Media */}
                {hasValue(user?.facebook) && (
                  <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-muted/40 p-3 text-muted-foreground backdrop-blur-md transition-colors hover:bg-muted/60 hover:text-foreground">
                    <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                      <FaFacebook className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="text-sm font-medium">{user.facebook}</span>
                  </div>
                )}

                {hasValue(user?.instagram) && (
                  <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-muted/40 p-3 text-muted-foreground backdrop-blur-md transition-colors hover:bg-muted/60 hover:text-foreground">
                    <div className="p-2 bg-pink-500/10 rounded-lg group-hover:bg-pink-500/20 transition-colors">
                      <FaInstagram className="w-5 h-5 text-pink-500" />
                    </div>
                    <span className="text-sm font-medium">{user.instagram}</span>
                  </div>
                )}

                {hasValue(user?.linkedin) && (
                  <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-muted/40 p-3 text-muted-foreground backdrop-blur-md transition-colors hover:bg-muted/60 hover:text-foreground">
                    <div className="p-2 bg-blue-600/10 rounded-lg group-hover:bg-blue-600/20 transition-colors">
                      <FaLinkedin className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium">{user.linkedin}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {hasValue(user?.bio) && (
              <div className="border-t border-white/10 pt-4">
                <h4 className="mb-3 flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 text-sky-500">
                    <User className="w-4 h-4" />
                  </span>
                  About
                </h4>
                <p className="rounded-2xl border border-white/10 bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground backdrop-blur-md">
                  {user.bio}
                </p>
              </div>
            )}

            {/* No data message */}
            {!hasValue(user?.city) && !hasValue(user?.state) && !hasValue(user?.phonenumber) &&
              !hasValue(user?.email) && !hasValue(user?.facebook) && !hasValue(user?.instagram) &&
              !hasValue(user?.linkedin) && !hasValue(user?.bio) && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No additional information available</p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
