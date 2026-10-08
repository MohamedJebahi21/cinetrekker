import type { ChangeEvent, DragEvent, RefObject } from "react";
import { Award, Camera, Clock, Film, Star, Trophy, User, X } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/Image";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ProfileText = (key: string, fallback: string) => string;

type Milestone = {
  target: number;
  label: string;
};

type NextLevelRequirement = {
  count: number;
  name: string;
} | null;

export type ProfileIdentityHeroProps = {
  profilePhoto: string | null;
  isAvatarDragActive: boolean;
  onAvatarDragActiveChange: (isActive: boolean) => void;
  profilePhotoInputRef: RefObject<HTMLInputElement | null>;
  onPhotoFile: (file: File) => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPhotoRemove: () => void;
  text: ProfileText;
  userName: string;
  bio: string;
  cinephileLevel: string;
  nextLevelRequirement: NextLevelRequirement;
  moviesWatched: number;
  levelProgress: number;
  countMoviesWatched: number;
  countRatings: number;
  totalWatchDaysHoursMinutes: string;
  achievementMilestones: Milestone[];
  userId?: string;
  isEditMode?: boolean;
  isInactive?: boolean;
};

export function ProfileIdentityHero({
  profilePhoto,
  isAvatarDragActive,
  onAvatarDragActiveChange,
  profilePhotoInputRef,
  onPhotoFile,
  onPhotoChange,
  onPhotoRemove,
  text,
  userName,
  bio,
  cinephileLevel,
  nextLevelRequirement,
  moviesWatched,
  levelProgress,
  countMoviesWatched,
  countRatings,
  totalWatchDaysHoursMinutes,
  achievementMilestones,
  userId,
  isEditMode = false,
  isInactive = false,
}: ProfileIdentityHeroProps) {
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    onAvatarDragActiveChange(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onAvatarDragActiveChange(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onPhotoFile(file);
  };

  return (
    <Card className="profile-identity-card profile-premium-hero relative overflow-hidden border border-border/80 bg-gradient-to-br from-card/95 via-card/90 to-background/95 backdrop-blur-xl shadow-2xl ring-1 ring-white/10">
      {/* Cinematic ambient background glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-1/2 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <CardContent className="relative z-10 p-5 sm:p-7 lg:p-8">
        <div className="profile-identity-layout flex items-start gap-4 sm:gap-7 lg:gap-8">
          <div className="flex w-20 shrink-0 flex-col items-center sm:w-[9.5rem] sm:min-w-[9.5rem]">
            <div
              className="relative group"
              onDragOver={(event) => {
                event.preventDefault();
                onAvatarDragActiveChange(true);
              }}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div
                className={cn(
                  "profile-avatar-frame relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-primary/40 bg-muted/80 shadow-[0_12px_40px_rgba(0,0,0,0.4)] ring-4 ring-primary/20 sm:h-32 sm:w-32 transition-all duration-300 group-hover:scale-[1.03] group-hover:ring-primary/40",
                  isAvatarDragActive && "border-primary ring-primary/60 scale-[1.03]",
                )}
              >
                {profilePhoto ? (
                  <Image
                    src={profilePhoto}
                    alt={text("profile.title", "Profile")}
                    width={160}
                    height={160}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-16 w-16 text-neutral-600" />
                  </div>
                )}
                <div
                  className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/65 px-4 text-center text-white transition-opacity",
                    isAvatarDragActive
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100",
                  )}
                >
                  <Camera className="h-6 w-6" />
                  <p className="text-xs font-semibold">
                    {text("profile.dropPhotoToUpload", "Drop a photo to upload")}
                  </p>
                  <p className="text-[11px] text-white/70">
                    {text("profile.photoFormats", "JPG, PNG, or WebP up to 2MB")}
                  </p>
                </div>
              </div>
            </div>

            <Input
              type="file"
              accept="image/*"
              className="hidden"
              id="profile-photo-input"
              ref={profilePhotoInputRef}
              onChange={onPhotoChange}
            />
            {isEditMode ? <>
              <div className="mt-4 flex w-full max-w-[11rem] flex-col gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9 w-full justify-center text-xs"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    type="button"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {profilePhoto
                      ? text("profile.changePhoto", "Change photo")
                      : text("profile.uploadPhoto", "Upload photo")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {text("profile.avatarUploadHint", "Click or drop an image to update your avatar")}
                </TooltipContent>
              </Tooltip>
              {profilePhoto ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-full justify-center text-xs"
                  onClick={onPhotoRemove}
                >
                  <X className="mr-2 h-4 w-4" />
                  {text("common.delete", "Remove")}
                </Button>
              ) : null}
            </div>
            <p className="mt-2 max-w-[11rem] text-center text-[11px] leading-4 text-muted-foreground">
              {text("profile.photoUploadHint", "Drag and drop a profile picture or choose a file.")}
            </p>
            </> : null}
          </div>

          <div className="min-w-0 flex-1">
            <p className="profile-hero-eyebrow text-[10px] font-semibold uppercase text-primary">
              {text("profile.profileEyebrow", "CineTrekker profile")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <h1 className="text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl">
                {userName}
              </h1>
              <Badge variant="secondary" className="rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-primary">
                <Trophy className="mr-1.5 h-3.5 w-3.5" />
                {cinephileLevel}
              </Badge>
            </div>
            <p className="profile-hero-bio mt-2 text-sm leading-relaxed text-muted-foreground">
              {bio || text("profile.identityFallback", "Building a personal record of every great watch.")}
            </p>

            <div className="mt-3 max-w-xl">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{cinephileLevel}</span>
                {nextLevelRequirement ? (
                  <span>
                    {moviesWatched} / {nextLevelRequirement.count} {text("profile.toNextLevel", "to")} {nextLevelRequirement.name}
                  </span>
                ) : (
                  <span className="font-bold text-primary">{text("profile.maxLevel", "Max Rank")}</span>
                )}
              </div>
              <Progress value={levelProgress} className="h-1.5" />
            </div>

            {isInactive ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Film className="h-4 w-4 text-primary" />
                  {text("profile.recentRecapEmpty", "Log a title to begin building your personal viewing story.")}
                </p>
                {userId ? (
                  <Link
                    to={`/user/${userId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 transition-colors hover:underline"
                  >
                    <User className="h-3.5 w-3.5" />
                    {text("profile.viewPublicProfile", "View public profile")}
                  </Link>
                ) : null}
              </div>
            ) : (
              <>
                <div className="profile-stat-grid mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="profile-stat rounded-xl border border-primary/20 bg-background/70 px-4 py-3.5 backdrop-blur-md shadow-sm transition-all duration-200 hover:border-primary/50 hover:bg-background/90 hover:shadow-md">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Film className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {text("profile.moviesWatched", "Movies Watched")}
                      </p>
                    </div>
                    <p className="tabular-nums text-2xl font-extrabold tracking-tight text-foreground">{countMoviesWatched}</p>
                  </div>
                  <div className="profile-stat rounded-xl border border-amber-500/20 bg-background/70 px-4 py-3.5 backdrop-blur-md shadow-sm transition-all duration-200 hover:border-amber-500/50 hover:bg-background/90 hover:shadow-md">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                        <Star className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {text("profile.ratings", "Ratings")}
                      </p>
                    </div>
                    <p className="tabular-nums text-2xl font-extrabold tracking-tight text-foreground">{countRatings}</p>
                  </div>
                  <div className="profile-stat rounded-xl border border-blue-500/20 bg-background/70 px-4 py-3.5 backdrop-blur-md shadow-sm transition-all duration-200 hover:border-blue-500/50 hover:bg-background/90 hover:shadow-md">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/15 text-blue-500">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {text("profile.watchTime", "Watch Time")}
                      </p>
                    </div>
                    <p className="tabular-nums text-2xl font-extrabold tracking-tight text-foreground">{totalWatchDaysHoursMinutes}</p>
                  </div>
                </div>

                <div className="profile-milestone-row mt-5 flex flex-wrap items-center gap-2.5 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    {text("profile.milestones", "Milestones")}
                  </span>
                  {achievementMilestones.map((milestone) => {
                    const unlocked = moviesWatched >= milestone.target;
                    return (
                      <span
                        key={milestone.target}
                        className={cn(
                          "rounded-full border px-2 py-1 text-[10px] font-semibold",
                          unlocked
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border bg-muted/35 text-muted-foreground",
                        )}
                      >
                        {unlocked ? "✓ " : ""}{milestone.label}
                      </span>
                    );
                  })}
                  {userId ? (
                    <Link
                      to={`/user/${userId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 transition-colors hover:underline"
                    >
                      <User className="h-3.5 w-3.5" />
                      {text("profile.viewPublicProfile", "View public profile")}
                    </Link>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
