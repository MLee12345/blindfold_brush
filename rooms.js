const ROOM_CODE_LENGTH = 6;
const MAX_ACTIVE_PLAYERS = 6;
const MIN_ACTIVE_PLAYERS = 2;
const ROOM_PHASES = {
  lobby: "lobby",
  promptSubmission: "prompt-submission",
  inGame: "in-game",
  complete: "complete",
  closed: "closed",
};

function createRoomCode(existingCodes = []) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
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
    .replace(/[^A-Z0-9]/g, "");
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

class BlindfoldBrushRoomManager {
  constructor() {
    this.rooms = new Map();
  }

  create(hostPlayer) {
    const room = createRoom(hostPlayer, this.listCodes());
    this.rooms.set(room.code, room);
    return cloneRoom(room);
  }

  get(roomCode) {
    const room = this.rooms.get(normalizeRoomCode(roomCode));
    return room ? cloneRoom(room) : null;
  }

  save(room) {
    this.rooms.set(normalizeRoomCode(room.code), cloneRoom(room));
    return this.get(room.code);
  }

  join(roomCode, player, options) {
    const room = this.get(roomCode);
    const nextRoom = joinRoom(room, player, options);
    return this.save(nextRoom);
  }

  leave(roomCode, playerId) {
    const room = this.get(roomCode);
    const nextRoom = leaveRoom(room, playerId);
    return this.save(nextRoom);
  }

  listCodes() {
    return [...this.rooms.keys()];
  }
}

window.BlindfoldBrushRooms = {
  ROOM_CODE_LENGTH,
  MAX_ACTIVE_PLAYERS,
  MIN_ACTIVE_PLAYERS,
  ROOM_PHASES,
  BlindfoldBrushRoomManager,
  canStartGame,
  createInviteLink,
  createRoom,
  createRoomCode,
  getActivePlayers,
  joinRoom,
  leaveRoom,
  normalizeRoomCode,
  resetRoomForNewGame,
  setPromptSubmissionStatus,
  startRoomGame,
};
