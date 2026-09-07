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

const playerRows = Array.from(
  document.querySelectorAll(".player-row")
);

const rankingTokens = Array.from(
  document.querySelectorAll(".ranking-token")
);

const tokenRow = document.querySelector(".token-row");

const advanceButton = document.querySelector(
  ".advance-button"
);

const stageLabel = document.querySelector(
  ".game-header p"
);

const communityCardElements = Array.from(
  document.querySelectorAll(".community-cards .card")
);

const suits = [
  {
    symbol: "♠",
    color: "black"
  },
  {
    symbol: "♥",
    color: "red"
  },
  {
    symbol: "♦",
    color: "red"
  },
  {
    symbol: "♣",
    color: "black"
  }
];

const ranks = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A"
];

let activePlayerIndex = 0;
let currentStage = "preflop";
let deck = [];
let playerHands = [];
let communityCards = [];

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

  playerHands = [
    [],
    [],
    [],
    []
  ];

  // Deal one card to every player, twice.
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
  cardElement.classList.toggle(
    "red-card",
    card.color === "red"
  );
}

function hideCard(cardElement) {
  cardElement.replaceChildren();
  cardElement.textContent = "?";

  cardElement.classList.add("card-slot");
  cardElement.classList.remove("red-card");
}

function renderPlayerHands() {
  playerRows.forEach(function (row, playerIndex) {
    const cardElements = Array.from(
      row.querySelectorAll(".mini-hand .card")
    );

    cardElements.forEach(function (
      cardElement,
      cardIndex
    ) {
      displayCard(
        cardElement,
        playerHands[playerIndex][cardIndex]
      );
    });
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
      hideCard(cardElement);
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
    return;
  }

  if (currentStage === "preflop") {
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

  playerRows.forEach(function (row, playerIndex) {
    const tokenSpace = row.querySelector(".owned-token");
    const statusDisplay = row.querySelector(
      ".player-info span"
    );

    tokenSpace.replaceChildren();

    row.classList.toggle(
      "active-player",
      playerIndex === activePlayerIndex
    );

    const playerToken = playerTokens[playerIndex];

    if (playerToken === null) {
      tokenSpace.textContent = "—";
      tokenSpace.classList.remove("has-token");
      statusDisplay.textContent = "Waiting for token";
    } else {
      const tokenButton = getTokenButton(playerToken);

      tokenSpace.classList.add("has-token");
      tokenSpace.appendChild(tokenButton);

      statusDisplay.textContent =
        "Holding token " + playerToken;
    }
  });

  updateAdvanceButton();
}

function giveTokenToActivePlayer(tokenNumber) {
  const currentToken = playerTokens[activePlayerIndex];
  const currentOwnerIndex = findTokenOwner(tokenNumber);

  if (currentOwnerIndex === activePlayerIndex) {
    playerTokens[activePlayerIndex] = null;
    updateTokenDisplay();
    return;
  }

  if (currentOwnerIndex !== -1) {
    playerTokens[currentOwnerIndex] = currentToken;
  }

  playerTokens[activePlayerIndex] = tokenNumber;

  updateTokenDisplay();
}

function advanceGameStage() {
  if (advanceButton.disabled) {
    return;
  }

  if (currentStage === "preflop") {
    currentStage = "flop";
  } else if (currentStage === "flop") {
    currentStage = "turn";
  } else if (currentStage === "turn") {
    currentStage = "river";
  } else {
    window.alert(
      "The poker-hand evaluator comes next. " +
      "It will determine whether this order is correct."
    );

    return;
  }

  renderCommunityCards();
  updateAdvanceButton();
}

startGameButton.addEventListener("click", function () {
  dealNewRound();
  showScreen(gameScreen);
});

howToPlayButton.addEventListener("click", function () {
  showScreen(rulesScreen);
});

backButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    showScreen(menuScreen);
  });
});

playerRows.forEach(function (row, playerIndex) {
  row.addEventListener("click", function () {
    activePlayerIndex = playerIndex;
    updateTokenDisplay();
  });
});

rankingTokens.forEach(function (button) {
  button.addEventListener("click", function (event) {
    event.stopPropagation();

    const tokenNumber = Number(button.textContent);

    giveTokenToActivePlayer(tokenNumber);
  });
});

advanceButton.addEventListener(
  "click",
  advanceGameStage
);

updateTokenDisplay();