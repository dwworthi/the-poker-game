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

const advanceButton = document.querySelector(
  ".advance-button"
);

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

const stages = [
  {
    name: "Pre-Flop",
    color: "white",
    visibleCards: 0
  },
  {
    name: "Flop",
    color: "yellow",
    visibleCards: 3
  },
  {
    name: "Turn",
    color: "orange",
    visibleCards: 4
  },
  {
    name: "River",
    color: "red",
    visibleCards: 5
  }
];

const playerNames = [
  "You",
  "Player 2",
  "Player 3",
  "Player 4"
];

let activePlayerIndex = 0;
let currentStageIndex = 0;
let deck = [];
let playerHands = [];
let communityCards = [];
let notificationTimer;
let roundFinished = false;
let isDealing = false;

const playerRequests = [
  null,
  null,
  null,
  null
];

const playerConfirmations = [
  false,
  false,
  false,
  false
];

const tokenHistory = [
  [],
  [],
  [],
  []
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
  }, 2600);
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

  activePlayerIndex = 0;
  currentStageIndex = 0;
  roundFinished = false;

  playerRequests.fill(null);
  playerConfirmations.fill(false);

  tokenHistory.forEach(function (history) {
    history.length = 0;
  });

  renderPlayerHands();
  renderCommunityCards();
  renderTokenSystem();

  showNotification(
    "Cards dealt — choose the white tokens"
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

function renderCommunityCards() {
  const currentStage = stages[currentStageIndex];

  communityCardElements.forEach(function (
    cardElement,
    cardIndex
  ) {
    if (cardIndex < currentStage.visibleCards) {
      displayCard(
        cardElement,
        communityCards[cardIndex]
      );
    } else {
      hideCommunityCard(cardElement);
    }
  });

  stageLabel.textContent = currentStage.name;
}

function getTokenSpace(playerIndex) {
  return document.querySelector(
    '[data-token-space="' + playerIndex + '"]'
  );
}

function requestsAreSettled() {
  if (
    playerRequests.some(function (request) {
      return request === null;
    })
  ) {
    return false;
  }

  return new Set(playerRequests).size ===
    playerRequests.length;
}

function resetConfirmations() {
  playerConfirmations.fill(false);
}

function createHistoryToken(entry) {
  const token = document.createElement("span");

  token.className =
    "history-token token-" + entry.color;

  token.textContent = entry.number;
  token.title =
    entry.stage + ": Token " + entry.number;

  return token;
}

function renderTokenHistory() {
  tokenHistory.forEach(function (history, playerIndex) {
    const tokenSpace = getTokenSpace(playerIndex);

    tokenSpace.replaceChildren();

    if (history.length === 0) {
      tokenSpace.textContent = "—";
      tokenSpace.classList.remove("has-history");
      return;
    }

    tokenSpace.classList.add("has-history");

    history.forEach(function (entry) {
      tokenSpace.appendChild(
        createHistoryToken(entry)
      );
    });
  });
}

function renderTokenRequests() {
  const currentColor =
    stages[currentStageIndex].color;

  rankingTokens.forEach(function (button) {
    const tokenNumber = Number(
      button.dataset.tokenNumber ||
      button.textContent
    );

    button.dataset.tokenNumber = tokenNumber;

    const requesters = [];

    playerRequests.forEach(function (
      requestedToken,
      playerIndex
    ) {
      if (requestedToken === tokenNumber) {
        requesters.push(playerNames[playerIndex]);
      }
    });

    button.replaceChildren();

    const number = document.createElement("span");
    number.className = "token-number";
    number.textContent = tokenNumber;

    button.appendChild(number);

    button.className =
      "ranking-token stage-token token-" +
      currentColor;

    if (requesters.length > 0) {
      button.classList.add("wanted-token");

      const requestText =
        document.createElement("span");

      requestText.className = "token-request-text";

            const shortNames = requesters.map(
        function (name) {
          if (name === "You") {
            return "You";
          }

          return name.replace("Player ", "P");
        }
      );

      if (shortNames.length === 1) {
        requestText.textContent =
          shortNames[0] + " wants";
      } else {
        requestText.textContent =
          shortNames.join(" + ");
      }

      button.appendChild(requestText);
    }
  });
}

function renderActivePlayer() {
  playerSeats.forEach(function (seat) {
    const playerIndex = Number(
      seat.dataset.player
    );

    seat.classList.toggle(
      "active-player",
      playerIndex === activePlayerIndex
    );
  });
}

function updateConfirmationButton() {
  if (roundFinished) {
    advanceButton.disabled = true;
    advanceButton.textContent =
      "Poker evaluator coming next";
    return;
  }

  if (!requestsAreSettled()) {
    advanceButton.disabled = true;

    if (
      playerRequests.some(function (request) {
        return request === null;
      })
    ) {
      advanceButton.textContent =
        "Everyone Must Choose a Token";
    } else {
      advanceButton.textContent =
        "Players Want the Same Token";
    }

    return;
  }

  if (playerConfirmations[activePlayerIndex]) {
    advanceButton.disabled = true;
    advanceButton.textContent =
      playerNames[activePlayerIndex] +
      " Confirmed ✓";
    return;
  }

  advanceButton.disabled = false;
  advanceButton.textContent =
    playerNames[activePlayerIndex] +
    ": I’m Good With This";
}

function renderTokenSystem() {
  renderTokenHistory();
  renderTokenRequests();
  renderActivePlayer();
  updateConfirmationButton();
}

function chooseToken(tokenNumber) {
  if (roundFinished) {
    return;
  }

  if (
    playerRequests[activePlayerIndex] ===
    tokenNumber
  ) {
    playerRequests[activePlayerIndex] = null;

    showNotification(
      playerNames[activePlayerIndex] +
      " no longer wants token " +
      tokenNumber
    );
  } else {
    playerRequests[activePlayerIndex] =
      tokenNumber;

    showNotification(
      playerNames[activePlayerIndex] +
      " wants token " +
      tokenNumber
    );
  }

  resetConfirmations();
  renderTokenSystem();
}

function everyoneConfirmed() {
  return playerConfirmations.every(
    function (isConfirmed) {
      return isConfirmed;
    }
  );
}

function settleCurrentStage() {
  const completedStage =
    stages[currentStageIndex];

  playerRequests.forEach(function (
    tokenNumber,
    playerIndex
  ) {
    tokenHistory[playerIndex].push({
      number: tokenNumber,
      color: completedStage.color,
      stage: completedStage.name
    });
  });

  if (currentStageIndex === stages.length - 1) {
    roundFinished = true;

    showNotification(
      "Everyone confirmed — ready for results!"
    );

    renderTokenSystem();

    window.setTimeout(function () {
      window.alert(
        "All four colored tokens are saved beside each " +
        "player. The poker evaluator and results screen " +
        "come next."
      );
    }, 500);

    return;
  }

  currentStageIndex += 1;

  playerRequests.fill(null);
  playerConfirmations.fill(false);

  renderCommunityCards();
  renderTokenSystem();

  showNotification(
    stages[currentStageIndex].name +
    " revealed — choose the " +
    stages[currentStageIndex].color +
    " tokens"
  );
}

function confirmCurrentPlayer() {
  if (
    !requestsAreSettled() ||
    playerConfirmations[activePlayerIndex]
  ) {
    return;
  }

  playerConfirmations[activePlayerIndex] = true;

  showNotification(
    playerNames[activePlayerIndex] +
    " is good with this arrangement"
  );

  if (everyoneConfirmed()) {
    settleCurrentStage();
  } else {
    updateConfirmationButton();
  }
}
function getOpeningDealTargets() {
  const targets = [];

  for (let cardIndex = 0; cardIndex < 2; cardIndex += 1) {
    for (
      let playerIndex = 0;
      playerIndex < 4;
      playerIndex += 1
    ) {
      if (playerIndex === 0) {
        targets.push(yourCardElements[cardIndex]);
      } else {
        const playerSeat = document.querySelector(
          '[data-player="' + playerIndex + '"]'
        );

        const playerCards = Array.from(
          playerSeat.querySelectorAll(
            ".hidden-hand .card"
          )
        );

        targets.push(playerCards[cardIndex]);
      }
    }
  }

  return targets;
}

function prepareOpeningDeal() {
  const targets = getOpeningDealTargets();

  targets.forEach(function (target) {
    target.style.visibility = "hidden";
  });
}

function wait(milliseconds) {
  return new Promise(function (resolve) {
    window.setTimeout(resolve, milliseconds);
  });
}

function sendCardToTarget(deckCard, target) {
  return new Promise(function (resolve) {
    const deckPosition =
      deckCard.getBoundingClientRect();

    const targetPosition =
      target.getBoundingClientRect();

    const flyingCard =
      document.createElement("div");

    flyingCard.className =
      "card card-back flying-card";

    flyingCard.style.left =
      deckPosition.left + "px";

    flyingCard.style.top =
      deckPosition.top + "px";

    flyingCard.style.width =
      deckPosition.width + "px";

    flyingCard.style.height =
      deckPosition.height + "px";

    document.body.appendChild(flyingCard);

    const moveX =
      targetPosition.left - deckPosition.left;

    const moveY =
      targetPosition.top - deckPosition.top;

    const growX =
      targetPosition.width /
      deckPosition.width;

    const growY =
      targetPosition.height /
      deckPosition.height;

    const animation = flyingCard.animate(
      [
        {
          transform:
            "translate(0, 0) scale(1)",
          opacity: 1
        },
        {
          transform:
            "translate(" +
            moveX +
            "px, " +
            moveY +
            "px) scale(" +
            growX +
            ", " +
            growY +
            ")",
          opacity: 1
        }
      ],
      {
        duration: 320,
        easing: "ease-out",
        fill: "forwards"
      }
    );

    animation.onfinish = function () {
      flyingCard.remove();
      target.style.visibility = "visible";
      target.classList.add("card-arrival");

      window.setTimeout(function () {
        target.classList.remove("card-arrival");
      }, 300);

      resolve();
    };
  });
}

async function animateOpeningDeal() {
  if (isDealing) {
    return;
  }

  isDealing = true;
  gameScreen.classList.add("dealing");

  const deckCard = document.querySelector(
    ".deck-pile .card"
  );

  const targets = getOpeningDealTargets();

  showNotification("Dealing cards…");

  for (const target of targets) {
    await sendCardToTarget(deckCard, target);
    await wait(65);
  }

  gameScreen.classList.remove("dealing");
  isDealing = false;

  showNotification(
    "Cards dealt — choose the white tokens"
  );
}
startGameButton.addEventListener("click", function () {
  dealNewRound();
  prepareOpeningDeal();
  showScreen(gameScreen);

  window.requestAnimationFrame(function () {
    animateOpeningDeal();
  });
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
    activePlayerIndex = Number(
      seat.dataset.player
    );

    renderActivePlayer();
    updateConfirmationButton();

    showNotification(
      "Testing as " +
      playerNames[activePlayerIndex]
    );
  });
});

rankingTokens.forEach(function (button) {
  button.addEventListener("click", function (
    event
  ) {
    event.stopPropagation();

    chooseToken(
      Number(button.dataset.tokenNumber)
    );
  });
});

advanceButton.addEventListener(
  "click",
  confirmCurrentPlayer
);

renderTokenSystem();