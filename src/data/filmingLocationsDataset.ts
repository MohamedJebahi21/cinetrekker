export interface CuratedFilmingLocationRecord {
  mediaType: "movie" | "tv";
  tmdbId?: number;
  title: string;
  locations: Array<{
    label: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    scene: string;
    trivia?: string[];
  }>;
}

export const CURATED_FILMING_LOCATIONS: CuratedFilmingLocationRecord[] = [
  {
    mediaType: "movie",
    tmdbId: 438631,
    title: "Dune",
    locations: [
      {
        label: "Wadi Rum, Jordan",
        city: "Wadi Rum",
        country: "Jordan",
        latitude: 29.5321,
        longitude: 35.4222,
        scene: "Arrakis desert exteriors",
        trivia: [
          "Production crews had to protect camera rigs from blowing sand between takes.",
          "Logistics teams coordinated sunrise windows to capture dune shadow lines.",
        ],
      },
      {
        label: "Liwa Desert, Abu Dhabi",
        city: "Liwa",
        country: "United Arab Emirates",
        latitude: 23.1274,
        longitude: 53.7776,
        scene: "Wide dune horizon sequences",
        trivia: [
          "A temporary service road was reinforced for heavy film equipment.",
          "Heat shimmer frequently forced lens and focus adjustments.",
        ],
      },
    ],
  },
  {
    mediaType: "movie",
    tmdbId: 475557,
    title: "Joker",
    locations: [
      {
        label: "The Bronx, New York",
        city: "New York",
        country: "United States",
        latitude: 40.8448,
        longitude: -73.8648,
        scene: "Iconic stair dance and neighborhood scenes",
        trivia: [
          "Permit windows were tightly scheduled to minimize city disruption.",
          "Crowd control required multiple resets to preserve continuity.",
        ],
      },
      {
        label: "Brooklyn, New York",
        city: "New York",
        country: "United States",
        latitude: 40.6782,
        longitude: -73.9442,
        scene: "Street and transit atmosphere shots",
        trivia: [
          "Rain effects were staged to preserve the film's gritty mood.",
        ],
      },
    ],
  },
  {
    mediaType: "movie",
    title: "Harry Potter and the Philosopher's Stone",
    locations: [
      {
        label: "Alnwick Castle, Northumberland",
        city: "Alnwick",
        country: "United Kingdom",
        latitude: 55.4154,
        longitude: -1.7056,
        scene: "Hogwarts flying lesson courtyard",
        trivia: [
          "Set teams installed temporary rigging that left no permanent marks on the castle.",
        ],
      },
      {
        label: "King's Cross Station, London",
        city: "London",
        country: "United Kingdom",
        latitude: 51.5308,
        longitude: -0.1238,
        scene: "Platform 9 3/4 departure scenes",
        trivia: [
          "Station filming had to work around active rail operations and tight platform windows.",
        ],
      },
      {
        label: "Leadenhall Market, London",
        city: "London",
        country: "United Kingdom",
        latitude: 51.5128,
        longitude: -0.0835,
        scene: "Diagon Alley exterior passages",
        trivia: [
          "Street dressing was removed overnight to return the market to normal trade hours.",
        ],
      },
    ],
  },
  {
    mediaType: "tv",
    title: "Sherlock",
    locations: [
      {
        label: "221B Baker Street, London",
        city: "London",
        country: "United Kingdom",
        latitude: 51.5238,
        longitude: -0.1586,
        scene: "Detective headquarters exteriors",
        trivia: [
          "Shooting schedules were built around regular pedestrian flow on the street.",
        ],
      },
      {
        label: "North Gower Street, London",
        city: "London",
        country: "United Kingdom",
        latitude: 51.5262,
        longitude: -0.1387,
        scene: "Street-level apartment entrance scenes",
        trivia: [
          "Facade continuity required repeated prop placement checks between takes.",
        ],
      },
    ],
  },
  {
    mediaType: "movie",
    title: "The Lord of the Rings: The Fellowship of the Ring",
    locations: [
      {
        label: "Matamata, Waikato",
        city: "Matamata",
        country: "New Zealand",
        latitude: -37.8721,
        longitude: 175.6829,
        scene: "The Shire village landscapes",
        trivia: [
          "The production rebuilt natural textures after weather changes to maintain scene continuity.",
        ],
      },
      {
        label: "Tongariro National Park",
        city: "Tongariro",
        country: "New Zealand",
        latitude: -39.2814,
        longitude: 175.562,
        scene: "Mordor volcanic terrain shots",
        trivia: [
          "Crew access was limited by conservation rules and weather-sensitive terrain.",
        ],
      },
    ],
  },
];
