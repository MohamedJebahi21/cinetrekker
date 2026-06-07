import './globals.css'
import SpeedInsightsClient from './speed-insights-client'
import { metadata } from './metadata'

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
