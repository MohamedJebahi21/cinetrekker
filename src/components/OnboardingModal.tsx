import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("onboarding_complete")) {
      setTimeout(() => setOpen(true), 1000);
    }
  }, []);
  const handleClose = () => {
    setOpen(false);
    localStorage.setItem("onboarding_complete", "1");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>Welcome to CineTrekker!</DialogTitle>
        <div className="space-y-4">
          <p>Track your movies and TV shows, get recommendations, and more.</p>
          <ul className="list-disc pl-6 text-sm text-muted-foreground">
            <li>Add to your watchlist with the bookmark icon</li>
            <li>Mark as watched and leave ratings</li>
            <li>Discover trending and personalized picks</li>
            <li>Switch between dark and light mode</li>
          </ul>
          <Button onClick={handleClose} className="w-full mt-4">Get Started</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
