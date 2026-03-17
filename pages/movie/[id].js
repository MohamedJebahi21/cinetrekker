import Head from "next/head";
import Link from "next/link";
import { getDetailPageData, getPosterUrl } from "../../lib/tmdbSsr";

const SITE_NAME = "CineTrekker";
const FALLBACK_DESCRIPTION =
  "Track movies and TV shows, discover trending picks, and build your watchlist on CineTrekker.";

function buildBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

function buildDescription(details) {
  if (details?.overview && details.overview.trim()) {
    return details.overview.slice(0, 160);
  }
  return FALLBACK_DESCRIPTION;
}

function buildMovieJsonLd({ details, title, description, poster, pageUrl }) {
  if (!details) {
    return null;
  }

  const payload = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: title,
    description,
    image: poster || undefined,
    datePublished: details.release_date || undefined,
    url: pageUrl,
  };

  if (
    typeof details.vote_average === "number" &&
    details.vote_average > 0 &&
    typeof details.vote_count === "number" &&
    details.vote_count > 0
  ) {
    payload.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: details.vote_average,
      ratingCount: details.vote_count,
      bestRating: 10,
      worstRating: 0,
    };
  }

  return payload;
}

function SkeletonDetails() {
  return (
    <div className="detail-skeleton" aria-hidden="true">
      <div className="poster" />
      <div className="text" />
      <div className="text short" />
      <div className="text" />
    </div>
  );
}

export async function getServerSideProps(context) {
  const id = context?.params?.id;
  const response = await getDetailPageData({
    id,
    mediaType: "movie",
    language: "en-US",
  });

  if (!response.ok && response.error) {
    console.error(`[SSR][MOVIE] ${response.error}`);
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

export default function MovieDetailsPage({ movies, trending, details, error }) {
  const baseUrl = buildBaseUrl();
  const id = details?.id;
  const title = details?.title || "Movie Details";
  const pageTitle = `${title} | ${SITE_NAME}`;
  const description = buildDescription(details);
  const poster = getPosterUrl(details?.poster_path);
  const pageUrl = `${baseUrl}/movie/${id || ""}`.replace(/\/$/, "");
  const jsonLd = buildMovieJsonLd({ details, title, description, poster, pageUrl });

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={pageUrl} />

        <meta property="og:type" content="video.movie" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={pageUrl} />
        {poster ? <meta property="og:image" content={poster} /> : null}

        <meta name="twitter:card" content={poster ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />
        {poster ? <meta name="twitter:image" content={poster} /> : null}

        {jsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ) : null}
      </Head>
      <main className="container">
        <p><Link href="/">Back to Home</Link></p>
        {error ? <p className="error">Data warning: {error}</p> : null}

        {!details ? (
          <SkeletonDetails />
        ) : (
          <section className="detail-card">
            {poster ? <img src={poster} alt={title} /> : <div className="poster-fallback">No poster</div>}
            <div>
              <h1>{title}</h1>
              <p>{details.overview || "No overview available."}</p>
            </div>
          </section>
        )}

        <section>
          <h2>Popular Movies</h2>
          {movies.length === 0 ? <div className="inline-skeleton" /> : <ul>{movies.slice(0, 8).map((m) => <li key={m.id}>{m.title || m.name}</li>)}</ul>}
        </section>

        <section>
          <h2>Trending Movies</h2>
          {trending.length === 0 ? <div className="inline-skeleton" /> : <ul>{trending.slice(0, 8).map((m) => <li key={m.id}>{m.title || m.name}</li>)}</ul>}
        </section>
      </main>

      <style jsx>{`
        .container { max-width: 1080px; margin: 0 auto; padding: 24px; }
        .error { color: #b91c1c; background: #fee2e2; padding: 10px; border-radius: 8px; }
        .detail-card { display: grid; grid-template-columns: 260px 1fr; gap: 16px; margin-bottom: 24px; }
        img, .poster-fallback { width: 260px; height: 390px; object-fit: cover; border-radius: 10px; background: #f3f4f6; display: grid; place-items: center; }
        .detail-skeleton .poster { width: 260px; height: 390px; border-radius: 10px; background: #e5e7eb; }
        .detail-skeleton .text { height: 18px; margin: 10px 0; border-radius: 6px; background: #e5e7eb; }
        .detail-skeleton .short { width: 60%; }
        .inline-skeleton { height: 20px; background: #e5e7eb; border-radius: 6px; }
        @media (max-width: 720px) { .detail-card { grid-template-columns: 1fr; } img, .poster-fallback, .detail-skeleton .poster { width: 100%; height: auto; aspect-ratio: 2 / 3; } }
      `}</style>
    </>
  );
}
