import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Calendar, Eye, Users, MapPin, Flag, ChevronLeft, ChevronRight, ShieldAlert, Settings, Sparkles, Check, ArrowLeft } from "lucide-react";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { useUserProfileQuery } from "@/hooks/useProfileQueries";
import { RelationshipActions } from "@/components/RelationshipActions";
import { isObjEmpty } from "@/utils/util";
import { resolveUserImage } from "@/lib/userImage";
import { formatMemberName } from "@/lib/displayName";
import { useAuth } from "@/context/AuthContext";
import { useAuthStore } from "@/stores/authStore";
import { useIsUserOnline } from "@/stores/presenceStore";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { UserProfileSkeleton } from "@/components/UserProfileSkeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

dayjs.extend(relativeTime);

function formatActiveStatus(timestamp) {
    if (!timestamp) return "Active recently";

    const lastSeen = dayjs(timestamp);
    if (!lastSeen.isValid()) return "Active recently";

    const now = dayjs();
    const minutes = now.diff(lastSeen, "minute");

    if (minutes < 1) return "Active just now";
    if (minutes < 60) return `Active ${minutes}m ago`;

    const hours = now.diff(lastSeen, "hour");
    if (hours < 24) return `Active ${hours}h ago`;

    const days = now.diff(lastSeen, "day");
    if (days === 1) return "Active yesterday";
    if (days < 7) return `Active ${days}d ago`;

    return `Active ${lastSeen.format("MMM D, YYYY")}`;
}

// Configured Questionnaire Data Matrix maps for iterative rendering
const MALE_QUESTIONS = [
    { key: "q1", left: "Android", right: "iPhone" },
    { key: "q2", left: "Capitalism", right: "Equal Opportunities" },
    { key: "q3", left: "Truck", right: "BMW" },
    { key: "q4", left: "Socialism", right: "Pyramid Scheme" },
    { key: "q5", left: "Modern Family", right: "Traditional Family" },
    { key: "q6", left: "Suit/Formal dress", right: "Jeans and T-shirt" },
    { key: "q7", left: "Partner", right: "Title Wife" },
    { key: "q8", left: "Concerts/Clubs", right: "Movie at home" },
    { key: "q9", left: "End goal Happiness", right: "End goal Family/kids" },
    { key: "q10", left: "Credit card", right: "Cash/Debit card" },
];

const FEMALE_QUESTIONS = [
    { key: "q1", left: "Android", right: "iPhone" },
    { key: "q2", left: "Trader Joe's", right: "ALDI/WINCO" },
    { key: "q3", left: "Tesla", right: "Toyota" },
    { key: "q4", left: "Costco", right: "Whole Foods" },
    { key: "q5", left: "Woman Rights", right: "Transwoman is woman" },
    { key: "q6", left: "Pro-Choice", right: "Pro-Life" },
    { key: "q7", left: "KOHL'S", right: "NORDSTROM" },
    { key: "q8", left: "Enchanted (film)", right: "Barbie (film)" },
    { key: "q9", left: "Power Couple", right: "Traditional Relationship" },
    { key: "q10", left: "Concerts/Clubs", right: "Movie at home" },
    { key: "q11", left: "Title Husband", right: "Partner" },
    { key: "q12", left: "End goal Happiness", right: "End goal Family/kids" },
    { key: "q13", left: "Credit card", right: "Cash/Debit card" },
    { key: "q14", left: "Dog Mom/Cat Mom", right: "Pet Owner" },
];

function readQuestionValue(profile, key) {
    const raw = profile?.questionairevalues?.[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const numeric = Number(value);
    return Number.isFinite(numeric)
        ? Math.min(100, Math.max(0, numeric))
        : null;
}

function ProfileSocialCard({
    icon,
    label,
    value,
    brandClassName,
    iconClassName,
}) {
    const Icon = icon;
    const linked = Boolean(String(value || "").trim());

    return (
        <div
            className={`rounded-2xl border p-3.5 backdrop-blur-md transition-colors ${
                linked
                    ? brandClassName
                    : "border-dashed border-border/70 bg-muted/20 text-muted-foreground"
            }`}
        >
            <div className="flex items-center gap-2">
                <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        linked ? "bg-white/40 dark:bg-white/10" : "bg-muted"
                    }`}
                >
                    <Icon className={`h-3.5 w-3.5 ${iconClassName}`} />
                </div>
                <span
                    className={`text-xs font-bold uppercase tracking-[0.16em] ${
                        linked ? "text-foreground" : "text-muted-foreground"
                    }`}
                >
                    {label}
                </span>
                {linked && (
                    <Check className="ml-auto h-3.5 w-3.5 text-emerald-500" />
                )}
            </div>
            <p
                className={`mt-2 truncate text-xs font-medium ${
                    linked ? "text-foreground/80" : "text-muted-foreground/70"
                }`}
            >
                {linked ? value : "Not connected"}
            </p>
        </div>
    );
}


export function UserProfile() {
    const { userid } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { profiledata } = useAuth();
    const token = useAuthStore((state) => state.token);
    const profileQuery = useUserProfileQuery(userid);

    const fromShortlist = location.state?.from === "shortlist";
    const fromDialog = location.state?.from === "dialog";
    const shortlistTab =
        location.state?.shortlistTab === "liked-you" ? "liked-you" : "shortlist";

    const handleBackToShortlist = () => {
        navigate(
            shortlistTab === "liked-you"
                ? "/dashboard/shortlist?tab=liked-you"
                : "/dashboard/shortlist",
        );
    };

    const handleBackToDiscovery = () => {
        // Return to the discovery search page while preserving its route state
        // and TanStack Query cache (which keeps the active list arrays).
        navigate(-1);
    };

    const userData = profileQuery.data ?? null;
    const loading = profileQuery.isLoading;
    const error = profileQuery.error?.message ?? null;
    const isOnline = useIsUserOnline(userData?.userid || userData?.id);
    const displayName = formatMemberName(userData, { viewer: profiledata });
    const displayNameWithAge = [displayName, userData?.age]
        .filter((value) => value != null && value !== "")
        .join(", ");
    const activeStatus = formatActiveStatus(
        userData?.timeoflogin ||
            userData?.last_seen_at ||
            userData?.last_active_at ||
            userData?.last_login_at,
    );
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [imageUseCover, setImageUseCover] = useState({});
    const [avatarFailed, setAvatarFailed] = useState(false);
    const carouselRef = useRef(null);

    // The ProtectedRoute wrapper handles the normal case; this fallback keeps
    // the page safe if it is ever rendered outside that wrapper.
    useEffect(() => {
        if (!token) {
            navigate('/login', { replace: true });
        }
    }, [token, navigate]);

    // Clean parsed image array blocks
    const validImages = useMemo(() => {
        const urls = (userData?.image_urls ?? []).filter(
            (img) => img && typeof img === 'string' && img.trim() !== ''
        );

        if (urls.length > 0) return urls;

        return (userData?.images ?? []).filter(
            (img) => typeof img === 'string' && img.startsWith('http')
        );
    }, [userData]);

    const hasImages = validImages.length > 0;

    // Resolve the summary avatar through the same R2/S3 pipeline as the cards.
    const resolvedAvatar = useMemo(
        () => resolveUserImage(userData),
        [userData]
    );

    useEffect(() => {
        setAvatarFailed(false);
    }, [resolvedAvatar]);

    const showResolvedAvatar = Boolean(resolvedAvatar) && !avatarFailed;

    // Safe background gradient generator
    const dummyAvatarStyles = useMemo(() => {
        if (!userData) return "";
        const colors = [
            'from-blue-400 to-blue-600', 'from-purple-400 to-purple-600',
            'from-green-400 to-green-600', 'from-pink-400 to-pink-600',
            'from-orange-400 to-orange-600', 'from-teal-400 to-teal-600',
            'from-indigo-400 to-indigo-600', 'from-red-400 to-red-600'
        ];
        const patterns = ['bg-gradient-to-br', 'bg-gradient-to-tr', 'bg-gradient-to-bl', 'bg-gradient-to-tl'];

        const colorIndex = (userData.firstname?.charCodeAt(0) || 0) % colors.length;
        const patternIndex = (userData.age || 0) % patterns.length;
        return `${patterns[patternIndex]} ${colors[colorIndex]}`;
    }, [userData]);

    const nextImage = () => {
        if (!validImages.length) return;
        setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
    };

    const prevImage = () => {
        if (!validImages.length) return;
        setCurrentImageIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
    };

    const onImageLoad = (index, e) => {
        try {
            const nw = e.target.naturalWidth || 0;
            const nh = e.target.naturalHeight || 0;
            const rect = carouselRef.current?.getBoundingClientRect();
            const cw = rect?.width || 720;
            const ch = rect?.height || 420;
            const useCover = nw < cw * window.devicePixelRatio || nh < ch * window.devicePixelRatio;
            setImageUseCover((prev) => ({ ...prev, [index]: useCover }));
        } catch {
            // safe fallback pass
        }
    };

    const reportUser = () => {
        // 1. Point explicitly to userData (the person being viewed)
        const targetUserId = userData?.userid || "Unknown ID";
        const targetUserName = `${userData?.firstname || ''} ${userData?.lastname || ''}`.trim();

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


    if (loading) return <UserProfileSkeleton />;

    if (error || !userData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
                <Card className="max-w-md w-full shadow-lg border border-border">
                    <CardContent className="pt-8 pb-8 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Profile Not Found</h2>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            {error || 'The user profile you are looking for does not exist or is not accessible.'}
                        </p>
                        {fromDialog ? (
                            <Button
                                onClick={handleBackToDiscovery}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Discovery
                            </Button>
                        ) : fromShortlist ? (
                            <Button
                                onClick={handleBackToShortlist}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Shortlist
                            </Button>
                        ) : (
                            <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
                                Back to Dashboard
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    const activeQuestionSet = userData.gender === 'Male' ? MALE_QUESTIONS : FEMALE_QUESTIONS;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12 space-y-8">

                {fromDialog && (
                    <div className="flex justify-start">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleBackToDiscovery}
                            className="gap-2 border-primary/30 bg-primary/5 font-semibold text-primary shadow-sm hover:bg-primary/10"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Discovery
                        </Button>
                    </div>
                )}

                {fromShortlist && (
                    <div className="flex justify-start">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleBackToShortlist}
                            className="gap-2 border-primary/30 bg-primary/5 font-semibold text-primary shadow-sm hover:bg-primary/10"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Shortlist
                        </Button>
                    </div>
                )}

                {/* Flag Action Button Link */}
                <button
                    title="Flag user node context"
                    onClick={reportUser}
                    className="absolute right-4 top-4 p-2 rounded-xl bg-card hover:bg-muted/50 border border-border shadow-xs transition-colors cursor-pointer"
                >
                    <Flag className="w-4 h-4 text-destructive" />
                </button>

                {/* Global Intro Header Title Block */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                        <Eye className="w-3.5 h-3.5" /> User Profile
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground mb-2">
                        {displayNameWithAge}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground max-w-sm mx-auto">
                        Explore mutual interests, personality benchmarks, and profile details.
                    </p>
                    <div className="mt-4 flex justify-center">
                        <RelationshipActions
                            targetId={userData.userid || userData.id}
                            targetName={displayName}
                        />
                    </div>
                </div>

                {/* Large Media Gallery Carousel Block Container */}
                {hasImages && (
                    <div className="w-full rounded-3xl border border-white/10 bg-card/40 p-2 shadow-xl backdrop-blur-lg">
                        <div ref={carouselRef} className="w-full max-w-[720px] h-[360px] sm:h-[440px] md:h-[500px] mx-auto relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900/20 via-muted/30 to-primary/10 flex items-center justify-center ring-1 ring-white/10">

                            <div className="relative w-full h-full flex items-center justify-center">
                                {validImages.map((image, index) => (
                                    <div
                                        key={index}
                                        className={`absolute inset-0 transition-opacity duration-500 flex items-center justify-center ${index === currentImageIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                                            }`}
                                    >
                                        <img
                                            src={image}
                                            alt={`${userData.firstname} - Visual File node attachment index ${index + 1}`}
                                            className={`max-w-full max-h-full ${imageUseCover[index] ? 'object-cover w-full h-full' : 'object-contain'}`}
                                            onLoad={(e) => onImageLoad(index, e)}
                                            onError={(e) => { e.target.src = "/artistic-profile-teal-red-lighting.jpg"; }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Navigation Controls */}
                            {validImages.length > 1 && (
                                <>
                                    <button
                                        onClick={prevImage}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 rounded-full border border-white/20 bg-black/35 p-2 text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/55 active:scale-95"
                                        aria-label="Previous image block element"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={nextImage}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 rounded-full border border-white/20 bg-black/35 p-2 text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/55 active:scale-95"
                                        aria-label="Next image block element"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>

                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 rounded-full border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-md">
                                        {validImages.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentImageIndex(index)}
                                                className={`h-1.5 rounded-full transition-all ${index === currentImageIndex ? "bg-white w-3" : "bg-white/40 hover:bg-white/70"
                                                    }`}
                                                aria-label={`Navigate indicator slot ${index + 1}`}
                                            />
                                        ))}
                                    </div>

                                    <div className="absolute top-3 right-3 z-20 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-white shadow-lg backdrop-blur-md">
                                        {currentImageIndex + 1} / {validImages.length}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Informational Presentation Layout Split grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 md:gap-8 items-start">

                    {/* AVATAR SUMMARY COLUMN */}
                    <Card className="border border-border/80 bg-card/40 shadow-xl backdrop-blur-lg">
                        <CardContent className="p-6 text-center space-y-4">

                            <div className="relative mx-auto w-24 h-24">
                                <div className="absolute inset-0 scale-105 rounded-full bg-gradient-to-br from-primary via-fuchsia-500 to-sky-400 opacity-60 blur-md" />
                                <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted ring-4 ring-background/10 dark:ring-primary/10 shadow-md">
                                    {showResolvedAvatar ? (
                                        <img
                                            src={resolvedAvatar}
                                            alt={`${userData.firstname} avatar frame node asset`}
                                            loading="eager"
                                            decoding="async"
                                            onError={() => setAvatarFailed(true)}
                                            className="w-full h-full object-cover rounded-full"
                                        />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center relative font-bold text-white text-2xl ${dummyAvatarStyles}`}>
                                            {userData.firstname?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h2 className="text-lg font-bold tracking-tight text-foreground">{displayNameWithAge}</h2>
                                <div className="flex items-center justify-center gap-1 text-xs font-semibold text-muted-foreground">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>{userData.city || "NA"}, {userData.state || "NA"}</span>
                                </div>
                                {!isObjEmpty(userData.userhandle) && (
                                    <Badge variant="secondary" className="mt-1 border-primary/20 bg-primary/10 font-mono text-xs text-primary">
                                        @{userData.userhandle}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex justify-center">
                                <div className="inline-flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                                    {isOnline ? (
                                        <>
                                            <span className="relative flex h-2 w-2">
                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e]" />
                                            </span>
                                            <span className="whitespace-nowrap">Online Now</span>
                                        </>
                                    ) : (
                                        <span className="whitespace-nowrap">{activeStatus}</span>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-muted/30 px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-md">
                                {userData.visibilityPreference === 'events-only' ? (
                                    <span className="inline-flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-amber-500" /> <span>Events only</span></span>
                                ) : userData.visibilityPreference === 'online-only' ? (
                                    <span className="inline-flex items-center gap-2"><Users className="w-3.5 h-3.5 text-sky-500" /> <span>Online only</span></span>
                                ) : (
                                    <span className="inline-flex items-center gap-2"><Eye className="w-3.5 h-3.5 text-fuchsia-500" /> <span>Visible everywhere</span></span>
                                )}
                            </div>

                        </CardContent>
                    </Card>

                    {/* ATTRIBUTES INFO DETAILS COLUMN */}
                    <div className="space-y-6">

                        {/* Contact Parameters block card */}
                        <Card className="border border-border/80 bg-card/40 shadow-xl backdrop-blur-lg">
                            <CardContent className="space-y-4 p-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 text-sky-500 shadow-sm">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold tracking-tight text-foreground">Contact details</h3>
                                        <p className="text-xs text-muted-foreground">Ways to reach out and connect</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-white/10 bg-muted/40 p-3.5 backdrop-blur-md">
                                        <Label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                            <Mail className="w-3.5 h-3.5 text-sky-500" /> Email address
                                        </Label>
                                        <p className="mt-1 truncate text-sm font-semibold text-foreground/90 select-all">
                                            {userData.email || "No contact email exposed"}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-white/10 bg-muted/40 p-3.5 backdrop-blur-md">
                                        <Label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                            <Phone className="w-3.5 h-3.5 text-emerald-500" /> Phone line
                                        </Label>
                                        <p className="mt-1 truncate text-sm font-semibold text-foreground/90 select-all">
                                            {userData.phonenumber || 'Not provided'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Social handles matrix grid card */}
                        <Card className="border border-border/80 bg-card/40 shadow-xl backdrop-blur-lg">
                            <CardContent className="space-y-4 p-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-pink-500/10 text-fuchsia-500 shadow-sm">
                                        <Users className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold tracking-tight text-foreground">Social channels</h3>
                                        <p className="text-xs text-muted-foreground">Their presence across the community</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <ProfileSocialCard
                                        icon={FaFacebook}
                                        label="Facebook"
                                        value={userData.facebook}
                                        brandClassName="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5"
                                        iconClassName="text-blue-500"
                                    />
                                    <ProfileSocialCard
                                        icon={FaInstagram}
                                        label="Instagram"
                                        value={userData.instagram}
                                        brandClassName="border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-orange-500/5"
                                        iconClassName="text-pink-500"
                                    />
                                    <ProfileSocialCard
                                        icon={FaLinkedin}
                                        label="LinkedIn"
                                        value={userData.linkedin}
                                        brandClassName="border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-blue-600/5"
                                        iconClassName="text-sky-600"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* User Bio Card */}
                        {!isObjEmpty(userData.bio) && (
                            <Card className="border border-border/80 bg-card/40 shadow-xl backdrop-blur-lg">
                                <CardContent className="space-y-4 p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-500 shadow-sm">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold tracking-tight text-foreground">About {userData.firstname}</h3>
                                            <p className="text-xs text-muted-foreground">In their own words</p>
                                        </div>
                                    </div>
                                    <p className="rounded-2xl border border-white/10 bg-muted/30 p-4 text-sm leading-relaxed text-foreground/90 whitespace-pre-line backdrop-blur-md">
                                        {userData.bio}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                    </div>
                </div>

                {/* QUESTIONNAIRE ACCORDION METRIC MATRIX LAYER */}
                {userData.questionairevaluesset && userData.questionairevalues && (
                    <div className="w-full pt-2">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="questionnaire" className="overflow-hidden rounded-2xl border border-border/80 bg-card/40 shadow-xl backdrop-blur-lg">
                                <AccordionTrigger className="px-6 py-4 hover:no-underline transition-colors hover:bg-muted/10">
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 via-fuchsia-500/10 to-transparent text-primary">
                                            <Settings className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-foreground">Questionnaire Values</h3>
                                            <p className="text-xs text-muted-foreground">Compatibility positioning across shared values</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-6 pt-2">

                                    {/* Compatibility progress matrix */}
                                    <div className="grid grid-cols-1 gap-4">
                                        {activeQuestionSet.map((question) => {
                                            const value =
                                                readQuestionValue(
                                                    userData,
                                                    question.key,
                                                ) ?? 20;
                                            const ownValue =
                                                readQuestionValue(
                                                    profiledata,
                                                    question.key,
                                                );
                                            const aligned =
                                                ownValue !== null &&
                                                Math.abs(value - ownValue) <= 20;
                                            const trackClass = aligned
                                                ? "from-emerald-400 via-teal-400 to-cyan-400"
                                                : "from-primary via-fuchsia-500 to-sky-400";
                                            const pinClass = aligned
                                                ? "bg-emerald-400 shadow-emerald-400/60"
                                                : "bg-primary shadow-primary/60";

                                            return (
                                                <div
                                                    key={question.key}
                                                    className="rounded-2xl border border-white/10 bg-muted/30 p-4 backdrop-blur-md transition-colors hover:bg-muted/40"
                                                >
                                                    <div className="flex items-center justify-between gap-3 text-xs font-semibold sm:text-sm">
                                                        <span className="truncate text-foreground">
                                                            {question.left}
                                                        </span>
                                                        {aligned ? (
                                                            <Badge className="shrink-0 border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-300">
                                                                Aligned
                                                            </Badge>
                                                        ) : (
                                                            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                                                                {value}%
                                                            </span>
                                                        )}
                                                        <span className="truncate text-right text-muted-foreground">
                                                            {question.right}
                                                        </span>
                                                    </div>

                                                    <div className="relative mt-3 h-2.5 w-full rounded-full bg-muted/70">
                                                        <div
                                                            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${trackClass}`}
                                                            style={{ width: `${value}%` }}
                                                        />
                                                        {ownValue !== null && (
                                                            <div
                                                                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]"
                                                                style={{ left: `${ownValue}%` }}
                                                                title="Your position"
                                                            />
                                                        )}
                                                        <div
                                                            className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-lg ${pinClass}`}
                                                            style={{ left: `${value}%` }}
                                                        />
                                                    </div>

                                                    {aligned && (
                                                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                                                            Shared compatibility field
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                )}

            </div>
        </div>
    );
}