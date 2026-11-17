# Blindfold Brush
**Product Requirements Document (PRD)**

**Product Type:** Browser-Based Multiplayer Drawing Game  
**Platform:** Desktop Web  
**Release Target:** Polished First Release  
**Operating Budget:** $0/month

---

## Product Overview

Blindfold Brush is a multiplayer drawing and guessing game in which artists cannot see their own strokes until the drawing round ends.

Inspired by *skribbl.io* and blind contour drawing, the game combines live guessing with unpredictable artwork. One player receives a prompt and draws on a hidden canvas, while friends watch the drawing develop in real time and attempt to identify it.

Each game takes place in a private room of 2–6 players. The experience emphasizes humor, creativity, and social interaction rather than artistic skill.

---

## 1. Primary Users

Blindfold Brush is designed for small groups of friends seeking a casual, humorous multiplayer experience.

**Primary Audience**
- Friends playing together online.
- Groups of 2–6 active players.
- Casual players regardless of artistic ability.
- Players looking for short, entertaining social games.

**Access Requirements**
- Players join private rooms through invitation links or room codes.
- No account registration or login is required.
- Players choose a nickname and customize an avatar before joining.
- The game runs directly in a desktop browser.

**Intended Experience**

The game should be easy to understand, quick to join, and enjoyable regardless of drawing skill. The primary entertainment comes from guessing drawings and reacting to unexpected final artwork.

## 2. Problems to Solve

Traditional online drawing games often reward artistic ability and fast guessing. This can make gameplay predictable or less enjoyable for players who are less confident in their drawing skills.

Blindfold Brush addresses three problems:

**2.1 Predictable Gameplay**

Conventional drawing games allow artists to see and correct their work as they draw. Blindfold Brush removes this feedback, introducing uncertainty and unexpected results.

**2.2 Artistic Skill Barriers**

Players who lack drawing experience may feel disadvantaged in traditional drawing games. Blindfold Brush makes imperfect drawings a central part of the experience, reducing the importance of artistic ability.

**2.3 Limited Social Entertainment**

Traditional drawing games focus primarily on identifying the answer. Blindfold Brush combines competitive guessing with a final drawing reveal, creating additional opportunities for humor and shared reactions.

## 3. Capabilities

### 3.1 Private Multiplayer Rooms

- Players create or join private rooms.
- Each room supports 2–6 active players.
- Rooms are accessible through unique invitation links or codes.
- No accounts or passwords are required.
- Players use nicknames and customizable avatars.

### 3.2 Player-Generated Prompts

- Each player submits exactly three words or phrases before a game.
- All submissions enter a shared, hidden prompt pool.
- At the start of each turn, three prompts are randomly selected.
- The artist chooses one of these prompts.
- Only the artist sees the prompt options and selected answer.
- Prompts remain in the pool and may reappear during later rounds.

### 3.3 Drawing Mechanics

- Each drawing round lasts a maximum of 30 seconds.
- The artist cannot see their own strokes during the round.
- Other players see the drawing develop in real time.
- The artist sees a faint grid and a visible custom cursor.
- Available tools include:
  - Multiple brush colors.
  - Adjustable brush sizes.
  - Eraser.
  - Undo.
- Erasing and undoing must update the drawing visible to other players without revealing the affected strokes to the artist.

### 3.4 Live Guessing

- Players submit guesses through a shared text chat.
- Correct answers are automatically detected.
- Minor spelling mistakes are accepted.
- Accepted correct guesses are hidden from other players.
- A system notification announces when someone guesses correctly without revealing the answer.
- Players who guess correctly cannot submit additional guesses during that round.
- The artist can read chat but cannot send messages while drawing.

### 3.5 Scoring System

- Guessers earn points for identifying the correct prompt.
- Faster correct guesses earn more points.
- The artist earns points for each player who guesses correctly.
- A leaderboard displays cumulative scores throughout the game.
- Round results display points earned by each player.
- The precise point values and speed-based scoring formula may be selected during implementation, provided faster guesses are rewarded consistently.

### 3.6 Artist Rotation

- Artists are selected randomly without repeats within a cycle.
- Each active player draws once per cycle.
- A new randomized order is generated after each completed cycle.
- Each game consists of three cycles.
- Every player who remains active throughout the game receives exactly three drawing turns.

### 3.7 Round Completion

- Each round ends after 30 seconds or earlier if every eligible guesser answers correctly.
- At the end of the round, the completed drawing becomes visible to the artist immediately.
- The correct prompt and points earned are displayed.
- Results remain visible for five seconds.
- The next turn begins automatically.

### 3.8 Game Completion

- The game ends after three drawing cycles are completed.
- The final leaderboard displays rankings and highlights the winner.
- A gallery displays completed drawings, their prompts, and their artists.
- Gallery drawings can be viewed but not downloaded or shared through built-in tools.
- The host can initiate a new game in the existing room.

### 3.9 Disconnects and Spectators

- Disconnected players are automatically removed from active games.
- Removed players lose their accumulated points.
- Rejoining players start with zero points.
- If the current artist disconnects, their turn ends.
- If the host disconnects, host privileges transfer automatically.
- Players joining an ongoing game enter spectator mode.
- Spectators may watch and use text chat but cannot submit scored guesses or draw.
- Spectators may participate when the next game begins.

## 4. Required Inputs

### 4.1 Player Identity

Before entering a room, each player provides:

- A nickname.
- A customized avatar.

Avatars use preset customization options for:
- Face.
- Hairstyle.
- Clothing color.
- Skin tone.

Players can edit their nicknames and avatars before the game begins.

### 4.2 Prompt Submission

- Each player submits exactly three words or phrases.
- Prompts are entered one at a time on separate screens.
- Players may edit submitted prompts until the game begins.
- Empty submissions do not count.
- No content filtering, character limits, or duplicate prevention are required.

### 4.3 Game Configuration

- Game length is fixed at three drawing turns per player.
- Drawing rounds last up to 30 seconds.
- The host does not need to configure round counts or durations.
- The host starts the game manually after at least two players have completed prompt submission.
- All participating players must complete prompt submission before the game starts.

### 4.4 Drawing Inputs

Artists interact using a mouse or trackpad.

Required inputs include:
- Prompt selection.
- Cursor movement.
- Mouse press and drag.
- Color selection.
- Brush-size selection.
- Eraser selection.
- Undo command.

### 4.5 Guessing Inputs

- Guessers type answers into a shared chat input.
- Messages are submitted through the keyboard or send control.
- Correct-answer detection is performed automatically.
- Incorrect guesses remain visible in chat.

### 4.6 Room Access

- Players can create private rooms.
- Other players can join using a room code or invitation link.
- Room access requires no authentication.

## 5. User Flows

### 5.1 Player Setup

1. The player opens the website.
2. The player enters a nickname.
3. The player customizes an avatar.
4. The player selects Create Room or Join Room.
5. If joining, the player enters a room code or opens an invitation link.
6. The player enters the room lobby.

### 5.2 Lobby and Prompt Submission

1. Players see a grid of player cards.
2. Each card displays an avatar, nickname, and prompt submission status.
3. Players submit three prompts, one at a time.
4. Players may edit their nickname, avatar, and prompts.
5. The host shares the room link or code with friends.
6. Once at least two players have completed setup and all participating players are ready, the host clicks Start Game.

### 5.3 Artist and Prompt Selection

1. The game selects the next artist from the randomized turn order.
2. The artist privately receives three randomly selected prompts.
3. A 10-second selection countdown begins.
4. The artist selects one prompt.
5. If no choice is made, the system randomly selects one of the three prompts.
6. Other players see the main game screen, including an empty canvas, chat, artist information, and countdown.
7. The 30-second drawing round begins after prompt selection.

### 5.4 Drawing and Guessing

1. The artist begins drawing on the hidden canvas.
2. The artist sees only the grid, cursor, and drawing tools.
3. Guessers see strokes appear in real time.
4. Blank spaces representing the answer are displayed to guessers. Spaces between words remain visible.
5. At 10 seconds, one random unrevealed letter appears.
6. At 20 seconds, a second random unrevealed letter appears.
7. Guessers submit answers through chat.
8. Correct guesses are detected, including minor spelling mistakes.
9. Accepted guesses earn speed-based points and are hidden from other guessers.
10. The artist earns points when players guess correctly.

### 5.5 Round Completion

1. The round ends after 30 seconds or when all eligible guessers answer correctly.
2. The artist's completed drawing is instantly revealed.
3. The correct answer and earned points appear.
4. The leaderboard updates.
5. The results remain visible for five seconds.
6. The next artist selection begins automatically.

### 5.6 Game Completion

1. The game completes three drawing cycles.
2. The final leaderboard appears.
3. The highest-scoring player is highlighted as the winner.
4. Players can browse a view-only gallery of the completed drawings.
5. The host may select New Game.

### 5.7 Starting a New Game

1. The host selects New Game.
2. All players return to the lobby.
3. Nicknames and avatars remain unchanged.
4. Scores are reset to zero.
5. The previous prompt pool is cleared.
6. Every participating player submits three new prompts.
7. The host starts the next game.

### 5.8 Disconnect Handling

- When a player disconnects, they are removed from the active game and its turn order.
- If the disconnected player was drawing, the game advances to the next available turn.
- If the host disconnects, another active player becomes host automatically.
- If fewer than two active players remain, the game ends and the remaining participants return to the lobby.
- An interrupted game does not resume its previous progress.
- Late joiners spectate until the following game.

## 6. Constraints

### 6.1 Device Compatibility

- The game supports desktop and laptop computers.
- Mouse and trackpad input must be supported.
- Mobile phones and tablets are outside the first-release scope.

### 6.2 Browser Accessibility

- The application runs entirely in the browser.
- No installation or download is required.
- No account registration is required.
- Players join through a shareable website URL.

### 6.3 Hosting Budget

- Maximum operating budget: $0/month.
- Hosting, multiplayer infrastructure, and required backend services must use free tiers.
- The implementation must respect the limitations of those tiers.
- If a free-tier limitation prevents a requirement from being met reliably, the coding AI should identify the limitation rather than introduce a paid dependency.

### 6.4 Multiplayer Constraints

- Rooms support 2–6 active players.
- Gameplay is private; there is no public matchmaking.
- Drawings, chat, timers, scoring, and game state must synchronize across connected clients.
- Reliable gameplay takes priority over decorative features.

### 6.5 Room Lifecycle

- Rooms exist only while participants remain connected.
- When the final participant leaves, the room closes automatically.
- Closed-room codes become invalid.
- Associated temporary game data is deleted.

### 6.6 First-Release Quality

The first release must include all approved gameplay features with a visually polished interface.

Requirements include:
- Responsive drawing.
- Smooth transitions.
- Clear interaction feedback.
- Stable multiplayer behavior.
- Consistent appearance across game screens.

### 6.7 Excluded Features

The first release will not include:
- Mobile or tablet support.
- User accounts or persistent player profiles.
- Public matchmaking.
- Voice chat.
- Emoji reactions.
- Drawing downloads or external sharing.
- Persistent game recovery.
- Paid infrastructure.

## 7. Interface Requirements

### 7.1 Visual Style

Blindfold Brush will use a playful, colorful visual style inspired by Gartic Phone.

Design characteristics:
- Bright and cheerful color palette.
- Rounded buttons and panels.
- Friendly cartoon avatars.
- Bold, readable typography.
- Smooth, subtle animations.
- Consistent spacing and visual hierarchy.

The interface should feel energetic without becoming cluttered.

### 7.2 Home Screen

The home screen includes:
- Blindfold Brush title and branding.
- Nickname input.
- Avatar customization.
- Create Room button.
- Join Room button.

Avatar customization must be simple enough to complete quickly.

### 7.3 Lobby Screen

The lobby uses a colorful grid of player cards.

Each card displays:
- Player avatar.
- Player nickname.
- Prompt submission status.

Additional elements include:
- Room code.
- Copyable invitation link.
- Prompt submission interface.
- Editing controls for player information and prompts.
- Host-only Start Game button.

The Start Game button remains disabled until the minimum player count and prompt submission requirements are satisfied.

### 7.4 Main Gameplay Screen

The gameplay interface uses a three-column layout.

**Left Column — Leaderboard**
- Player avatars.
- Nicknames.
- Current scores.
- Ranking order.

**Center Column — Drawing Area**
- Large drawing canvas.
- Artist name and avatar.
- Round countdown.
- Prompt display or guessing hints, depending on the player's role.
- Drawing toolbar for the artist.

**Right Column — Chat**
- Live guesses.
- General chat messages.
- Correct-guess notifications.
- Text input for eligible participants.

The canvas should occupy the largest portion of the screen.

### 7.5 Artist's Hidden Canvas

The artist's canvas must include:
- A faint positioning grid.
- A visible custom cursor.
- Cursor indicators for brush color and size.
- No visible drawing marks before the round ends.

The grid is visible only to the artist. Spectators and guessers view a clean canvas with the drawing strokes.

### 7.6 Drawing Toolbar

The drawing toolbar appears beneath the artist's canvas.

Controls include:
- Color palette.
- Brush size selector.
- Eraser.
- Undo.

Controls must provide clear visual feedback when selected.

### 7.7 Prompt Selection Interface

The artist sees:
- Three selectable prompt options.
- A 10-second countdown.
- A clear indication of the selected prompt.

Other players see:
- The empty canvas.
- Artist information.
- Countdown.
- Chat panel.

Unselected prompts and the chosen answer remain hidden from guessers.

### 7.8 Round Results Screen

At the end of each drawing round:
- The completed drawing appears instantly.
- The correct prompt is displayed.
- Points earned during the round are shown.
- The leaderboard updates.

The results screen lasts five seconds before transitioning automatically.

### 7.9 Final Results Screen

The final results screen includes:
- Prominently displayed winner.
- Final leaderboard.
- Drawing gallery showing all completed artwork.
- Each drawing's prompt and artist.
- Host-only New Game button.

The gallery is view-only.

### 7.10 Animation and Feedback

- Use smooth transitions between screens.
- Provide subtle animations for score updates and correct guesses.
- Highlight active selections and button interactions.
- Keep animations short and nonintrusive.
- Do not use stroke replay or delayed drawing reveal animations.
- Visual effects must not interfere with drawing performance.

## 8. Technical Constraints

### 8.1 Technology Stack

The coding AI will select the most appropriate technology stack.

Selection priorities:
- Reliable real-time multiplayer.
- Ease of development and maintenance.
- Compatibility with free hosting.
- Responsive rendering and drawing.
- Straightforward deployment.

The stack may use a modern frontend framework and a suitable real-time backend.

### 8.2 Hosting and Deployment

- The application must be accessible through a shareable website URL.
- Hosting and backend services must remain within free tiers.
- The architecture must support multiple independent private rooms.
- No paid subscription or infrastructure dependency is permitted.

### 8.3 Server-Authoritative Multiplayer

The server is the authoritative source for shared gameplay state.

Server-controlled behavior includes:
- Turn order and artist selection.
- Prompt selection and validation.
- Round countdowns.
- Correct-answer detection.
- Scoring.
- Round completion.
- Game completion.
- Host assignment.

Clients display the shared game state and send player actions to the server.

### 8.4 Real-Time Synchronization

The multiplayer system must synchronize:
- Drawing strokes.
- Brush colors and sizes associated with strokes.
- Eraser operations.
- Undo operations.
- Chat messages.
- Correct-guess notifications.
- Player scores.
- Timers.
- Player joins and disconnects.
- Turn changes and round results.

The artist must not receive visible drawing feedback before the round ends, while guessers receive live drawing updates.

### 8.5 Answer Validation

The server must:
- Compare guesses against the selected prompt.
- Ignore capitalization differences.
- Accept minor spelling mistakes, including small character insertions, deletions, or substitutions.
- Prevent the answer from appearing publicly when guessed correctly.
- Prevent duplicate scoring by the same guesser.
- Reject guesses submitted after the round ends.

The validation logic should avoid accepting unrelated words as correct answers.

### 8.6 Temporary Data Storage

Temporarily stored data includes:
- Nicknames.
- Avatar settings.
- Room membership.
- Submitted prompts.
- Turn order.
- Drawing data.
- Chat and guessing state.
- Scores.
- Completed drawings for the end-game gallery.

Data requirements:
- No persistent accounts.
- No cloud-saved player profiles.
- Refreshing or closing the website resets the player's identity.
- Game data is deleted when the room closes.
- Drawings are not retained for future sessions.

### 8.7 Connection Handling

- Detect disconnected players and remove them from active game state.
- Remove disconnected players from scoring and remaining turn eligibility.
- Transfer host privileges automatically when necessary.
- End an active game if fewer than two active players remain.
- Permit players to rejoin a room as new participants, subject to its current game state.
- Players joining during a game enter spectator mode.

### 8.8 Server Failure Handling

- Automatic recovery is not required.
- If the backend crashes or restarts, active games may be lost.
- Players must create a new room after such a failure.
- No persistent checkpoint or session restoration system is required.

### 8.9 Performance Requirements

- Drawing should respond immediately to mouse or trackpad input.
- Remote drawings should appear with minimal noticeable delay.
- Round timers must remain synchronized across clients.
- Scores and correct guesses must be processed consistently.
- The application must remain usable in a full 6-player room.
- Rendering and animation should not significantly degrade drawing responsiveness.

### 8.10 Browser Compatibility

The application must support modern desktop browsers, prioritizing:
- Google Chrome.
- Safari.
- Mozilla Firefox.
- Microsoft Edge.

Mobile and tablet compatibility are not required.

---

**End of Product Requirements Document**

Blindfold Brush's first release is defined by a complete private multiplayer experience, hidden-canvas drawing, live guessing, player-generated prompts, three drawing turns per player, and a polished, colorful interface. All implementation decisions should preserve these requirements while maintaining the $0 monthly operating budget.
