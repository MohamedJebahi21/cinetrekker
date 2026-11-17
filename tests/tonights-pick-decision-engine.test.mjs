import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tonightsPickPath = new URL("../src/components/home/TonightsPick.tsx", import.meta.url);
const homePagePath = new URL("../src/pages/Index.tsx", import.meta.url);
const heroSectionPath = new URL("../src/components/HeroSection.tsx", import.meta.url);

test("TonightsPick provides a clean hero trigger with guided step-by-step modal", async () => {
  const [pickSource, homeSource, heroSource] = await Promise.all([
    readFile(tonightsPickPath, "utf8"),
    readFile(homePagePath, "utf8"),
    readFile(heroSectionPath, "utf8"),
  ]);

  // Component structure & export
  assert.match(pickSource, /export function TonightsPick/);
  assert.match(pickSource, /id="tonights-pick"/);

  // Clean collapsed homepage state: single prominent CTA button
  assert.match(pickSource, /handleOpenModal/);
  assert.match(pickSource, /decideWhatToWatch/);

  // Guided modal dialog integration
  assert.match(pickSource, /Dialog/);
  assert.match(pickSource, /DialogContent/);
  assert.match(pickSource, /isModalOpen/);
  assert.match(pickSource, /modalStep/);

  // Step-by-step navigation
  assert.match(pickSource, /handleNextStep/);
  assert.match(pickSource, /handlePrevStep/);
  assert.match(pickSource, /handleDecide/);

  // Vibe options
  assert.match(pickSource, /High-Octane/);
  assert.match(pickSource, /Laugh Out Loud/);
  assert.match(pickSource, /Mind-Bending/);
  assert.match(pickSource, /Chilling & Dark/);
  assert.match(pickSource, /Deep & Gripping/);
  assert.match(pickSource, /Cozy & Feel-Good/);

  // Time & format options (including movies and TV series)
  assert.match(pickSource, /Under 95 min/);
  assert.match(pickSource, /95–130 min/);
  assert.match(pickSource, /130\+ min/);
  assert.match(pickSource, /TV Series/);

  // Era filters
  assert.match(pickSource, /Any Era \(Top Rated\)/);
  assert.match(pickSource, /Recent \(2020s\)/);
  assert.match(pickSource, /2000s–2010s/);
  assert.match(pickSource, /Pre-2000 Classics/);

  // Watched exclusion to never recommend finished titles
  assert.match(pickSource, /new Set\(watched\.map\(\(w\) => w\.mediaId\)\)/);
  assert.match(pickSource, /!watchedIds\.has\(item\.id\)/);

  // Decisive actions on pick within modal result view
  assert.match(pickSource, /handleRollAnother/);
  assert.match(pickSource, /TrailerModal/);
  assert.match(pickSource, /addToWatchlist/);
  assert.match(pickSource, /addToWatched/);
  assert.match(pickSource, /buildMediaPath/);

  // Integration into Home
  assert.match(homeSource, /import \{ TonightsPick \} from "@/);
  assert.match(homeSource, /<TonightsPick \/>/);

  // Hero integration
  assert.match(heroSource, /#tonights-pick/);
  assert.match(heroSource, /ArrowLeft/);
  assert.match(heroSource, /ArrowRight/);
});
