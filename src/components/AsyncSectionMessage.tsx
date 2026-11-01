import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type AsyncSectionMessageProps = {
  title: string;
  description: string;
  onRetry?: () => void;
};

export function AsyncSectionMessage({ title, description, onRetry }: AsyncSectionMessageProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-32 flex-col items-start justify-center gap-2 rounded-xl border border-border/60 bg-card/35 px-4 py-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
      <div className="flex min-w-0 items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" className="min-h-10 shrink-0 gap-2" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t("common.retry", "Retry")}
        </Button>
      ) : null}
    </div>
  );
}
