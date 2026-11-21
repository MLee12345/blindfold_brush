const ROOM_CODE_LENGTH = 4;
const MAX_ACTIVE_PLAYERS = 6;
const MIN_ACTIVE_PLAYERS = 2;
const ROOM_STORAGE_PREFIX = "blindfold-brush-room:";
const ROOM_PHASES = {
  lobby: "lobby",
  promptSubmission: "prompt-submission",
  inGame: "in-game",
  complete: "complete",
  closed: "closed",
};

const INITIAL_PROMPTS = [
  "Apple", "Ball", "Boat", "Book", "Bus", "Cake", "Car", "Cat", "Cloud", "Crown",
  "Dog", "Door", "Duck", "Eye", "Fish", "Flower", "Fork", "Hat", "House", "Key",
  "Moon", "Mug", "Pencil", "Pizza", "Rainbow", "Shoe", "Star", "Sun", "Tree", "Train",
  "Umbrella", "Whale", "Bicycle", "Butterfly", "Camera", "Castle", "Chicken", "Clock",
  "Cupcake", "Dinosaur", "Donut", "Dragon", "Elephant", "Firework", "Guitar", "Helicopter",
  "Ice cream", "Jacket", "Lighthouse", "Mermaid", "Octopus", "Parachute", "Penguin", "Rocket",
  "Sandwich", "Snowman", "Telescope", "Toothbrush", "Volcano", "Windmill", "Wizard", "Backpack",
  "Campfire", "Compass", "Easel", "Feather", "Galaxy", "Ghost", "Magnet", "Mountain", "Robot",
  "Satellite", "Scarecrow", "Treasure chest", "Anchor", "Aquarium", "Astronaut", "Barn", "Bridge",
  "Cabin", "Cactus", "Candle", "Carousel", "Chameleon", "Chef", "Chimney", "Cookie", "Dolphin",
  "Drum", "Ferris wheel", "Fireplace", "Flamingo", "Fountain", "Globe", "Kangaroo", "Kite", "Ladder",
  "Lantern", "Piano", "Pirate", "Puzzle", "Shark", "Skis", "Swing", "Tiger", "Tractor", "Trumpet",
  "Turtle", "Violin",
];

function createInitialPromptOptions() {
  return [...INITIAL_PROMPTS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}

function createNextPromptOptions(room) {
  const history = new Set(
    (Array.isArray(room.promptHistory) ? room.promptHistory : Object.values(room.promptHistory || {}))
      .filter((prompt) => INITIAL_PROMPTS.includes(prompt)),
  );
  const availablePrompts = INITIAL_PROMPTS.filter((prompt) => !history.has(prompt));
  const promptSource = availablePrompts.length >= 3
    ? availablePrompts
    : INITIAL_PROMPTS.filter((prompt) => prompt !== room.selectedPrompt);

  return [...promptSource]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}

function createRoomCode(existingCodes = []) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const usedCodes = new Set(existingCodes.map(normalizeRoomCode));
  let code = "";

  do {
    code = "";

    for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  } while (usedCodes.has(code));

  return code;
}

function normalizeRoomCode(roomCode) {
  return String(roomCode || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, ROOM_CODE_LENGTH);
}

function createPlayerId() {
  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createPlayerRecord(player, { isHost = false, isSpectator = false } = {}) {
  if (!player || !player.id) {
    throw new Error("Player must include an id.");
  }

  return {
    id: String(player.id),
    nickname: String(player.nickname || "Player").trim() || "Player",
    avatar: player.avatar || null,
    isHost,
    isSpectator,
    isActive: true,
    promptsSubmitted: Boolean(player.promptsSubmitted),
    joinedAt: Date.now(),
  };
}

function createRoom(hostPlayer, existingCodes = []) {
  const code = createRoomCode(existingCodes);
  const host = createPlayerRecord(hostPlayer, { isHost: true });

  return {
    code,
    phase: ROOM_PHASES.inGame,
    hostId: host.id,
    players: [host],
    currentArtistId: host.id,
    promptOptions: createInitialPromptOptions(),
    promptHistory: [],
    selectedPrompt: null,
    roundStartedAt: null,
    roundEndsAt: null,
    resultsEndsAt: null,
    correctGuessers: [],
    drawingDataUrl: null,
    roundPoints: [],
    roundResult: null,
    messages: [],
    scores: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function cloneRoom(room) {
  return {
    ...room,
    players: room.players.map((player) => ({ ...player })),
  };
}

function getActivePlayers(room) {
  return room.players.filter((player) => player.isActive && !player.isSpectator);
}

function findPlayer(room, playerId) {
  return room.players.find((player) => player.id === playerId);
}

function joinRoom(room, player, { forceSpectator = false } = {}) {
  if (!room || room.phase === ROOM_PHASES.closed) {
    throw new Error("Room is not available.");
  }

  const nextRoom = cloneRoom(room);
  const existingPlayer = findPlayer(nextRoom, player.id);
  const activePlayerCount = getActivePlayers(nextRoom).length;
  const joinsAsSpectator = forceSpectator || nextRoom.phase !== ROOM_PHASES.lobby || activePlayerCount >= MAX_ACTIVE_PLAYERS;

  if (existingPlayer) {
    Object.assign(existingPlayer, createPlayerRecord({ ...existingPlayer, ...player }, {
      isHost: existingPlayer.id === nextRoom.hostId,
      isSpectator: existingPlayer.isSpectator,
    }));
    existingPlayer.isActive = true;
    existingPlayer.promptsSubmitted = "promptsSubmitted" in player
      ? Boolean(player.promptsSubmitted)
      : existingPlayer.promptsSubmitted;
  } else {
    nextRoom.players.push(createPlayerRecord(player, { isSpectator: joinsAsSpectator }));
  }

  nextRoom.updatedAt = Date.now();
  return nextRoom;
}

function leaveRoom(room, playerId) {
  const nextRoom = cloneRoom(room);
  const leavingPlayer = findPlayer(nextRoom, playerId);

  if (!leavingPlayer) {
    return nextRoom;
  }

  leavingPlayer.isActive = false;
  leavingPlayer.promptsSubmitted = false;

  const remainingActivePlayers = nextRoom.players.filter((player) => player.isActive);

  if (remainingActivePlayers.length === 0) {
    nextRoom.phase = ROOM_PHASES.closed;
    nextRoom.hostId = null;
  } else if (nextRoom.hostId === playerId) {
    const nextHost = remainingActivePlayers.find((player) => !player.isSpectator) || remainingActivePlayers[0];
    nextRoom.hostId = nextHost.id;
    nextRoom.players.forEach((player) => {
      player.isHost = player.id === nextRoom.hostId;
    });
  }

  nextRoom.updatedAt = Date.now();
  return nextRoom;
}

function setPromptSubmissionStatus(room, playerId, promptsSubmitted) {
  const nextRoom = cloneRoom(room);
  const player = findPlayer(nextRoom, playerId);

  if (player) {
    player.promptsSubmitted = Boolean(promptsSubmitted);
    nextRoom.updatedAt = Date.now();
  }

  return nextRoom;
}

function canStartGame(room) {
  const activePlayers = getActivePlayers(room);

  return (
    room.phase === ROOM_PHASES.lobby &&
    activePlayers.length >= MIN_ACTIVE_PLAYERS &&
    activePlayers.length <= MAX_ACTIVE_PLAYERS &&
    activePlayers.every((player) => player.promptsSubmitted)
  );
}

function startRoomGame(room, hostId) {
  if (room.hostId !== hostId) {
    throw new Error("Only the host can start the game.");
  }

  if (!canStartGame(room)) {
    throw new Error("Room is not ready to start.");
  }

  const nextRoom = cloneRoom(room);
  nextRoom.phase = ROOM_PHASES.inGame;
  nextRoom.updatedAt = Date.now();
  return nextRoom;
}

function resetRoomForNewGame(room, hostId) {
  if (room.hostId !== hostId) {
    throw new Error("Only the host can start a new game.");
  }

  const nextRoom = cloneRoom(room);
  nextRoom.phase = ROOM_PHASES.lobby;
  nextRoom.players = nextRoom.players
    .filter((player) => player.isActive)
    .map((player) => ({
      ...player,
      isSpectator: false,
      promptsSubmitted: false,
    }));
  nextRoom.updatedAt = Date.now();
  return nextRoom;
}

function createInviteLink(roomCode, baseUrl = window.location.href) {
  const url = new URL(baseUrl);
  url.searchParams.set("room", normalizeRoomCode(roomCode));
  return url.toString();
}

// Message shown when a room code does not exist online.
const ROOM_NOT_FOUND_MESSAGE = "Room not found.";

// Rooms are saved online in Firebase (see network.js), so players on
// different devices can create and join the same room code.
class BlindfoldBrushRoomManager {
  constructor(network = window.BlindfoldBrushNetwork) {
    if (!network) {
      throw new Error("network.js is not loaded.");
    }

    this.network = network;
  }

  // Creates a room with a code nobody else is using.
  async create(hostPlayer) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const room = createRoom(hostPlayer);
      const wasSaved = await this.network.saveNewRoom(room);

      if (wasSaved) {
        return room;
      }
    }

    throw new Error("Could not find a free room code. Please try again.");
  }

  // Reads a room once. Returns null if it does not exist.
  async get(roomCode) {
    return this.network.loadRoom(normalizeRoomCode(roomCode));
  }

  // Updates the current online room while keeping the room manager API simple
  // for the game UI. Firebase applies the replacement transaction atomically.
  async update(room) {
    if (!room || !room.code) {
      throw new Error("Room data is required.");
    }

    const code = normalizeRoomCode(room.code);
    const updatedRoom = await this.network.changeRoom(code, (currentRoom) => {
      if (!currentRoom) {
        return undefined;
      }

      return {
        ...currentRoom,
        ...cloneRoom(room),
        code,
        updatedAt: Date.now(),
      };
    });

    if (!updatedRoom) {
      throw new Error(ROOM_NOT_FOUND_MESSAGE);
    }

    return updatedRoom;
  }

  async recordCorrectGuess(roomCode, { playerId, playerName, guessPoints, artistPoints }) {
    const code = normalizeRoomCode(roomCode);
    const updatedRoom = await this.network.changeRoom(code, (currentRoom) => {
      if (!currentRoom) {
        return undefined;
      }

      const correctGuessers = Array.isArray(currentRoom.correctGuessers)
        ? currentRoom.correctGuessers
        : Object.values(currentRoom.correctGuessers || {});

      if (correctGuessers.includes(playerId)) {
        return currentRoom;
      }

      const roundPoints = Array.isArray(currentRoom.roundPoints)
        ? currentRoom.roundPoints.map((entry) => ({ ...entry }))
        : Object.values(currentRoom.roundPoints || {}).map((entry) => ({ ...entry }));
      const safeGuessPoints = Math.max(0, Math.round(Number(guessPoints) || 0));
      const safeArtistPoints = Math.max(0, Math.round(Number(artistPoints) || 0));
      const artistId = currentRoom.currentArtistId || currentRoom.hostId;
      const artist = (currentRoom.players || []).find((player) => player.id === artistId);

      const guesserRoundPoints = roundPoints.find((entry) => entry.playerId === playerId);

      if (guesserRoundPoints) {
        guesserRoundPoints.points += safeGuessPoints;
      } else {
        roundPoints.push({ playerId, playerName, points: safeGuessPoints });
      }

      if (artist) {
        const artistRoundPoints = roundPoints.find((entry) => entry.playerId === artist.id);

        if (artistRoundPoints) {
          artistRoundPoints.points += safeArtistPoints;
        } else {
          roundPoints.push({ playerId: artist.id, playerName: artist.nickname, points: safeArtistPoints });
        }
      }

      return {
        ...currentRoom,
        roundPoints,
        correctGuessers: [...correctGuessers, playerId],
        messages: [
          ...(Array.isArray(currentRoom.messages) ? currentRoom.messages : Object.values(currentRoom.messages || {})),
          {
            id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: "system",
            text: `${playerName} guessed the word!`,
            createdAt: Date.now(),
          },
        ].slice(-100),
        updatedAt: Date.now(),
      };
    });

    if (!updatedRoom) {
      throw new Error(ROOM_NOT_FOUND_MESSAGE);
    }

    return updatedRoom;
  }

  async finalizeRound(roomCode, resultsLengthSeconds) {
    const code = normalizeRoomCode(roomCode);
    const duration = Math.max(1, Math.round(Number(resultsLengthSeconds) || 1));
    const updatedRoom = await this.network.changeRoom(code, (currentRoom) => {
      if (!currentRoom) {
        return undefined;
      }

      if (currentRoom.roundResult && currentRoom.resultsEndsAt) {
        return currentRoom;
      }

      const roundPoints = Array.isArray(currentRoom.roundPoints)
        ? currentRoom.roundPoints
        : Object.values(currentRoom.roundPoints || {});
      const finalizedPoints = roundPoints.map((entry) => ({
        ...entry,
        points: Math.max(0, Math.round(Number(entry.points) || 0)),
      }));
      const scores = { ...(currentRoom.scores || {}) };

      finalizedPoints.forEach((entry) => {
        scores[entry.playerId] = (scores[entry.playerId] || 0) + entry.points;
      });

      const players = getActivePlayers(currentRoom);
      const currentArtistId = currentRoom.currentArtistId || currentRoom.hostId;
      const currentArtistIndex = players.findIndex((player) => player.id === currentArtistId);
      const nextArtist = players.length
        ? players[(currentArtistIndex < 0 ? 0 : currentArtistIndex + 1) % players.length]
        : null;

      return {
        ...currentRoom,
        scores,
        currentArtistId: nextArtist?.id || null,
        promptOptions: createNextPromptOptions(currentRoom),
        selectedPrompt: null,
        roundStartedAt: null,
        roundEndsAt: null,
        correctGuessers: [],
        drawingDataUrl: null,
        roundPoints: finalizedPoints,
        resultsEndsAt: Date.now() + duration * 1000,
        roundResult: {
          prompt: currentRoom.selectedPrompt,
          points: finalizedPoints,
        },
        updatedAt: Date.now(),
      };
    });

    if (!updatedRoom) {
      throw new Error(ROOM_NOT_FOUND_MESSAGE);
    }

    return updatedRoom;
  }

  async finishResults(roomCode, expectedResultsEndsAt) {
    const code = normalizeRoomCode(roomCode);
    const updatedRoom = await this.network.changeRoom(code, (currentRoom) => {
      if (!currentRoom) {
        return undefined;
      }

      if (Number(currentRoom.resultsEndsAt) !== Number(expectedResultsEndsAt)) {
        return currentRoom;
      }

      return {
        ...currentRoom,
        resultsEndsAt: null,
        roundPoints: [],
        roundResult: null,
        updatedAt: Date.now(),
      };
    });

    if (!updatedRoom) {
      throw new Error(ROOM_NOT_FOUND_MESSAGE);
    }

    return updatedRoom;
  }

  // Adds the player to an existing room. Throws "Room not found." if the code does not exist.
  async join(roomCode, player, options) {
    const code = normalizeRoomCode(roomCode);
    const room = await this.network.changeRoom(code, (currentRoom) => {
      if (!currentRoom) {
        return null; // No room with this code: change nothing.
      }

      try {
        return joinRoom(currentRoom, player, options);
      } catch (error) {
        return undefined; // Room is closed: cancel.
      }
    });

    if (!room) {
      throw new Error(ROOM_NOT_FOUND_MESSAGE);
    }

    return room;
  }

  // Removes the player from the room. The room is deleted when nobody is left.
  async leave(roomCode, playerId) {
    const code = normalizeRoomCode(roomCode);

    return this.network.changeRoom(code, (currentRoom) => {
      if (!currentRoom) {
        return null;
      }

      const nextRoom = leaveRoom(currentRoom, playerId);
      return nextRoom.phase === ROOM_PHASES.closed ? null : nextRoom;
    });
  }

  // Calls onChange(room) whenever the room changes on any device. Returns a stop function.
  watch(roomCode, onChange) {
    return this.network.watchRoom(normalizeRoomCode(roomCode), onChange);
  }

  // Shows the player as away if their device disconnects. Returns a stop function.
  keepPlayerOnline(roomCode, playerId) {
    return this.network.keepPlayerOnline(normalizeRoomCode(roomCode), playerId);
  }
}

window.BlindfoldBrushRooms = {
  ROOM_CODE_LENGTH,
  MAX_ACTIVE_PLAYERS,
  MIN_ACTIVE_PLAYERS,
  ROOM_STORAGE_PREFIX,
  ROOM_PHASES,
  ROOM_NOT_FOUND_MESSAGE,
  BlindfoldBrushRoomManager,
  canStartGame,
  createInviteLink,
  createPlayerId,
  createRoom,
  createRoomCode,
  findPlayer,
  getActivePlayers,
  joinRoom,
  leaveRoom,
  normalizeRoomCode,
  resetRoomForNewGame,
  setPromptSubmissionStatus,
  startRoomGame,
};
