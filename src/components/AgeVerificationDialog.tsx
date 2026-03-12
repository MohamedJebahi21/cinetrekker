import { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onSubmit: (age: number) => Promise<void> | void;
  isSaving?: boolean;
};

export function AgeVerificationDialog({ open, onSubmit, isSaving = false }: Props) {
  const { t } = useTranslation();
  const [ageInput, setAgeInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parsedAge = useMemo(() => {
    const trimmed = ageInput.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    return Number.isInteger(value) ? value : null;
  }, [ageInput]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (parsedAge === null || parsedAge < 0 || parsedAge > 120) {
      setError(t("contentPolicy.ageError", "Enter a valid age between 0 and 120."));
      return;
    }

    setError(null);
    await onSubmit(parsedAge);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        // Keep the modal open until age is submitted successfully.
      }}
    >
      <DialogContent className="max-w-md" aria-describedby="age-verification-description">
        <DialogHeader>
          <DialogTitle>{t("contentPolicy.ageTitle", "Age Verification")}</DialogTitle>
          <DialogDescription id="age-verification-description">
            {t(
              "contentPolicy.ageDescription",
              "Enter your age to configure maturity filtering. Your exact age is not stored; only the selected safety level is saved.",
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="age-input" className="text-sm font-medium">
              {t("contentPolicy.ageLabel", "Your age")}
            </label>
            <Input
              id="age-input"
              type="number"
              min={0}
              max={120}
              step={1}
              inputMode="numeric"
              value={ageInput}
              onChange={(event) => setAgeInput(event.target.value)}
              placeholder={t("contentPolicy.agePlaceholder", "Enter age")}
              autoFocus
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving
              ? t("contentPolicy.saving", "Saving...")
              : t("contentPolicy.confirmAge", "Confirm Age")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
