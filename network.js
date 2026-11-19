const NETWORK_EVENTS = {
  playerJoined: "player-joined",
  playerLeft: "player-left",
  roomUpdated: "room-updated",
  promptsSubmitted: "prompts-submitted",
  gameStarted: "game-started",
  gameStateUpdated: "game-state-updated",
  promptSelected: "prompt-selected",
  drawingStroke: "drawing-stroke",
  drawingCleared: "drawing-cleared",
  drawingUndo: "drawing-undo",
  chatMessage: "chat-message",
  correctGuess: "correct-guess",
  roundEnded: "round-ended",
  stateRequested: "state-requested",
};

function createNetworkId(prefix = "message") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeNetworkRoomCode(roomCode) {
  return String(roomCode || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function cloneNetworkPayload(payload) {
  if (payload === undefined || payload === null) {
    return {};
  }

  return JSON.parse(JSON.stringify(payload));
}

function createNetworkMessage(type, payload = {}, senderId = null, roomCode = null) {
  if (!type) {
    throw new Error("Network message type is required.");
  }

  return {
    id: createNetworkId(),
    type,
    payload: cloneNetworkPayload(payload),
    senderId,
    roomCode: roomCode ? normalizeNetworkRoomCode(roomCode) : null,
    sentAt: Date.now(),
  };
}

function isNetworkMessage(message) {
  return Boolean(message && message.id && message.type && message.sentAt);
}

class LocalRealtimeChannel {
  constructor(roomCode, { storage = window.localStorage } = {}) {
    this.roomCode = normalizeNetworkRoomCode(roomCode);
    this.storage = storage;
    this.listeners = new Set();
    this.receivedMessageIds = new Set();
    this.storageKey = `blindfold-brush:room:${this.roomCode}`;
    this.channel = "BroadcastChannel" in window
      ? new BroadcastChannel(this.storageKey)
      : null;
    this.handleBroadcastMessage = this.handleBroadcastMessage.bind(this);
    this.handleStorageMessage = this.handleStorageMessage.bind(this);
  }

  connect() {
    if (this.channel) {
      this.channel.addEventListener("message", this.handleBroadcastMessage);
    }

    window.addEventListener("storage", this.handleStorageMessage);
    return this;
  }

  disconnect() {
    if (this.channel) {
      this.channel.removeEventListener("message", this.handleBroadcastMessage);
      this.channel.close();
    }

    window.removeEventListener("storage", this.handleStorageMessage);
    this.listeners.clear();
  }

  send(message) {
    this.rememberMessage(message);

    if (this.channel) {
      this.channel.postMessage(message);
    }

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(message));
    } catch (error) {
      window.console.warn("Could not write network message to local storage.", error);
    }

    this.emit(message);
  }

  subscribe(listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  handleBroadcastMessage(event) {
    this.receive(event.data);
  }

  handleStorageMessage(event) {
    if (event.key !== this.storageKey || !event.newValue) {
      return;
    }

    try {
      this.receive(JSON.parse(event.newValue));
    } catch (error) {
      window.console.warn("Could not read network message from local storage.", error);
    }
  }

  receive(message) {
    if (!isNetworkMessage(message) || this.receivedMessageIds.has(message.id)) {
      return;
    }

    this.rememberMessage(message);
    this.emit(message);
  }

  rememberMessage(message) {
    this.receivedMessageIds.add(message.id);

    if (this.receivedMessageIds.size > 200) {
      const oldestMessageId = this.receivedMessageIds.values().next().value;
      this.receivedMessageIds.delete(oldestMessageId);
    }
  }

  emit(message) {
    this.listeners.forEach((listener) => {
      listener(message);
    });
  }
}

class BlindfoldBrushNetwork {
  constructor({ playerId, roomCode, adapter = null } = {}) {
    if (!playerId) {
      throw new Error("Network requires a player id.");
    }

    if (!roomCode) {
      throw new Error("Network requires a room code.");
    }

    this.playerId = playerId;
    this.roomCode = normalizeNetworkRoomCode(roomCode);
    this.adapter = adapter || new LocalRealtimeChannel(this.roomCode);
    this.subscriptions = new Set();
  }

  connect() {
    if (typeof this.adapter.connect === "function") {
      this.adapter.connect();
    }

    return this;
  }

  disconnect() {
    this.subscriptions.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.subscriptions.clear();

    if (typeof this.adapter.disconnect === "function") {
      this.adapter.disconnect();
    }
  }

  send(type, payload = {}) {
    const message = createNetworkMessage(type, payload, this.playerId, this.roomCode);

    this.adapter.send(message);
    return message;
  }

  on(type, listener) {
    return this.onAny((message) => {
      if (message.type === type) {
        listener(message.payload, message);
      }
    });
  }

  onAny(listener) {
    const unsubscribe = this.adapter.subscribe((message) => {
      if (isNetworkMessage(message) && message.roomCode === this.roomCode) {
        listener(message);
      }
    });

    this.subscriptions.add(unsubscribe);

    return () => {
      unsubscribe();
      this.subscriptions.delete(unsubscribe);
    };
  }

  announceJoin(player) {
    return this.send(NETWORK_EVENTS.playerJoined, { player });
  }

  announceLeave(playerId = this.playerId) {
    return this.send(NETWORK_EVENTS.playerLeft, { playerId });
  }

  updateRoom(room) {
    return this.send(NETWORK_EVENTS.roomUpdated, { room });
  }

  submitPrompts(prompts) {
    return this.send(NETWORK_EVENTS.promptsSubmitted, { prompts });
  }

  startGame(gameState) {
    return this.send(NETWORK_EVENTS.gameStarted, { gameState });
  }

  updateGameState(gameState) {
    return this.send(NETWORK_EVENTS.gameStateUpdated, { gameState });
  }

  selectPrompt(prompt) {
    return this.send(NETWORK_EVENTS.promptSelected, { prompt });
  }

  sendDrawingStroke(stroke) {
    return this.send(NETWORK_EVENTS.drawingStroke, { stroke });
  }

  clearDrawing() {
    return this.send(NETWORK_EVENTS.drawingCleared);
  }

  undoDrawing() {
    return this.send(NETWORK_EVENTS.drawingUndo);
  }

  sendChatMessage(text) {
    return this.send(NETWORK_EVENTS.chatMessage, {
      text: String(text || "").trim(),
    });
  }

  sendCorrectGuess(playerId) {
    return this.send(NETWORK_EVENTS.correctGuess, { playerId });
  }

  endRound(result) {
    return this.send(NETWORK_EVENTS.roundEnded, { result });
  }

  requestState() {
    return this.send(NETWORK_EVENTS.stateRequested);
  }
}

window.BlindfoldBrushNetwork = {
  NETWORK_EVENTS,
  BlindfoldBrushNetwork,
  LocalRealtimeChannel,
  createNetworkId,
  createNetworkMessage,
  isNetworkMessage,
  normalizeNetworkRoomCode,
};
