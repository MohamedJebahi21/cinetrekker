import { Media } from "@/types/media";

export interface FilmingLocation {
  label: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  scene: string;
}

const COUNTRY_COORDS: Record<
  string,
  { city: string; country: string; latitude: number; longitude: number }
> = {
  US: {
    city: "New York",
    country: "United States",
    latitude: 40.7128,
    longitude: -74.006,
  },
  GB: {
    city: "London",
    country: "United Kingdom",
    latitude: 51.5072,
    longitude: -0.1276,
  },
  NZ: {
    city: "Queenstown",
    country: "New Zealand",
    latitude: -45.0312,
    longitude: 168.6626,
  },
  IS: {
    city: "Vik",
    country: "Iceland",
    latitude: 63.4186,
    longitude: -19.006,
  },
  MA: {
    city: "Erg Chebbi",
    country: "Morocco",
    latitude: 31.1333,
    longitude: -4.0167,
  },
  JO: {
    city: "Wadi Rum",
    country: "Jordan",
    latitude: 29.5321,
    longitude: 35.4222,
  },
  IT: {
    city: "Rome",
    country: "Italy",
    latitude: 41.9028,
    longitude: 12.4964,
  },
  ES: {
    city: "Almeria",
    country: "Spain",
    latitude: 36.834,
    longitude: -2.4637,
  },
  FR: {
    city: "Paris",
    country: "France",
    latitude: 48.8566,
    longitude: 2.3522,
  },
  JP: {
    city: "Tokyo",
    country: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
  },
  KR: {
    city: "Seoul",
    country: "South Korea",
    latitude: 37.5665,
    longitude: 126.978,
  },
  CA: {
    city: "Vancouver",
    country: "Canada",
    latitude: 49.2827,
    longitude: -123.1207,
  },
};

const TITLE_LOCATION_HINTS: Array<{
  keyword: string;
  location: FilmingLocation;
}> = [
  {
    keyword: "dune",
    location: {
      label: "Wadi Rum, Jordan",
      city: "Wadi Rum",
      country: "Jordan",
      latitude: 29.5321,
      longitude: 35.4222,
      scene: "Sahara-like desert landscapes",
    },
  },
  {
    keyword: "joker",
    location: {
      label: "The Bronx, New York",
      city: "New York",
      country: "United States",
      latitude: 40.8448,
      longitude: -73.8648,
      scene: "Rain-soaked city streets",
    },
  },
  {
    keyword: "lord of the rings",
    location: {
      label: "Matamata, New Zealand",
      city: "Matamata",
      country: "New Zealand",
      latitude: -37.8721,
      longitude: 175.6829,
      scene: "Rolling fantasy countryside",
    },
  },
  {
    keyword: "batman",
    location: {
      label: "Liverpool, United Kingdom",
      city: "Liverpool",
      country: "United Kingdom",
      latitude: 53.4084,
      longitude: -2.9916,
      scene: "Neo-noir night streets",
    },
  },
  {
    keyword: "interstellar",
    location: {
      label: "Alberta, Canada",
      city: "Fort Macleod",
      country: "Canada",
      latitude: 49.7216,
      longitude: -113.4003,
      scene: "Wide prairie horizons",
    },
  },
];

function getMediaTitle(media: Media): string {
  return (
    media.title ||
    media.name ||
    media.original_title ||
    media.original_name ||
    "Unknown"
  );
}

export function getFilmingLocation(media: Media): FilmingLocation {
  const title = getMediaTitle(media).toLowerCase();
  const hinted = TITLE_LOCATION_HINTS.find((item) =>
    title.includes(item.keyword),
  );
  if (hinted) {
    return hinted.location;
  }

  const productionCountry = media.production_countries?.[0];
  if (productionCountry) {
    const fallbackForIso = COUNTRY_COORDS[productionCountry.iso_3166_1];
    if (fallbackForIso) {
      return {
        label: `${fallbackForIso.city}, ${fallbackForIso.country}`,
        city: fallbackForIso.city,
        country: fallbackForIso.country,
        latitude: fallbackForIso.latitude,
        longitude: fallbackForIso.longitude,
        scene: "Iconic cinematic backdrop",
      };
    }

    return {
      label: productionCountry.name,
      city: productionCountry.name,
      country: productionCountry.name,
      latitude: 20,
      longitude: 0,
      scene: "Production location",
    };
  }

  const originCode = media.origin_country?.[0];
  if (originCode && COUNTRY_COORDS[originCode]) {
    const origin = COUNTRY_COORDS[originCode];
    return {
      label: `${origin.city}, ${origin.country}`,
      city: origin.city,
      country: origin.country,
      latitude: origin.latitude,
      longitude: origin.longitude,
      scene: "Fan-favorite filming zone",
    };
  }

  return {
    label: "Global location",
    city: "Worldwide",
    country: "Global",
    latitude: 25,
    longitude: 5,
    scene: "Cinematic journey",
  };
}

export function getFilmedInBadge(media: Media): string {
  const location = getFilmingLocation(media);

  if (location.country === "Global") {
    return "Filmed in: Location unavailable";
  }

  const isEstimated =
    location.scene === "Iconic cinematic backdrop" ||
    location.scene === "Production location" ||
    location.scene === "Fan-favorite filming zone";

  return isEstimated
    ? `Filmed in: ${location.country} (est.)`
    : `Filmed in: ${location.country}`;
}

export function getFilmingMapPoints(
  items: Media[],
): Array<FilmingLocation & { id: number; title: string }> {
  return items.slice(0, 24).map((media) => {
    const title = getMediaTitle(media);
    const location = getFilmingLocation(media);
    return {
      id: media.id,
      title,
      ...location,
    };
  });
}
