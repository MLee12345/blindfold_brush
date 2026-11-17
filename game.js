const GAME_SETTINGS = {
  promptSelectionSeconds: 10,
  drawingRoundSeconds: 30,
  resultsSeconds: 5,
  drawingCycles: 3,
  minPlayers: 2,
};

const GAME_PHASES = {
  lobby: "lobby",
  promptSelection: "prompt-selection",
  drawing: "drawing",
  results: "results",
  complete: "complete",
};

function shuffleItems(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function createBlankGameState() {
  return {
    phase: GAME_PHASES.lobby,
    players: [],
    activePlayers: [],
    currentArtistId: null,
    currentPrompt: null,
    promptOptions: [],
    cycleNumber: 0,
    turnNumber: 0,
    turnOrder: [],
    guessedPlayerIds: [],
    roundStartedAt: null,
    roundEndsAt: null,
    resultsEndAt: null,
    isComplete: false,
  };
}

class BlindfoldBrushGame {
  constructor({ onStateChange, onPromptOptions, onRoundStart, onRoundEnd, onGameComplete } = {}) {
    this.state = createBlankGameState();
    this.promptPool = [];
    this.roundResults = [];
    this.gallery = [];
    this.timerId = null;
    this.onStateChange = onStateChange;
    this.onPromptOptions = onPromptOptions;
    this.onRoundStart = onRoundStart;
    this.onRoundEnd = onRoundEnd;
    this.onGameComplete = onGameComplete;
  }

  getState() {
    return {
      ...this.state,
      players: [...this.state.players],
      activePlayers: [...this.state.activePlayers],
      promptOptions: [...this.state.promptOptions],
      turnOrder: [...this.state.turnOrder],
      guessedPlayerIds: [...this.state.guessedPlayerIds],
    };
  }

  addPlayer(player) {
    if (!player || !player.id) {
      return;
    }

    const existingPlayer = this.state.players.find((savedPlayer) => savedPlayer.id === player.id);

    if (existingPlayer) {
      Object.assign(existingPlayer, player, { isActive: player.isActive !== false });
    } else {
      this.state.players.push({ ...player, isActive: player.isActive !== false });
    }

    this.refreshActivePlayers();
    this.emitStateChange();
  }

  removePlayer(playerId) {
    this.state.players = this.state.players.filter((player) => player.id !== playerId);
    this.refreshActivePlayers();

    if (this.state.currentArtistId === playerId && this.state.phase === GAME_PHASES.drawing) {
      this.endRound("artist-disconnected");
      return;
    }

    if (this.state.activePlayers.length < GAME_SETTINGS.minPlayers && this.state.phase !== GAME_PHASES.lobby) {
      this.completeGame();
      return;
    }

    this.emitStateChange();
  }

  addPrompts(playerId, prompts) {
    const usablePrompts = prompts
      .map((prompt) => String(prompt).trim())
      .filter(Boolean)
      .map((prompt) => ({ playerId, text: prompt }));

    this.promptPool.push(...usablePrompts);
  }

  startGame() {
    this.refreshActivePlayers();

    if (this.state.activePlayers.length < GAME_SETTINGS.minPlayers) {
      return false;
    }

    this.state.cycleNumber = 0;
    this.state.turnNumber = 0;
    this.state.isComplete = false;
    this.roundResults = [];
    this.gallery = [];
    this.startNextCycle();
    this.startNextTurn();

    return true;
  }

  choosePrompt(promptText) {
    if (this.state.phase !== GAME_PHASES.promptSelection) {
      return;
    }

    const selectedPrompt = this.state.promptOptions.find((prompt) => prompt === promptText);
    this.startDrawingRound(selectedPrompt || this.state.promptOptions[0]);
  }

  markCorrectGuess(playerId) {
    if (this.state.phase !== GAME_PHASES.drawing || playerId === this.state.currentArtistId) {
      return false;
    }

    const isEligibleGuesser = this.state.activePlayers.some((player) => player.id === playerId);
    const hasAlreadyGuessed = this.state.guessedPlayerIds.includes(playerId);

    if (!isEligibleGuesser || hasAlreadyGuessed) {
      return false;
    }

    this.state.guessedPlayerIds.push(playerId);

    if (this.allEligibleGuessersFinished()) {
      this.endRound("all-guessed");
    } else {
      this.emitStateChange();
    }

    return true;
  }

  saveCompletedDrawing(drawingDataUrl) {
    if (!drawingDataUrl || !this.state.currentPrompt || !this.state.currentArtistId) {
      return;
    }

    this.gallery.push({
      drawingDataUrl,
      prompt: this.state.currentPrompt,
      artistId: this.state.currentArtistId,
    });
  }

  refreshActivePlayers() {
    this.state.activePlayers = this.state.players.filter((player) => player.isActive !== false);
  }

  startNextCycle() {
    this.state.cycleNumber += 1;
    this.state.turnOrder = shuffleItems(this.state.activePlayers.map((player) => player.id));
    this.state.turnNumber = 0;
  }

  startNextTurn() {
    if (this.state.cycleNumber > GAME_SETTINGS.drawingCycles) {
      this.completeGame();
      return;
    }

    if (this.state.turnNumber >= this.state.turnOrder.length) {
      this.startNextCycle();

      if (this.state.cycleNumber > GAME_SETTINGS.drawingCycles) {
        this.completeGame();
        return;
      }
    }

    this.state.currentArtistId = this.state.turnOrder[this.state.turnNumber];
    this.state.turnNumber += 1;
    this.state.currentPrompt = null;
    this.state.guessedPlayerIds = [];
    this.state.phase = GAME_PHASES.promptSelection;
    this.state.promptOptions = this.pickPromptOptions();
    this.emitStateChange();

    if (this.onPromptOptions) {
      this.onPromptOptions(this.state.currentArtistId, [...this.state.promptOptions]);
    }

    this.startTimer(GAME_SETTINGS.promptSelectionSeconds, () => {
      this.startDrawingRound(this.state.promptOptions[0]);
    });
  }

  pickPromptOptions() {
    const shuffledPrompts = shuffleItems(this.promptPool.map((prompt) => prompt.text));
    const promptOptions = shuffledPrompts.slice(0, 3);

    while (promptOptions.length < 3) {
      promptOptions.push("Mystery object");
    }

    return promptOptions;
  }

  startDrawingRound(prompt) {
    this.stopTimer();
    this.state.phase = GAME_PHASES.drawing;
    this.state.currentPrompt = prompt;
    this.state.roundStartedAt = Date.now();
    this.state.roundEndsAt = this.state.roundStartedAt + GAME_SETTINGS.drawingRoundSeconds * 1000;
    this.state.promptOptions = [];
    this.emitStateChange();

    if (this.onRoundStart) {
      this.onRoundStart(this.getState());
    }

    this.startTimer(GAME_SETTINGS.drawingRoundSeconds, () => {
      this.endRound("time-expired");
    });
  }

  endRound(reason) {
    if (this.state.phase !== GAME_PHASES.drawing) {
      return;
    }

    this.stopTimer();
    this.state.phase = GAME_PHASES.results;
    this.state.resultsEndAt = Date.now() + GAME_SETTINGS.resultsSeconds * 1000;

    const result = {
      artistId: this.state.currentArtistId,
      prompt: this.state.currentPrompt,
      guessedPlayerIds: [...this.state.guessedPlayerIds],
      reason,
    };

    this.roundResults.push(result);
    this.emitStateChange();

    if (this.onRoundEnd) {
      this.onRoundEnd(result, this.getState());
    }

    this.startTimer(GAME_SETTINGS.resultsSeconds, () => {
      this.startNextTurn();
    });
  }

  completeGame() {
    this.stopTimer();
    this.state.phase = GAME_PHASES.complete;
    this.state.isComplete = true;
    this.emitStateChange();

    if (this.onGameComplete) {
      this.onGameComplete({
        rounds: [...this.roundResults],
        gallery: [...this.gallery],
        state: this.getState(),
      });
    }
  }

  allEligibleGuessersFinished() {
    const eligibleGuessers = this.state.activePlayers.filter((player) => player.id !== this.state.currentArtistId);

    return eligibleGuessers.length > 0 && eligibleGuessers.every((player) => {
      return this.state.guessedPlayerIds.includes(player.id);
    });
  }

  startTimer(seconds, callback) {
    this.stopTimer();
    this.timerId = window.setTimeout(callback, seconds * 1000);
  }

  stopTimer() {
    window.clearTimeout(this.timerId);
    this.timerId = null;
  }

  emitStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }
}

window.BlindfoldBrushGame = BlindfoldBrushGame;
window.BlindfoldBrushGameSettings = GAME_SETTINGS;
window.BlindfoldBrushGamePhases = GAME_PHASES;
