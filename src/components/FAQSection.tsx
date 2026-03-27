import type { FaqItem } from "@/lib/seo";

interface FAQSectionProps {
  title: string;
  intro?: string;
  items: FaqItem[];
}

export function FAQSection({ title, intro, items }: FAQSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-3xl border border-border/50 bg-card/70 p-6 md:p-8">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold text-foreground md:text-3xl">
          {title}
        </h2>
        {intro ? (
          <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
            {intro}
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4">
        {items.map((item) => (
          <article
            key={item.question}
            className="rounded-2xl border border-border/40 bg-background/60 p-5"
          >
            <h3 className="text-lg font-semibold text-foreground">
              {item.question}
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground md:text-base">
              {item.answer}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
