(function () {
  "use strict";

  const roundStages = [
    "preflop",
    "flop",
    "turn",
    "river"
  ];

  let currentScore = null;
  let lastOpenedRound = null;
  let resultBeingSaved = false;
  let listenedScoreRoomRef = null;

  function isHost() {
    return (
      onlineUser &&
      onlineUser.uid ===
        currentRoomHostUid
    );
  }

  function updateScoreScreen(score) {
    successfulRounds =
      score.successes || 0;

    failedRounds =
      score.failures || 0;

    roundNumber =
      score.roundNumber || 1;

    successScore.textContent =
      successfulRounds + " / 3";

    failureScore.textContent =
      failedRounds + " / 3";

    roundLabel.textContent =
      "Round " + roundNumber;
  }

  function roundHasBeenScored(score) {
    return (
      score.lastScoredRound ===
      score.roundNumber
    );
  }

  function updateRoundButton() {
        if (
      !currentScore ||
      !roundHasBeenScored(
        currentScore
      )
    ) {
      return;
    }

    const gameIsOver =
      currentScore.gameOver === true;

    if (isHost()) {
      advanceButton.disabled = false;

      advanceButton.textContent =
        gameIsOver
          ? "Play Again"
          : "Next Round";
    } else {
      advanceButton.disabled = true;

      advanceButton.textContent =
        gameIsOver
          ? "Waiting for host to play again"
          : "Waiting for host to deal";
    }

    notificationBanner.hidden = false;

    if (gameIsOver) {
      notificationBanner.textContent =
        currentScore.successes >= 3
          ? "🏆 Your team won The Poker Game!"
          : "Three failed rounds — game over";
    } else {
      notificationBanner.textContent =
        "Round complete — " +
        currentScore.successes +
        " success, " +
        currentScore.failures +
        " failure";
    }
  }

  async function reportResult(
    wasSuccessful
  ) {
    if (
      !isHost() ||
      !currentRoomRef ||
      resultBeingSaved
    ) {
      return;
    }

    resultBeingSaved = true;

    try {
      await currentRoomRef
        .child("game/score")
        .transaction(function (
          savedScore
        ) {
          const score =
            savedScore || {
              successes: 0,
              failures: 0,
              roundNumber: 1,
              lastScoredRound: 0,
              gameOver: false
            };

          if (
            score.lastScoredRound ===
            score.roundNumber
          ) {
            return;
          }

          if (wasSuccessful) {
            score.successes =
              (score.successes || 0) + 1;
          } else {
            score.failures =
              (score.failures || 0) + 1;
          }

          score.lastScoredRound =
            score.roundNumber;

          score.gameOver =
            score.successes >= 3 ||
            score.failures >= 3;

          return score;
        });
    } catch (error) {
      console.error(
        "Score update failed:",
        error
      );

      showNotification(
        "Score failed: " +
        (error.code || error.message)
      );
    } finally {
      resultBeingSaved = false;
    }
  }

  function createRoundCards(
    playerOrder
  ) {
    const cards = shuffleOnlineDeck(
      createOnlineDeck()
    );

    const hands = {};

    playerOrder.forEach(function (uid) {
      hands[uid] = [];
    });

    for (
      let cardNumber = 0;
      cardNumber < 2;
      cardNumber += 1
    ) {
      playerOrder.forEach(
        function (uid) {
          hands[uid].push(
            cards.pop()
          );
        }
      );
    }

    return {
      hands: hands,

      flop: [
        cards.pop(),
        cards.pop(),
        cards.pop()
      ],

      turn: cards.pop(),
      river: cards.pop()
    };
  }

  async function dealNextRound(
    resetEntireGame
  ) {
    if (
      !isHost() ||
      !currentRoomRef ||
      !currentScore ||
      newRoundBeingDealt
    ) {
      return;
    }

    newRoundBeingDealt = true;
    advanceButton.disabled = true;
    advanceButton.textContent =
      "Dealing Next Round…";

    try {
      const gameSnapshot =
        await currentRoomRef
          .child("game")
          .once("value");

      const gameData =
        gameSnapshot.val();

      const playerOrder =
        Object.values(
          gameData.playerOrder
        );

      const roundCards =
        createRoundCards(
          playerOrder
        );

      const nextRoundNumber =
        resetEntireGame
          ? 1
          : currentScore.roundNumber + 1;

      const nextScore =
        resetEntireGame
          ? {
              successes: 0,
              failures: 0,
              roundNumber: 1,
              lastScoredRound: 0,
              gameOver: false
            }
          : {
              successes:
                currentScore.successes,
              failures:
                currentScore.failures,
              roundNumber:
                nextRoundNumber,
              lastScoredRound:
                currentScore
                  .lastScoredRound,
              gameOver: false
            };

      const updates = {
        "game/score": nextScore,

        "game/startedAt":
          firebase.database
            .ServerValue.TIMESTAMP,

        "board/flop":
          roundCards.flop,

        "board/turn":
          roundCards.turn,

        "board/river":
          roundCards.river,

        "meta/status": "playing",
        "meta/stage": "preflop"
      };

      playerOrder.forEach(
        function (uid) {
          updates[
            "privateHands/" + uid
          ] = {
            card1:
              roundCards.hands[uid][0],

            card2:
              roundCards.hands[uid][1]
          };

          updates[
            "reveals/" + uid
          ] = null;

          roundStages.forEach(
            function (stage) {
              updates[
                "requests/" +
                stage +
                "/" +
                uid
              ] = null;

              updates[
                "confirmations/" +
                stage +
                "/" +
                uid
              ] = null;
            }
          );
        }
      );

      await currentRoomRef.update(
        updates
      );
    } catch (error) {
      console.error(
        "Next round failed:",
        error
      );

      advanceButton.disabled = false;

      advanceButton.textContent =
        currentScore.gameOver
          ? "Play Again"
          : "Next Round";

      showNotification(
        "Next round failed: " +
        (error.code || error.message)
      );
    } finally {
      newRoundBeingDealt = false;
    }
  }

  async function openNewRound(
    roundNumberToOpen
  ) {
    try {
      await new Promise(
        function (resolve) {
          window.setTimeout(
            resolve,
            450
          );
        }
      );

      const snapshots =
        await Promise.all([
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

      const gameData =
        snapshots[0].val();

      const handData =
        snapshots[1].val();

      const canonicalOrder =
        Object.values(
          gameData.playerOrder
        );

      const localOrder = [
        onlineUser.uid
      ].concat(
        canonicalOrder.filter(
          function (uid) {
            return (
              uid !== onlineUser.uid
            );
          }
        )
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
          ownHand,
          localOrder,
          canonicalOrder
        );

      lastOpenedRound =
        roundNumberToOpen;
    } catch (error) {
      console.error(
        "Opening next round failed:",
        error
      );

      showNotification(
        "New round failed: " +
        (error.code || error.message)
      );
    }
  }

  function handleRoundScore(snapshot) {
  const score =
    snapshot.val();

  if (!score) {
    return;
  }

  currentScore = score;
  updateScoreScreen(score);

  if (lastOpenedRound === null) {
    lastOpenedRound =
      score.roundNumber;
  } else if (
    score.roundNumber !==
    lastOpenedRound
  ) {
    openNewRound(
      score.roundNumber
    );

    return;
  }

  updateRoundButton();
}

function watchRoundScore() {
  const newestRoomRef =
    typeof currentRoomRef === "undefined"
      ? null
      : currentRoomRef;

  if (
    newestRoomRef !==
    listenedScoreRoomRef
  ) {
    if (listenedScoreRoomRef) {
      listenedScoreRoomRef
        .child("game/score")
        .off(
          "value",
          handleRoundScore
        );
    }

    listenedScoreRoomRef =
      newestRoomRef;

    currentScore = null;
    lastOpenedRound = null;
    resultBeingSaved = false;
    newRoundBeingDealt = false;

    /*
     * Clear the previous room's score while
     * waiting for the new game to begin.
     */
    updateScoreScreen({
      successes: 0,
      failures: 0,
      roundNumber: 1
    });

    if (listenedScoreRoomRef) {
      listenedScoreRoomRef
        .child("game/score")
        .on(
          "value",
          handleRoundScore
        );
    }
  }

  window.setTimeout(
    watchRoundScore,
    250
  );
}

  function primaryAction() {
    if (
      !isHost() ||
      !currentScore ||
      !roundHasBeenScored(
        currentScore
      )
    ) {
      return;
    }

    dealNextRound(
      currentScore.gameOver === true
    );
  }

  window.PokerRoundActions = {
    reportResult: reportResult,
    primaryAction: primaryAction
  };

  watchRoundScore();
})();