import React from "react";
import { getProviderUrlFromData } from "@/lib/providerMap";
import { getProviderWatchUrl } from "@/lib/providerLinks";
import type { Provider } from "@/types/media";
import { Image } from "@/components/ui/Image";

export default function StreamingInfo({
  providers,
}: {
  providers?: Provider[];
}) {
  if (!providers || providers.length === 0) return null;
  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold mb-2">Where to Watch</h3>
      <div className="flex items-center gap-2">
        {providers.slice(0, 6).map((p) => {
          const href =
            getProviderWatchUrl(p.provider_id) ||
            getProviderUrlFromData(p) ||
            p.urls?.standard_web ||
            "#";
          return (
            <a
              key={p.provider_id}
              href={href}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md p-1 bg-background/60 hover:opacity-90"
            >
              {p.icon_url ? (
                <Image
                  src={p.icon_url}
                  alt={p.short_name || p.clear_name}
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-xs text-muted-foreground px-2">
                  {p.short_name}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
