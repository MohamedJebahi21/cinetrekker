import { Heart, HeartOff, Loader2, Bell, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildFollowedTitleState,
  useTitleFollows,
} from "@/hooks/useTitleFollows";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import type { MediaDetails } from "@/types/media";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface FollowUpdatesButtonProps {
  mediaId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  details?: Pick<
    MediaDetails,
    "release_date" | "status" | "number_of_seasons" | "last_episode_to_air"
  >;
}

interface FollowPreferences {
  newEpisodes: boolean;
  newSeasons: boolean;
  streamingAvailability: boolean;
}

const PREFERENCES_KEY = "cinetrekker_follow_preferences";

export function FollowUpdatesButton({
  mediaId,
  mediaType,
  title,
  posterPath,
  details,
}: FollowUpdatesButtonProps) {
  const { isFollowing, followTitle, unfollowTitle, isPending } =
    useTitleFollows();
  const followed = isFollowing(mediaId, mediaType);
  
  const [preferences, setPreferences] = useState<FollowPreferences>(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        const allPrefs = JSON.parse(stored);
        return allPrefs[`${mediaType}-${mediaId}`] || {
          newEpisodes: true,
          newSeasons: true,
          streamingAvailability: false,
        };
      }
    } catch {
      // Ignore parse errors
    }
    return {
      newEpisodes: true,
      newSeasons: true,
      streamingAvailability: false,
    };
  });
  
  const [showPreferences, setShowPreferences] = useState(false);

  const savePreferences = (newPrefs: FollowPreferences) => {
    setPreferences(newPrefs);
    try {
      const allPrefs = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}");
      allPrefs[`${mediaType}-${mediaId}`] = newPrefs;
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(allPrefs));
    } catch {
      // Ignore storage errors
    }
  };

  const handleClick = async () => {
    if (followed) {
      await unfollowTitle({ mediaId, mediaType });
      return;
    }

    // If showing preferences and not following, follow with preferences
    if (showPreferences) {
      await followTitle({
        mediaId,
        mediaType,
        title,
        posterPath,
        initialState: details
          ? buildFollowedTitleState(mediaType, mediaId, details)
          : undefined,
      });
      savePreferences(preferences);
      setShowPreferences(false);
      return;
    }

    // Otherwise just follow with default preferences
    await followTitle({
      mediaId,
      mediaType,
      title,
      posterPath,
      initialState: details
        ? buildFollowedTitleState(mediaType, mediaId, details)
        : undefined,
    });
    savePreferences(preferences);
  };

  const handleTogglePreference = (key: keyof FollowPreferences) => {
    setPreferences(prev => {
      const newPrefs = {
        ...prev,
        [key]: !prev[key]
      };
      return newPrefs;
    });
  };

  const handleFollowWithPreferences = async () => {
    await followTitle({
      mediaId,
      mediaType,
      title,
      posterPath,
      initialState: details
        ? buildFollowedTitleState(mediaType, mediaId, details)
        : undefined,
    });
    savePreferences(preferences);
    setShowPreferences(false);
    toast({
      title: "Following with preferences",
      description: "You will receive notifications based on your selected preferences.",
    });
  };

  return (
    <DropdownMenu open={showPreferences} onOpenChange={setShowPreferences}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={followed ? "secondary" : "outline"}
          className="gap-2"
          disabled={isPending}
          aria-label={followed ? "Following updates" : "Follow Updates"}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Updating...
            </>
          ) : followed ? (
            <>
              <HeartOff className="w-4 h-4" />
              Following
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              Follow Updates
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      {!followed && (
        <DropdownMenuContent align="end" className="w-56">
          <div className="p-4 space-y-3">
            <p className="text-sm font-medium">Follow preferences:</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={preferences.newEpisodes}
                  onCheckedChange={() => handleTogglePreference("newEpisodes")}
                />
                <span className="text-sm">New episodes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={preferences.newSeasons}
                  onCheckedChange={() => handleTogglePreference("newSeasons")}
                />
                <span className="text-sm">New seasons</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={preferences.streamingAvailability}
                  onCheckedChange={() => handleTogglePreference("streamingAvailability")}
                />
                <span className="text-sm">Streaming availability</span>
              </label>
            </div>
            <Button
              onClick={handleFollowWithPreferences}
              className="w-full"
              size="sm"
            >
              <Check className="w-4 h-4 mr-1" />
              Start Following
            </Button>
          </div>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}