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
let currentLobbyPlayers = {};
let onlineGameOpened = false;

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
  return name
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 18);
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
    let index = 0;
    index < 5;
    index += 1
  ) {
    code += characters[
      Math.floor(
        Math.random() *
        characters.length
      )
    ];
  }

  return code;
}

function createOnlineDeck() {
  const deckSuits = [
    { symbol: "♠", color: "black" },
    { symbol: "♥", color: "red" },
    { symbol: "♦", color: "red" },
    { symbol: "♣", color: "black" }
  ];

  const deckRanks = [
    "2", "3", "4", "5", "6", "7",
    "8", "9", "10", "J", "Q", "K", "A"
  ];

  const cards = [];

  deckSuits.forEach(function (suit) {
    deckRanks.forEach(function (rank) {
      cards.push({
        rank: rank,
        suit: suit.symbol,
        color: suit.color
      });
    });
  });

  return cards;
}

function shuffleOnlineDeck(cards) {
  for (
    let index = cards.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1)
    );

    const temporaryCard = cards[index];

    cards[index] = cards[randomIndex];
    cards[randomIndex] = temporaryCard;
  }

  return cards;
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
    console.warn(error);
  }
}

function loadRememberedPlayerName(input) {
  try {
    const name = localStorage.getItem(
      "pokerGamePlayerName"
    );

    if (name) {
      input.value = name;
    }
  } catch (error) {
    console.warn(error);
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

function getOrderedPlayerEntries(players) {
  return Object.entries(players || {})
    .sort(function (first, second) {
      return (
        (first[1].joinedAt || 0) -
        (second[1].joinedAt || 0)
      );
    });
}

function renderLobbyPlayers(players) {
  const elements = getOnlineElements();

  currentLobbyPlayers = players || {};

  const entries = getOrderedPlayerEntries(
    currentLobbyPlayers
  );

  elements.lobbyPlayerList.replaceChildren();

  entries.forEach(function (entry) {
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
      const hostBadge =
        document.createElement("span");

      hostBadge.className = "lobby-badge";
      hostBadge.textContent = "Host";
      badges.appendChild(hostBadge);
    }

    if (onlineUser && uid === onlineUser.uid) {
      const youBadge =
        document.createElement("span");

      youBadge.className =
        "lobby-badge you-badge";

      youBadge.textContent = "You";
      badges.appendChild(youBadge);
    }

    row.appendChild(name);
    row.appendChild(badges);

    elements.lobbyPlayerList.appendChild(row);
  });

  const playerCount = entries.length;

  elements.lobbyPlayerCount.textContent =
    playerCount +
    (playerCount === 1
      ? " player"
      : " players");

  const isHost =
    onlineUser &&
    onlineUser.uid === currentRoomHostUid;

  elements.lobbyStartButton.hidden = !isHost;

  if (isHost) {
    elements.lobbyStartButton.disabled =
      playerCount < 3 ||
      playerCount > 6;
  }

  if (playerCount < 3) {
    elements.lobbyMessage.textContent =
      "Waiting for at least 3 players…";
  } else if (playerCount > 6) {
    elements.lobbyMessage.textContent =
      "The base game currently supports up to 6 players.";
  } else if (isHost) {
    elements.lobbyMessage.textContent =
      "Everyone is here. Start when ready.";
  } else {
    elements.lobbyMessage.textContent =
      "Waiting for the host to start.";
  }
}

async function waitForGameCode() {
  for (
    let attempt = 0;
    attempt < 60;
    attempt += 1
  ) {
    if (
      window.PokerDynamicPlayers &&
      window.PokerDynamicPlayers
        .startOnlineOpening
    ) {
      return;
    }

    await new Promise(function (resolve) {
      window.setTimeout(resolve, 100);
    });
  }

  throw new Error(
    "The game code did not finish loading."
  );
}

async function openOnlineGame() {
  if (
    onlineGameOpened ||
    !currentRoomRef ||
    !onlineUser
  ) {
    return;
  }

  onlineGameOpened = true;

  const elements = getOnlineElements();

  setMessage(
    elements.lobbyMessage,
    "Dealing cards…"
  );

  try {
    await waitForGameCode();

    const results = await Promise.all([
      currentRoomRef
        .child("game")
        .once("value"),

      currentRoomRef
        .child(
          "privateHands/" +
          onlineUser.uid
        )
        .once("value")
    ]);

    const gameData = results[0].val();
    const handData = results[1].val();

    if (
      !gameData ||
      !gameData.playerOrder ||
      !handData
    ) {
      throw new Error(
        "The opening deal is incomplete."
      );
    }

    const savedOrder =
      Object.values(gameData.playerOrder);

    const localOrder = [
      onlineUser.uid
    ].concat(
      savedOrder.filter(function (uid) {
        return uid !== onlineUser.uid;
      })
    );

    const localNames =
      localOrder.map(function (uid) {
        return (
          gameData.playerNames[uid] ||
          "Player"
        );
      });

    const ownHand = [
      handData.card1,
      handData.card2
    ];

    window.PokerDynamicPlayers
      .startOnlineOpening(
        localNames,
        ownHand
      );
  } catch (error) {
    console.error(
      "Opening online game failed:",
      error
    );

    onlineGameOpened = false;

    setMessage(
      elements.lobbyMessage,
      "Start failed: " +
      (error.code || error.message),
      "error"
    );
  }
}

function listenToRoom(roomCode) {
  stopListeningToRoom();

  const elements = getOnlineElements();

  currentRoomCode = roomCode;
  onlineGameOpened = false;

  currentRoomRef = onlineDatabase.ref(
    "rooms/" + roomCode
  );

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

      renderLobbyPlayers(
        currentLobbyPlayers
      );

      if (meta.status === "playing") {
        openOnlineGame();
      }
    });

  currentPlayersRef.on(
    "value",
    function (snapshot) {
      renderLobbyPlayers(snapshot.val());
    },
    function (error) {
      setMessage(
        elements.lobbyMessage,
        "Player list failed: " +
        (error.code || error.message),
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
      .ref(
        "rooms/" +
        roomCode +
        "/meta"
      )
      .once("value");

    if (!snapshot.exists()) {
      return roomCode;
    }
  }

  throw new Error(
    "Could not create a room code."
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
      "Still connecting. Try again.",
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
      stage: "preflop",
      createdAt:
        firebase.database.ServerValue.TIMESTAMP
    });

    await roomRef
      .child(
        "players/" +
        onlineUser.uid
      )
      .set({
        name: playerName,
        joinedAt:
          firebase.database.ServerValue.TIMESTAMP
      });

    roomRef
      .child(
        "players/" +
        onlineUser.uid
      )
      .onDisconnect()
      .remove();

    rememberPlayerName(playerName);
    listenToRoom(roomCode);
  } catch (error) {
    console.error(error);

    setMessage(
      elements.onlineMessage,
      "Create failed: " +
      (error.code || error.message),
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
      "Still connecting. Try again.",
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

    return;
  }

  if (roomCode.length !== 5) {
    setMessage(
      elements.onlineMessage,
      "Enter the 5-character room code.",
      "error"
    );

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
        "Room not found.",
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
      .child(
        "players/" +
        onlineUser.uid
      )
      .set({
        name: playerName,
        joinedAt:
          firebase.database.ServerValue.TIMESTAMP
      });

    roomRef
      .child(
        "players/" +
        onlineUser.uid
      )
      .onDisconnect()
      .remove();

    rememberPlayerName(playerName);
    listenToRoom(roomCode);
  } catch (error) {
    console.error(error);

    setMessage(
      elements.onlineMessage,
      "Join failed: " +
      (error.code || error.message),
      "error"
    );
  } finally {
    elements.createRoomButton.disabled = false;
    elements.joinRoomButton.disabled = false;
  }
}

async function startOnlineGame() {
  const elements = getOnlineElements();

  if (
    !onlineUser ||
    !currentRoomRef ||
    onlineUser.uid !== currentRoomHostUid
  ) {
    return;
  }

  const entries = getOrderedPlayerEntries(
    currentLobbyPlayers
  );

  if (
    entries.length < 3 ||
    entries.length > 6
  ) {
    setMessage(
      elements.lobbyMessage,
      "Start with 3–6 players.",
      "error"
    );

    return;
  }

  elements.lobbyStartButton.disabled = true;

  setMessage(
    elements.lobbyMessage,
    "Shuffling and dealing…"
  );

  try {
    const cards = shuffleOnlineDeck(
      createOnlineDeck()
    );

    const playerOrder =
      entries.map(function (entry) {
        return entry[0];
      });

    const playerNames = {};
    const hands = {};

    entries.forEach(function (entry) {
      playerNames[entry[0]] =
        entry[1].name || "Player";

      hands[entry[0]] = [];
    });

    for (
      let cardNumber = 0;
      cardNumber < 2;
      cardNumber += 1
    ) {
      playerOrder.forEach(function (uid) {
        hands[uid].push(cards.pop());
      });
    }

    const flop = [
      cards.pop(),
      cards.pop(),
      cards.pop()
    ];

    const turn = cards.pop();
    const river = cards.pop();

    const updates = {
      "game/playerOrder": playerOrder,
      "game/playerNames": playerNames,
      "game/startedAt":
        firebase.database.ServerValue.TIMESTAMP,

      "board/flop": flop,
      "board/turn": turn,
      "board/river": river,

      "meta/status": "playing",
      "meta/stage": "preflop"
    };

    playerOrder.forEach(function (uid) {
      updates[
        "privateHands/" + uid
      ] = {
        card1: hands[uid][0],
        card2: hands[uid][1]
      };
    });

    await currentRoomRef.update(updates);
  } catch (error) {
    console.error(
      "Start game failed:",
      error
    );

    elements.lobbyStartButton.disabled = false;

    setMessage(
      elements.lobbyMessage,
      "Start failed: " +
      (error.code || error.message),
      "error"
    );
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
      console.error(error);
    }
  }

  stopListeningToRoom();

  currentRoomCode = null;
  currentRoomHostUid = null;
  currentLobbyPlayers = {};
  onlineGameOpened = false;

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
    startOnlineGame
  );
}

window.createOnlineRoom = createOnlineRoom;
window.joinOnlineRoom = joinOnlineRoom;

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