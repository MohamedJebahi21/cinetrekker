import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getImageUrl } from '@/services/tmdb';
import { Image } from '@/components/ui/Image';

export interface StreamingProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority?: number;
}

/**
 * Streaming service provider logos and names
 */
const STREAMING_PROVIDERS: Record<number, { name: string; color: string }> = {
  8: { name: 'Netflix', color: 'bg-red-600' },
  9: { name: 'Amazon Prime Video', color: 'bg-blue-600' },
  15: { name: 'Hulu', color: 'bg-green-600' },
  1899: { name: 'Max', color: 'bg-purple-600' },
  337: { name: 'Disney+', color: 'bg-blue-400' },
  350: { name: 'Apple TV+', color: 'bg-black' },
  531: { name: 'Paramount+', color: 'bg-blue-700' },
  387: { name: 'Peacock', color: 'bg-yellow-500' },
  36: { name: 'DIRECTV', color: 'bg-gray-800' },
  118: { name: 'VUDU', color: 'bg-blue-900' },
  188: { name: 'Google Play', color: 'bg-orange-500' },
  559: { name: 'Naver Store', color: 'bg-green-700' },
  192: { name: 'YouTube', color: 'bg-red-700' },
  1: { name: 'Netflix', color: 'bg-red-600' },
};

interface StreamingBadgesProps {
  providers?: StreamingProvider[];
  maxDisplay?: number;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Display streaming provider badges
 */
export function StreamingBadges({
  providers = [],
  maxDisplay = 3,
  showTooltip = true,
  size = 'sm',
}: StreamingBadgesProps) {
  if (!providers || providers.length === 0) {
    return null;
  }

  const displayed = providers.slice(0, maxDisplay);
  const remaining = Math.max(0, providers.length - maxDisplay);

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {displayed.map((provider) => (
          <Tooltip key={provider.provider_id}>
            <TooltipTrigger asChild>
              <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-muted flex items-center justify-center`}>
                {provider.logo_path ? (
                  <Image
                    src={getImageUrl(provider.logo_path, 'w92') || undefined}
                    alt={provider.provider_name}
                    width={92}
                    height={92}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {provider.provider_name.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            {showTooltip && <TooltipContent>{provider.provider_name}</TooltipContent>}
          </Tooltip>
        ))}
        {remaining > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center border border-border`}>
                <span className="text-xs font-bold text-muted-foreground">+{remaining}</span>
              </div>
            </TooltipTrigger>
            {showTooltip && (
              <TooltipContent>
                <div className="text-xs space-y-1">
                  {providers.slice(maxDisplay).map((p) => (
                    <div key={p.provider_id}>{p.provider_name}</div>
                  ))}
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Streaming service badge with name
 */
export function StreamingServiceBadge({ providerId, providerName }: { providerId: number; providerName: string }) {
  const provider = STREAMING_PROVIDERS[providerId];
  const color = provider?.color || 'bg-gray-500';

  return (
    <Badge className={`${color} text-white`}>
      <span className="text-xs">{providerName}</span>
    </Badge>
  );
}

/**
 * Multiple streaming services as badges
 */
export function StreamingServiceBadges({
  providers = [],
  maxDisplay = 4,
}: {
  providers?: { provider_id: number; provider_name: string }[];
  maxDisplay?: number;
}) {
  if (!providers || providers.length === 0) {
    return null;
  }

  const displayed = providers.slice(0, maxDisplay);
  const remaining = Math.max(0, providers.length - maxDisplay);

  return (
    <div className="flex flex-wrap gap-2">
      {displayed.map((provider) => (
        <StreamingServiceBadge
          key={provider.provider_id}
          providerId={provider.provider_id}
          providerName={provider.provider_name}
        />
      ))}
      {remaining > 0 && (
        <Badge variant="outline">
          <span className="text-xs">+{remaining} more</span>
        </Badge>
      )}
    </div>
  );
}

/**
 * Streaming availability information
 */
export interface StreamingAvailability {
  link?: string;
  flatrate?: StreamingProvider[]; // Subscription
  buy?: StreamingProvider[]; // Purchase
  rent?: StreamingProvider[]; // Rental
  ads?: StreamingProvider[]; // Ad-supported
}

/**
 * Display streaming availability with tabs
 */
export function StreamingAvailability({
  availability,
}: {
  availability: {
    link?: string;
    flatrate?: StreamingProvider[];
    buy?: StreamingProvider[];
    rent?: StreamingProvider[];
    ads?: StreamingProvider[];
  };
}) {
  if (!availability || Object.keys(availability).length === 0) {
    return <p className="text-sm text-muted-foreground">Not available in your region</p>;
  }

  return (
    <div className="space-y-3">
      {availability.flatrate && availability.flatrate.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Stream Now</p>
          <StreamingBadges providers={availability.flatrate} />
        </div>
      )}
      {availability.ads && availability.ads.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Watch Free (with Ads)</p>
          <StreamingBadges providers={availability.ads} />
        </div>
      )}
      {availability.rent && availability.rent.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Rent</p>
          <StreamingBadges providers={availability.rent} />
        </div>
      )}
      {availability.buy && availability.buy.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2">Buy</p>
          <StreamingBadges providers={availability.buy} />
        </div>
      )}
      {availability.link && (
        <a href={availability.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
          See more providers →
        </a>
      )}
    </div>
  );
}
