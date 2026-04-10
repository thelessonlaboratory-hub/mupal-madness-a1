// Mupal Madness — Version 1 Core Simulation Engine
// Phase 1 prototype: no UI, no artwork, no screen flow.
// Purpose: generate a valid run, resolve matchups, and simulate a full tournament.

/**
 * @typedef {"cold" | "temperate" | "hot"} Temperature
 * @typedef {"bright" | "variable" | "dark"} Light
 */

const EAR_TRAITS = [
  {
    id: "ears_super_small",
    label: "Super small, super hairy ears",
    modifiers: { cold: 3, temperate: 0, hot: -3 },
  },
  {
    id: "ears_small",
    label: "Small, hairy ears",
    modifiers: { cold: 2, temperate: 1, hot: -2 },
  },
  {
    id: "ears_medium",
    label: "Medium, not hairy ears",
    modifiers: { cold: 0, temperate: 3, hot: -1 },
  },
  {
    id: "ears_large",
    label: "Large, not hairy ears",
    modifiers: { cold: -1, temperate: 1, hot: 0 },
  },
  {
    id: "ears_very_large",
    label: "Very large ears with extra capillaries",
    modifiers: { cold: -3, temperate: 0, hot: 3 },
  },
];

const EYE_TRAITS = [
  {
    id: "eyes_very_small",
    label: "Very small eyes, excellent color vision",
    modifiers: { bright: 3, variable: 0, dark: -3 },
  },
  {
    id: "eyes_small",
    label: "Small eyes, good color vision",
    modifiers: { bright: 2, variable: 1, dark: -2 },
  },
  {
    id: "eyes_medium",
    label: "Medium eyes, fair color vision",
    modifiers: { bright: 0, variable: 3, dark: -1 },
  },
  {
    id: "eyes_large",
    label: "Large eyes, poor color vision",
    modifiers: { bright: -1, variable: 1, dark: 0 },
  },
  {
    id: "eyes_very_large",
    label: "Very large eyes, no color vision",
    modifiers: { bright: -3, variable: 0, dark: 3 },
  },
];

const TEMPERATURE_STATES = ["cold", "temperate", "hot"];
const LIGHT_STATES = ["bright", "variable", "dark"];

const NAME_PARTS_A = [
  "Di", "Ta", "Du", "Mo", "By", "Ib", "Yo", "Ya", "Lu", "Ke",
  "Xo", "U", "Gry", "Do", "Gi", "Qu", "Za", "Pe", "Ri", "Su",
];
const NAME_PARTS_B = [
  "j", "billy", "py", "lish", "z", "bick", "sa", "pple", "bz", "bel",
  "p", "sho", "nn", "hi", "ster", "id", "lo", "va", "din", "mar",
];

/** @returns {number} */
function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

/** @returns {number} */
function roll2d6() {
  return rollDie() + rollDie();
}

/**
 * Maps 1d6 -> one of three equally probable states.
 * @template T
 * @param {readonly T[]} values
 * @returns {T}
 */
function rollThreeState(values) {
  const roll = rollDie();
  if (roll <= 2) return values[0];
  if (roll <= 4) return values[1];
  return values[2];
}

/**
 * @param {readonly {id:string}[]} list
 * @param {string} id
 */
function getTraitById(list, id) {
  const trait = list.find((item) => item.id === id);
  if (!trait) throw new Error(`Unknown trait id: ${id}`);
  return trait;
}

/**
 * @param {Set<string>} usedNames
 * @returns {string}
 */
function generateUniqueName(usedNames) {
  for (let i = 0; i < 100; i += 1) {
    const name = `${NAME_PARTS_A[Math.floor(Math.random() * NAME_PARTS_A.length)]}${NAME_PARTS_B[Math.floor(Math.random() * NAME_PARTS_B.length)]}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  throw new Error("Failed to generate a unique Mupal name.");
}

/**
 * @typedef Mupal
 * @property {string} name
 * @property {string} ears
 * @property {string} eyes
 * @property {boolean} isStudent
 */

/**
 * @param {Partial<Mupal>} input
 * @returns {Mupal}
 */
function createMupal(input) {
  return {
    name: input.name ?? "",
    ears: input.ears ?? "",
    eyes: input.eyes ?? "",
    isStudent: input.isStudent ?? false,
  };
}

/**
 * @returns {{temperature: Temperature, light: Light}}
 */
function rollEnvironment() {
  return {
    temperature: rollThreeState(TEMPERATURE_STATES),
    light: rollThreeState(LIGHT_STATES),
  };
}

/**
 * @param {Mupal} mupal
 * @param {{temperature: Temperature, light: Light}} environment
 */
function getModifiers(mupal, environment) {
  const earTrait = getTraitById(EAR_TRAITS, mupal.ears);
  const eyeTrait = getTraitById(EYE_TRAITS, mupal.eyes);

  return {
    earModifier: earTrait.modifiers[environment.temperature],
    eyeModifier: eyeTrait.modifiers[environment.light],
  };
}

/**
 * @param {Mupal} mupal
 * @param {{temperature: Temperature, light: Light}} environment
 */
function calculateFinalScore(mupal, environment) {
  const baseRoll = roll2d6();
  const { earModifier, eyeModifier } = getModifiers(mupal, environment);
  return {
    baseRoll,
    earModifier,
    eyeModifier,
    finalScore: baseRoll + earModifier + eyeModifier,
  };
}

/**
 * Resolves one matchup using repeated rerolls on ties.
 * @param {Mupal} mupalA
 * @param {Mupal} mupalB
 * @param {{temperature: Temperature, light: Light}} environment
 */
function resolveMatchup(mupalA, mupalB, environment) {
  /** @type {Array<{mupalA: ReturnType<typeof calculateFinalScore>, mupalB: ReturnType<typeof calculateFinalScore>}>} */
  const rounds = [];

  while (true) {
    const resultA = calculateFinalScore(mupalA, environment);
    const resultB = calculateFinalScore(mupalB, environment);
    rounds.push({ mupalA: resultA, mupalB: resultB });

    if (resultA.finalScore > resultB.finalScore) {
      return {
        mupalA,
        mupalB,
        rounds,
        winner: mupalA,
        loser: mupalB,
      };
    }

    if (resultB.finalScore > resultA.finalScore) {
      return {
        mupalA,
        mupalB,
        rounds,
        winner: mupalB,
        loser: mupalA,
      };
    }
  }
}

/**
 * @template T
 * @param {T[]} items
 * @returns {T[]}
 */
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Returns true if generated Mupals satisfy the simulator's diversity guardrails.
 * This version requires at least 3 distinct ear traits, at least 3 distinct eye traits,
 * and fully unique ear+eye combinations among the 7 generated Mupals.
 * @param {Mupal[]} generated
 */
function passesDiversityGuardrails(generated) {
  const distinctEars = new Set(generated.map((m) => m.ears));
  const distinctEyes = new Set(generated.map((m) => m.eyes));
  if (distinctEars.size < 3) return false;
  if (distinctEyes.size < 3) return false;

  const seenCombos = new Set();
  for (const mupal of generated) {
    const key = `${mupal.ears}__${mupal.eyes}`;
    if (seenCombos.has(key)) return false;
    seenCombos.add(key);
  }

  return true;
}

/**
 * Generates 7 non-student Mupals using constrained randomness.
 * @param {Set<string>} usedNames
 * @returns {Mupal[]}
 */
function generateGeneratedMupals(usedNames) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const generated = Array.from({ length: 7 }, () => {
      const ear = EAR_TRAITS[Math.floor(Math.random() * EAR_TRAITS.length)].id;
      const eye = EYE_TRAITS[Math.floor(Math.random() * EYE_TRAITS.length)].id;
      return createMupal({
        name: generateUniqueName(usedNames),
        ears: ear,
        eyes: eye,
        isStudent: false,
      });
    });

    if (passesDiversityGuardrails(generated)) {
      return generated;
    }

    // Reset used names from this failed attempt.
    for (const mupal of generated) {
      usedNames.delete(mupal.name);
    }
  }

  throw new Error("Failed to generate a valid set of Mupals after repeated attempts.");
}

/**
 * Creates 4 Round 1 matchups from 8 total Mupals.
 * @param {Mupal} studentMupal
 * @param {Mupal[]} generatedMupals
 */
function generateInitialBracket(studentMupal, generatedMupals) {
  const all = shuffle([studentMupal, ...generatedMupals]);
  /** @type {Array<{mupalA:Mupal, mupalB:Mupal, winner:null}>} */
  const bracket = [];
  for (let i = 0; i < all.length; i += 2) {
    bracket.push({
      mupalA: all[i],
      mupalB: all[i + 1],
      winner: null,
    });
  }
  return bracket;
}

/**
 * Resolves a full round of matchups.
 * @param {Array<{mupalA:Mupal, mupalB:Mupal, winner:null|Mupal}>} matchups
 * @param {{temperature: Temperature, light: Light}} environment
 */
function resolveRound(matchups, environment) {
  const results = matchups.map((matchup) => resolveMatchup(matchup.mupalA, matchup.mupalB, environment));
  return {
    results,
    winners: results.map((result) => result.winner),
  };
}

/**
 * @param {Mupal[]} winners
 */
function buildNextRoundMatchups(winners) {
  const matchups = [];
  for (let i = 0; i < winners.length; i += 2) {
    matchups.push({
      mupalA: winners[i],
      mupalB: winners[i + 1],
      winner: null,
    });
  }
  return matchups;
}

/**
 * Runs a complete no-UI tournament with no intervention.
 * This is the correct first engine milestone.
 * @param {{ name: string, ears: string, eyes: string }} studentInput
 */
function simulateTournament(studentInput) {
  const usedNames = new Set();
  if (!studentInput.name || usedNames.has(studentInput.name)) {
    throw new Error("Student Mupal must have a unique, non-empty name.");
  }
  usedNames.add(studentInput.name);

  const studentMupal = createMupal({ ...studentInput, isStudent: true });
  const generatedMupals = generateGeneratedMupals(usedNames);
  const environment = rollEnvironment();

  const round1Matchups = generateInitialBracket(studentMupal, generatedMupals);
  const round1 = resolveRound(round1Matchups, environment);

  const round2Matchups = buildNextRoundMatchups(round1.winners);
  const round2 = resolveRound(round2Matchups, environment);

  const finalMatchups = buildNextRoundMatchups(round2.winners);
  const finalRound = resolveRound(finalMatchups, environment);

  return {
    environment,
    studentMupal,
    generatedMupals,
    round1,
    round2,
    finalRound,
    champion: finalRound.winners[0],
  };
}

// Optional browser/global exports.
window.MupalEngineV1 = {
  EAR_TRAITS,
  EYE_TRAITS,
  rollEnvironment,
  getModifiers,
  calculateFinalScore,
  resolveMatchup,
  generateGeneratedMupals,
  generateInitialBracket,
  resolveRound,
  simulateTournament,
};

/*
Example manual test in browser console:

const result = window.MupalEngineV1.simulateTournament({
  name: "Grace",
  ears: "ears_small",
  eyes: "eyes_medium",
});
console.log(result);
*/
