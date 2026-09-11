const firebaseConfig = {
  apiKey:
    "AIzaSyDZjpKpTkFy1lCeAFED47chk9MRx_yxh7I",

  authDomain:
    "the-poker-game.firebaseapp.com",

  databaseURL:
    "https://the-poker-game-default-rtdb.firebaseio.com/",

  projectId:
    "the-poker-game",

  storageBucket:
    "the-poker-game.firebasestorage.app",

  messagingSenderId:
    "663572093644",

  appId:
    "1:663572093644:web:0297c3d00ec07840dcc069"
};

firebase.initializeApp(firebaseConfig);

const onlineDatabase = firebase.database();

let onlineUser = null;
let currentRoomCode = null;
let currentRoomRef = null;
let currentPlayersRef = null;
let currentRoomHostUid = null;

function showOnlineStatus(message, isReady) {
  let status = document.querySelector(
    "#online-status"
  );

  if (!status) {
    status = document.createElement("p");
    status.id = "online-status";
    status.className = "online-status";

    const modeLabel = document.querySelector(
      ".mode-label"
    );

    modeLabel.insertAdjacentElement(
      "afterend",
      status
    );
  }

  status.textContent = message;

  status.classList.toggle(
    "online-ready",
    isReady
  );

  status.classList.toggle(
    "online-error",
    !isReady
  );
}

function showOnlineScreen(screen) {
  document
    .querySelectorAll("main > section")
    .forEach(function (section) {
      section.hidden = true;
    });

  screen.hidden = false;
}

function setMessage(
  element,
  message,
  messageType
) {
  element.textContent = message;

  element.classList.toggle(
    "message-error",
    messageType === "error"
  );

  element.classList.toggle(
    "message-success",
    messageType === "success"
  );
}

function cleanPlayerName(name) {
  return name.trim().replace(/\s+/g, " ").slice(0, 18);
}

function cleanRoomCode(code) {
  return code
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "")
    .slice(0, 5);
}

function createRoomCode() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (
    let characterNumber = 0;
    characterNumber < 5;
    characterNumber += 1
  ) {
    const randomIndex = Math.floor(
      Math.random() * characters.length
    );

    code += characters[randomIndex];
  }

  return code;
}

function getOnlineElements() {
  return {
    menuScreen:
      document.querySelector("#menu-screen"),

    onlineScreen:
      document.querySelector("#online-screen"),

    lobbyScreen:
      document.querySelector("#lobby-screen"),

    onlineGameButton:
      document.querySelector("#online-game-button"),

    playerNameInput:
      document.querySelector("#online-player-name"),

    roomCodeInput:
      document.querySelector("#room-code-input"),

    createRoomButton:
      document.querySelector("#create-room-button"),

    joinRoomButton:
      document.querySelector("#join-room-button"),

    onlineBackButton:
      document.querySelector("#online-back-button"),

    onlineMessage:
      document.querySelector("#online-message"),

    roomCodeDisplay:
      document.querySelector("#room-code-display"),

    lobbyPlayerList:
      document.querySelector("#lobby-player-list"),

    lobbyPlayerCount:
      document.querySelector("#lobby-player-count"),

    lobbyMessage:
      document.querySelector("#lobby-message"),

    lobbyStartButton:
      document.querySelector("#lobby-start-button"),

    leaveRoomButton:
      document.querySelector("#leave-room-button")
  };
}

function rememberPlayerName(name) {
  try {
    localStorage.setItem(
      "pokerGamePlayerName",
      name
    );
  } catch (error) {
    console.warn(
      "Could not remember player name:",
      error
    );
  }
}

function loadRememberedPlayerName(input) {
  try {
    const rememberedName = localStorage.getItem(
      "pokerGamePlayerName"
    );

    if (rememberedName) {
      input.value = rememberedName;
    }
  } catch (error) {
    console.warn(
      "Could not load player name:",
      error
    );
  }
}

function stopListeningToRoom() {
  if (currentPlayersRef) {
    currentPlayersRef.off();
  }

  if (currentRoomRef) {
    currentRoomRef.child("meta").off();
  }

  currentPlayersRef = null;
  currentRoomRef = null;
}

function renderLobbyPlayers(players) {
  const elements = getOnlineElements();
  const playerEntries = Object.entries(
    players || {}
  );

  playerEntries.sort(function (
    firstEntry,
    secondEntry
  ) {
    return (
      (firstEntry[1].joinedAt || 0) -
      (secondEntry[1].joinedAt || 0)
    );
  });

  elements.lobbyPlayerList.replaceChildren();

  playerEntries.forEach(function (entry) {
    const uid = entry[0];
    const player = entry[1];

    const row = document.createElement("div");
    row.className = "lobby-player";

    const name = document.createElement("span");
    name.className = "lobby-player-name";
    name.textContent = player.name || "Player";

    const badges = document.createElement("div");
    badges.className = "lobby-player-badges";

    if (uid === currentRoomHostUid) {
      const hostBadge = document.createElement("span");
      hostBadge.className = "lobby-badge";
      hostBadge.textContent = "Host";
      badges.appendChild(hostBadge);
    }

    if (onlineUser && uid === onlineUser.uid) {
      const youBadge = document.createElement("span");
      youBadge.className =
        "lobby-badge you-badge";
      youBadge.textContent = "You";
      badges.appendChild(youBadge);
    }

    row.appendChild(name);
    row.appendChild(badges);

    elements.lobbyPlayerList.appendChild(row);
  });

  const playerCount = playerEntries.length;

  elements.lobbyPlayerCount.textContent =
    playerCount +
    (playerCount === 1
      ? " player"
      : " players");

  if (playerCount < 3) {
    elements.lobbyMessage.textContent =
      "Waiting for at least 3 players…";
  } else {
    elements.lobbyMessage.textContent =
      "Everyone is here when the host is ready.";
  }
}

function listenToRoom(roomCode) {
  stopListeningToRoom();

  const elements = getOnlineElements();

  currentRoomCode = roomCode;
  currentRoomRef = onlineDatabase
    .ref("rooms/" + roomCode);

  currentPlayersRef =
    currentRoomRef.child("players");

  elements.roomCodeDisplay.textContent =
    roomCode;

  currentRoomRef
    .child("meta")
    .on("value", function (snapshot) {
      const meta = snapshot.val();

      if (!meta) {
        setMessage(
          elements.lobbyMessage,
          "This room no longer exists.",
          "error"
        );

        return;
      }

      currentRoomHostUid = meta.hostUid;

      elements.lobbyStartButton.hidden =
        !onlineUser ||
        onlineUser.uid !== currentRoomHostUid;
    });

  currentPlayersRef.on(
    "value",
    function (snapshot) {
      renderLobbyPlayers(snapshot.val());
    },
    function (error) {
      console.error(
        "Lobby player list failed:",
        error
      );

      setMessage(
        elements.lobbyMessage,
        "The player list could not be loaded.",
        "error"
      );
    }
  );

  showOnlineScreen(elements.lobbyScreen);
}

async function findUnusedRoomCode() {
  for (
    let attempt = 0;
    attempt < 10;
    attempt += 1
  ) {
    const roomCode = createRoomCode();

    const snapshot = await onlineDatabase
      .ref("rooms/" + roomCode + "/meta")
      .once("value");

    if (!snapshot.exists()) {
      return roomCode;
    }
  }

  throw new Error(
    "A room code could not be created. Try again."
  );
}

async function createOnlineRoom() {
  const elements = getOnlineElements();
  const playerName = cleanPlayerName(
    elements.playerNameInput.value
  );

  if (!onlineUser) {
    setMessage(
      elements.onlineMessage,
      "Still connecting. Please try again.",
      "error"
    );

    return;
  }

  if (!playerName) {
    setMessage(
      elements.onlineMessage,
      "Enter your name first.",
      "error"
    );

    elements.playerNameInput.focus();
    return;
  }

  elements.createRoomButton.disabled = true;
  elements.joinRoomButton.disabled = true;

  setMessage(
    elements.onlineMessage,
    "Creating room…"
  );

  try {
    const roomCode =
      await findUnusedRoomCode();

    const roomRef = onlineDatabase.ref(
      "rooms/" + roomCode
    );

    await roomRef.child("meta").set({
      hostUid: onlineUser.uid,
      status: "lobby",
      createdAt:
        firebase.database.ServerValue.TIMESTAMP
    });

    await roomRef
      .child("players/" + onlineUser.uid)
      .set({
        name: playerName,
        joinedAt:
          firebase.database.ServerValue.TIMESTAMP
      });

    roomRef
      .child("players/" + onlineUser.uid)
      .onDisconnect()
      .remove();

    rememberPlayerName(playerName);
    listenToRoom(roomCode);
  } catch (error) {
    console.error(
      "Create room failed:",
      error
    );

    setMessage(
      elements.onlineMessage,
      "Could not create the room. Try again.",
      "error"
    );
  } finally {
    elements.createRoomButton.disabled = false;
    elements.joinRoomButton.disabled = false;
  }
}

async function joinOnlineRoom() {
  const elements = getOnlineElements();
  const playerName = cleanPlayerName(
    elements.playerNameInput.value
  );

  const roomCode = cleanRoomCode(
    elements.roomCodeInput.value
  );

  elements.roomCodeInput.value = roomCode;

  if (!onlineUser) {
    setMessage(
      elements.onlineMessage,
      "Still connecting. Please try again.",
      "error"
    );

    return;
  }

  if (!playerName) {
    setMessage(
      elements.onlineMessage,
      "Enter your name first.",
      "error"
    );

    elements.playerNameInput.focus();
    return;
  }

  if (roomCode.length !== 5) {
    setMessage(
      elements.onlineMessage,
      "Enter the 5-character room code.",
      "error"
    );

    elements.roomCodeInput.focus();
    return;
  }

  elements.createRoomButton.disabled = true;
  elements.joinRoomButton.disabled = true;

  setMessage(
    elements.onlineMessage,
    "Joining room…"
  );

  try {
    const roomRef = onlineDatabase.ref(
      "rooms/" + roomCode
    );

    const metaSnapshot = await roomRef
      .child("meta")
      .once("value");

    if (!metaSnapshot.exists()) {
      setMessage(
        elements.onlineMessage,
        "Room not found. Check the code.",
        "error"
      );

      return;
    }

    if (
      metaSnapshot.child("status").val() !==
      "lobby"
    ) {
      setMessage(
        elements.onlineMessage,
        "That game has already started.",
        "error"
      );

      return;
    }

    await roomRef
      .child("players/" + onlineUser.uid)
      .set({
        name: playerName,
        joinedAt:
          firebase.database.ServerValue.TIMESTAMP
      });

    roomRef
      .child("players/" + onlineUser.uid)
      .onDisconnect()
      .remove();

    rememberPlayerName(playerName);
    listenToRoom(roomCode);
  } catch (error) {
    console.error(
      "Join room failed:",
      error
    );

    setMessage(
      elements.onlineMessage,
      "Could not join the room. Try again.",
      "error"
    );
  } finally {
    elements.createRoomButton.disabled = false;
    elements.joinRoomButton.disabled = false;
  }
}

async function leaveOnlineRoom() {
  const elements = getOnlineElements();

  if (
    currentRoomCode &&
    onlineUser
  ) {
    try {
      await onlineDatabase
        .ref(
          "rooms/" +
          currentRoomCode +
          "/players/" +
          onlineUser.uid
        )
        .remove();
    } catch (error) {
      console.error(
        "Leave room failed:",
        error
      );
    }
  }

  stopListeningToRoom();

  currentRoomCode = null;
  currentRoomHostUid = null;

  setMessage(elements.onlineMessage, "");
  showOnlineScreen(elements.menuScreen);
}

function setUpOnlineButtons() {
  const elements = getOnlineElements();

  loadRememberedPlayerName(
    elements.playerNameInput
  );

  elements.onlineGameButton.addEventListener(
    "click",
    function () {
      setMessage(elements.onlineMessage, "");
      showOnlineScreen(elements.onlineScreen);
    }
  );

  elements.onlineBackButton.addEventListener(
    "click",
    function () {
      showOnlineScreen(elements.menuScreen);
    }
  );

  elements.createRoomButton.addEventListener(
    "click",
    createOnlineRoom
  );

  elements.joinRoomButton.addEventListener(
    "click",
    joinOnlineRoom
  );

  elements.roomCodeInput.addEventListener(
    "input",
    function () {
      elements.roomCodeInput.value =
        cleanRoomCode(
          elements.roomCodeInput.value
        );
    }
  );

  elements.roomCodeDisplay.addEventListener(
    "click",
    async function () {
      try {
        await navigator.clipboard.writeText(
          currentRoomCode
        );

        setMessage(
          elements.lobbyMessage,
          "Room code copied!",
          "success"
        );
      } catch (error) {
        setMessage(
          elements.lobbyMessage,
          "Room code: " + currentRoomCode
        );
      }
    }
  );

  elements.leaveRoomButton.addEventListener(
    "click",
    leaveOnlineRoom
  );

  elements.lobbyStartButton.addEventListener(
    "click",
    function () {
      window.alert(
        "The live online game connection comes next. " +
        "For now, the room and player list are working."
      );
    }
  );
}

showOnlineStatus("Connecting…", false);
setUpOnlineButtons();

firebase
  .auth()
  .signInAnonymously()
  .then(function (credential) {
    onlineUser = credential.user;

    showOnlineStatus(
      "● Online Ready",
      true
    );
  })
  .catch(function (error) {
    console.error(
      "Firebase sign-in failed:",
      error
    );

    showOnlineStatus(
      "Failed: " +
      (error.code || error.message),
      false
    );
  });