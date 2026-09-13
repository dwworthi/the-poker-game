(function () {
  "use strict";

  let selectedPlayerCount = 4;
  let onlinePlayerUids = [];
  let processedOnlineReveals = 0;
  let onlineRevealResults = [];
  let onlineOrderCorrect = true;

  const countButtons = Array.from(
    document.querySelectorAll(
      "[data-player-count]"
    )
  );

  const continueButton =
    document.querySelector(
      "#continue-game-button"
    );

  const previewDescription =
    document.querySelector(
      "#preview-description"
    );

  const layoutPreview =
    document.querySelector(
      ".layout-preview"
    );

  if (layoutPreview) {
    layoutPreview.hidden = true;
  }

  function updatePlayerSelection(
    playerCount
  ) {
    selectedPlayerCount = playerCount;

    countButtons.forEach(function (button) {
      button.classList.toggle(
        "selected-count",
        Number(
          button.dataset.playerCount
        ) === playerCount
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

  function createOpponentSeat(
    playerIndex
  ) {
    const seat =
      document.createElement("article");

    seat.className =
      "player-seat opponent-seat " +
      "player-position-" +
      playerIndex;

    seat.dataset.player = playerIndex;

    const name =
      document.createElement("div");

    name.className = "seat-name";

    name.textContent =
      "Player " + (playerIndex + 1);

    const hand =
      document.createElement("div");

    hand.className = "hidden-hand";

    const firstCard =
      document.createElement("div");

    firstCard.className =
      "card card-back";

    const secondCard =
      document.createElement("div");

    secondCard.className =
      "card card-back";

    hand.appendChild(firstCard);
    hand.appendChild(secondCard);

    const tokenSpace =
      document.createElement("div");

    tokenSpace.className =
      "owned-token";

    tokenSpace.dataset.tokenSpace =
      playerIndex;

    tokenSpace.textContent = "—";

    seat.appendChild(name);
    seat.appendChild(hand);
    seat.appendChild(tokenSpace);

    return seat;
  }

  function createRankingToken(
    tokenNumber
  ) {
    const button =
      document.createElement("button");

    button.className =
      "ranking-token";

    button.type = "button";
    button.textContent = tokenNumber;

    button.dataset.tokenNumber =
      tokenNumber;

    return button;
  }

  function resizeGameArrays(
    playerCount
  ) {
    playerNames.splice(
      0,
      playerNames.length,
      "You"
    );

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
    seat.addEventListener(
      "click",
      function () {
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
      }
    );
  }

  function connectDynamicToken(button) {
    button.addEventListener(
      "click",
      function (event) {
        event.stopPropagation();

        const tokenNumber = Number(
          button.dataset.tokenNumber
        );

        if (window.pokerOnlineMode) {
          if (
            window.PokerOnlineActions
          ) {
            window.PokerOnlineActions
              .chooseToken(tokenNumber);
          }

          return;
        }

        chooseToken(tokenNumber);
      }
    );
  }

  function buildGameLayout(playerCount) {
    const tableScene =
      document.querySelector(
        ".table-scene"
      );

    const tableCenter =
      document.querySelector(
        ".table-center"
      );

    const tokenContainer =
      document.querySelector(
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

    const yourSeat =
      document.querySelector(
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
        playerIndex <
          selectedPlayerCount;
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
      .querySelectorAll(
        ".reveal-minimized"
      )
      .forEach(function (seat) {
        seat.classList.remove(
          "reveal-minimized"
        );
      });

    document
      .querySelectorAll(
        ".hand-result"
      )
      .forEach(function (result) {
        result.remove();
      });

    document
      .querySelectorAll(
        ".hidden-hand .card"
      )
      .forEach(function (card) {
        card.replaceChildren();
        card.className =
          "card card-back";
      });

    playerRequests.fill(null);
    playerConfirmations.fill(false);

    tokenHistory.forEach(
      function (history) {
        history.length = 0;
      }
    );

    renderPlayerHands();
    renderCommunityCards();
    renderTokenSystem();

    showNotification(
      "Cards dealt — choose the white tokens"
    );
  };

  prepareResults = function () {
    evaluatedHands =
      playerHands.map(function (hand) {
        return PokerEvaluator
          .evaluateSeven(
            hand.concat(
              communityCards
            )
          );
      });

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

    stageLabel.textContent =
      "Showdown";

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
        playerIndex <
          selectedPlayerCount;
        playerIndex += 1
      ) {
        if (playerIndex === 0) {
          targets.push(
            yourCardElements[
              cardIndex
            ]
          );
        } else {
          const playerSeat =
            document.querySelector(
              '[data-player="' +
              playerIndex +
              '"]'
            );

          const playerCards =
            Array.from(
              playerSeat
                .querySelectorAll(
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

  countButtons.forEach(
    function (button) {
      button.addEventListener(
        "click",
        function (event) {
          event.stopImmediatePropagation();

          updatePlayerSelection(
            Number(
              button.dataset
                .playerCount
            )
          );
        },
        true
      );
    }
  );

  continueButton.addEventListener(
    "click",
    function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();

      window.pokerOnlineMode = false;

      gameScreen.classList.remove(
        "online-game"
      );

      notificationBanner.hidden = false;

      buildGameLayout(
        selectedPlayerCount
      );

      startNewGame();
    },
    true
  );

  function startOnlineOpening(
    onlinePlayerNames,
    ownHand,
    localPlayerUids
  ) {
    onlinePlayerUids =
      localPlayerUids.slice();

    window.pokerOnlineMode = true;

    gameScreen.classList.add(
      "online-game"
    );

    notificationBanner.hidden = true;

    processedOnlineReveals = 0;
    onlineRevealResults = [];
    onlineOrderCorrect = true;

    selectedPlayerCount =
      onlinePlayerNames.length;

    buildGameLayout(
      selectedPlayerCount
    );

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
        seat.querySelector(
          ".seat-name"
        );

      if (nameElement) {
        nameElement.textContent =
          onlinePlayerNames[
            playerIndex
          ];
      }
    });

    const yourName =
      document.querySelector(
        ".your-label strong"
      );

    yourName.textContent =
      onlinePlayerNames[0] +
      " (You)";

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

    tokenHistory.forEach(
      function (history) {
        history.length = 0;
      }
    );

    gameScreen.classList.remove(
      "results-active"
    );

    document
      .querySelectorAll(
        ".hand-result"
      )
      .forEach(function (result) {
        result.remove();
      });

    document
      .querySelectorAll(
        ".hidden-hand .card"
      )
      .forEach(function (card) {
        card.replaceChildren();
        card.className =
          "card card-back";
      });

    renderPlayerHands();
    renderCommunityCards();
    renderTokenSystem();
    updateScoreDisplay();

    advanceButton.disabled = true;

    advanceButton.textContent =
      "Waiting for token choices";

    showScreen(gameScreen);
    prepareOpeningDeal();

    window.requestAnimationFrame(
      function () {
        animateOpeningDeal();
      }
    );
  }

  function applyOnlineState(state) {
    const stageKeys = [
      "preflop",
      "flop",
      "turn",
      "river"
    ];

    const newStageIndex =
      stageKeys.indexOf(
        state.stage
      );

    if (newStageIndex !== -1) {
      currentStageIndex =
        newStageIndex;
    }

    playerRequests.forEach(
      function (
        unused,
        playerIndex
      ) {
        const uid =
          onlinePlayerUids[
            playerIndex
          ];

        const request =
          state.currentRequests[uid];

        playerRequests[playerIndex] =
          typeof request === "number"
            ? request
            : null;

        playerConfirmations[
          playerIndex
        ] =
          state.confirmations[uid] ===
          state.signature;
      }
    );

    tokenHistory.forEach(
      function (
        history,
        playerIndex
      ) {
        history.length = 0;

        const uid =
          onlinePlayerUids[
            playerIndex
          ];

        for (
          let stageIndex = 0;
          stageIndex <
            currentStageIndex;
          stageIndex += 1
        ) {
          const stageKey =
            stageKeys[stageIndex];

          const stageRequests =
            state.allRequests[
              stageKey
            ] || {};

          if (
            typeof stageRequests[
              uid
            ] === "number"
          ) {
            history.push({
              number:
                stageRequests[uid],

              color:
                stages[stageIndex]
                  .color,

              stage:
                stages[stageIndex]
                  .name
            });
          }
        }
      }
    );

    communityCards = [
      null,
      null,
      null,
      null,
      null
    ];

    state.visibleCommunity.forEach(
      function (card, cardIndex) {
        communityCards[cardIndex] =
          card;
      }
    );

    renderCommunityCards();
    renderTokenSystem();

    const everyoneChose =
      playerRequests.every(
        function (request) {
          return request !== null;
        }
      );

    const choicesAreUnique =
      new Set(playerRequests).size ===
      playerRequests.length;

    const ownConfirmed =
      playerConfirmations[0];

    const allConfirmed =
      playerConfirmations.every(
        function (confirmed) {
          return confirmed;
        }
      );

    if (!everyoneChose) {
      advanceButton.disabled = true;

      advanceButton.textContent =
        "Everyone Must Choose a Token";
    } else if (!choicesAreUnique) {
      advanceButton.disabled = true;

      advanceButton.textContent =
        "Players Want the Same Token";
    } else if (allConfirmed) {
      advanceButton.disabled = true;

      advanceButton.textContent =
        state.stage === "river"
          ? "Showdown Coming Next"
          : "Dealing Next Stage…";
    } else if (ownConfirmed) {
      advanceButton.disabled = true;

      advanceButton.textContent =
        "You Confirmed ✓";
    } else {
      advanceButton.disabled = false;

      advanceButton.textContent =
        "I’m Good With This";
    }
  }

  advanceButton.addEventListener(
    "click",
    function (event) {
      if (!window.pokerOnlineMode) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (window.PokerOnlineActions) {
        window.PokerOnlineActions
          .confirm();
      }
    },
    true
  );

  function applyOnlineShowdown(state) {
    stageLabel.textContent =
      "Showdown";

    gameScreen.classList.add(
      "results-active"
    );

    while (
      processedOnlineReveals <
      state.reveals.length
    ) {
      const reveal =
        state.reveals[
          processedOnlineReveals
        ];

      const playerIndex =
        onlinePlayerUids.indexOf(
          reveal.uid
        );

      if (playerIndex === -1) {
        processedOnlineReveals += 1;
        continue;
      }

      const hand = [
        reveal.card1,
        reveal.card2
      ];

      playerHands[playerIndex] =
        hand;

      const result =
        PokerEvaluator.evaluateSeven(
          hand.concat(
            communityCards
          )
        );

      const shortCategory =
        result.description
          .split(" — ")[0];

      let comparisonText =
        "Waiting for the next hand…";

      let statusClass =
        "pending-result";

      revealPrivateCards(
        playerIndex
      );

      if (
        processedOnlineReveals > 0
      ) {
        const previousEntry =
          onlineRevealResults[
            processedOnlineReveals -
            1
          ];

        const comparison =
          PokerEvaluator.compareScores(
            result.score,
            previousEntry
              .result.score
          );

        if (comparison > 0) {
          comparisonText =
            "✓ Correctly higher";

          statusClass =
            "correct-result";

          if (
            processedOnlineReveals ===
            1
          ) {
            updateFirstResultStatus(
              "✓ Correctly lower",
              "correct-result"
            );
          }
        } else if (
          comparison === 0
        ) {
          comparisonText =
            "✓ Tie accepted";

          statusClass =
            "correct-result";

          if (
            processedOnlineReveals ===
            1
          ) {
            updateFirstResultStatus(
              "✓ Tie accepted",
              "correct-result"
            );
          }
        } else {
          onlineOrderCorrect = false;

          comparisonText =
            "✕ Out of order";

          statusClass =
            "wrong-result";

          if (
            processedOnlineReveals ===
            1
          ) {
            updateFirstResultStatus(
              "✕ Out of order",
              "wrong-result"
            );
          }
        }
      }

      addHandResult(
        playerIndex,
        {
          description:
            shortCategory
        },
        comparisonText,
        statusClass
      );

      if (
        processedOnlineReveals > 0
      ) {
        const previousEntry =
          onlineRevealResults[
            processedOnlineReveals -
            1
          ];

        minimizeRevealedPlayer(
          previousEntry.playerIndex
        );
      }

      onlineRevealResults.push({
        playerIndex: playerIndex,
        result: result
      });

      processedOnlineReveals += 1;

      window.clearTimeout(
        notificationTimer
      );

      notificationBanner.hidden =
        false;

      notificationBanner.textContent =
        playerNames[playerIndex] +
        " — " +
        result.description +
        " — " +
        comparisonText;
    }

    if (
      processedOnlineReveals ===
      onlinePlayerUids.length
    ) {
      advanceButton.disabled = true;

      advanceButton.textContent =
        onlineOrderCorrect
          ? "✓ Round Successful!"
          : "✕ Round Failed";

      return;
    }

    const nextPlayerIndex =
      onlinePlayerUids.indexOf(
        state.nextUid
      );

    if (
      state.nextUid ===
      onlinePlayerUids[0]
    ) {
      advanceButton.disabled = false;

      advanceButton.textContent =
        "Reveal My Hand";
    } else {
      advanceButton.disabled = true;

      advanceButton.textContent =
        "Waiting for " +
        (
          playerNames[
            nextPlayerIndex
          ] ||
          "next player"
        );
    }
  }

  window.PokerDynamicPlayers = {
    startOnlineOpening:
      startOnlineOpening,

    applyOnlineState:
      applyOnlineState,

    applyOnlineShowdown:
      applyOnlineShowdown
  };

  updatePlayerSelection(4);
})();