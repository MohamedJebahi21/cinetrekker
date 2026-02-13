import './globals.css'
import SpeedInsightsClient from './speed-insights-client'

export const metadata = {
  title: 'App Router Example',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsightsClient />
      </body>
    </html>
  );
}
