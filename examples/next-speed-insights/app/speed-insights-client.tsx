"use client";
import React from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function SpeedInsightsClient() {
  // This component is explicitly a client component so it won't run during
  // server rendering. The package is mounted on the client only which avoids SSR issues.
  return <SpeedInsights />;
}
