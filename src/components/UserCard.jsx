import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { MapPin, Heart, Coffee, Music, Camera, BookOpen, Gamepad2, Plane, Utensils, BellOff } from "lucide-react";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { isMuted, useProfileStore } from "@/stores/profileStore";
import { usePresenceStore } from "@/stores/presenceStore";
import { resolveUserImage } from "@/lib/userImage";
import { formatMemberName } from "@/lib/displayName";

dayjs.extend(relativeTime);

export function UserCard({ setSelectedUser, profile }) {
  const relationships = useProfileStore((state) => state.relationships);
  const muted = isMuted(relationships, profile?.userid || profile?.id);
  const online = usePresenceStore((state) =>
    state.onlineUserIds.includes(
      String(profile?.userid || profile?.id || ""),
    ),
  );
  const avatarUrl = resolveUserImage(profile);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  const showAvatar = Boolean(avatarUrl) && !avatarFailed;

  // Generate a more detailed dummy avatar based on user data
  const generateDummyAvatar = () => {
    const colors = [
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-green-400 to-green-600',
      'from-pink-400 to-pink-600',
      'from-orange-400 to-orange-600',
      'from-teal-400 to-teal-600',
      'from-indigo-400 to-indigo-600',
      'from-red-400 to-red-600'
    ];

    const patterns = [
      'bg-gradient-to-br',
      'bg-gradient-to-tr',
      'bg-gradient-to-bl',
      'bg-gradient-to-tl'
    ];

    // Use user data to create consistent colors
    const colorIndex = (profile?.firstname?.charCodeAt(0) || 0) % colors.length;
    const patternIndex = (profile?.age || 0) % patterns.length;

    return `${patterns[patternIndex]} ${colors[colorIndex]}`;
  };

  // Format the last login time
  const formatLastLogin = (timeoflogin) => {
    if (!timeoflogin) return 'recently';

    const loginTime = dayjs(timeoflogin);
    if (!loginTime.isValid()) return 'recently';

    const minutes = dayjs().diff(loginTime, 'minute');
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return loginTime.fromNow();
  };

  // Sample interests based on user data (in a real app, this would come from profile)
  const getSampleInterests = () => {
    const interests = [
      { icon: Coffee, label: 'Coffee' },
      { icon: Music, label: 'Music' },
      { icon: Camera, label: 'Photography' },
      { icon: BookOpen, label: 'Reading' },
      { icon: Gamepad2, label: 'Gaming' },
      { icon: Plane, label: 'Travel' },
      { icon: Utensils, label: 'Cooking' },
      { icon: Heart, label: 'Romance' }
    ];

    // Return 2-3 interests based on user data
    const seed = (profile?.firstname?.length || 0) + (profile?.age || 0);
    return interests.slice(seed % 3, (seed % 3) + 3);
  };

  const interests = getSampleInterests();
  const avatarClass = generateDummyAvatar();

  return (
    <Card
      key={profile?.id}
      onClick={() => setSelectedUser && setSelectedUser(profile)}
      className={`group relative overflow-hidden rounded-2xl border border-border/40 bg-card/60 transition-all duration-300 ease-in-out hover:bg-card hover:scale-[1.01] hover:border-primary/20 hover:shadow-sm cursor-pointer p-4 sm:p-6 ${muted ? "opacity-60 saturate-50" : ""}`}
    >
      {muted && (
        <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm backdrop-blur-md">
          <BellOff className="h-3 w-3" />
          Muted
        </div>
      )}
      <div className="p-0">
        <div className="flex gap-3 sm:gap-4 mb-3 sm:mb-4">
          {/* Profile Image */}
          <div className="relative shrink-0">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-2 ring-muted/40 shadow-xs group-hover:shadow-sm transition-shadow duration-300 ${avatarClass}`}>
              {showAvatar ? (
                <img
                  src={avatarUrl}
                  alt={profile?.firstname}
                  loading="lazy"
                  decoding="async"
                  onError={() => setAvatarFailed(true)}
                  className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center relative">
                  {/* Enhanced dummy avatar with more detail */}
                  <div className="text-white text-lg sm:text-2xl font-bold">
                    {profile?.firstname?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-white/30 rounded-full"></div>
                  </div>
                  <div className="absolute top-1 right-1 w-2 h-2 sm:w-3 sm:h-3 bg-white/40 rounded-full"></div>
                  <div className="absolute bottom-1 left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/60 rounded-full"></div>
                </div>
              )}
            </div>
            {/* Presence-backed online indicator */}
            {online && (
              <span
                data-testid="presence-online-dot"
                className="absolute right-0.5 bottom-0.5 w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse ring-2 ring-background"
              />
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1 sm:mb-2">
              <h4 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors duration-300 truncate">
                {formatMemberName(profile, { style: "initial" })}
              </h4>
              <div className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/20 dark:text-blue-300">
                {profile?.age}
              </div>
            </div>

            <div className="mb-2 sm:mb-3">
              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-950/20 dark:text-purple-300">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {profile?.city}, {profile?.state}
                </span>
              </span>
            </div>

            {/* Interests */}
            <div className="flex items-center gap-1 mb-2 sm:mb-3 flex-wrap" hidden>
              {interests.map((interest, index) => (
                <div key={index} className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-muted/50 rounded-full">
                  <interest.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">{interest.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bio/Description */}
        <div className="mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-3">
            {profile?.bio || `Hi! I'm ${profile?.firstname}, ${profile?.age} years old from ${profile?.city}. Looking to meet amazing people
             and create meaningful connections!`}
          </p>
        </div>

        {/* Footer with last login and action hint */}
        <div className="pt-3 sm:pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                online
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                  : "bg-muted/60 text-muted-foreground"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  online
                    ? "bg-green-500 shadow-[0_0_6px_#22c55e] animate-pulse"
                    : "bg-muted-foreground/30"
                }`}
              />
              <p className="whitespace-nowrap">
                {online
                  ? "Online now"
                  : `Active ${formatLastLogin(profile?.timeoflogin)}`}
              </p>
            </div>
            <div className="text-xs text-primary font-medium group-hover:underline">
              View Profile →
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
