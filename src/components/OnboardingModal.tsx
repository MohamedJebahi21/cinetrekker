import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export function OnboardingModal() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      const seen = localStorage.getItem("hasSeenOnboarding");
      if (!seen) setTimeout(() => setOpen(true), 1000);
    } catch (e) {
      // ignore (SSR or restricted storage)
      setTimeout(() => setOpen(true), 1000);
    }
  }, []);
  const handleClose = () => {
    setOpen(false);
    try { localStorage.setItem("hasSeenOnboarding", "1"); } catch (e) { console.warn('Failed to save onboarding state:', e); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-4 md:top-auto">
        <DialogTitle>{t('onboarding.welcome')}</DialogTitle>
        <DialogDescription>
          {t('onboarding.description')}
        </DialogDescription>
        <div className="space-y-4">
          <ul className="list-disc pl-6 text-sm text-muted-foreground">
            <li>{t('onboarding.feature1')}</li>
            <li>{t('onboarding.feature2')}</li>
            <li>{t('onboarding.feature3')}</li>
          </ul>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleClose} className="flex-1">{t('onboarding.start')}</Button>
            <Button variant="outline" onClick={handleClose} className="flex-1">{t('onboarding.skip')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
