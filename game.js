const GAME_SETTINGS = {
  promptSelectionSeconds: 10,
  drawingRoundSeconds: 30,
  resultsSeconds: 5,
  drawingCycles: 3,
  minPlayers: 2,
  timerTickMs: 250,
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
    correctGuesses: [],
    phaseStartedAt: null,
    phaseEndsAt: null,
    roundStartedAt: null,
    roundEndedAt: null,
    roundEndsAt: null,
    resultsEndAt: null,
    isComplete: false,
  };
}

class BlindfoldBrushGame {
  constructor({
    onStateChange,
    onPromptOptions,
    onTimerTick,
    onRoundStart,
    onRoundEnd,
    onGameComplete,
  } = {}) {
    this.state = createBlankGameState();
    this.promptPool = [];
    this.roundResults = [];
    this.gallery = [];
    this.timerId = null;
    this.tickId = null;
    this.onStateChange = onStateChange;
    this.onPromptOptions = onPromptOptions;
    this.onTimerTick = onTimerTick;
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
      correctGuesses: this.state.correctGuesses.map((guess) => ({ ...guess })),
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
    this.state.currentArtistId = null;
    this.state.currentPrompt = null;
    this.state.correctGuesses = [];
    this.state.guessedPlayerIds = [];
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
    this.refreshActivePlayers();

    if (this.state.activePlayers.length < GAME_SETTINGS.minPlayers) {
      this.completeGame();
      return;
    }

    this.state.turnOrder = this.state.turnOrder.filter((playerId) => {
      return this.state.activePlayers.some((player) => player.id === playerId);
    });

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
    this.state.correctGuesses = [];
    this.state.roundStartedAt = null;
    this.state.roundEndedAt = null;
    this.state.roundEndsAt = null;
    this.state.resultsEndAt = null;
    this.state.phase = GAME_PHASES.promptSelection;
    this.state.promptOptions = this.pickPromptOptions();
    this.startPhaseTimer(GAME_PHASES.promptSelection, GAME_SETTINGS.promptSelectionSeconds, () => {
      this.startDrawingRound(this.state.promptOptions[0]);
    });
    this.emitStateChange();

    if (this.onPromptOptions) {
      this.onPromptOptions(this.state.currentArtistId, [...this.state.promptOptions]);
    }
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
    this.state.roundEndedAt = null;
    this.state.roundEndsAt = this.state.roundStartedAt + GAME_SETTINGS.drawingRoundSeconds * 1000;
    this.state.phaseStartedAt = this.state.roundStartedAt;
    this.state.phaseEndsAt = this.state.roundEndsAt;
    this.state.promptOptions = [];
    this.state.correctGuesses = [];
    this.state.guessedPlayerIds = [];
    this.emitStateChange();

    if (this.onRoundStart) {
      this.onRoundStart(this.getState());
    }

    this.startPhaseTimer(GAME_PHASES.drawing, GAME_SETTINGS.drawingRoundSeconds, () => {
      this.endRound("time-expired");
    });
  }

  markCorrectGuess(playerId, guessedAt = Date.now()) {
    if (this.state.phase !== GAME_PHASES.drawing || playerId === this.state.currentArtistId) {
      return false;
    }

    const player = this.state.activePlayers.find((activePlayer) => activePlayer.id === playerId);
    const hasAlreadyGuessed = this.state.guessedPlayerIds.includes(playerId);

    if (!player || hasAlreadyGuessed) {
      return false;
    }

    const safeGuessedAt = Math.min(Math.max(guessedAt, this.state.roundStartedAt), Date.now());

    this.state.guessedPlayerIds.push(playerId);
    this.state.correctGuesses.push({
      playerId,
      playerName: player.name || player.nickname || "Player",
      guessedAt: safeGuessedAt,
    });

    if (this.allEligibleGuessersFinished()) {
      this.endRound("all-guessed");
    } else {
      this.emitStateChange();
    }

    return true;
  }

  endRound(reason, endedAt = Date.now()) {
    if (this.state.phase !== GAME_PHASES.drawing) {
      return;
    }

    this.stopTimer();
    this.state.phase = GAME_PHASES.results;
    this.state.roundEndedAt = endedAt;
    this.state.resultsEndAt = endedAt + GAME_SETTINGS.resultsSeconds * 1000;
    this.state.phaseStartedAt = endedAt;
    this.state.phaseEndsAt = this.state.resultsEndAt;

    const result = {
      artistId: this.state.currentArtistId,
      prompt: this.state.currentPrompt,
      guessedPlayerIds: [...this.state.guessedPlayerIds],
      correctGuesses: this.state.correctGuesses.map((guess) => ({ ...guess })),
      roundStartedAt: this.state.roundStartedAt,
      roundEndedAt: this.state.roundEndedAt,
      reason,
    };

    this.roundResults.push(result);
    this.emitStateChange();

    if (this.onRoundEnd) {
      this.onRoundEnd(result, this.getState());
    }

    this.startPhaseTimer(GAME_PHASES.results, GAME_SETTINGS.resultsSeconds, () => {
      this.startNextTurn();
    });
  }

  completeGame() {
    this.stopTimer();
    this.state.phase = GAME_PHASES.complete;
    this.state.isComplete = true;
    this.state.phaseStartedAt = Date.now();
    this.state.phaseEndsAt = null;
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
    this.startPhaseTimer(this.state.phase, seconds, callback);
  }

  startPhaseTimer(phase, seconds, callback) {
    this.stopTimer();
    const startedAt = Date.now();
    const endsAt = startedAt + seconds * 1000;

    this.state.phase = phase;
    this.state.phaseStartedAt = startedAt;
    this.state.phaseEndsAt = endsAt;
    this.timerId = window.setTimeout(callback, seconds * 1000);
    this.tickId = window.setInterval(() => {
      this.emitTimerTick();
    }, GAME_SETTINGS.timerTickMs);
    this.emitTimerTick();
  }

  stopTimer() {
    window.clearTimeout(this.timerId);
    window.clearInterval(this.tickId);
    this.timerId = null;
    this.tickId = null;
  }

  getSecondsRemaining() {
    if (!this.state.phaseEndsAt) {
      return 0;
    }

    return Math.max(0, Math.ceil((this.state.phaseEndsAt - Date.now()) / 1000));
  }

  emitTimerTick() {
    if (!this.onTimerTick) {
      return;
    }

    this.onTimerTick({
      phase: this.state.phase,
      secondsRemaining: this.getSecondsRemaining(),
      phaseEndsAt: this.state.phaseEndsAt,
      state: this.getState(),
    });
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
