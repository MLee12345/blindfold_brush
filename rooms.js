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
    phase: ROOM_PHASES.lobby,
    hostId: host.id,
    players: [host],
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
