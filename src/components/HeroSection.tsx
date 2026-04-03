import { ArrowRight, Bookmark, CheckCircle2, Sparkles, Tv } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const HERO_HIGHLIGHTS = [
  {
    icon: Bookmark,
    label: "Build a watchlist that stays organized across devices",
  },
  {
    icon: CheckCircle2,
    label: "Track what you watched, rated, and want to revisit",
  },
  {
    icon: Tv,
    label: "Keep up with series progress and continue where you left off",
  },
];

export function HeroSection() {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden border-b border-border/40 bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,9,20,0.22),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_42%)]" />
      <div className="page-container relative grid grid-cols-1 gap-8 py-12 sm:py-14 md:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] md:items-center md:gap-10 md:py-24">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-medium text-primary sm:px-4 sm:text-sm">
            <Sparkles className="h-4 w-4" />
            <span className="truncate sm:whitespace-normal">
              Track movies, series, and your next watch in one place
            </span>
          </div>

          <h1 className="max-w-3xl text-3xl font-black tracking-tight text-foreground sm:text-4xl md:text-6xl">
            Your personal movie &amp; TV tracker
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7 md:text-lg">
            Save what you want to watch, mark progress episode by episode, rate
            what you finish, and jump back into your next title without digging
            through global feeds first.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="btn-primary-glow h-11 w-full gap-2 px-4 text-sm shadow-[0_10px_28px_hsla(var(--primary)/0.28)] sm:h-12 sm:w-auto sm:px-6 sm:text-base"
            >
              <Link to={user ? "/watchlist" : "/signup"}>
                {user ? "Open My Watchlist" : "Start Tracking Free"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-10 w-full px-4 text-sm sm:h-12 sm:w-auto sm:px-6 sm:text-base"
            >
              <Link to="/search">Browse Movies &amp; TV</Link>
            </Button>
          </div>
        </div>

        <div className="ct-panel-strong grid gap-3 rounded-3xl border border-border/50 bg-[linear-gradient(180deg,hsla(var(--card)/0.92),hsla(var(--card)/0.72)),radial-gradient(circle_at_top,hsla(var(--primary)/0.12),transparent_58%)] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] md:p-5">
          {HERO_HIGHLIGHTS.map((highlight) => {
            const Icon = highlight.icon;
            return (
              <div
                key={highlight.label}
                className="group rounded-2xl border border-border/60 bg-[linear-gradient(180deg,hsla(var(--card)/0.88),hsla(var(--card)/0.65))] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_14px_36px_rgba(229,9,20,0.12)] focus-within:border-primary/35"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/12 text-primary shadow-[0_8px_18px_hsla(var(--primary)/0.12)] transition-transform duration-300 group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="text-sm leading-6 text-foreground/90">
                    {highlight.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
