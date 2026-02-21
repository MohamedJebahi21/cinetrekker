declare module '@vercel/speed-insights/next' {
  import type { ComponentType } from 'react';
  export const SpeedInsights: ComponentType<Record<string, never>>;
  const _default: ComponentType<Record<string, never>>;
  export default _default;
}

declare module '@vercel/speed-insights' {
  import type { ComponentType } from 'react';
  const _default: ComponentType<Record<string, never>>;
  export default _default;
}
