# Testing Notes

Use this file to track what the group tested before opening or merging a pull request.

## How to Run Tests

Open `index.html` in a browser.

For multiplayer checks, open the page in two browser tabs or two browser windows. Use one tab as the host and the other tab as a joining player.

## Basic Page Checks

- [ ] The page opens without a browser console error.
- [ ] The Blindfold Brush title is visible.
- [ ] The drawing canvas is visible.
- [ ] The color picker is visible.
- [ ] The brush-size slider is visible.
- [ ] The clear button is visible.
- [ ] Drawing works with a mouse or trackpad.
- [ ] The clear button removes the drawing.

## Drawing Checks

- [ ] The artist sees a grid instead of visible strokes during the round.
- [ ] The cursor indicator follows the mouse.
- [ ] Brush color changes apply to new strokes.
- [ ] Brush size changes apply to new strokes.
- [ ] Shift-drag erases from the hidden drawing.
- [ ] Command-Z or Control-Z undoes the last drawing action.
- [ ] The drawing reveals when the round ends.

## Room Checks

- [ ] Creating a room returns a room object with a six-character room code.
- [ ] Room codes use uppercase letters and numbers.
- [ ] Joining a room adds the new player to the room.
- [ ] A room allows 2-6 active players.
- [ ] A player joining after the room is full becomes a spectator.
- [ ] A player joining after the game starts becomes a spectator.
- [ ] Leaving a room marks the player inactive.
- [ ] If the host leaves, host status transfers to another active player.
- [ ] If every player leaves, the room closes.
- [ ] The host cannot start the game until at least two active players are ready.

## Prompt Checks

- [ ] Empty prompt text is ignored.
- [ ] Extra spaces inside a prompt are cleaned up.
- [ ] A player must submit exactly three prompts.
- [ ] Submitting fewer than three prompts returns an invalid result.
- [ ] Submitting more than three prompts returns an invalid result.
- [ ] Resubmitting prompts replaces that player's previous prompts.
- [ ] Prompt options return exactly three choices.
- [ ] Prompt options can use fallback prompts if the pool is too small.
- [ ] Answer hints hide letters with underscores.
- [ ] Spaces and punctuation stay visible in answer hints.
- [ ] Revealed hint letters appear in the correct positions.

## Network Checks

- [ ] Network room codes are normalized before messages are sent.
- [ ] Messages include an id, type, payload, sender id, room code, and timestamp.
- [ ] Chat messages are trimmed before sending.
- [ ] Subscribing to one event type ignores other event types.
- [ ] Subscribing with `onAny` receives all valid messages for the room.
- [ ] Disconnecting removes active subscriptions.
- [ ] Two tabs in the same room can receive local development messages.
- [ ] Messages from another room are ignored.

## Game Flow Checks

- [ ] At least two active players can start a game after prompt submission.
- [ ] The artist receives three prompt options.
- [ ] Non-artists do not see the selected answer.
- [ ] A drawing round lasts up to 30 seconds.
- [ ] The round ends early when every eligible guesser is correct.
- [ ] Results show the correct prompt.
- [ ] The next artist is selected after the result screen.
- [ ] The game ends after three drawing cycles.
- [ ] The final results include leaderboard and gallery information.

## Bugs to Fix

Write bugs here:

- 

