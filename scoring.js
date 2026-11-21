const SCORING_SETTINGS = {
  maxGuessPoints: 100,
  minGuessPoints: 25,
  artistPointsPerCorrectGuess: 20,
  roundSeconds: 30,
};

function clampScore(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function calculateGuessPoints(secondsRemaining) {
  const numericSeconds = Number.isFinite(secondsRemaining) ? secondsRemaining : 0;
  const safeSecondsRemaining = clampScore(numericSeconds, 0, SCORING_SETTINGS.roundSeconds);
  const speedPercent = safeSecondsRemaining / SCORING_SETTINGS.roundSeconds;
  const pointRange = SCORING_SETTINGS.maxGuessPoints - SCORING_SETTINGS.minGuessPoints;

  return Math.round(SCORING_SETTINGS.minGuessPoints + pointRange * speedPercent);
}

class BlindfoldBrushScoring {
  constructor(players = []) {
    this.scores = new Map();
    this.roundHistory = [];
    this.setPlayers(players);
  }

  setPlayers(players) {
    players.forEach((player) => {
      if (!this.scores.has(player.id)) {
        this.scores.set(player.id, {
          playerId: player.id,
          playerName: player.name || player.nickname || "Player",
          totalPoints: 0,
        });
      } else {
        const playerScore = this.scores.get(player.id);
        playerScore.playerName = player.name || player.nickname || playerScore.playerName;
      }
    });
  }

  removePlayer(playerId) {
    this.scores.delete(playerId);
  }

  scoreRound({ artistId, correctGuesses = [], roundStartedAt, roundEndedAt, prompt, reason }) {
    const roundPoints = [];
    const guessCount = correctGuesses.length;
    const artistPoints = guessCount * SCORING_SETTINGS.artistPointsPerCorrectGuess;

    if (artistId && artistPoints > 0) {
      this.addPoints(artistId, artistPoints);
      roundPoints.push({
        playerId: artistId,
        playerName: this.getPlayerName(artistId),
        role: "artist",
        points: artistPoints,
      });
    }

    correctGuesses.forEach((guess) => {
      const guessedAt = guess.guessedAt || roundEndedAt;
      const elapsedSeconds = Math.max(0, (guessedAt - roundStartedAt) / 1000);
      const secondsRemaining = SCORING_SETTINGS.roundSeconds - elapsedSeconds;
      const safeSecondsRemaining = Number.isFinite(secondsRemaining)
        ? clampScore(secondsRemaining, 0, SCORING_SETTINGS.roundSeconds)
        : 0;
      const points = calculateGuessPoints(secondsRemaining);

      this.addPoints(guess.playerId, points);
      roundPoints.push({
        playerId: guess.playerId,
        playerName: guess.playerName || this.getPlayerName(guess.playerId),
        role: "guesser",
        points,
        guessedAt,
        secondsRemaining: safeSecondsRemaining,
      });
    });

    const result = {
      artistId,
      prompt,
      reason,
      roundPoints,
      leaderboard: this.getLeaderboard(),
    };

    this.roundHistory.push(result);

    return result;
  }

  addPoints(playerId, points) {
    if (!this.scores.has(playerId)) {
      this.scores.set(playerId, {
        playerId,
        playerName: "Player",
        totalPoints: 0,
      });
    }

    const playerScore = this.scores.get(playerId);
    playerScore.totalPoints += points;
  }

  getPlayerName(playerId) {
    const playerScore = this.scores.get(playerId);

    return playerScore ? playerScore.playerName : "Player";
  }

  getLeaderboard() {
    return [...this.scores.values()]
      .sort((firstPlayer, secondPlayer) => {
        return secondPlayer.totalPoints - firstPlayer.totalPoints;
      })
      .map((playerScore, index) => {
        return {
          ...playerScore,
          rank: index + 1,
        };
      });
  }

  getRoundHistory() {
    return [...this.roundHistory];
  }
}

window.BlindfoldBrushScoring = BlindfoldBrushScoring;
window.BlindfoldBrushCalculateGuessPoints = calculateGuessPoints;
window.BlindfoldBrushScoringSettings = SCORING_SETTINGS;
