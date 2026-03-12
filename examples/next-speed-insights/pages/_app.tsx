import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';

// Dynamically import the SpeedInsights component only on the client to avoid SSR
const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then((mod) => mod.SpeedInsights),
  { ssr: false }
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <SpeedInsights />
    </>
  );
}
