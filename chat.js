const CHAT_MESSAGE_TYPES = {
  guess: "guess",
  system: "system",
};

const CHAT_REVEAL_TIMES = [10, 20];

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

function getRandomLetterIndexes(answer) {
  const indexes = String(answer)
    .split("")
    .map((character, index) => ({ character, index }))
    .filter((item) => item.character !== " ")
    .map((item) => item.index);

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[randomIndex]] = [indexes[randomIndex], indexes[index]];
  }

  return indexes;
}

class BlindfoldBrushChat {
  constructor({ onMessage, onCorrectGuess } = {}) {
    this.messages = [];
    this.hiddenCorrectGuesses = [];
    this.correctGuessPlayerIds = [];
    this.currentAnswer = "";
    this.currentArtistId = null;
    this.revealIndexes = [];
    this.roundStartedAt = null;
    this.isDrawingRoundActive = false;
    this.onMessage = onMessage;
    this.onCorrectGuess = onCorrectGuess;
  }

  startRound({ answer, artistId, startedAt = Date.now() }) {
    this.messages = [];
    this.hiddenCorrectGuesses = [];
    this.correctGuessPlayerIds = [];
    this.currentAnswer = answer;
    this.currentArtistId = artistId;
    this.revealIndexes = getRandomLetterIndexes(answer);
    this.roundStartedAt = startedAt;
    this.isDrawingRoundActive = true;
  }

  endRound() {
    this.isDrawingRoundActive = false;
    this.currentAnswer = "";
    this.currentArtistId = null;
    this.revealIndexes = [];
    this.roundStartedAt = null;
  }

  submitGuess({ playerId, playerName, text }) {
    const cleanedText = String(text).trim();
    const guessedAt = Date.now();

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
      this.hiddenCorrectGuesses.push({
        playerId,
        playerName,
        text: cleanedText,
        guessedAt,
      });
      this.addSystemMessage(`${playerName} guessed correctly.`);

      if (this.onCorrectGuess) {
        this.onCorrectGuess(playerId, {
          playerId,
          playerName,
          guessedAt,
          text: cleanedText,
        });
      }

      return { accepted: true, correct: true, guessedAt };
    }

    const message = {
      type: CHAT_MESSAGE_TYPES.guess,
      playerId,
      playerName,
      text: cleanedText,
      createdAt: guessedAt,
    };

    this.messages.push(message);
    this.emitMessage(message);

    return { accepted: true, correct: false, guessedAt };
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

  getHiddenCorrectGuesses() {
    return this.hiddenCorrectGuesses.map((guess) => ({ ...guess }));
  }

  getAnswerMask(elapsedSeconds = 0) {
    const answer = String(this.currentAnswer);
    const revealCount = CHAT_REVEAL_TIMES.filter((seconds) => elapsedSeconds >= seconds).length;
    const revealIndexes = this.revealIndexes.slice(0, revealCount);

    return answer
      .split("")
      .map((character, index) => {
        if (character === " ") {
          return " ";
        }

        return revealIndexes.includes(index) ? character : "_";
      })
      .join("");
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
