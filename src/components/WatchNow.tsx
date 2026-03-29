type WatchNowProps = {
  movieTitle: string;
};

export default function WatchNow({ movieTitle }: WatchNowProps) {
  const encodedTitle = encodeURIComponent(movieTitle);

  return (
    <section className="rounded-2xl border border-zinc-700/60 bg-zinc-900/80 p-6 shadow-xl backdrop-blur">
      <h2 className="text-xl font-semibold text-zinc-100">Watch Now</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Find ways to watch <span className="font-medium text-zinc-200">{movieTitle}</span>.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a
          href={`https://www.amazon.com/s?k=${encodedTitle}&tag=YOUR_AMAZON_TAG`}
          target="_blank" rel="noopener noreferrer"
          rel="noopener noreferrer sponsored"
          className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          Rent on Amazon
        </a>

        <a
          href={`https://www.fandango.com/search?q=${encodedTitle}&cmp=YOUR_FANDANGO_ID`}
          target="_blank" rel="noopener noreferrer"
          rel="noopener noreferrer sponsored"
          className="inline-flex items-center justify-center rounded-xl border border-red-500/70 bg-red-600/90 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
        >
          Buy Tickets on Fandango
        </a>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Disclosure: We may earn a commission from qualifying purchases made through affiliate links.
      </p>
    </section>
  );
}
