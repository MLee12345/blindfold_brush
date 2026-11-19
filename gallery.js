const GALLERY_SORTS = {
  newest: "newest",
  oldest: "oldest",
  artist: "artist",
  prompt: "prompt",
};

const GALLERY_LIMITS = {
  promptPreviewLength: 42,
  artistNameLength: 24,
};

function createGalleryId(prefix = "drawing") {
  if (window.crypto && window.crypto.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanGalleryText(value, fallback = "") {
  return String(value || fallback)
    .trim()
    .replace(/\s+/g, " ");
}

function truncateGalleryText(value, maxLength) {
  const text = cleanGalleryText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function isValidDrawingDataUrl(drawingDataUrl) {
  return typeof drawingDataUrl === "string" && drawingDataUrl.startsWith("data:image/");
}

function findGalleryArtist(players = [], artistId = null) {
  return players.find((player) => player.id === artistId) || null;
}

function createGalleryEntry({
  id = createGalleryId(),
  drawingDataUrl,
  prompt = "Mystery object",
  artistId = null,
  artistName = "Unknown artist",
  roundNumber = 1,
  cycleNumber = null,
  correctGuessCount = 0,
  guessedPlayerIds = [],
  createdAt = Date.now(),
} = {}) {
  if (!isValidDrawingDataUrl(drawingDataUrl)) {
    throw new Error("Gallery entry requires a drawing image data URL.");
  }

  const safePrompt = cleanGalleryText(prompt, "Mystery object");
  const safeArtistName = truncateGalleryText(artistName, GALLERY_LIMITS.artistNameLength) || "Unknown artist";

  return {
    id: String(id),
    drawingDataUrl,
    prompt: safePrompt,
    promptPreview: truncateGalleryText(safePrompt, GALLERY_LIMITS.promptPreviewLength),
    artistId,
    artistName: safeArtistName,
    roundNumber: Math.max(1, Number(roundNumber) || 1),
    cycleNumber: cycleNumber === null ? null : Math.max(1, Number(cycleNumber) || 1),
    correctGuessCount: Math.max(0, Number(correctGuessCount) || 0),
    guessedPlayerIds: [...guessedPlayerIds],
    createdAt: Number(createdAt) || Date.now(),
  };
}

function createGalleryEntryFromGame({ drawingDataUrl, gameState = {}, roundResult = {}, players = [] } = {}) {
  const artistId = roundResult.artistId || gameState.currentArtistId;
  const artist = findGalleryArtist(players.length ? players : gameState.players, artistId);
  const correctGuesses = roundResult.correctGuesses || gameState.correctGuesses || [];
  const guessedPlayerIds = roundResult.guessedPlayerIds || gameState.guessedPlayerIds || [];

  return createGalleryEntry({
    drawingDataUrl,
    prompt: roundResult.prompt || gameState.currentPrompt,
    artistId,
    artistName: artist ? artist.nickname || artist.name : "Unknown artist",
    roundNumber: roundResult.roundNumber || gameState.turnNumber || 1,
    cycleNumber: roundResult.cycleNumber || gameState.cycleNumber || null,
    correctGuessCount: correctGuesses.length || guessedPlayerIds.length,
    guessedPlayerIds,
    createdAt: roundResult.roundEndedAt || Date.now(),
  });
}

function sortGalleryEntries(entries = [], sortBy = GALLERY_SORTS.newest) {
  const sortedEntries = [...entries];

  if (sortBy === GALLERY_SORTS.oldest) {
    return sortedEntries.sort((firstEntry, secondEntry) => firstEntry.createdAt - secondEntry.createdAt);
  }

  if (sortBy === GALLERY_SORTS.artist) {
    return sortedEntries.sort((firstEntry, secondEntry) => {
      return firstEntry.artistName.localeCompare(secondEntry.artistName);
    });
  }

  if (sortBy === GALLERY_SORTS.prompt) {
    return sortedEntries.sort((firstEntry, secondEntry) => {
      return firstEntry.prompt.localeCompare(secondEntry.prompt);
    });
  }

  return sortedEntries.sort((firstEntry, secondEntry) => secondEntry.createdAt - firstEntry.createdAt);
}

function filterGalleryEntries(entries = [], searchText = "") {
  const query = cleanGalleryText(searchText).toLowerCase();

  if (!query) {
    return [...entries];
  }

  return entries.filter((entry) => {
    return (
      entry.prompt.toLowerCase().includes(query) ||
      entry.artistName.toLowerCase().includes(query)
    );
  });
}

function createGalleryView(entries = [], { players = [], searchText = "", sortBy = GALLERY_SORTS.newest } = {}) {
  const hydratedEntries = entries.map((entry) => {
    const artist = findGalleryArtist(players, entry.artistId);

    if (!artist) {
      return { ...entry };
    }

    return {
      ...entry,
      artistName: artist.nickname || artist.name || entry.artistName,
    };
  });

  return sortGalleryEntries(filterGalleryEntries(hydratedEntries, searchText), sortBy);
}

function getGalleryStats(entries = []) {
  const artistIds = new Set(entries.map((entry) => entry.artistId).filter(Boolean));
  const totalCorrectGuesses = entries.reduce((total, entry) => total + entry.correctGuessCount, 0);

  return {
    totalDrawings: entries.length,
    totalArtists: artistIds.size,
    totalCorrectGuesses,
  };
}

class BlindfoldBrushGallery {
  constructor(entries = []) {
    this.entries = entries.map((entry) => ({ ...entry }));
  }

  add(entry) {
    const nextEntry = createGalleryEntry(entry);
    this.entries.push(nextEntry);
    return nextEntry;
  }

  addFromGame(data) {
    const nextEntry = createGalleryEntryFromGame(data);
    this.entries.push(nextEntry);
    return nextEntry;
  }

  remove(entryId) {
    this.entries = this.entries.filter((entry) => entry.id !== entryId);
    return this.list();
  }

  clear() {
    this.entries = [];
  }

  list(options = {}) {
    return createGalleryView(this.entries, options);
  }

  find(entryId) {
    const entry = this.entries.find((savedEntry) => savedEntry.id === entryId);
    return entry ? { ...entry } : null;
  }

  stats() {
    return getGalleryStats(this.entries);
  }
}

window.BlindfoldBrushGallery = {
  GALLERY_LIMITS,
  GALLERY_SORTS,
  BlindfoldBrushGallery,
  cleanGalleryText,
  createGalleryEntry,
  createGalleryEntryFromGame,
  createGalleryId,
  createGalleryView,
  filterGalleryEntries,
  findGalleryArtist,
  getGalleryStats,
  isValidDrawingDataUrl,
  sortGalleryEntries,
  truncateGalleryText,
};
