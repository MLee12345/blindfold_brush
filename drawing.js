const canvas = document.querySelector("#drawingCanvas");
const context = canvas.getContext("2d");
const sizeInput = document.querySelector("#brushSize");
const clearButton = document.querySelector("#clearCanvas");
const undoButton = document.querySelector("#undoCanvas");
const toolButtons = document.querySelectorAll("[data-tool]");
const colorButtons = document.querySelectorAll("[data-color]");

const hiddenCanvas = document.createElement("canvas");
const hiddenContext = hiddenCanvas.getContext("2d");
const undoStack = [];
const maxUndoSteps = 25;
const roundLengthMs = 30000;
const gridSize = 40;

let isDrawing = false;
let activePointerId = null;
let cursorPoint = null;
let isRoundRevealed = false;
let roundTimer = null;
let selectedTool = "pen";
let selectedColor = "#1f2937";
let canUseDrawingTools = false;

function resizeHiddenCanvas() {
  hiddenCanvas.width = canvas.width;
  hiddenCanvas.height = canvas.height;
}

function saveCanvasState() {
  undoStack.push(hiddenContext.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height));

  if (undoStack.length > maxUndoSteps) {
    undoStack.shift();
  }
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function setBrushStyle(event) {
  const pressure = event.pointerType === "pen" && event.pressure > 0 ? event.pressure : 1;
  const isErasing = selectedTool === "eraser" || event.shiftKey;

  hiddenContext.lineWidth = Math.max(1, Number(sizeInput.value) * pressure);
  hiddenContext.lineCap = "round";
  hiddenContext.lineJoin = "round";
  hiddenContext.strokeStyle = selectedColor;
  hiddenContext.fillStyle = selectedColor;
  hiddenContext.globalCompositeOperation = isErasing ? "destination-out" : "source-over";
}

function clearVisibleCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawGrid() {
  context.save();
  context.strokeStyle = "#d7e0ef";
  context.lineWidth = 1;
  context.globalAlpha = 0.65;

  for (let x = gridSize; x < canvas.width; x += gridSize) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }

  for (let y = gridSize; y < canvas.height; y += gridSize) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  context.restore();
}

function drawCursor() {
  if (!cursorPoint) {
    return;
  }

  const cursorRadius = Math.max(4, Number(sizeInput.value) / 2);
  const isErasing = selectedTool === "eraser";

  context.save();
  context.globalAlpha = isErasing ? 0.9 : 0.75;
  context.fillStyle = isErasing ? "#ffffff" : selectedColor;
  context.strokeStyle = isErasing ? "#667085" : selectedColor;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(cursorPoint.x, cursorPoint.y, cursorRadius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function renderCanvasView() {
  clearVisibleCanvas();

  if (isRoundRevealed) {
    context.drawImage(hiddenCanvas, 0, 0);
  } else {
    drawGrid();
  }

  drawCursor();
}

function revealDrawing() {
  isRoundRevealed = true;
  isDrawing = false;
  hiddenContext.closePath();
  hiddenContext.globalCompositeOperation = "source-over";

  if (activePointerId !== null && canvas.hasPointerCapture(activePointerId)) {
    canvas.releasePointerCapture(activePointerId);
  }

  activePointerId = null;
  renderCanvasView();
}

function startRound() {
  window.clearTimeout(roundTimer);
  undoStack.length = 0;
  cursorPoint = null;
  isRoundRevealed = false;
  hiddenContext.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
  renderCanvasView();
  roundTimer = window.setTimeout(revealDrawing, roundLengthMs);
}

function paintDot(point, event) {
  setBrushStyle(event);

  hiddenContext.beginPath();
  hiddenContext.arc(point.x, point.y, hiddenContext.lineWidth / 2, 0, Math.PI * 2);
  hiddenContext.fill();
  hiddenContext.beginPath();
  hiddenContext.moveTo(point.x, point.y);
}

function startDrawing(event) {
  event.preventDefault();

  if (!canUseDrawingTools || activePointerId !== null || isRoundRevealed) {
    return;
  }

  saveCanvasState();
  isDrawing = true;
  activePointerId = event.pointerId;
  canvas.setPointerCapture(activePointerId);

  const point = getCanvasPoint(event);

  cursorPoint = point;
  paintDot(point, event);
  renderCanvasView();
}

function draw(event) {
  if (!isDrawing || event.pointerId !== activePointerId) {
    return;
  }

  event.preventDefault();
  const point = getCanvasPoint(event);

  setBrushStyle(event);
  cursorPoint = point;
  hiddenContext.lineTo(point.x, point.y);
  hiddenContext.stroke();
  renderCanvasView();
}

function stopDrawing(event) {
  if (!isDrawing || event.pointerId !== activePointerId) {
    return;
  }

  isDrawing = false;
  activePointerId = null;
  hiddenContext.closePath();
  hiddenContext.globalCompositeOperation = "source-over";

  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function clearCanvas() {
  if (!canUseDrawingTools) {
    return;
  }

  startRound();
}

function undoLastAction() {
  if (!canUseDrawingTools || isRoundRevealed) {
    return;
  }

  const previousCanvasState = undoStack.pop();

  if (previousCanvasState) {
    hiddenContext.putImageData(previousCanvasState, 0, 0);
    renderCanvasView();
  }
}

function handleKeyboardShortcut(event) {
  const isUndoShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z";

  if (isUndoShortcut) {
    event.preventDefault();
    undoLastAction();
  }
}

function selectTool(toolName) {
  if (!canUseDrawingTools) {
    return;
  }

  selectedTool = toolName;

  toolButtons.forEach((button) => {
    const isSelected = button.dataset.tool === selectedTool;
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  renderCanvasView();
}

function selectColor(color) {
  if (!canUseDrawingTools) {
    return;
  }

  selectedColor = color;
  selectedTool = "pen";

  colorButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.color === color);
  });

  selectTool("pen");
}

function moveCursor(event) {
  if (isDrawing) {
    return;
  }

  cursorPoint = getCanvasPoint(event);
  renderCanvasView();
}

function hideCursor() {
  if (isDrawing) {
    return;
  }

  cursorPoint = null;
  renderCanvasView();
}

function setDrawingToolsAvailable(isAvailable) {
  canUseDrawingTools = isAvailable;

  if (!isAvailable) {
    isDrawing = false;
    activePointerId = null;
    hiddenContext.closePath();
    hiddenContext.globalCompositeOperation = "source-over";
  }

  document.querySelector(".controls").hidden = !isAvailable;
}

resizeHiddenCanvas();
startRound();
canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", draw);
canvas.addEventListener("pointermove", moveCursor);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointerleave", stopDrawing);
canvas.addEventListener("pointerleave", hideCursor);
canvas.addEventListener("pointercancel", stopDrawing);
clearButton.addEventListener("click", clearCanvas);
undoButton.addEventListener("click", undoLastAction);
sizeInput.addEventListener("input", renderCanvasView);
toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectTool(button.dataset.tool);
  });
});
colorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectColor(button.dataset.color);
  });
});
document.addEventListener("keydown", handleKeyboardShortcut);

function loadGameModule(path, globalName) {
  if (window[globalName]) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = path;
    script.onload = resolve;
    script.onerror = reject;
    document.body.append(script);
  });
}

function createElement(tagName, className, textContent) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (textContent) {
    element.textContent = textContent;
  }

  return element;
}

function installRuntimeStyles() {
  const style = document.createElement("style");

  style.textContent = `
    .bb-room-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      padding: 10px 12px;
      margin-bottom: 10px;
      border: 1px solid #d7dfdd;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.95);
    }

    .bb-room-bar[hidden],
    .bb-round-info[hidden],
    .bb-prompt-picker[hidden] {
      display: none;
    }

    .bb-room-input,
    .bb-chat-input {
      min-height: 36px;
      border: 1px solid #c8d3e5;
      border-radius: 6px;
      padding: 0 10px;
      font: inherit;
    }

    .bb-room-code {
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      padding: 0 10px;
      border: 1px solid #c8d3e5;
      border-radius: 6px;
      background: #f4f7fb;
      font-weight: 800;
    }

    .bb-play-area {
      min-height: 0;
      display: grid;
      grid-template-columns: 180px minmax(0, 1fr) 250px;
      gap: 12px;
    }

    .bb-panel {
      min-height: 0;
      border: 1px solid #d7dfdd;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.95);
      padding: 10px;
      overflow: hidden;
    }

    .bb-panel-title {
      margin: 0 0 8px;
      font-size: 14px;
      font-weight: 800;
      color: #172033;
    }

    .bb-leaderboard-list,
    .bb-chat-messages {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .bb-leaderboard-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      background: #f4f7fb;
      font-size: 14px;
    }

    .bb-chat-panel {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 8px;
    }

    .bb-chat-messages {
      align-content: start;
      overflow: auto;
      min-height: 0;
    }

    .bb-chat-message {
      padding: 6px 8px;
      border-radius: 6px;
      background: #f4f7fb;
      font-size: 14px;
      overflow-wrap: anywhere;
    }

    .bb-chat-message[data-type="system"] {
      color: #0f766e;
      font-weight: 700;
      background: #e7f7f4;
    }

    .bb-chat-form {
      display: flex;
      gap: 6px;
    }

    .bb-chat-input {
      min-width: 0;
      flex: 1;
    }

    .bb-round-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 10px;
      margin-bottom: 8px;
      border: 1px solid #d7dfdd;
      border-radius: 8px;
      background: #ffffff;
      font-weight: 700;
    }

    .bb-prompt-picker {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding: 8px 10px;
      margin-bottom: 8px;
      border: 1px solid #d7dfdd;
      border-radius: 8px;
      background: #ffffff;
    }

    .bb-prompt-button {
      min-height: 34px;
      border-radius: 6px;
      background: #8b5cf6;
    }

    .bb-prompt-button:hover {
      background: #7c3aed;
    }

    .bb-center-column {
      min-width: 0;
      min-height: 0;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
    }

    .bb-canvas-stage {
      min-height: 0;
    }

    @media (max-width: 850px) {
      .bb-play-area {
        grid-template-columns: 1fr;
      }

      .bb-panel {
        max-height: 180px;
      }
    }
  `;

  document.head.append(style);
}

function initializeRuntimeGame() {
  const app = document.querySelector(".app");
  const toolbar = document.querySelector(".toolbar");
  const canvasStage = document.querySelector(".canvas-stage");
  const controls = document.querySelector(".controls");
  const localPlayerId = `player-${Date.now()}`;

  let currentPlayer = null;
  let roomCreated = false;
  let latestGameState = null;
  let latestRoundResult = null;

  const roomBar = createElement("section", "bb-room-bar");
  const nicknameInput = createElement("input", "bb-room-input");
  const roomCodeInput = createElement("input", "bb-room-input");
  const generatedRoomCode = createElement("span", "bb-room-code", "Room: ----");
  const createRoomButton = createElement("button", "", "Create Room");
  const joinRoomButton = createElement("button", "", "Join Room");
  const startGameButton = createElement("button", "", "Start Game");
  const addPlayerButton = createElement("button", "", "Add Test Player");

  nicknameInput.placeholder = "Nickname";
  roomCodeInput.placeholder = "Join code";
  startGameButton.disabled = true;
  roomBar.append(nicknameInput, createRoomButton, generatedRoomCode, roomCodeInput, joinRoomButton, addPlayerButton, startGameButton);

  const playArea = createElement("section", "bb-play-area");
  const leaderboardPanel = createElement("aside", "bb-panel");
  const leaderboardTitle = createElement("h2", "bb-panel-title", "Leaderboard");
  const leaderboardList = createElement("ol", "bb-leaderboard-list");
  const centerColumn = createElement("section", "bb-center-column");
  const roundInfo = createElement("div", "bb-round-info");
  const hintText = createElement("span", "bb-hint-text", "Create a room to start.");
  const timerText = createElement("span", "bb-timer-text", "");
  const promptPicker = createElement("div", "bb-prompt-picker");
  const chatPanel = createElement("aside", "bb-panel bb-chat-panel");
  const chatTitle = createElement("h2", "bb-panel-title", "Chat");
  const chatMessages = createElement("ul", "bb-chat-messages");
  const chatForm = createElement("form", "bb-chat-form");
  const chatInput = createElement("input", "bb-chat-input");
  const chatButton = createElement("button", "", "Send");

  roundInfo.hidden = true;
  promptPicker.hidden = true;
  chatInput.placeholder = "Type a guess";
  chatInput.disabled = true;
  chatButton.disabled = true;
  roundInfo.append(hintText, timerText);
  leaderboardPanel.append(leaderboardTitle, leaderboardList);
  chatForm.append(chatInput, chatButton);
  chatPanel.append(chatTitle, chatMessages, chatForm);
  centerColumn.append(roundInfo, promptPicker, canvasStage);
  playArea.append(leaderboardPanel, centerColumn, chatPanel);
  toolbar.after(roomBar);
  roomBar.after(playArea);

  const chat = new window.BlindfoldBrushChat({
    onMessage: renderChat,
    onCorrectGuess: (playerId, guess) => {
      game.markCorrectGuess(playerId, guess.guessedAt);
    },
  });
  const scoring = new window.BlindfoldBrushScoring();
  const game = new window.BlindfoldBrushGame({
    onStateChange: (state) => {
      latestGameState = state;
      updateDrawingRole(state);
      updateRoundInfo(state);
      renderLeaderboard();
    },
    onTimerTick: ({ state, secondsRemaining }) => {
      latestGameState = state;
      updateTimer(secondsRemaining);
      updateHint(state);
    },
    onPromptOptions: (artistId, promptOptions) => {
      renderPromptOptions(artistId, promptOptions);
    },
    onRoundStart: (state) => {
      promptPicker.hidden = true;
      chat.startRound({
        answer: state.currentPrompt,
        artistId: state.currentArtistId,
        startedAt: state.roundStartedAt,
      });
      chatInput.placeholder = state.currentArtistId === localPlayerId ? "Artists cannot guess" : "Type a guess";
      renderChat();
      startRound();
    },
    onRoundEnd: (result) => {
      chat.endRound();
      latestRoundResult = scoring.scoreRound(result);
      renderLeaderboard();
      renderRoundResult(latestRoundResult);
      revealDrawing();
    },
    onGameComplete: () => {
      setDrawingToolsAvailable(false);
      hintText.textContent = "Game complete.";
      timerText.textContent = "";
    },
  });

  setDrawingToolsAvailable(false);
  renderChat();
  renderLeaderboard();

  function getNickname() {
    return nicknameInput.value.trim() || "Player";
  }

  function createRoomCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let index = 0; index < 4; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    return code;
  }

  function createRoom() {
    if (roomCreated) {
      return;
    }

    currentPlayer = {
      id: localPlayerId,
      name: getNickname(),
      isActive: true,
    };
    roomCreated = true;
    generatedRoomCode.textContent = `Room: ${createRoomCode()}`;
    roomCodeInput.hidden = true;
    joinRoomButton.hidden = true;
    game.addPlayer(currentPlayer);
    scoring.setPlayers([currentPlayer]);
    chat.messages = [];
    renderChat();
    renderLeaderboard();
    chatInput.disabled = false;
    chatButton.disabled = false;
    startGameButton.disabled = game.getState().activePlayers.length < 2;
    hintText.textContent = "Room created. Waiting for players.";
    roundInfo.hidden = false;
  }

  function joinRoom() {
    const joinCode = roomCodeInput.value.trim();

    createRoom();
    generatedRoomCode.textContent = `Room: ${joinCode || "LOCAL"}`;
    hintText.textContent = `Joined room ${joinCode || "LOCAL"}.`;
  }

  function addTestPlayer() {
    createRoom();
    const nextNumber = game.getState().players.length + 1;
    const player = {
      id: `guest-${nextNumber}`,
      name: `Player ${nextNumber}`,
      isActive: true,
    };

    game.addPlayer(player);
    scoring.setPlayers(game.getState().players);
    startGameButton.disabled = game.getState().activePlayers.length < 2;
    renderLeaderboard();
  }

  function startGameFromRoom() {
    createRoom();
    scoring.setPlayers(game.getState().players);
    game.addPrompts(localPlayerId, ["sunflower", "spaceship", "pizza"]);
    game.getState().players.forEach((player) => {
      game.addPrompts(player.id, [`${player.name} prompt`, "banana", "castle"]);
    });
    game.startGame();
  }

  function updateDrawingRole(state) {
    const isArtist = Boolean(currentPlayer && state.currentArtistId === currentPlayer.id && state.phase === "drawing");

    setDrawingToolsAvailable(isArtist);
    chatInput.disabled = !roomCreated || isArtist;
    chatButton.disabled = !roomCreated || isArtist;
  }

  function updateRoundInfo(state) {
    if (!roomCreated) {
      return;
    }

    roundInfo.hidden = false;
    updateHint(state);
  }

  function updateTimer(secondsRemaining) {
    timerText.textContent = Number.isFinite(secondsRemaining) && secondsRemaining > 0
      ? `${secondsRemaining}s`
      : "";
  }

  function updateHint(state) {
    if (!state) {
      return;
    }

    if (state.phase === "prompt-selection") {
      const artistName = getPlayerName(state.currentArtistId);
      hintText.textContent = state.currentArtistId === localPlayerId
        ? "Choose one prompt to draw."
        : `${artistName} is choosing a prompt.`;
      return;
    }

    if (state.phase === "drawing") {
      const elapsedSeconds = Math.floor((Date.now() - state.roundStartedAt) / 1000);
      const mask = chat.getAnswerMask(elapsedSeconds);
      const isArtist = state.currentArtistId === localPlayerId;
      hintText.textContent = isArtist ? `Draw: ${state.currentPrompt}` : `Hint: ${mask}`;
      return;
    }

    if (state.phase === "results" && latestRoundResult) {
      hintText.textContent = `Answer: ${latestRoundResult.prompt}`;
      return;
    }

    if (state.phase === "complete") {
      hintText.textContent = "Final leaderboard";
      return;
    }

    hintText.textContent = "Room ready.";
  }

  function renderRoundResult(result) {
    const summary = result.roundPoints.length
      ? result.roundPoints.map((entry) => `${entry.playerName}: +${entry.points}`).join(", ")
      : "No points this round.";

    chat.addSystemMessage(`Round over. ${summary}`);
  }

  function renderPromptOptions(artistId, promptOptions) {
    promptPicker.replaceChildren();

    if (artistId !== localPlayerId) {
      promptPicker.hidden = true;
      return;
    }

    promptOptions.forEach((prompt) => {
      const button = createElement("button", "bb-prompt-button", prompt);

      button.type = "button";
      button.addEventListener("click", () => {
        promptPicker.hidden = true;
        game.choosePrompt(prompt);
      });
      promptPicker.append(button);
    });

    promptPicker.hidden = false;
  }

  function renderLeaderboard() {
    const rows = scoring.getLeaderboard();

    if (rows.length === 0 && latestGameState) {
      scoring.setPlayers(latestGameState.players);
    }

    const leaderboardRows = scoring.getLeaderboard();
    leaderboardList.replaceChildren();

    if (leaderboardRows.length === 0) {
      const emptyRow = createElement("li", "bb-leaderboard-row", "No players yet");
      leaderboardList.append(emptyRow);
      return;
    }

    leaderboardRows.forEach((player) => {
      const row = createElement("li", "bb-leaderboard-row");
      const name = createElement("span", "", `${player.rank}. ${player.playerName}`);
      const score = createElement("strong", "", String(player.totalPoints));
      row.append(name, score);
      leaderboardList.append(row);
    });
  }

  function renderChat() {
    chatMessages.replaceChildren();
    const messages = chat.getVisibleMessages();

    messages.forEach((message) => {
      const row = createElement("li", "bb-chat-message");
      row.dataset.type = message.type;
      row.textContent = message.type === "system"
        ? message.text
        : `${message.playerName}: ${message.text}`;
      chatMessages.append(row);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function getPlayerName(playerId) {
    const state = latestGameState || game.getState();
    const player = state.players.find((savedPlayer) => savedPlayer.id === playerId);

    return player ? player.name || player.nickname || "Player" : "Player";
  }

  createRoomButton.addEventListener("click", createRoom);
  joinRoomButton.addEventListener("click", joinRoom);
  addPlayerButton.addEventListener("click", addTestPlayer);
  startGameButton.addEventListener("click", startGameFromRoom);
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!currentPlayer) {
      createRoom();
    }

    const state = latestGameState || game.getState();
    const text = chatInput.value;
    const result = state.phase === "drawing"
      ? chat.submitGuess({ playerId: currentPlayer.id, playerName: currentPlayer.name, text })
      : chat.submitMessage({ playerId: currentPlayer.id, playerName: currentPlayer.name, text });

    if (result.accepted) {
      chatInput.value = "";
    }
  });

  window.BlindfoldBrushRuntime = {
    game,
    chat,
    scoring,
    addPlayer: (player) => {
      game.addPlayer(player);
      scoring.setPlayers(game.getState().players);
      startGameButton.disabled = game.getState().activePlayers.length < 2;
      renderLeaderboard();
    },
    renderLeaderboard,
    renderChat,
  };
}

installRuntimeStyles();
Promise.all([
  loadGameModule("game.js", "BlindfoldBrushGame"),
  loadGameModule("chat.js", "BlindfoldBrushChat"),
  loadGameModule("scoring.js", "BlindfoldBrushScoring"),
]).then(initializeRuntimeGame);

