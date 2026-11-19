const REQUIRED_PROMPTS_PER_PLAYER = 3;
const PROMPT_OPTIONS_PER_TURN = 3;
const DEFAULT_PROMPTS = [
  "Mystery object",
  "Birthday cake",
  "Rocket ship",
  "Tiny castle",
  "Banana phone",
  "Lost robot",
];

function normalizePrompt(prompt) {
  return String(prompt || "").trim().replace(/\s+/g, " ");
}

function isHiddenHintCharacter(character) {
  return /[a-z0-9]/i.test(character);
}

function shufflePromptItems(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function validatePromptSubmission(promptInputs) {
  const prompts = (promptInputs || []).map(normalizePrompt).filter(Boolean);

  return {
    isValid: prompts.length === REQUIRED_PROMPTS_PER_PLAYER,
    prompts,
    missingCount: Math.max(0, REQUIRED_PROMPTS_PER_PLAYER - prompts.length),
    extraCount: Math.max(0, prompts.length - REQUIRED_PROMPTS_PER_PLAYER),
  };
}

function createPromptRecord(playerId, text) {
  return {
    id: `${playerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    playerId,
    text,
    createdAt: Date.now(),
  };
}

function createPlayerPromptRecords(playerId, promptInputs) {
  if (!playerId) {
    throw new Error("Player id is required to submit prompts.");
  }

  const result = validatePromptSubmission(promptInputs);

  if (!result.isValid) {
    throw new Error(`Each player must submit exactly ${REQUIRED_PROMPTS_PER_PLAYER} prompts.`);
  }

  return result.prompts.map((prompt) => createPromptRecord(playerId, prompt));
}

function getPromptText(prompt) {
  return typeof prompt === "string" ? normalizePrompt(prompt) : normalizePrompt(prompt.text);
}

function createPromptOptions(promptPool, optionCount = PROMPT_OPTIONS_PER_TURN) {
  const promptTexts = (promptPool || []).map(getPromptText).filter(Boolean);
  const options = shufflePromptItems(promptTexts).slice(0, optionCount);

  while (options.length < optionCount) {
    options.push(DEFAULT_PROMPTS[options.length % DEFAULT_PROMPTS.length]);
  }

  return options;
}

function createAnswerHint(promptText, revealedIndexes = []) {
  const revealed = new Set(revealedIndexes);

  return normalizePrompt(promptText)
    .split("")
    .map((character, index) => {
      if (!isHiddenHintCharacter(character)) {
        return character;
      }

      return revealed.has(index) ? character : "_";
    })
    .join("");
}

function getHiddenLetterIndexes(promptText, revealedIndexes = []) {
  const revealed = new Set(revealedIndexes);

  return normalizePrompt(promptText)
    .split("")
    .map((character, index) => ({ character, index }))
    .filter(({ character, index }) => {
      return isHiddenHintCharacter(character) && !revealed.has(index);
    })
    .map(({ index }) => index);
}

function pickRandomHiddenLetterIndex(promptText, revealedIndexes = []) {
  const hiddenIndexes = getHiddenLetterIndexes(promptText, revealedIndexes);

  if (hiddenIndexes.length === 0) {
    return null;
  }

  return hiddenIndexes[Math.floor(Math.random() * hiddenIndexes.length)];
}

class BlindfoldBrushPromptManager {
  constructor() {
    this.promptPool = [];
    this.playerPromptIds = new Map();
  }

  submitPlayerPrompts(playerId, promptInputs) {
    const prompts = createPlayerPromptRecords(playerId, promptInputs);

    this.removePlayerPrompts(playerId);
    this.promptPool.push(...prompts);
    this.playerPromptIds.set(playerId, prompts.map((prompt) => prompt.id));

    return prompts.map((prompt) => ({ ...prompt }));
  }

  removePlayerPrompts(playerId) {
    const promptIds = new Set(this.playerPromptIds.get(playerId) || []);

    if (promptIds.size === 0) {
      return;
    }

    this.promptPool = this.promptPool.filter((prompt) => !promptIds.has(prompt.id));
    this.playerPromptIds.delete(playerId);
  }

  hasSubmitted(playerId) {
    return this.playerPromptIds.has(playerId);
  }

  allPlayersSubmitted(playerIds) {
    return playerIds.length > 0 && playerIds.every((playerId) => this.hasSubmitted(playerId));
  }

  getPlayerPrompts(playerId) {
    const promptIds = new Set(this.playerPromptIds.get(playerId) || []);

    return this.promptPool
      .filter((prompt) => promptIds.has(prompt.id))
      .map((prompt) => ({ ...prompt }));
  }

  getPromptPool() {
    return this.promptPool.map((prompt) => ({ ...prompt }));
  }

  createOptions(optionCount = PROMPT_OPTIONS_PER_TURN) {
    return createPromptOptions(this.promptPool, optionCount);
  }

  addToGame(game) {
    if (!game || typeof game.addPrompts !== "function") {
      throw new Error("Game must support addPrompts(playerId, prompts).");
    }

    this.promptPool.forEach((prompt) => {
      game.addPrompts(prompt.playerId, [prompt.text]);
    });
  }

  clear() {
    this.promptPool = [];
    this.playerPromptIds.clear();
  }
}

window.BlindfoldBrushPrompts = {
  REQUIRED_PROMPTS_PER_PLAYER,
  PROMPT_OPTIONS_PER_TURN,
  DEFAULT_PROMPTS,
  BlindfoldBrushPromptManager,
  createAnswerHint,
  createPlayerPromptRecords,
  createPromptOptions,
  getHiddenLetterIndexes,
  normalizePrompt,
  pickRandomHiddenLetterIndex,
  validatePromptSubmission,
};
