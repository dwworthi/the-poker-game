(function () {
  "use strict";

  let selectedPlayerCount = 4;

  const countButtons = Array.from(
    document.querySelectorAll("[data-player-count]")
  );

  const continueButton = document.querySelector(
    "#continue-game-button"
  );

  const previewDescription = document.querySelector(
    "#preview-description"
  );

  const layoutPreview = document.querySelector(
    ".layout-preview"
  );

  if (layoutPreview) {
    layoutPreview.hidden = true;
  }

  function updatePlayerSelection(playerCount) {
    selectedPlayerCount = playerCount;

    countButtons.forEach(function (button) {
      button.classList.toggle(
        "selected-count",
        Number(button.dataset.playerCount) ===
          playerCount
      );
    });

    previewDescription.textContent =
      playerCount +
      " players will be seated around the table.";

    continueButton.disabled = false;

    continueButton.textContent =
      "Start " +
      playerCount +
      "-Player Game";
  }

  function createOpponentSeat(playerIndex) {
    const seat = document.createElement("article");

    seat.className =
      "player-seat opponent-seat " +
      "player-position-" +
      playerIndex;

    seat.dataset.player = playerIndex;

    const name = document.createElement("div");
    name.className = "seat-name";
    name.textContent = "Player " + (playerIndex + 1);

    const hand = document.createElement("div");
    hand.className = "hidden-hand";

    const firstCard = document.createElement("div");
    firstCard.className = "card card-back";

    const secondCard = document.createElement("div");
    secondCard.className = "card card-back";

    hand.appendChild(firstCard);
    hand.appendChild(secondCard);

    const tokenSpace = document.createElement("div");

    tokenSpace.className = "owned-token";
    tokenSpace.dataset.tokenSpace = playerIndex;
    tokenSpace.textContent = "—";

    seat.appendChild(name);
    seat.appendChild(hand);
    seat.appendChild(tokenSpace);

    return seat;
  }

  function createRankingToken(tokenNumber) {
    const button = document.createElement("button");

    button.className = "ranking-token";
    button.type = "button";
    button.textContent = tokenNumber;
    button.dataset.tokenNumber = tokenNumber;

    return button;
  }

  function resizeGameArrays(playerCount) {
    playerNames.splice(0, playerNames.length, "You");

    for (
      let playerIndex = 1;
      playerIndex < playerCount;
      playerIndex += 1
    ) {
      playerNames.push(
        "Player " + (playerIndex + 1)
      );
    }

    playerRequests.splice(
      0,
      playerRequests.length
    );

    playerConfirmations.splice(
      0,
      playerConfirmations.length
    );

    tokenHistory.splice(
      0,
      tokenHistory.length
    );

    for (
      let playerIndex = 0;
      playerIndex < playerCount;
      playerIndex += 1
    ) {
      playerRequests.push(null);
      playerConfirmations.push(false);
      tokenHistory.push([]);
    }
  }

    function connectDynamicSeat(seat) {
    seat.addEventListener("click", function () {
      if (window.pokerOnlineMode) {
        return;
      }

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
  }

    function connectDynamicToken(button) {
    button.addEventListener("click", function (event) {
      event.stopPropagation();

      if (window.pokerOnlineMode) {
        showNotification(
          "Online token selection comes next"
        );

        return;
      }

      chooseToken(
        Number(button.dataset.tokenNumber)
      );
    });
  }

  function buildGameLayout(playerCount) {
    const tableScene = document.querySelector(
      ".table-scene"
    );

    const tableCenter = document.querySelector(
      ".table-center"
    );

    const tokenContainer = document.querySelector(
      ".token-row"
    );

    tableScene
      .querySelectorAll(".player-seat")
      .forEach(function (seat) {
        seat.remove();
      });

    tableScene.className =
      "table-scene player-count-" +
      playerCount;

    const newOpponentSeats = [];

    for (
      let playerIndex = 1;
      playerIndex < playerCount;
      playerIndex += 1
    ) {
      const seat =
        createOpponentSeat(playerIndex);

      tableScene.insertBefore(
        seat,
        tableCenter
      );

      connectDynamicSeat(seat);
      newOpponentSeats.push(seat);
    }

    tokenContainer.replaceChildren();

    const newTokens = [];

    for (
      let tokenNumber = 1;
      tokenNumber <= playerCount;
      tokenNumber += 1
    ) {
      const token =
        createRankingToken(tokenNumber);

      tokenContainer.appendChild(token);
      connectDynamicToken(token);
      newTokens.push(token);
    }

    const yourSeat = document.querySelector(
      ".you-seat"
    );

    playerSeats.splice(
      0,
      playerSeats.length,
      yourSeat,
      ...newOpponentSeats
    );

    rankingTokens.splice(
      0,
      rankingTokens.length,
      ...newTokens
    );

    resizeGameArrays(playerCount);
  }

  /*
   * Replace the fixed four-player round setup with
   * a version based on the selected player count.
   */
  dealNewRound = function () {
    deck = shuffleDeck(createDeck());

    playerHands = Array.from(
      {
        length: selectedPlayerCount
      },
      function () {
        return [];
      }
    );

    for (
      let cardNumber = 0;
      cardNumber < 2;
      cardNumber += 1
    ) {
      for (
        let playerIndex = 0;
        playerIndex < selectedPlayerCount;
        playerIndex += 1
      ) {
        playerHands[playerIndex].push(
          deck.pop()
        );
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
    evaluatedHands = [];
    revealOrder = [];
    revealedCount = 0;
    teamOrderCorrect = true;
    roundScored = false;

    gameScreen.classList.remove(
      "results-active"
    );

    document
      .querySelectorAll(".hand-result")
      .forEach(function (result) {
        result.remove();
      });

    document
      .querySelectorAll(".hidden-hand .card")
      .forEach(function (card) {
        card.replaceChildren();
        card.className = "card card-back";
      });

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
  };

  prepareResults = function () {
    evaluatedHands = playerHands.map(
      function (hand) {
        return PokerEvaluator.evaluateSeven(
          hand.concat(communityCards)
        );
      }
    );

    revealOrder = Array.from(
      {
        length: selectedPlayerCount
      },
      function (_, playerIndex) {
        return playerIndex;
      }
    ).sort(function (first, second) {
      return (
        playerRequests[first] -
        playerRequests[second]
      );
    });

    revealedCount = 0;
    teamOrderCorrect = true;

    stageLabel.textContent = "Showdown";

    gameScreen.classList.add(
      "results-active"
    );

    showNotification(
      "Final tokens locked — reveal from lowest to highest"
    );
  };

  getOpeningDealTargets = function () {
    const targets = [];

    for (
      let cardIndex = 0;
      cardIndex < 2;
      cardIndex += 1
    ) {
      for (
        let playerIndex = 0;
        playerIndex < selectedPlayerCount;
        playerIndex += 1
      ) {
        if (playerIndex === 0) {
          targets.push(
            yourCardElements[cardIndex]
          );
        } else {
          const playerSeat =
            document.querySelector(
              '[data-player="' +
              playerIndex +
              '"]'
            );

          const playerCards = Array.from(
            playerSeat.querySelectorAll(
              ".hidden-hand .card"
            )
          );

          targets.push(
            playerCards[cardIndex]
          );
        }
      }
    }

    return targets;
  };

  countButtons.forEach(function (button) {
    button.addEventListener(
      "click",
      function (event) {
        event.stopImmediatePropagation();

        updatePlayerSelection(
          Number(button.dataset.playerCount)
        );
      },
      true
    );
  });

  continueButton.addEventListener(
    "click",
    function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();

            window.pokerOnlineMode = false;

      buildGameLayout(
        selectedPlayerCount
      );

      startNewGame();
    },
    true
  );

    function startOnlineOpening(
    onlinePlayerNames,
    ownHand
  ) {
    window.pokerOnlineMode = true;

    selectedPlayerCount =
      onlinePlayerNames.length;

    buildGameLayout(selectedPlayerCount);

    playerNames.splice(
      0,
      playerNames.length,
      ...onlinePlayerNames
    );

    playerSeats.forEach(function (
      seat,
      playerIndex
    ) {
      const nameElement =
        seat.querySelector(".seat-name");

      if (nameElement) {
        nameElement.textContent =
          onlinePlayerNames[playerIndex];
      }
    });

    const yourName =
      document.querySelector(
        ".your-label strong"
      );

    yourName.textContent =
      onlinePlayerNames[0] + " (You)";

    playerHands = Array.from(
      {
        length: selectedPlayerCount
      },
      function (_, playerIndex) {
        if (playerIndex === 0) {
          return ownHand;
        }

        return [null, null];
      }
    );

    communityCards = [
      null,
      null,
      null,
      null,
      null
    ];

    activePlayerIndex = 0;
    currentStageIndex = 0;
    successfulRounds = 0;
    failedRounds = 0;
    roundNumber = 1;
    gameOver = false;
    roundFinished = false;
    roundScored = false;
    evaluatedHands = [];
    revealOrder = [];
    revealedCount = 0;
    teamOrderCorrect = true;

    playerRequests.fill(null);
    playerConfirmations.fill(false);

    tokenHistory.forEach(function (history) {
      history.length = 0;
    });

    gameScreen.classList.remove(
      "results-active"
    );

    document
      .querySelectorAll(".hand-result")
      .forEach(function (result) {
        result.remove();
      });

    document
      .querySelectorAll(".hidden-hand .card")
      .forEach(function (card) {
        card.replaceChildren();
        card.className = "card card-back";
      });

    renderPlayerHands();
    renderCommunityCards();
    renderTokenSystem();
    updateScoreDisplay();

    advanceButton.disabled = true;
    advanceButton.textContent =
      "Online Tokens Coming Next";

    showScreen(gameScreen);
    prepareOpeningDeal();

    window.requestAnimationFrame(function () {
      animateOpeningDeal();
    });
  }

  window.PokerDynamicPlayers = {
    startOnlineOpening:
      startOnlineOpening
  };

  updatePlayerSelection(4);
})();