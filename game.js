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

const advanceButton = document.querySelector(
  ".advance-button"
);

let activePlayerIndex = 0;

// Stores the token held by each player.
// Example: [1, 3, null, 4]
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

function findTokenOwner(tokenNumber) {
  return playerTokens.findIndex(function (token) {
    return token === tokenNumber;
  });
}

function updateTokenDisplay() {
  playerRows.forEach(function (row, playerIndex) {
    const tokenDisplay = row.querySelector(".owned-token");
    const statusDisplay = row.querySelector(
      ".player-info span"
    );

    row.classList.toggle(
      "active-player",
      playerIndex === activePlayerIndex
    );

    if (playerTokens[playerIndex] === null) {
      tokenDisplay.textContent = "—";
      tokenDisplay.classList.remove("has-token");
      statusDisplay.textContent = "Waiting for token";
    } else {
      tokenDisplay.textContent = playerTokens[playerIndex];
      tokenDisplay.classList.add("has-token");
      statusDisplay.textContent =
        "Holding token " + playerTokens[playerIndex];
    }
  });

  rankingTokens.forEach(function (button) {
    const tokenNumber = Number(button.textContent);
    const ownerIndex = findTokenOwner(tokenNumber);

    button.classList.toggle(
      "claimed-token",
      ownerIndex !== -1
    );
  });

  const everyoneHasToken = playerTokens.every(
    function (token) {
      return token !== null;
    }
  );

  advanceButton.disabled = !everyoneHasToken;

  if (everyoneHasToken) {
    advanceButton.textContent = "Deal the Flop";
  } else {
    advanceButton.textContent =
      "Select All Tokens to Deal the Flop";
  }
}

function giveTokenToActivePlayer(tokenNumber) {
  const currentToken = playerTokens[activePlayerIndex];
  const currentOwnerIndex = findTokenOwner(tokenNumber);

  // Tapping your current token returns it to the pool.
  if (currentOwnerIndex === activePlayerIndex) {
    playerTokens[activePlayerIndex] = null;
    updateTokenDisplay();
    return;
  }

  // If another player owns this token, exchange tokens.
  if (currentOwnerIndex !== -1) {
    playerTokens[currentOwnerIndex] = currentToken;
  }

  playerTokens[activePlayerIndex] = tokenNumber;

  updateTokenDisplay();
}

startGameButton.addEventListener("click", function () {
  showScreen(gameScreen);
  activePlayerIndex = 0;
  updateTokenDisplay();
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
  button.addEventListener("click", function () {
    const tokenNumber = Number(button.textContent);
    giveTokenToActivePlayer(tokenNumber);
  });
});

advanceButton.addEventListener("click", function () {
  if (advanceButton.disabled) {
    return;
  }

  window.alert(
    "All four players have selected a token. " +
    "The flop will be added in the next checkpoint!"
  );
});

updateTokenDisplay();