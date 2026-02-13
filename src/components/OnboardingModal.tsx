import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function OnboardingModal() {
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
    try { localStorage.setItem("hasSeenOnboarding", "1"); } catch (e) {}
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
          </ul>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleClose} className="flex-1">Get Started</Button>
            <Button variant="outline" onClick={handleClose} className="flex-1">Skip</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
