import "./globals.css";
import SpeedInsightsClient from "./speed-insights-client";
import { metadata } from "./metadata";

export { metadata };

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CineTrekker",
  url: "https://cinetrekker.vercel.app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        {children}
        <SpeedInsightsClient />
      </body>
    </html>
  );
}
