import { Link } from "react-router-dom";

type LinkItem = {
  to: string;
  title: string;
  description: string;
};

interface InternalLinksSectionProps {
  title: string;
  links: LinkItem[];
}

export function InternalLinksSection({
  title,
  links,
}: InternalLinksSectionProps) {
  if (links.length === 0) return null;

  return (
    <section className="rounded-3xl border border-border/50 bg-card/70 p-6 md:p-8">
      <h2 className="text-2xl font-bold text-foreground md:text-3xl">
        {title}
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-2xl border border-border/40 bg-background/60 p-5 transition-colors hover:border-primary/30 hover:bg-background"
          >
            <h3 className="text-lg font-semibold text-foreground">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
