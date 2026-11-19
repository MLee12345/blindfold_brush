const PLAYER_NICKNAME_LIMITS = {
  min: 2,
  max: 18,
};

const PLAYER_STATUS = {
  active: "active",
  spectator: "spectator",
  disconnected: "disconnected",
};

const AVATAR_OPTIONS = {
  faces: ["smile", "laugh", "focus", "cool", "surprised", "wink"],
  hairstyles: ["short", "curly", "bob", "ponytail", "cap", "spiky"],
  clothingColors: ["#0f766e", "#2563eb", "#e0523f", "#d89000", "#7c3aed", "#db2777"],
  skinTones: ["#f7d7bd", "#e8b989", "#c68642", "#8d5524", "#6b3f2a"],
};

const DEFAULT_AVATAR = {
  face: "smile",
  hairstyle: "short",
  clothingColor: "#0f766e",
  skinTone: "#f7d7bd",
};

function createPlayerId(prefix = "player") {
  if (window.crypto && window.crypto.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanNickname(nickname) {
  return String(nickname || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, PLAYER_NICKNAME_LIMITS.max);
}

function isValidNickname(nickname) {
  const cleanedNickname = cleanNickname(nickname);
  return cleanedNickname.length >= PLAYER_NICKNAME_LIMITS.min;
}

function normalizeAvatar(avatar = {}) {
  return {
    face: AVATAR_OPTIONS.faces.includes(avatar.face) ? avatar.face : DEFAULT_AVATAR.face,
    hairstyle: AVATAR_OPTIONS.hairstyles.includes(avatar.hairstyle) ? avatar.hairstyle : DEFAULT_AVATAR.hairstyle,
    clothingColor: AVATAR_OPTIONS.clothingColors.includes(avatar.clothingColor)
      ? avatar.clothingColor
      : DEFAULT_AVATAR.clothingColor,
    skinTone: AVATAR_OPTIONS.skinTones.includes(avatar.skinTone) ? avatar.skinTone : DEFAULT_AVATAR.skinTone,
  };
}

function createPlayerProfile({
  id = createPlayerId(),
  nickname = "Player",
  avatar = DEFAULT_AVATAR,
  isHost = false,
  isSpectator = false,
  isActive = true,
  promptsSubmitted = false,
  score = 0,
} = {}) {
  const cleanedNickname = cleanNickname(nickname) || "Player";

  return {
    id: String(id),
    nickname: cleanedNickname,
    avatar: normalizeAvatar(avatar),
    isHost: Boolean(isHost),
    isSpectator: Boolean(isSpectator),
    isActive: Boolean(isActive),
    promptsSubmitted: Boolean(promptsSubmitted),
    score: Number(score) || 0,
    joinedAt: Date.now(),
  };
}

function updatePlayerProfile(player, updates = {}) {
  if (!player || !player.id) {
    throw new Error("Player profile must include an id.");
  }

  const nextPlayer = {
    ...player,
    avatar: normalizeAvatar(player.avatar),
  };

  if ("nickname" in updates) {
    nextPlayer.nickname = cleanNickname(updates.nickname) || nextPlayer.nickname;
  }

  if ("avatar" in updates) {
    nextPlayer.avatar = normalizeAvatar({ ...nextPlayer.avatar, ...updates.avatar });
  }

  if ("promptsSubmitted" in updates) {
    nextPlayer.promptsSubmitted = Boolean(updates.promptsSubmitted);
  }

  if ("isActive" in updates) {
    nextPlayer.isActive = Boolean(updates.isActive);
  }

  if ("isSpectator" in updates) {
    nextPlayer.isSpectator = Boolean(updates.isSpectator);
  }

  if ("score" in updates) {
    nextPlayer.score = Math.max(0, Number(updates.score) || 0);
  }

  return nextPlayer;
}

function getPlayerStatus(player) {
  if (!player || player.isActive === false) {
    return PLAYER_STATUS.disconnected;
  }

  if (player.isSpectator) {
    return PLAYER_STATUS.spectator;
  }

  return PLAYER_STATUS.active;
}

function getPlayerStatusLabel(player) {
  const status = getPlayerStatus(player);

  if (status === PLAYER_STATUS.disconnected) {
    return "Disconnected";
  }

  if (status === PLAYER_STATUS.spectator) {
    return "Spectator";
  }

  if (player.promptsSubmitted) {
    return "Ready";
  }

  return "Needs prompts";
}

function sortPlayersForLobby(players = [], hostId = null) {
  return [...players].sort((firstPlayer, secondPlayer) => {
    if (firstPlayer.id === hostId) {
      return -1;
    }

    if (secondPlayer.id === hostId) {
      return 1;
    }

    if (firstPlayer.isActive !== secondPlayer.isActive) {
      return firstPlayer.isActive ? -1 : 1;
    }

    if (firstPlayer.isSpectator !== secondPlayer.isSpectator) {
      return firstPlayer.isSpectator ? 1 : -1;
    }

    return firstPlayer.nickname.localeCompare(secondPlayer.nickname);
  });
}

function countActivePlayers(players = []) {
  return players.filter((player) => player.isActive && !player.isSpectator).length;
}

function createAvatarSummary(avatar = DEFAULT_AVATAR) {
  const normalizedAvatar = normalizeAvatar(avatar);

  return [
    normalizedAvatar.face,
    normalizedAvatar.hairstyle,
    normalizedAvatar.clothingColor,
    normalizedAvatar.skinTone,
  ].join(" / ");
}

function createLobbyPlayerView(player, hostId = null) {
  return {
    id: player.id,
    nickname: player.nickname,
    avatar: normalizeAvatar(player.avatar),
    avatarSummary: createAvatarSummary(player.avatar),
    isHost: player.id === hostId || Boolean(player.isHost),
    status: getPlayerStatus(player),
    statusLabel: getPlayerStatusLabel(player),
    score: Number(player.score) || 0,
  };
}

window.BlindfoldBrushPlayers = {
  AVATAR_OPTIONS,
  DEFAULT_AVATAR,
  PLAYER_NICKNAME_LIMITS,
  PLAYER_STATUS,
  cleanNickname,
  countActivePlayers,
  createAvatarSummary,
  createLobbyPlayerView,
  createPlayerId,
  createPlayerProfile,
  getPlayerStatus,
  getPlayerStatusLabel,
  isValidNickname,
  normalizeAvatar,
  sortPlayersForLobby,
  updatePlayerProfile,
};
