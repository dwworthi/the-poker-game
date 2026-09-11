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
  let visibleOnlineCommunity = [];
  let stageAdvanceInProgress = false;
  let synchronizationStarted = false;

  function getCurrentRequests() {
    return (
      allOnlineRequests[
        currentOnlineStage
      ] || {}
    );
  }

  function getCurrentConfirmations() {
    return (
      allOnlineConfirmations[
        currentOnlineStage
      ] || {}
    );
  }

  function createArrangementSignature(
    requests
  ) {
    return canonicalPlayerOrder
      .map(function (uid) {
        const request = requests[uid];

        return (
          uid +
          ":" +
          (
            typeof request === "number"
              ? request
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

  function displayOnlineState() {
    if (
      !window.PokerDynamicPlayers ||
      !window.PokerDynamicPlayers
        .applyOnlineState
    ) {
      return;
    }

    const requests = getCurrentRequests();

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
      }

      if (
        currentOnlineStage === "flop"
      ) {
        const flopSnapshot =
          await currentRoomRef
            .child("board/flop")
            .once("value");

        visibleOnlineCommunity =
          Object.values(
            flopSnapshot.val() || {}
          );
      }

      if (
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
      }

      if (
        currentOnlineStage === "river"
      ) {
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
    }
  }

  async function advanceStageIfReady() {
    if (
      stageAdvanceInProgress ||
      !onlineUser ||
      onlineUser.uid !==
        currentRoomHostUid
    ) {
      return;
    }

    const requests = getCurrentRequests();

    if (!requestsAreSettled(requests)) {
      return;
    }

    const signature =
      createArrangementSignature(requests);

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

    if (
      currentIndex === -1 ||
      currentIndex ===
        stageOrder.length - 1
    ) {
      displayOnlineState();
      return;
    }

    const nextStage =
      stageOrder[currentIndex + 1];

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
      !currentRoomRef ||
      !onlineUser ||
      !currentOnlineStage
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
        "Token choice failed — try again"
      );
    }
  }

  async function confirmOnlineChoice() {
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
        "Confirmation failed — try again"
      );
    }
  }

  function stopOnlineGameListeners() {
    if (!currentRoomRef) {
      return;
    }

    currentRoomRef
      .child("requests")
      .off();

    currentRoomRef
      .child("confirmations")
      .off();

    currentRoomRef
      .child("meta/stage")
      .off();

    synchronizationStarted = false;
  }

  function startOnlineGameListeners(
    localUids,
    canonicalUids
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
      .child("meta/stage")
      .on("value", function (snapshot) {
        const newStage = snapshot.val();

        if (
          stageOrder.includes(newStage)
        ) {
          currentOnlineStage = newStage;
          loadVisibleCommunity();
        }
      });
  }

  window.PokerOnlineActions = {
    chooseToken:
      chooseOnlineToken,

    confirm:
      confirmOnlineChoice,

    stop:
      stopOnlineGameListeners
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
          canonicalUids
        );
      };
  }

  connectToOpeningFunction();
})();