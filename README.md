# Blindfold Brush

Blindfold Brush is a browser-based multiplayer drawing game project for a three-person group.

## Branches and Jobs

### `frontend-ui`

Person 1 edits:

- `index.html`
- `styles.css`
- `players.js`
- `gallery.js`

Job:

- Build the page layout
- Add buttons and controls
- Style the drawing app
- Make the app look clean and easy to use
- Add the visible screens for setup, lobby, drawing, chat, results, and gallery when those features are ready
- Build player setup behavior, including nickname and avatar data
- Build gallery behavior for viewing completed drawings

### `drawing-engine`

Person 2 edits:

- `drawing.js`
- `game.js`
- `chat.js`
- `scoring.js`

Job:

- Make drawing work on the canvas
- Add brush behavior
- Add clear, eraser, undo, or other drawing tools
- Handle mouse and touch input
- Support the blind drawing mechanic, including hidden strokes, grid, cursor, and reveal behavior
- Build game-round behavior, including timers, turn flow, and artist rotation
- Build guessing and chat behavior for drawing rounds
- Build scoring and leaderboard behavior

### `project-setup-docs`

Person 3 edits:

- `README.md`
- `TESTING.md`
- `rooms.js`
- `prompts.js`
- `network.js`

Job:

- Keep project instructions updated
- Write how to run the project
- Write testing notes
- Help organize files and GitHub pull requests
- Build room creation, room joining, room codes, and room lifecycle logic
- Build prompt submission and prompt selection logic
- Build multiplayer connection logic with the real-time backend
- Keep the project aligned with the PRD requirements

## Files

- `index.html` is the main page.
- `styles.css` controls how the app looks.
- `drawing.js` controls the drawing behavior.
- `rooms.js` will control creating rooms, joining rooms, room codes, and room lifecycle.
- `players.js` will track nicknames, avatars, hosts, active players, spectators, and disconnect behavior.
- `prompts.js` will manage player-submitted prompts and prompt selection.
- `game.js` will manage game phases, round timers, artist rotation, and turn flow.
- `chat.js` will manage guesses, chat messages, and correct-answer handling.
- `scoring.js` will calculate points and leaderboard updates.
- `network.js` will connect the browser to the real-time multiplayer backend.
- `gallery.js` will store completed round drawings for the final gallery view.
- `TESTING.md` explains how to test the app.
- `ROLES.md` explains each person's role.

## How to Run

Open `index.html` in a browser.

