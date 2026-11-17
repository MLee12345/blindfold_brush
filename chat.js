const CHAT_MESSAGE_TYPES = {
  guess: "guess",
  system: "system",
};

function normalizeGuess(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ");
}

function getEditDistance(firstValue, secondValue) {
  const first = normalizeGuess(firstValue);
  const second = normalizeGuess(secondValue);
  const distances = Array.from({ length: first.length + 1 }, () => []);

  for (let row = 0; row <= first.length; row += 1) {
    distances[row][0] = row;
  }

  for (let column = 0; column <= second.length; column += 1) {
    distances[0][column] = column;
  }

  for (let row = 1; row <= first.length; row += 1) {
    for (let column = 1; column <= second.length; column += 1) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1;

      distances[row][column] = Math.min(
        distances[row - 1][column] + 1,
        distances[row][column - 1] + 1,
        distances[row - 1][column - 1] + cost,
      );
    }
  }

  return distances[first.length][second.length];
}

function isCorrectGuess(guess, answer) {
  const normalizedGuess = normalizeGuess(guess);
  const normalizedAnswer = normalizeGuess(answer);

  if (!normalizedGuess || !normalizedAnswer) {
    return false;
  }

  if (normalizedGuess === normalizedAnswer) {
    return true;
  }

  const allowedMistakes = normalizedAnswer.length <= 5 ? 1 : 2;

  return getEditDistance(normalizedGuess, normalizedAnswer) <= allowedMistakes;
}

class BlindfoldBrushChat {
  constructor({ onMessage, onCorrectGuess } = {}) {
    this.messages = [];
    this.correctGuessPlayerIds = [];
    this.currentAnswer = "";
    this.currentArtistId = null;
    this.isDrawingRoundActive = false;
    this.onMessage = onMessage;
    this.onCorrectGuess = onCorrectGuess;
  }

  startRound({ answer, artistId }) {
    this.messages = [];
    this.correctGuessPlayerIds = [];
    this.currentAnswer = answer;
    this.currentArtistId = artistId;
    this.isDrawingRoundActive = true;
  }

  endRound() {
    this.isDrawingRoundActive = false;
    this.currentAnswer = "";
    this.currentArtistId = null;
  }

  submitGuess({ playerId, playerName, text }) {
    const cleanedText = String(text).trim();

    if (!this.isDrawingRoundActive || !cleanedText) {
      return { accepted: false, reason: "chat-closed" };
    }

    if (playerId === this.currentArtistId) {
      return { accepted: false, reason: "artist-cannot-guess" };
    }

    if (this.correctGuessPlayerIds.includes(playerId)) {
      return { accepted: false, reason: "already-correct" };
    }

    if (isCorrectGuess(cleanedText, this.currentAnswer)) {
      this.correctGuessPlayerIds.push(playerId);
      this.addSystemMessage(`${playerName} guessed correctly.`);

      if (this.onCorrectGuess) {
        this.onCorrectGuess(playerId);
      }

      return { accepted: true, correct: true };
    }

    const message = {
      type: CHAT_MESSAGE_TYPES.guess,
      playerId,
      playerName,
      text: cleanedText,
      createdAt: Date.now(),
    };

    this.messages.push(message);
    this.emitMessage(message);

    return { accepted: true, correct: false };
  }

  addSystemMessage(text) {
    const message = {
      type: CHAT_MESSAGE_TYPES.system,
      text,
      createdAt: Date.now(),
    };

    this.messages.push(message);
    this.emitMessage(message);
  }

  getVisibleMessages() {
    return [...this.messages];
  }

  emitMessage(message) {
    if (this.onMessage) {
      this.onMessage(message);
    }
  }
}

window.BlindfoldBrushChat = BlindfoldBrushChat;
window.BlindfoldBrushChatMessageTypes = CHAT_MESSAGE_TYPES;
window.BlindfoldBrushIsCorrectGuess = isCorrectGuess;
