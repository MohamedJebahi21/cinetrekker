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
];

function hashDay(dayKey: string) {
  return Array.from(dayKey).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}

export function getTriviaDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
    const parsed = JSON.parse(window.localStorage.getItem("cinetrekker_daily_trivia_v1") || "null") as Partial<DailyTriviaState> | null;
    if (!parsed || parsed.dayKey !== dayKey) {
      return { dayKey, answered: false, selectedIndex: null, correct: false, streak: parsed?.streak || 0 };
    }
    return {
      dayKey,
      answered: parsed.answered === true,
      selectedIndex: typeof parsed.selectedIndex === "number" ? parsed.selectedIndex : null,
      correct: parsed.correct === true,
      streak: typeof parsed.streak === "number" && parsed.streak > 0 ? parsed.streak : 0,
    };
  } catch {
    return { dayKey, answered: false, selectedIndex: null, correct: false, streak: 0 };
  }
}

export function saveDailyTriviaAnswer(question: DailyTriviaQuestion, selectedIndex: number, date = new Date()) {
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
    window.localStorage.setItem("cinetrekker_daily_trivia_v1", JSON.stringify(state));
  }
  return state;
}
