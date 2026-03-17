import Head from "next/head";
import Link from "next/link";
import { getHomePageData, getPosterUrl } from "../lib/tmdbSsr";

function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-card" aria-hidden="true" />
      ))}
    </div>
  );
}

function MediaGrid({ title, items, hrefBuilder }) {
  return (
    <section>
      <h2>{title}</h2>
      {items.length === 0 ? (
        <SkeletonGrid />
      ) : (
        <div className="grid">
          {items.map((item) => {
            const mediaType = item.media_type || (item.title ? "movie" : "tv");
            const displayTitle = item.title || item.name || "Untitled";
            const poster = getPosterUrl(item.poster_path);
            const href = hrefBuilder ? hrefBuilder(item) : `/${mediaType}/${item.id}`;

            return (
              <article key={`${mediaType}-${item.id}`} className="card">
                <Link href={href}>
                  {poster ? (
                    <img src={poster} alt={displayTitle} loading="lazy" />
                  ) : (
                    <div className="poster-fallback">No poster</div>
                  )}
                  <h3>{displayTitle}</h3>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export async function getServerSideProps() {
  const response = await getHomePageData({ page: 1, language: "en-US" });

  if (!response.ok && response.error) {
    console.error(`[SSR][HOME] ${response.error}`);
  }

  return {
    props: {
      movies: response.data.movies,
      trending: response.data.trending,
      details: response.data.details,
      error: response.error,
    },
  };
}

export default function HomePage({ movies, trending, error }) {
  return (
    <>
      <Head>
        <title>CineTrekker SSR Home</title>
      </Head>
      <main className="container">
        <h1>CineTrekker SSR Home</h1>
        {error ? <p className="error">Some data failed to load: {error}</p> : null}

        <MediaGrid title="Popular Movies" items={movies} hrefBuilder={(item) => `/movie/${item.id}`} />
        <MediaGrid title="Trending" items={trending} hrefBuilder={(item) => `/${item.media_type || (item.title ? "movie" : "tv")}/${item.id}`} />
      </main>

      <style jsx>{`
        .container { max-width: 1080px; margin: 0 auto; padding: 24px; }
        h1 { margin: 0 0 16px; }
        h2 { margin: 24px 0 12px; }
        .error { color: #b91c1c; background: #fee2e2; padding: 10px; border-radius: 8px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
        .card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background: #fff; }
        .card a { color: inherit; text-decoration: none; }
        img { width: 100%; aspect-ratio: 2 / 3; object-fit: cover; display: block; }
        h3 { font-size: 0.95rem; padding: 8px; min-height: 52px; margin: 0; }
        .poster-fallback { width: 100%; aspect-ratio: 2 / 3; display: grid; place-items: center; background: #f3f4f6; color: #6b7280; }
        .skeleton-card { width: 100%; aspect-ratio: 2 / 3; border-radius: 10px; background: linear-gradient(90deg, #ececec 25%, #f5f5f5 37%, #ececec 63%); background-size: 400% 100%; animation: shimmer 1.2s ease-in-out infinite; }
        @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
      `}</style>
    </>
  );
}
