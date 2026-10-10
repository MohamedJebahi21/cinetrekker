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
    <Card className="profile-identity-card profile-premium-hero relative overflow-hidden border border-border/70 bg-card/65 backdrop-blur-xl shadow-xl ring-1 ring-white/5">
      {/* Subtle top edge highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <CardContent className="relative z-10 p-5 sm:p-6 lg:p-7">
        <div className="profile-identity-layout flex items-start gap-4 sm:gap-7 lg:gap-8">
          <div className="flex w-20 shrink-0 flex-col items-center sm:w-28 sm:min-w-[7rem]">
            <div
              className={cn("relative group", isEditMode && "cursor-pointer")}
              tabIndex={isEditMode ? 0 : undefined}
              role={isEditMode ? "button" : undefined}
              aria-label={isEditMode ? text("profile.avatarUploadHint", "Click or drop an image to update your avatar") : undefined}
              onKeyDown={(e) => {
                if (isEditMode && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  profilePhotoInputRef.current?.click();
                }
              }}
              onClick={() => {
                if (isEditMode) {
                  profilePhotoInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                onAvatarDragActiveChange(true);
              }}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div
                className={cn(
                  "profile-avatar-frame relative h-20 w-20 overflow-hidden rounded-2xl border border-border/80 bg-muted/80 shadow-md ring-1 ring-white/10 sm:h-28 sm:w-28 transition-all duration-200",
                  isEditMode && "ring-2 ring-primary/30 group-hover:ring-primary/60 focus-visible:ring-2 focus-visible:ring-primary",
                  isAvatarDragActive && "border-primary ring-2 ring-primary scale-[1.02]",
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
                  <div className="profile-stat rounded-xl border border-border/70 bg-card/40 px-4 py-3 backdrop-blur-sm transition-colors hover:border-border hover:bg-card/60">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Film className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {text("profile.moviesWatched", "Movies Watched")}
                      </p>
                    </div>
                    <p className="tabular-nums text-2xl font-bold tracking-tight text-foreground">{countMoviesWatched}</p>
                  </div>
                  <div className="profile-stat rounded-xl border border-border/70 bg-card/40 px-4 py-3 backdrop-blur-sm transition-colors hover:border-border hover:bg-card/60">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
                        <Star className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {text("profile.ratings", "Ratings")}
                      </p>
                    </div>
                    <p className="tabular-nums text-2xl font-bold tracking-tight text-foreground">{countRatings}</p>
                  </div>
                  <div className="profile-stat rounded-xl border border-border/70 bg-card/40 px-4 py-3 backdrop-blur-sm transition-colors hover:border-border hover:bg-card/60">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {text("profile.watchTime", "Watch Time")}
                      </p>
                    </div>
                    <p className="tabular-nums text-2xl font-bold tracking-tight text-foreground">{totalWatchDaysHoursMinutes}</p>
                  </div>
                </div>

                <div className="profile-milestone-row mt-5 flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    {text("profile.milestones", "Milestones")}
                  </span>
                  {achievementMilestones.map((milestone) => {
                    const unlocked = moviesWatched >= milestone.target;
                    return (
                      <span
                        key={milestone.target}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors",
                          unlocked
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-border/60 bg-muted/20 text-muted-foreground",
                        )}
                      >
                        {unlocked ? "✓ " : ""}{milestone.label}
                      </span>
                    );
                  })}
                  {userId ? (
                    <Link
                      to={`/user/${userId}`}
                      className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground underline-offset-4 transition-colors hover:underline"
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
