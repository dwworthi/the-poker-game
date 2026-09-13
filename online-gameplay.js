(function () {
  "use strict";

  const stageOrder = [
    "preflop",
    "flop",
    "turn",
    "river"
  ];

  let canonicalPlayerOrder = [];
  let localPlayerOrder = [];
  let currentOnlineStage = "preflop";
  let allOnlineRequests = {};
  let allOnlineConfirmations = {};
  let allOnlineReveals = {};
  let visibleOnlineCommunity = [];
  let ownOnlineHand = null;
  let stageAdvanceInProgress = false;
  let synchronizationStarted = false;

  function getRequestStage() {
    if (currentOnlineStage === "showdown") {
      return "river";
    }

    return currentOnlineStage;
  }

  function getCurrentRequests() {
    return (
      allOnlineRequests[
        getRequestStage()
      ] || {}
    );
  }

  function getCurrentConfirmations() {
    return (
      allOnlineConfirmations[
        getRequestStage()
      ] || {}
    );
  }

  function getPlayerName(uid) {
    const localIndex =
      localPlayerOrder.indexOf(uid);

    if (
      localIndex !== -1 &&
      typeof playerNames !== "undefined"
    ) {
      return (
        playerNames[localIndex] ||
        "Player"
      );
    }

    return "Player";
  }

  function createArrangementSignature(
    requests
  ) {
    return canonicalPlayerOrder
      .map(function (uid) {
        const choice = requests[uid];

        return (
          uid +
          ":" +
          (
            typeof choice === "number"
              ? choice
              : "-"
          )
        );
      })
      .join("|");
  }

  function requestsAreSettled(requests) {
    const choices =
      canonicalPlayerOrder.map(
        function (uid) {
          return requests[uid];
        }
      );

    if (
      choices.some(function (choice) {
        return typeof choice !== "number";
      })
    ) {
      return false;
    }

    return (
      new Set(choices).size ===
      choices.length
    );
  }

  function getRevealOrder() {
    const requests = getCurrentRequests();

    return canonicalPlayerOrder
      .slice()
      .sort(function (firstUid, secondUid) {
        return (
          requests[firstUid] -
          requests[secondUid]
        );
      });
  }

  function getOrderedReveals() {
    const revealOrder = getRevealOrder();
    const orderedReveals = [];

    revealOrder.forEach(function (uid) {
      const reveal =
        allOnlineReveals[uid];

      if (reveal) {
        orderedReveals.push({
          uid: uid,
          card1: reveal.card1,
          card2: reveal.card2
        });
      }
    });

    return orderedReveals;
  }

  function updateConfirmationBanner() {
    notificationBanner.hidden = false;

    if (currentOnlineStage === "showdown") {
      const revealOrder =
        getRevealOrder();

      const revealedCount =
        getOrderedReveals().length;

      const nextUid =
        revealOrder[revealedCount];

      if (nextUid) {
        notificationBanner.textContent =
          "Waiting for " +
          getPlayerName(nextUid) +
          " to reveal";
      } else {
        notificationBanner.textContent =
          "All hands revealed";
      }

      return;
    }

    const requests =
      getCurrentRequests();

    const waitingForChoice =
      canonicalPlayerOrder.filter(
        function (uid) {
          return (
            typeof requests[uid] !==
            "number"
          );
        }
      );

    if (waitingForChoice.length > 0) {
      notificationBanner.textContent =
        "Waiting for token: " +
        waitingForChoice
          .map(getPlayerName)
          .join(", ");

      return;
    }

    if (!requestsAreSettled(requests)) {
      notificationBanner.textContent =
        "Two or more players want the same token";

      return;
    }

    const signature =
      createArrangementSignature(
        requests
      );

    const confirmations =
      getCurrentConfirmations();

    const confirmedPlayers =
      canonicalPlayerOrder.filter(
        function (uid) {
          return (
            confirmations[uid] ===
            signature
          );
        }
      );

    const waitingPlayers =
      canonicalPlayerOrder.filter(
        function (uid) {
          return (
            confirmations[uid] !==
            signature
          );
        }
      );

    if (waitingPlayers.length === 0) {
      notificationBanner.textContent =
        "Everyone confirmed — continuing…";

      return;
    }

    let message =
      "Waiting for confirmation: " +
      waitingPlayers
        .map(getPlayerName)
        .join(", ");

    if (confirmedPlayers.length > 0) {
      message +=
        " • Confirmed: " +
        confirmedPlayers
          .map(getPlayerName)
          .join(", ");
    }

    notificationBanner.textContent =
      message;
  }

  function displayOnlineState() {
    if (
      !window.PokerDynamicPlayers ||
      !window.PokerDynamicPlayers
        .applyOnlineState
    ) {
      return;
    }

    const requests =
      getCurrentRequests();

    window.PokerDynamicPlayers
      .applyOnlineState({
        stage: currentOnlineStage,

        currentRequests: requests,

        confirmations:
          getCurrentConfirmations(),

        signature:
          createArrangementSignature(
            requests
          ),

        allRequests:
          allOnlineRequests,

        visibleCommunity:
          visibleOnlineCommunity
      });

    updateConfirmationBanner();

    if (
      currentOnlineStage === "showdown" &&
      window.PokerDynamicPlayers
        .applyOnlineShowdown
    ) {
      const revealOrder =
        getRevealOrder();

      const orderedReveals =
        getOrderedReveals();

      window.PokerDynamicPlayers
        .applyOnlineShowdown({
          reveals: orderedReveals,

          nextUid:
            revealOrder[
              orderedReveals.length
            ] || null
        });
    }
  }

  async function loadVisibleCommunity() {
    if (!currentRoomRef) {
      return;
    }

    try {
      if (
        currentOnlineStage === "preflop"
      ) {
        visibleOnlineCommunity = [];
      } else if (
        currentOnlineStage === "flop"
      ) {
        const snapshot =
          await currentRoomRef
            .child("board/flop")
            .once("value");

        visibleOnlineCommunity =
          Object.values(
            snapshot.val() || {}
          );
      } else if (
        currentOnlineStage === "turn"
      ) {
        const snapshots =
          await Promise.all([
            currentRoomRef
              .child("board/flop")
              .once("value"),

            currentRoomRef
              .child("board/turn")
              .once("value")
          ]);

        visibleOnlineCommunity =
          Object.values(
            snapshots[0].val() || {}
          );

        visibleOnlineCommunity.push(
          snapshots[1].val()
        );
      } else {
        const snapshots =
          await Promise.all([
            currentRoomRef
              .child("board/flop")
              .once("value"),

            currentRoomRef
              .child("board/turn")
              .once("value"),

            currentRoomRef
              .child("board/river")
              .once("value")
          ]);

        visibleOnlineCommunity =
          Object.values(
            snapshots[0].val() || {}
          );

        visibleOnlineCommunity.push(
          snapshots[1].val(),
          snapshots[2].val()
        );
      }

      displayOnlineState();
    } catch (error) {
      console.error(
        "Community cards failed:",
        error
      );

      window.setTimeout(
        loadVisibleCommunity,
        500
      );
    }
  }

  async function advanceStageIfReady() {
    if (
      stageAdvanceInProgress ||
      currentOnlineStage === "showdown" ||
      !onlineUser ||
      onlineUser.uid !==
        currentRoomHostUid
    ) {
      return;
    }

    const requests =
      getCurrentRequests();

    if (!requestsAreSettled(requests)) {
      return;
    }

    const signature =
      createArrangementSignature(
        requests
      );

    const confirmations =
      getCurrentConfirmations();

    const everyoneConfirmed =
      canonicalPlayerOrder.every(
        function (uid) {
          return (
            confirmations[uid] ===
            signature
          );
        }
      );

    if (!everyoneConfirmed) {
      return;
    }

    const currentIndex =
      stageOrder.indexOf(
        currentOnlineStage
      );

    const nextStage =
      currentOnlineStage === "river"
        ? "showdown"
        : stageOrder[currentIndex + 1];

    if (!nextStage) {
      return;
    }

    stageAdvanceInProgress = true;

    try {
      await currentRoomRef
        .child("meta/stage")
        .transaction(function (
          savedStage
        ) {
          if (
            savedStage ===
            currentOnlineStage
          ) {
            return nextStage;
          }

          return;
        });
    } catch (error) {
      console.error(
        "Stage advance failed:",
        error
      );

      showNotification(
        "Stage failed: " +
        (error.code || error.message)
      );
    } finally {
      stageAdvanceInProgress = false;
    }
  }

  function refreshOnlineState() {
    displayOnlineState();
    advanceStageIfReady();
  }

  async function chooseOnlineToken(
    tokenNumber
  ) {
    if (
      currentOnlineStage === "showdown" ||
      !currentRoomRef ||
      !onlineUser
    ) {
      return;
    }

    const requestRef =
      currentRoomRef.child(
        "requests/" +
        currentOnlineStage +
        "/" +
        onlineUser.uid
      );

    const currentChoice =
      getCurrentRequests()[
        onlineUser.uid
      ];

    try {
      if (currentChoice === tokenNumber) {
        await requestRef.remove();
      } else {
        await requestRef.set(
          tokenNumber
        );
      }
    } catch (error) {
      console.error(
        "Token request failed:",
        error
      );

      showNotification(
        "Token failed: " +
        (error.code || error.message)
      );
    }
  }

  async function revealOwnHand() {
    if (
      currentOnlineStage !== "showdown" ||
      !currentRoomRef ||
      !onlineUser ||
      !ownOnlineHand
    ) {
      return;
    }

    const revealOrder =
      getRevealOrder();

    const orderedReveals =
      getOrderedReveals();

    const nextUid =
      revealOrder[
        orderedReveals.length
      ];

    if (nextUid !== onlineUser.uid) {
      return;
    }

    try {
      await currentRoomRef
        .child(
          "reveals/" +
          onlineUser.uid
        )
        .set({
          card1: ownOnlineHand[0],
          card2: ownOnlineHand[1]
        });
    } catch (error) {
      console.error(
        "Hand reveal failed:",
        error
      );

      showNotification(
        "Reveal failed: " +
        (error.code || error.message)
      );
    }
  }

  async function confirmOnlineChoice() {
    if (
      currentOnlineStage === "showdown"
    ) {
      revealOwnHand();
      return;
    }

    if (
      !currentRoomRef ||
      !onlineUser
    ) {
      return;
    }

    const requests =
      getCurrentRequests();

    if (!requestsAreSettled(requests)) {
      return;
    }

    const signature =
      createArrangementSignature(
        requests
      );

    try {
      await currentRoomRef
        .child(
          "confirmations/" +
          currentOnlineStage +
          "/" +
          onlineUser.uid
        )
        .set(signature);
    } catch (error) {
      console.error(
        "Confirmation failed:",
        error
      );

      showNotification(
        "Confirmation failed: " +
        (error.code || error.message)
      );
    }
  }

  function startOnlineGameListeners(
    localUids,
    canonicalUids,
    hand
  ) {
    if (
      synchronizationStarted ||
      !currentRoomRef
    ) {
      return;
    }

    synchronizationStarted = true;

    localPlayerOrder =
      localUids.slice();

    canonicalPlayerOrder =
      canonicalUids.slice();

    ownOnlineHand =
      hand.slice();

    currentRoomRef
      .child("requests")
      .on("value", function (snapshot) {
        allOnlineRequests =
          snapshot.val() || {};

        refreshOnlineState();
      });

    currentRoomRef
      .child("confirmations")
      .on("value", function (snapshot) {
        allOnlineConfirmations =
          snapshot.val() || {};

        refreshOnlineState();
      });

    currentRoomRef
      .child("reveals")
      .on("value", function (snapshot) {
        allOnlineReveals =
          snapshot.val() || {};

        displayOnlineState();
      });

    currentRoomRef
      .child("meta/stage")
      .on("value", function (snapshot) {
        const newStage =
          snapshot.val();

        if (
          stageOrder.includes(newStage) ||
          newStage === "showdown"
        ) {
          currentOnlineStage =
            newStage;

          window.setTimeout(
            loadVisibleCommunity,
            350
          );
        }
      });
  }

  window.PokerOnlineActions = {
    chooseToken:
      chooseOnlineToken,

    confirm:
      confirmOnlineChoice
  };

  function connectToOpeningFunction() {
    if (
      !window.PokerDynamicPlayers ||
      !window.PokerDynamicPlayers
        .startOnlineOpening
    ) {
      window.setTimeout(
        connectToOpeningFunction,
        100
      );

      return;
    }

    const originalStart =
      window.PokerDynamicPlayers
        .startOnlineOpening;

    window.PokerDynamicPlayers
      .startOnlineOpening =
      function (
        names,
        hand,
        localUids,
        canonicalUids
      ) {
        originalStart(
          names,
          hand,
          localUids
        );

        startOnlineGameListeners(
          localUids,
          canonicalUids,
          hand
        );
      };
  }

  const onlineGameScreen =
    document.querySelector("#game-screen");

  onlineGameScreen.addEventListener(
    "click",
    function (event) {
      if (!window.pokerOnlineMode) {
        return;
      }

      const tappedSeat =
        event.target.closest(
          ".player-seat, .you-seat"
        );

      if (tappedSeat) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  connectToOpeningFunction();
})(); 