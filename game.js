const menuScreen = document.querySelector("#menu-screen");
const gameScreen = document.querySelector("#game-screen");
const rulesScreen = document.querySelector("#rules-screen");

const startGameButton = document.querySelector(
  "#start-game-button"
);

const howToPlayButton = document.querySelector(
  "#how-to-play-button"
);

const backButtons = document.querySelectorAll(
  ".back-button"
);

const playerSeats = Array.from(
  document.querySelectorAll("[data-player]")
);

const rankingTokens = Array.from(
  document.querySelectorAll(".ranking-token")
);

const tokenRow = document.querySelector(".token-row");
const advanceButton = document.querySelector(".advance-button");
const stageLabel = document.querySelector("#stage-label");

const notificationBanner = document.querySelector(
  "#notification-banner"
);

const communityCardElements = Array.from(
  document.querySelectorAll(".community-cards .card")
);

const yourCardElements = Array.from(
  document.querySelectorAll(".your-hand .card")
);

const suits = [
  { symbol: "♠", color: "black" },
  { symbol: "♥", color: "red" },
  { symbol: "♦", color: "red" },
  { symbol: "♣", color: "black" }
];

const ranks = [
  "2", "3", "4", "5", "6", "7", "8",
  "9", "10", "J", "Q", "K", "A"
];

const playerNames = [
  "You",
  "Player 2",
  "Player 3",
  "Player 4"
];

let activePlayerIndex = 0;
let currentStage = "preflop";
let deck = [];
let playerHands = [];
let communityCards = [];
let notificationTimer;

const playerTokens = [
  null,
  null,
  null,
  null
];

function showScreen(screenToShow) {
  menuScreen.hidden = true;
  gameScreen.hidden = true;
  rulesScreen.hidden = true;

  screenToShow.hidden = false;
}

function showNotification(message) {
  notificationBanner.textContent = message;

  window.clearTimeout(notificationTimer);

  notificationTimer = window.setTimeout(function () {
    notificationBanner.textContent =
      "Tap a player to simulate their choice";
  }, 2500);
}

function createDeck() {
  const newDeck = [];

  suits.forEach(function (suit) {
    ranks.forEach(function (rank) {
      newDeck.push({
        rank: rank,
        suit: suit.symbol,
        color: suit.color
      });
    });
  });

  return newDeck;
}

function shuffleDeck(cards) {
  for (
    let currentIndex = cards.length - 1;
    currentIndex > 0;
    currentIndex -= 1
  ) {
    const randomIndex = Math.floor(
      Math.random() * (currentIndex + 1)
    );

    const temporaryCard = cards[currentIndex];

    cards[currentIndex] = cards[randomIndex];
    cards[randomIndex] = temporaryCard;
  }

  return cards;
}

function dealNewRound() {
  deck = shuffleDeck(createDeck());

  playerHands = [[], [], [], []];

  for (let cardNumber = 0; cardNumber < 2; cardNumber += 1) {
    for (
      let playerIndex = 0;
      playerIndex < playerHands.length;
      playerIndex += 1
    ) {
      playerHands[playerIndex].push(deck.pop());
    }
  }

  communityCards = [
    deck.pop(),
    deck.pop(),
    deck.pop(),
    deck.pop(),
    deck.pop()
  ];

  currentStage = "preflop";
  activePlayerIndex = 0;
  playerTokens.fill(null);

  renderPlayerHands();
  renderCommunityCards();
  updateTokenDisplay();

  showNotification(
    "Cards dealt — tap a player to test their token choice"
  );
}

function displayCard(cardElement, card) {
  cardElement.replaceChildren();

  const rankElement = document.createElement("span");
  const suitElement = document.createElement("span");

  rankElement.textContent = card.rank;
  suitElement.textContent = card.suit;

  cardElement.appendChild(rankElement);
  cardElement.appendChild(suitElement);

  cardElement.classList.remove("card-slot");
  cardElement.classList.remove("card-back");

  cardElement.classList.toggle(
    "red-card",
    card.color === "red"
  );
}

function hideCommunityCard(cardElement) {
  cardElement.replaceChildren();
  cardElement.textContent = "?";

  cardElement.classList.add("card-slot");
  cardElement.classList.remove("red-card");
}

function renderPlayerHands() {
  yourCardElements.forEach(function (
    cardElement,
    cardIndex
  ) {
    displayCard(
      cardElement,
      playerHands[0][cardIndex]
    );
  });
}

function getVisibleCommunityCardCount() {
  if (currentStage === "preflop") {
    return 0;
  }

  if (currentStage === "flop") {
    return 3;
  }

  if (currentStage === "turn") {
    return 4;
  }

  return 5;
}

function renderCommunityCards() {
  const visibleCardCount =
    getVisibleCommunityCardCount();

  communityCardElements.forEach(function (
    cardElement,
    cardIndex
  ) {
    if (cardIndex < visibleCardCount) {
      displayCard(
        cardElement,
        communityCards[cardIndex]
      );
    } else {
      hideCommunityCard(cardElement);
    }
  });

  if (currentStage === "preflop") {
    stageLabel.textContent = "Pre-Flop";
  } else if (currentStage === "flop") {
    stageLabel.textContent = "Flop";
  } else if (currentStage === "turn") {
    stageLabel.textContent = "Turn";
  } else {
    stageLabel.textContent = "River";
  }
}

function findTokenOwner(tokenNumber) {
  return playerTokens.findIndex(function (token) {
    return token === tokenNumber;
  });
}

function getTokenButton(tokenNumber) {
  return rankingTokens.find(function (button) {
    return Number(button.textContent) === tokenNumber;
  });
}

function getTokenSpace(playerIndex) {
  return document.querySelector(
    '[data-token-space="' + playerIndex + '"]'
  );
}

function updateAdvanceButton() {
  const everyoneHasToken = playerTokens.every(
    function (token) {
      return token !== null;
    }
  );

  advanceButton.disabled = !everyoneHasToken;

  if (!everyoneHasToken) {
    advanceButton.textContent =
      "Select All Tokens to Continue";
  } else if (currentStage === "preflop") {
    advanceButton.textContent = "Deal the Flop";
  } else if (currentStage === "flop") {
    advanceButton.textContent = "Deal the Turn";
  } else if (currentStage === "turn") {
    advanceButton.textContent = "Deal the River";
  } else {
    advanceButton.textContent = "Reveal Results";
  }
}

function updateTokenDisplay() {
  rankingTokens
    .slice()
    .sort(function (firstButton, secondButton) {
      return (
        Number(firstButton.textContent) -
        Number(secondButton.textContent)
      );
    })
    .forEach(function (button) {
      tokenRow.appendChild(button);
    });

  playerSeats.forEach(function (seat) {
    const playerIndex = Number(seat.dataset.player);

    seat.classList.toggle(
      "active-player",
      playerIndex === activePlayerIndex
    );
  });

  playerTokens.forEach(function (token, playerIndex) {
    const tokenSpace = getTokenSpace(playerIndex);

    tokenSpace.replaceChildren();

    if (token === null) {
      tokenSpace.textContent = "—";
      tokenSpace.classList.remove("has-token");
    } else {
      tokenSpace.classList.add("has-token");
      tokenSpace.appendChild(getTokenButton(token));
    }
  });

  updateAdvanceButton();
}

function chooseToken(tokenNumber) {
  const currentToken = playerTokens[activePlayerIndex];
  const currentOwnerIndex = findTokenOwner(tokenNumber);

  if (currentOwnerIndex === activePlayerIndex) {
    playerTokens[activePlayerIndex] = null;

    showNotification(
      playerNames[activePlayerIndex] +
      " returns token " +
      tokenNumber
    );

    updateTokenDisplay();
    return;
  }

  if (currentOwnerIndex !== -1) {
    showNotification(
      playerNames[activePlayerIndex] +
      " wants token " +
      tokenNumber +
      " from " +
      playerNames[currentOwnerIndex]
    );

    return;
  }

  playerTokens[activePlayerIndex] = tokenNumber;

  showNotification(
    playerNames[activePlayerIndex] +
    " takes token " +
    tokenNumber
  );

  if (currentToken !== null) {
    showNotification(
      playerNames[activePlayerIndex] +
      " switches to token " +
      tokenNumber
    );
  }

  updateTokenDisplay();
}

function advanceGameStage() {
  if (advanceButton.disabled) {
    return;
  }

  if (currentStage === "preflop") {
    currentStage = "flop";
    showNotification("The flop is revealed");
  } else if (currentStage === "flop") {
    currentStage = "turn";
    showNotification("The turn is revealed");
  } else if (currentStage === "turn") {
    currentStage = "river";
    showNotification("The river is revealed");
  } else {
    window.alert(
      "The results screen will be added with the poker evaluator."
    );

    return;
  }

  renderCommunityCards();
  updateAdvanceButton();
}

startGameButton.addEventListener("click", function () {
  showScreen(gameScreen);
  dealNewRound();
});

howToPlayButton.addEventListener("click", function () {
  showScreen(rulesScreen);
});

backButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    showScreen(menuScreen);
  });
});

playerSeats.forEach(function (seat) {
  seat.addEventListener("click", function () {
    activePlayerIndex = Number(seat.dataset.player);
    updateTokenDisplay();

    showNotification(
      "Testing as " + playerNames[activePlayerIndex]
    );
  });
});

rankingTokens.forEach(function (button) {
  button.addEventListener("click", function (event) {
    event.stopPropagation();

    chooseToken(Number(button.textContent));
  });
});

advanceButton.addEventListener(
  "click",
  advanceGameStage
);

updateTokenDisplay();