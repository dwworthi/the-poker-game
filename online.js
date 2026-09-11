const firebaseConfig = {
  apiKey: "AIzaSyDZjpKpTkFy1lCeAFED47chk9MRx_yxh7I",
  authDomain: "the-poker-game.firebaseapp.com",
  databaseURL:
    "https://the-poker-game-default-rtdb.firebaseio.com/",
  projectId: "the-poker-game",
  storageBucket:
    "the-poker-game.firebasestorage.app",
  messagingSenderId: "663572093644",
  appId:
    "1:663572093644:web:0297c3d00ec07840dcc069"
};

firebase.initializeApp(firebaseConfig);

function showOnlineStatus(message, isReady) {
  let status = document.querySelector(
    "#online-status"
  );

  if (!status) {
    status = document.createElement("p");
    status.id = "online-status";
    status.className = "online-status";

    const modeLabel = document.querySelector(
      ".mode-label"
    );

    modeLabel.insertAdjacentElement(
      "afterend",
      status
    );
  }

  status.textContent = message;

  status.classList.toggle(
    "online-ready",
    isReady
  );

  status.classList.toggle(
    "online-error",
    !isReady
  );
}

showOnlineStatus("Connecting…", false);

firebase
  .auth()
  .signInAnonymously()
  .then(function () {
    showOnlineStatus("● Online Ready", true);
  })
  .catch(function (error) {
    console.error(
      "Firebase sign-in failed:",
      error
    );

    showOnlineStatus(
  "Failed: " +
  (error.code || error.message),
  false
);
  });