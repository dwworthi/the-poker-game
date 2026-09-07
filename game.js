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

let activePlayerIndex = 0;

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

function getTokenButton(tokenNumber) {
  return rankingTokens.find(function (button) {
    return Number(button.textContent) === tokenNumber;
  });
}

function updateTokenDisplay() {
  // First return every physical token to the shared pool.
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

  // Tapping your own token returns it to the pool.
  if (currentOwnerIndex === activePlayerIndex) {
    playerTokens[activePlayerIndex] = null;
    updateTokenDisplay();
    return;
  }

  // If someone else owns it, move or exchange it.
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
  button.addEventListener("click", function (event) {
    event.stopPropagation();

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