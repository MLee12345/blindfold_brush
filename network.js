// network.js
// Connects Blindfold Brush to Firebase Realtime Database so rooms are shared
// between different devices. Rooms are saved at /rooms/{roomCode}.
//
// index.html loads the Firebase browser scripts (CDN) before this file.

// 1. Paste your Firebase project settings here
//    (Firebase console > Project settings > Your apps > Web app).
const firebaseConfig = {
  apiKey: "AIzaSyB3GcdP_MuWh1X9j1CxuPeBk_4fDQFZe0M",
  authDomain: "blindfold-brush.firebaseapp.com",
  databaseURL: "https://blindfold-brush-default-rtdb.firebaseio.com/",
  projectId: "blindfold-brush",
  storageBucket: "blindfold-brush.firebasestorage.app",
  messagingSenderId: "61571644789",
  appId: "1:61571644789:web:ecc8965949a15ed096a73c"
};

let database = null;

function isFirebaseConfigured() {
  return Boolean(firebaseConfig.databaseURL) && !firebaseConfig.databaseURL.includes("PASTE_HERE");
}

// Starts Firebase the first time it is needed and returns the database.
function connectToFirebase() {
  if (database) {
    return database;
  }

  if (!window.firebase) {
    throw new Error("Could not load Firebase. Check your internet connection.");
  }

  if (!isFirebaseConfigured()) {
    throw new Error("Online rooms are not set up yet. Paste your Firebase config into network.js.");
  }

  if (window.firebase.apps.length === 0) {
    window.firebase.initializeApp(firebaseConfig);
  }

  database = window.firebase.database();
  return database;
}

function getRoomRef(roomCode) {
  return connectToFirebase().ref(`rooms/${roomCode}`);
}

// Turns Firebase errors into messages a player can understand.
function makeFriendlyError(error) {
  const text = String((error && (error.code || error.message)) || "");

  if (text.toLowerCase().includes("permission")) {
    return new Error("Firebase blocked this request. Check your Realtime Database rules.");
  }

  return error instanceof Error ? error : new Error("Could not reach the online rooms. Please try again.");
}

// rooms.js keeps players in an array, but Firebase works best with objects.
// Online, players are stored as { playerId: player }.
function roomToFirebase(room) {
  const players = {};

  room.players.forEach((player) => {
    players[player.id] = player;
  });

  return { ...room, players };
}

function roomFromFirebase(data) {
  if (!data || !data.code) {
    return null;
  }

  const players = Object.values(data.players || {}).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

  return { ...data, players };
}

// Saves a brand-new room, but only if nobody is already using that code.
// Returns true if the room was saved, false if the code was taken.
async function saveNewRoom(room) {
  try {
    const result = await getRoomRef(room.code).transaction((currentData) => {
      if (currentData !== null) {
        return undefined; // Code already in use: cancel.
      }

      return roomToFirebase(room);
    });

    return result.committed;
  } catch (error) {
    throw makeFriendlyError(error);
  }
}

// Reads a room once. Returns null if it does not exist.
async function loadRoom(roomCode) {
  try {
    const snapshot = await getRoomRef(roomCode).get();
    return roomFromFirebase(snapshot.val());
  } catch (error) {
    throw makeFriendlyError(error);
  }
}

// Safely changes a room, even if several players change it at the same time.
// changeFn(room) receives the room (or null) and returns:
//   - a room object to save it
//   - null to delete it (or leave it missing)
//   - undefined to cancel without changing anything
// Returns the saved room, or null if the room does not exist / was cancelled.
async function changeRoom(roomCode, changeFn) {
  try {
    const result = await getRoomRef(roomCode).transaction((currentData) => {
      const nextRoom = changeFn(roomFromFirebase(currentData));

      if (nextRoom === undefined) {
        return undefined;
      }

      return nextRoom === null ? null : roomToFirebase(nextRoom);
    });

    if (!result.committed) {
      return null;
    }

    return roomFromFirebase(result.snapshot.val());
  } catch (error) {
    throw makeFriendlyError(error);
  }
}

// Calls onChange(room) now and every time the room changes online.
// onChange receives null if the room is deleted.
// Returns a function that stops listening.
function watchRoom(roomCode, onChange) {
  const roomRef = getRoomRef(roomCode);
  const handleValue = (snapshot) => onChange(roomFromFirebase(snapshot.val()));

  roomRef.on("value", handleValue, (error) => {
    window.console.warn("Stopped watching room.", error);
  });

  return () => roomRef.off("value", handleValue);
}

// Marks the player as away if their laptop disconnects or the tab closes,
// and marks them as back when they reconnect.
// Returns a function that stops doing this.
function keepPlayerOnline(roomCode, playerId) {
  const connectedRef = connectToFirebase().ref(".info/connected");
  const playerRef = getRoomRef(roomCode).child(`players/${playerId}`);

  const handleConnection = (snapshot) => {
    if (snapshot.val() !== true) {
      return;
    }

    playerRef.onDisconnect().update({ isActive: false });

    // Only update players that still exist, so we never create a half room.
    playerRef.transaction((player) => (player ? { ...player, isActive: true } : null));
  };

  connectedRef.on("value", handleConnection);

  return () => {
    connectedRef.off("value", handleConnection);
    playerRef.onDisconnect().cancel();
  };
}

window.BlindfoldBrushNetwork = {
  isFirebaseConfigured,
  saveNewRoom,
  loadRoom,
  changeRoom,
  watchRoom,
  keepPlayerOnline,
};
