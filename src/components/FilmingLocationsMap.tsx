import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Media } from "@/types/media";
import { getFilmingMapPoints } from "@/lib/filmingLocations";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface FilmingLocationsMapProps {
  items?: Media[];
  points?: Array<{
    id: number | string;
    title: string;
    label: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    scene: string;
  }>;
}

export function FilmingLocationsMap({ items = [], points: customPoints }: FilmingLocationsMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const points = useMemo(
    () => customPoints ?? getFilmingMapPoints(items),
    [customPoints, items],
  );

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [6, 28],
      zoom: 1.45,
      projection: "globe",
      attributionControl: false,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("style.load", () => {
      map.setFog({
        color: "rgb(8, 10, 18)",
        "high-color": "rgb(20, 28, 42)",
        "horizon-blend": 0.22,
      });
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !mapReady) {
      return;
    }

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    points.forEach((point) => {
      const markerNode = document.createElement("button");
      markerNode.className = "ct-map-pin";
      markerNode.setAttribute(
        "aria-label",
        `Filming location for ${point.title}`,
      );

      const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(
        `<div class="ct-map-popup"><strong>${point.title}</strong><p>${point.label}</p><small>${point.scene}</small></div>`,
      );

      const marker = new mapboxgl.Marker({
        element: markerNode,
        anchor: "bottom",
      })
        .setLngLat([point.longitude, point.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markerRefs.current.push(marker);
    });
  }, [points, mapReady]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/60 p-5 text-sm text-white/85">
        <p className="font-semibold uppercase tracking-[0.12em] text-[#f2c572]">
          Mapbox token missing
        </p>
        <p className="mt-2 text-white/70">
          Add <code>VITE_MAPBOX_ACCESS_TOKEN</code> to render the interactive
          filming map.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
      <div ref={mapContainerRef} className="h-[320px] w-full md:h-[420px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 to-transparent" />
      <div className="pointer-events-none absolute inset-0 border border-[#f2c572]/20" />
    </div>
  );
}
