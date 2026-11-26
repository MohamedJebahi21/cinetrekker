import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PendingFavoriteRemoval } from "@/pages/Profile";

interface ProfileFavoriteRemovalDialogProps {
  /** Controls dialog open state and provides the title for description interpolation. */
  pendingRemoval: PendingFavoriteRemoval | null;
  /** Called when the user cancels or dismisses the dialog. */
  onClose: () => void;
  /** Called when the user confirms removal. Profile.tsx wires this to unpinFavorite(). */
  onConfirm: (mediaId: number, mediaType: "movie" | "tv", title: string) => void;
  /** i18n text helper passed from Profile.tsx. */
  text: (key: string, fallback: string) => string;
}

/**
 * Confirmation dialog before removing a pinned favorite from the user's profile shelf.
 */
export function ProfileFavoriteRemovalDialog({
  pendingRemoval,
  onClose,
  onConfirm,
  text,
}: ProfileFavoriteRemovalDialogProps) {
  return (
    <Dialog
      open={Boolean(pendingRemoval)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle>
            {text("profile.confirmFavoriteRemovalTitle", "Remove from favorites?")}
          </DialogTitle>
          <DialogDescription>
            {pendingRemoval
              ? text(
                  "profile.confirmFavoriteRemovalDescription",
                  "{{title}} will be removed from your favorites shelf. You can add it back anytime.",
                ).replace("{{title}}", pendingRemoval.title)
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {text("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (pendingRemoval) {
                onConfirm(
                  pendingRemoval.mediaId,
                  pendingRemoval.mediaType,
                  pendingRemoval.title,
                );
              }
              onClose();
            }}
          >
            {text("profile.removeFavorite", "Remove favorite")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
