export interface DailyTriviaQuestion {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  category: "film" | "tv" | "actors" | "worlds";
}

export interface DailyTriviaState {
  dayKey: string;
  answered: boolean;
  selectedIndex: number | null;
  correct: boolean;
  streak: number;
}

const TRIVIA_STORAGE_KEY = "cinetrekker_daily_trivia_v1";

// The daily selection is deterministic, so every CineTrekker user receives the
// same challenge on a given date while the catalogue stays fresh for more than
// six weeks before its first repeat.
const QUESTIONS: DailyTriviaQuestion[] = [
  {
    id: "parasite-director",
    prompt: "Who directed the Oscar-winning film Parasite?",
    options: ["Bong Joon-ho", "Park Chan-wook", "Lee Chang-dong", "Ryusuke Hamaguchi"],
    answerIndex: 0,
    explanation: "Bong Joon-ho directed Parasite, which won Best Picture at the 92nd Academy Awards.",
    category: "film",
  },
  {
    id: "neo-actor",
    prompt: "Who played Neo in The Matrix?",
    options: ["Christian Bale", "Keanu Reeves", "Hugh Jackman", "Joseph Gordon-Levitt"],
    answerIndex: 1,
    explanation: "Keanu Reeves played Neo across The Matrix film series.",
    category: "actors",
  },
  {
    id: "stranger-things-town",
    prompt: "Which fictional Indiana town is home to Stranger Things?",
    options: ["Riverdale", "Sunnydale", "Hawkins", "Stars Hollow"],
    answerIndex: 2,
    explanation: "The story begins in the fictional town of Hawkins, Indiana.",
    category: "tv",
  },
  {
    id: "inception-director",
    prompt: "Who directed Inception?",
    options: ["Denis Villeneuve", "Christopher Nolan", "David Fincher", "Sam Mendes"],
    answerIndex: 1,
    explanation: "Christopher Nolan wrote and directed Inception.",
    category: "film",
  },
  {
    id: "breaking-bad-city",
    prompt: "In which city is Breaking Bad primarily set?",
    options: ["Albuquerque", "Austin", "Phoenix", "Las Vegas"],
    answerIndex: 0,
    explanation: "Walter White’s story is primarily set in Albuquerque, New Mexico.",
    category: "tv",
  },
  {
    id: "lord-of-rings-world",
    prompt: "What is the name of the world where The Lord of the Rings takes place?",
    options: ["Narnia", "Westeros", "Middle-earth", "Thedas"],
    answerIndex: 2,
    explanation: "Middle-earth is the setting for The Hobbit and The Lord of the Rings.",
    category: "worlds",
  },
  {
    id: "star-wars-quote",
    prompt: "Which franchise is associated with the phrase “May the Force be with you”?",
    options: ["Star Trek", "Star Wars", "Dune", "The Expanse"],
    answerIndex: 1,
    explanation: "“May the Force be with you” is one of Star Wars’ signature lines.",
    category: "worlds",
  },
  {
    id: "wednesday-character",
    prompt: "Which family does Wednesday Addams belong to?",
    options: ["The Munsters", "The Addams Family", "The Greys", "The Spellmans"],
    answerIndex: 1,
    explanation: "Wednesday is the iconic daughter of The Addams Family.",
    category: "tv",
  },
  {
    id: "jaws-director",
    prompt: "Who directed Jaws?",
    options: ["George Lucas", "Steven Spielberg", "Francis Ford Coppola", "Ridley Scott"],
    answerIndex: 1,
    explanation: "Steven Spielberg directed Jaws, released in 1975.",
    category: "film",
  },
  {
    id: "godfather-family",
    prompt: "The Godfather follows which fictional crime family?",
    options: ["The Corleones", "The Soprano family", "The Shelby family", "The Byrdes"],
    answerIndex: 0,
    explanation: "The Corleone family is at the center of The Godfather trilogy.",
    category: "film",
  },
  {
    id: "avatar-planet",
    prompt: "What is the name of the moon in Avatar?",
    options: ["Pandora", "Arrakis", "Endor", "LV-426"],
    answerIndex: 0,
    explanation: "Pandora is the lush moon where Avatar is set.",
    category: "worlds",
  },
  {
    id: "office-company",
    prompt: "What company do the employees work for in The Office (U.S.)?",
    options: ["Initech", "Dunder Mifflin", "Prestige Worldwide", "Vance Refrigeration"],
    answerIndex: 1,
    explanation: "Dunder Mifflin is the paper company at the heart of the series.",
    category: "tv",
  },
  {
    id: "toy-story-milestone",
    prompt: "Which film was the first feature-length movie made entirely with computer animation?",
    options: ["Shrek", "Toy Story", "A Bug’s Life", "Tron"],
    answerIndex: 1,
    explanation: "Pixar’s Toy Story, released in 1995, was the first feature-length film made entirely with computer animation.",
    category: "film",
  },
  {
    id: "spirited-away-studio",
    prompt: "Which studio produced Spirited Away?",
    options: ["Studio Ghibli", "Madhouse", "MAPPA", "Toei Animation"],
    answerIndex: 0,
    explanation: "Spirited Away was produced by Studio Ghibli and directed by Hayao Miyazaki.",
    category: "film",
  },
  {
    id: "shires-residents",
    prompt: "The Shire in The Lord of the Rings is chiefly home to which people?",
    options: ["Elves", "Dwarves", "Hobbits", "Wizards"],
    answerIndex: 2,
    explanation: "The Shire is the peaceful homeland of the Hobbits, including Frodo and Bilbo Baggins.",
    category: "worlds",
  },
  {
    id: "lost-flight",
    prompt: "Which flight crashes at the beginning of Lost?",
    options: ["Oceanic 815", "Ajira 316", "Flight 828", "Pan Am 103"],
    answerIndex: 0,
    explanation: "Oceanic Flight 815 crashes on the island in the opening episode of Lost.",
    category: "tv",
  },
  {
    id: "simpsons-town",
    prompt: "What town do The Simpsons live in?",
    options: ["Quahog", "Springfield", "South Park", "Arlen"],
    answerIndex: 1,
    explanation: "The Simpson family lives in Springfield, a deliberately ambiguous American town.",
    category: "tv",
  },
  {
    id: "kill-bill-director",
    prompt: "Who directed Kill Bill?",
    options: ["Robert Rodriguez", "Quentin Tarantino", "Guy Ritchie", "David Lynch"],
    answerIndex: 1,
    explanation: "Quentin Tarantino wrote and directed both volumes of Kill Bill.",
    category: "film",
  },
  {
    id: "jurassic-park-island",
    prompt: "On which fictional island is Jurassic Park built?",
    options: ["Isla Sorna", "Isla Nublar", "Skull Island", "The Island"],
    answerIndex: 1,
    explanation: "John Hammond’s Jurassic Park is built on Isla Nublar, near Costa Rica.",
    category: "worlds",
  },
  {
    id: "harry-potter-school",
    prompt: "Which school does Harry Potter attend?",
    options: ["Beauxbatons", "Durmstrang", "Hogwarts", "Ilvermorny"],
    answerIndex: 2,
    explanation: "Hogwarts School of Witchcraft and Wizardry is Harry Potter’s school.",
    category: "worlds",
  },
  {
    id: "black-panther-nation",
    prompt: "What is the fictional nation in Black Panther?",
    options: ["Genosha", "Latveria", "Wakanda", "Talokan"],
    answerIndex: 2,
    explanation: "Wakanda is the hidden, technologically advanced nation ruled by T’Challa.",
    category: "worlds",
  },
  {
    id: "friends-coffeehouse",
    prompt: "What is the name of the coffeehouse in Friends?",
    options: ["Monk’s Café", "Central Perk", "Café Grumpy", "Luke’s"],
    answerIndex: 1,
    explanation: "Central Perk is the New York coffeehouse where the group regularly meets.",
    category: "tv",
  },
  {
    id: "mandalorian-child",
    prompt: "Which character does the Mandalorian protect for much of the series?",
    options: ["BB-8", "Grogu", "Ezra Bridger", "Finn"],
    answerIndex: 1,
    explanation: "Din Djarin becomes the protector of Grogu, also known as “the Child.”",
    category: "tv",
  },
  {
    id: "game-of-thrones-continent",
    prompt: "Most of Game of Thrones takes place on which continent?",
    options: ["Essos", "Westeros", "Sothoryos", "Ulthos"],
    answerIndex: 1,
    explanation: "Westeros is the primary setting for the struggle over the Iron Throne.",
    category: "worlds",
  },
  {
    id: "succession-company",
    prompt: "What media company is at the center of Succession?",
    options: ["Hooli", "Waystar Royco", "Sterling Cooper", "Pierpoint"],
    answerIndex: 1,
    explanation: "The Roy family fights for control of the fictional media conglomerate Waystar Royco.",
    category: "tv",
  },
  {
    id: "the-bear-city",
    prompt: "In which city is The Bear set?",
    options: ["New York", "Chicago", "Boston", "Philadelphia"],
    answerIndex: 1,
    explanation: "The Bear follows Carmy and his team in Chicago.",
    category: "tv",
  },
  {
    id: "mad-men-agency",
    prompt: "What advertising agency does Don Draper work for at the start of Mad Men?",
    options: ["Sterling Cooper", "McCann Erickson", "SC&P", "Ogilvy"],
    answerIndex: 0,
    explanation: "Mad Men begins at the New York advertising agency Sterling Cooper.",
    category: "tv",
  },
  {
    id: "sherlock-address",
    prompt: "What is Sherlock Holmes’ famous London address?",
    options: ["10 Downing Street", "221B Baker Street", "12 Grimmauld Place", "4 Privet Drive"],
    answerIndex: 1,
    explanation: "Sherlock Holmes and Dr. Watson live at 221B Baker Street.",
    category: "worlds",
  },
  {
    id: "doctor-who-ship",
    prompt: "What is the name of the Doctor’s time-travelling ship?",
    options: ["Enterprise", "Serenity", "TARDIS", "Rocinante"],
    answerIndex: 2,
    explanation: "The TARDIS is the Doctor’s time machine and spacecraft.",
    category: "tv",
  },
  {
    id: "back-to-future-speed",
    prompt: "At what speed must the DeLorean travel to time travel in Back to the Future?",
    options: ["66 mph", "88 mph", "100 mph", "120 mph"],
    answerIndex: 1,
    explanation: "The DeLorean requires 88 miles per hour to activate time travel.",
    category: "film",
  },
  {
    id: "alien-ship",
    prompt: "What is the name of the commercial spacecraft in Alien?",
    options: ["Nostromo", "Sulaco", "Discovery One", "Event Horizon"],
    answerIndex: 0,
    explanation: "The crew of Alien travels aboard the commercial towing vehicle Nostromo.",
    category: "film",
  },
  {
    id: "indiana-jones-artifact",
    prompt: "Which artifact does Indiana Jones seek in Raiders of the Lost Ark?",
    options: ["The Holy Grail", "The Ark of the Covenant", "The Crystal Skull", "The Sankara Stones"],
    answerIndex: 1,
    explanation: "Raiders of the Lost Ark follows Indiana Jones’ search for the Ark of the Covenant.",
    category: "film",
  },
  {
    id: "titanic-director",
    prompt: "Who directed Titanic?",
    options: ["James Cameron", "Ron Howard", "Peter Jackson", "Ridley Scott"],
    answerIndex: 0,
    explanation: "James Cameron wrote and directed Titanic, released in 1997.",
    category: "film",
  },
  {
    id: "dark-knight-villain",
    prompt: "Which villain is the primary antagonist in The Dark Knight?",
    options: ["Bane", "The Joker", "Two-Face", "Scarecrow"],
    answerIndex: 1,
    explanation: "The Joker is Batman’s central adversary in Christopher Nolan’s The Dark Knight.",
    category: "film",
  },
  {
    id: "barbie-director",
    prompt: "Who directed Barbie (2023)?",
    options: ["Sofia Coppola", "Greta Gerwig", "Emerald Fennell", "Chloé Zhao"],
    answerIndex: 1,
    explanation: "Greta Gerwig directed Barbie and co-wrote it with Noah Baumbach.",
    category: "film",
  },
  {
    id: "dune-planet",
    prompt: "What desert planet is central to Dune?",
    options: ["Caladan", "Arrakis", "Giedi Prime", "Kaitain"],
    answerIndex: 1,
    explanation: "Arrakis is the desert planet known as Dune and the source of spice melange.",
    category: "worlds",
  },
  {
    id: "sopranos-state",
    prompt: "The Sopranos is primarily set in which U.S. state?",
    options: ["New York", "New Jersey", "Pennsylvania", "Connecticut"],
    answerIndex: 1,
    explanation: "Tony Soprano’s family and crew are based in northern New Jersey.",
    category: "tv",
  },
  {
    id: "parks-rec-town",
    prompt: "What fictional Indiana town is the setting of Parks and Recreation?",
    options: ["Pawnee", "Hawkins", "Eagleton", "Greendale"],
    answerIndex: 0,
    explanation: "Leslie Knope works for the Parks Department in the fictional town of Pawnee, Indiana.",
    category: "tv",
  },
  {
    id: "good-place-architect",
    prompt: "Who serves as the architect of the Good Place neighborhood?",
    options: ["Chidi", "Michael", "Janet", "Tahani"],
    answerIndex: 1,
    explanation: "Michael introduces himself as the architect responsible for the neighborhood.",
    category: "tv",
  },
  {
    id: "severance-company",
    prompt: "What company employs the Macrodata Refinement team in Severance?",
    options: ["Lumon Industries", "Waystar Royco", "Hooli", "Aperture Science"],
    answerIndex: 0,
    explanation: "Mark and his co-workers work for Lumon Industries in Severance.",
    category: "tv",
  },
  {
    id: "the-wire-city",
    prompt: "Which city is the setting of The Wire?",
    options: ["Detroit", "Baltimore", "Washington, D.C.", "Newark"],
    answerIndex: 1,
    explanation: "The Wire examines institutions and communities across Baltimore, Maryland.",
    category: "tv",
  },
  {
    id: "rings-author",
    prompt: "Who wrote The Lord of the Rings novels?",
    options: ["C. S. Lewis", "J. R. R. Tolkien", "Ursula K. Le Guin", "Terry Pratchett"],
    answerIndex: 1,
    explanation: "J. R. R. Tolkien wrote The Hobbit and The Lord of the Rings.",
    category: "worlds",
  },
  {
    id: "crown-monarch",
    prompt: "The Crown dramatizes the reign of which British monarch?",
    options: ["Queen Victoria", "Queen Elizabeth II", "Queen Anne", "King George VI"],
    answerIndex: 1,
    explanation: "The Crown follows the reign and family life of Queen Elizabeth II.",
    category: "tv",
  },
  {
    id: "arrival-director",
    prompt: "Who directed Arrival?",
    options: ["Denis Villeneuve", "Alex Garland", "Christopher Nolan", "Alfonso Cuarón"],
    answerIndex: 0,
    explanation: "Denis Villeneuve directed Arrival, adapted from Ted Chiang’s story “Story of Your Life.”",
    category: "film",
  },
];

function hashDay(dayKey: string) {
  return Array.from(dayKey).reduce(
    (hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0,
    0,
  );
}

export function getTriviaDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getYesterdayKey(date = new Date()) {
  const yesterday = new Date(date);
  yesterday.setDate(date.getDate() - 1);
  return getTriviaDayKey(yesterday);
}

export function getDailyTrivia(date = new Date()) {
  const dayKey = getTriviaDayKey(date);
  const index = Math.abs(hashDay(dayKey)) % QUESTIONS.length;
  return QUESTIONS[index];
}

export function readDailyTriviaState(date = new Date()): DailyTriviaState {
  const dayKey = getTriviaDayKey(date);
  if (typeof window === "undefined") {
    return { dayKey, answered: false, selectedIndex: null, correct: false, streak: 0 };
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(TRIVIA_STORAGE_KEY) || "null",
    ) as Partial<DailyTriviaState> | null;

    if (parsed?.dayKey === dayKey) {
      return {
        dayKey,
        answered: parsed.answered === true,
        selectedIndex: typeof parsed.selectedIndex === "number" ? parsed.selectedIndex : null,
        correct: parsed.correct === true,
        streak: typeof parsed.streak === "number" && parsed.streak > 0 ? parsed.streak : 0,
      };
    }

    const carriedStreak =
      parsed?.dayKey === getYesterdayKey(date) &&
      parsed.correct === true &&
      typeof parsed.streak === "number" &&
      parsed.streak > 0
        ? parsed.streak
        : 0;

    return { dayKey, answered: false, selectedIndex: null, correct: false, streak: carriedStreak };
  } catch {
    return { dayKey, answered: false, selectedIndex: null, correct: false, streak: 0 };
  }
}

export function saveDailyTriviaAnswer(
  question: DailyTriviaQuestion,
  selectedIndex: number,
  date = new Date(),
) {
  const previous = readDailyTriviaState(date);
  const correct = selectedIndex === question.answerIndex;
  const state: DailyTriviaState = {
    dayKey: getTriviaDayKey(date),
    answered: true,
    selectedIndex,
    correct,
    streak: correct ? previous.streak + 1 : 0,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TRIVIA_STORAGE_KEY, JSON.stringify(state));
  }
  return state;
}

export const dailyTriviaQuestionCount = QUESTIONS.length;
