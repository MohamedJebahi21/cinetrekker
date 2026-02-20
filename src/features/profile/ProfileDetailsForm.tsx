import { CalendarDays, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ProfileDetailsFormProps {
  title: string;
  displayNameLabel: string;
  displayNamePlaceholder: string;
  dateOfBirthLabel: string;
  bioLabel: string;
  bioPlaceholder: string;
  charactersLabel: string;
  currentAgeLabel: string;
  displayName: string;
  dateOfBirth: string;
  bio: string;
  dobError: string;
  userAge: number | null;
  maxDate: string;
  onDisplayNameChange: (value: string) => void;
  onDateOfBirthChange: (value: string) => void;
  onBioChange: (value: string) => void;
}

export function ProfileDetailsForm({
  title,
  displayNameLabel,
  displayNamePlaceholder,
  dateOfBirthLabel,
  bioLabel,
  bioPlaceholder,
  charactersLabel,
  currentAgeLabel,
  displayName,
  dateOfBirth,
  bio,
  dobError,
  userAge,
  maxDate,
  onDisplayNameChange,
  onDateOfBirthChange,
  onBioChange,
}: ProfileDetailsFormProps) {
  return (
    <section className="mb-8" aria-label={title}>
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm">
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center gap-2 text-neutral-300">
                <User className="h-4 w-4" aria-hidden="true" />
                {displayNameLabel}
              </Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(event) => onDisplayNameChange(event.target.value)}
                placeholder={displayNamePlaceholder}
                maxLength={50}
                className="bg-black/40 border-neutral-700 focus:border-red-500 focus:ring-red-500/20"
                aria-label={displayNameLabel}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob" className="flex items-center gap-2 text-neutral-300">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {dateOfBirthLabel}
              </Label>
              <Input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={(event) => onDateOfBirthChange(event.target.value)}
                max={maxDate}
                className={cn(
                  'bg-black/40 border-neutral-700 focus:border-red-500 focus:ring-red-500/20',
                  dobError && 'border-destructive focus:border-destructive',
                )}
                aria-invalid={Boolean(dobError)}
                aria-describedby={dobError ? 'profile-dob-error' : undefined}
                aria-label={dateOfBirthLabel}
              />
              {dobError && (
                <p id="profile-dob-error" className="text-xs text-destructive" role="alert">
                  {dobError}
                </p>
              )}
              {userAge !== null && !dobError && <p className="text-xs text-neutral-500">{currentAgeLabel}: {userAge}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-neutral-300">{bioLabel}</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(event) => onBioChange(event.target.value)}
              placeholder={bioPlaceholder}
              className="min-h-[100px] w-full resize-y rounded-md border border-neutral-700 bg-black/40 p-3 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              maxLength={500}
              aria-label={bioLabel}
            />
            <p className="text-xs text-neutral-500">{bio.length}/500 {charactersLabel}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
