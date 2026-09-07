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

function showScreen(screenToShow) {
  menuScreen.hidden = true;
  gameScreen.hidden = true;
  rulesScreen.hidden = true;

  screenToShow.hidden = false;
}

startGameButton.addEventListener("click", function () {
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
