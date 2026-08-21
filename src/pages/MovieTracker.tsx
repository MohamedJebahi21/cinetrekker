import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Film,
  ListChecks,
  Search,
  Tv,
} from "lucide-react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import {
  buildCanonicalUrl,
  toBreadcrumbJsonLd,
  toFaqJsonLd,
} from "@/lib/seo";

const faqItems = [
  {
    question: "What is a movie and TV show tracker?",
    answer:
      "A movie and TV show tracker gives you one place to keep a watchlist, record what you have finished, and return to a series without losing your place.",
  },
  {
    question: "Can I track episode progress?",
    answer:
      "Yes. CineTrekker is designed to help you mark series progress and return to the next available episode when you are ready to continue watching.",
  },
  {
    question: "Can I explore before creating an account?",
    answer:
      "Yes. You can browse, search, and explore titles before signing up. A free account keeps your watchlist and progress available across sessions.",
  },
  {
    question: "Does search support original-language titles?",
    answer:
      "Yes. CineTrekker search supports original-language titles as well as commonly used translated names, helping you find international movies and TV shows.",
  },
];

const productSteps = [
  {
    icon: Search,
    title: "Find the title",
    description:
      "Search movies, TV shows, and people — including international titles by their original-language names.",
  },
  {
    icon: Bookmark,
    title: "Give it a place",
    description:
      "Add it to a watchlist when it is interesting now, even if you are not ready to watch tonight.",
  },
  {
    icon: ListChecks,
    title: "Pick up where you left off",
    description:
      "Mark films watched and keep a dependable record of series and episode progress.",
  },
];

const useCases = [
  {
    icon: Film,
    title: "For movie nights",
    description:
      "Turn a scattered list of recommendations into a watchlist you can actually choose from.",
  },
  {
    icon: Tv,
    title: "For ongoing series",
    description:
      "Keep your next episode visible so a break between seasons does not become a restart.",
  },
  {
    icon: CalendarDays,
    title: "For what is coming next",
    description:
      "Browse discovery and calendar views when you want a better answer than endless scrolling.",
  },
];

export default function MovieTracker() {
  const canonical = buildCanonicalUrl("/movie-tracker");

  return (
    <div className="ct-page-shell min-h-screen">
      <SEO
        title="Free Movie & TV Show Tracker"
        description="Track movies, TV shows, watchlists, and episode progress in one free, focused place. Explore CineTrekker before you sign up."
        canonical={canonical}
        keywords="free movie tracker, TV show tracker, watchlist app, episode tracker, track movies, track TV shows, movie watchlist"
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Movie & TV Show Tracker", path: "/movie-tracker" },
          ]),
          toFaqJsonLd(faqItems),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Free Movie & TV Show Tracker",
            description:
              "Track movies, TV shows, watchlists, and episode progress in one free, focused place.",
            url: canonical,
            isPartOf: {
              "@type": "WebSite",
              name: "CineTrekker",
              url: buildCanonicalUrl("/"),
            },
          },
        ]}
      />

      <main className="page-container pb-24 pt-20 md:pb-14">
        <section className="relative overflow-hidden rounded-[1.25rem] border border-border/80 bg-card px-6 py-10 shadow-[var(--shadow-card)] sm:px-8 lg:px-12 lg:py-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 88% 15%, hsl(var(--primary) / 0.16), transparent 28%), radial-gradient(circle at 12% 96%, hsl(var(--primary) / 0.08), transparent 34%)",
            }}
          />
          <div className="relative grid items-end gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <div>
              <p className="ct-kicker text-xs font-bold uppercase">Free movie &amp; TV show tracker</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl">
                Remember every great watch. Know what to play next.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                CineTrekker helps you find movies and shows, make a watchlist with intent,
                and keep series progress from falling through the cracks.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild className="min-h-11 rounded-xl px-5 font-bold">
                  <Link to="/search">
                    Explore titles <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="min-h-11 rounded-xl border-border/80 bg-background/70 px-5 font-semibold hover:bg-accent">
                  <Link to="/signup">Create a free account</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Browse first. Create an account only when you want your lists and progress to stay with you.
              </p>
            </div>

            <div className="grid gap-3" aria-label="CineTrekker benefits">
              {[
                "Movies, series, and episode progress in one place",
                "Original-language title search for international shows",
                "A focused watchlist, not another endless feed",
              ].map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/55 p-4 backdrop-blur-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium leading-6 text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14">
          <div className="max-w-2xl">
            <p className="ct-kicker text-xs font-bold uppercase">A simple tracker, not another chore</p>
            <h2 className="section-title mt-3">From a title you notice to a watch you remember.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Good tracking should take less attention than deciding what to watch. CineTrekker keeps the core loop clear: find a title, save it with purpose, and come back when it is time to press play.
            </p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {productSteps.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className="ct-panel h-full p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary">Step {index + 1}</p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 border-y border-border/70 py-12">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <p className="ct-kicker text-xs font-bold uppercase">Built around real viewing habits</p>
              <h2 className="section-title mt-3">A better home for your next great watch.</h2>
              <p className="mt-4 leading-7 text-muted-foreground">
                Whether you are planning a film night, following a long-running series, or finding a show whose title you only know in its original language, the goal is the same: make the next useful action obvious.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {useCases.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-xl border border-border/75 bg-card p-5 shadow-sm">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 font-bold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
          <div>
            <p className="ct-kicker text-xs font-bold uppercase">Questions, answered</p>
            <h2 className="section-title mt-3">Movie tracker FAQs</h2>
            <div className="mt-6 divide-y divide-border/70 rounded-xl border border-border/80 bg-card">
              {faqItems.map((item) => (
                <details key={item.question} className="group p-5">
                  <summary className="cursor-pointer list-none pr-8 font-semibold text-foreground marker:content-none">
                    {item.question}
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>

          <aside className="ct-panel-strong self-start p-6">
            <p className="ct-kicker text-xs font-bold uppercase">Start where you are</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">No setup ritual required.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Search for the show or movie already on your mind. If CineTrekker earns a place in your routine, create a free account to keep the record.
            </p>
            <Button asChild className="mt-6 min-h-11 w-full rounded-xl font-bold">
              <Link to="/search">Search CineTrekker <Search className="ml-2 h-4 w-4" /></Link>
            </Button>
          </aside>
        </section>

        <InternalLinksSection
          title="Keep exploring"
          links={[
            {
              to: "/discover",
              title: "Discover something new",
              description: "Browse focused discovery views when you need a better next-watch idea.",
            },
            {
              to: "/calendar",
              title: "See upcoming releases",
              description: "Plan around films and series that are arriving soon.",
            },
            {
              to: "/about",
              title: "How CineTrekker works",
              description: "Learn more about the product, its tracking flow, and its data sources.",
            },
          ]}
        />
      </main>
    </div>
  );
}
