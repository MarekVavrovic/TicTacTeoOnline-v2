//Game
const winSound = document.getElementById("winSound");
const clickSound = document.getElementById("clickSound");
const sidebarSound = document.getElementById("sidebarSound");

const modal = document.getElementById("myModal");
const modalText = document.getElementById("modalText");
const closeModal = document.getElementById("closeModal");

// const menuButton = document.getElementById("menuButton");
const boardSettings = document.getElementById("boardSettings");
const dropdownContainer = document.querySelector(".dropdownContainer");
const boardElement = document.getElementById("board");
const boardSizeSelect = document.getElementById("boardSizeSelect");
const boardWinSelect = document.getElementById("boardWinSelect");
const clearBoard = document.getElementById("clearBoard");

const toggleSidebarButton = document.getElementById("toggleSidebar");
const sidebar = document.getElementById("sidebar");
const resetScoreButton = document.getElementById("resetScoreButton");

//Chat
const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const chatCircle = document.getElementById("chat-circle");
const chatBox = document.querySelector(".chat-box");
const chatBoxHeader = chatBox.querySelector(".chat-box-toggle");

//const roomName = document.getElementById("room");
import { outputRoomName, outputMessage } from "../utils/chat.js";
const socket = io();

//CHAT START
// 1.1 get username and room from the querystring
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

//1.2 emit querystring
socket.emit(`joinRoom`, {
  username,
  room,
});
//1.3 Output room and users on DOM
socket.on("roomUsers", ({ room, users }) => {
  outputRoomName(room);
});

//chat listeners

socket.on("message", (message) => {
  outputMessage(message);
  if (!chatIsOpen) {
    toggleChatBox();
  }
  scrollChatToBottom();
});

let lastScrollHeight = chatMessages.scrollHeight;
let chatIsOpen = false;

function toggleChatBox() {
  if (chatIsOpen) {
    chatBox.style.display = "none";
    chatIsOpen = false;
  } else {
    chatBox.style.display = "block";
    chatIsOpen = true;
  }
}

function scrollChatToBottom() {
  const newScrollHeight = chatMessages.scrollHeight;
  if (newScrollHeight > lastScrollHeight) {
    chatMessages.scrollTop = newScrollHeight;
    lastScrollHeight = newScrollHeight;
  }
}

chatCircle.addEventListener("click", toggleChatBox);
chatBoxHeader.addEventListener("click", toggleChatBox);

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const msg = event.target.elements.msg.value;

  //emitting input value to the server
  socket.emit("chatMessage", msg);
  event.target.elements.msg.value = "";
  event.target.elements.msg.focus();
});

//CHAT END

// Player names input elements
const playerXNameInput = document.getElementById("playerXName");
const playerONameInput = document.getElementById("playerOName");

// Initialize player names from local storage or set default names
let playerXName = localStorage.getItem("playerXName") || "Player X";
let playerOName = localStorage.getItem("playerOName") || "Player O";

// Initialize the input fields with the current player names
playerXNameInput.value = playerXName;
playerONameInput.value = playerOName;

// Update player names in local storage when input values change
playerXNameInput.addEventListener("input", () => {
  playerXName = playerXNameInput.value;
  localStorage.setItem("playerXName", playerXName);
});

playerONameInput.addEventListener("input", () => {
  playerOName = playerONameInput.value;
  localStorage.setItem("playerOName", playerOName);
});

let boardWin = parseInt(boardWinSelect.value);
let boardSize = parseInt(boardSizeSelect.value);

let currentPlayer = "X";

//color coding for players
function makeMove(cell) {
  if (!cell.textContent) {
    // Check if the cell is empty
    cell.textContent = currentPlayer;

    // Change text color based on the current player
    if (currentPlayer === "X") {
      cell.style.color = "red";
      currentPlayer = "O"; // Switch to the next player
    } else if (currentPlayer === "O") {
      cell.style.color = "blue";
      currentPlayer = "X";
    }
  }
}

let board = new Array(boardSize)
  .fill(null)
  .map(() => new Array(boardSize).fill(null));

function createBoard() {
  boardElement.innerHTML = "";
  boardElement.style.gridTemplateColumns = `repeat(${boardSize}, 50px)`;

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.addEventListener("click", handleCellClick);
      boardElement.appendChild(cell);
    }
  }
}

function handleCellClick(event) {
  const row = parseInt(event.target.dataset.row);
  const col = parseInt(event.target.dataset.col);

  if (board[row][col] === null) {
    event.target.textContent = currentPlayer;
    board[row][col] = currentPlayer;
    playSound(clickSound);

    event.target.classList.remove(`player${currentPlayer}`);

    if (checkWin(row, col)) {
      // Display the winner
      displayWinner(currentPlayer === "X" ? playerXName : playerOName);
    } else if (checkDraw()) {
      modalText.textContent = "It's a draw!";
      showModal();
      resetGame();
    } else {
      // Switch to the next player
      currentPlayer = currentPlayer === "X" ? "O" : "X";
      // Add the new current player's class to the cell
      event.target.classList.add(`player${currentPlayer}`);
    }
  }
}

function showModal() {
  modal.style.visibility = "visible";
  modal.style.zIndex = 10;
}

function hideModal() {
  modal.style.visibility = "hidden";
}

function playSound(soundElement) {
  soundElement.currentTime = 0;
  soundElement.play();
}

//CheckWin
function checkWin(row, col) {
  const symbol = board[row][col];

  // Define direction vectors for checking different directions
  const directions = [
    [1, 0], // Check right
    [0, 1], // Check down
    [1, 1], // Check diagonal (down-right)
    [-1, 1], // Check diagonal (up-right)
  ];

  for (const [dx, dy] of directions) {
    let count = 1; // Count the consecutive symbols in the current direction

    // Check in both directions (forward and backward)
    for (let dir = -1; dir <= 1; dir += 2) {
      for (let step = 1; step < boardWin; step++) {
        const newRow = row + dir * step * dy;
        const newCol = col + dir * step * dx;

        if (
          newRow >= 0 &&
          newRow < boardSize &&
          newCol >= 0 &&
          newCol < boardSize &&
          board[newRow][newCol] === symbol
        ) {
          count++;
        } else {
          break; // Stop counting if the sequence is broken
        }
      }

      if (count === boardWin) {
        return true; // Found a winning sequence
      }
    }
  }

  return false; // No winning sequence found
}

// Display player names when a player wins
let playerXScore = 0;
let playerOScore = 0;

function displayWinner(player) {
  modalText.textContent = player + " wins!";
  showModal();
  playSound(winSound);
  resetGame();
  if (player === playerXName) {
    playerXScore++;
  } else if (player === playerOName) {
    playerOScore++;
  }
  // Calculate win probabilities
  const probabilityText = calculateWinProbability(playerXScore, playerOScore);

  // Display the score and probability in the modal
  modalText.innerHTML = `<div><span class="score">Score:</span> ${playerXName}  ( ${playerXScore} - ${playerOScore} )  ${playerOName}</div><div><span class="score">Probability Of Winning:</span></div><div>${probabilityText}</div>`;
  showModal();
  playSound(winSound);
  resetGame();
}

function checkDraw() {
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      if (board[row][col] === null) {
        return false;
      }
    }
  }
  return true;
}

function resetGame() {
  board = new Array(boardSize)
    .fill(null)
    .map(() => new Array(boardSize).fill(null));
  currentPlayer = "X";
  boardElement.innerHTML = "";
  createBoard();
}

//Game Score, Probability outcome
function calculateWinProbability(playerXScore, playerOScore) {
  const totalGames = playerXScore + playerOScore;
  const probabilityX = (playerXScore / totalGames) * 100;
  const probabilityO = (playerOScore / totalGames) * 100;

  return `${playerXName}: ${probabilityX.toFixed(
    0
  )}%, ${playerOName}: ${probabilityO.toFixed(0)}%`;
}

//LISTENERS
toggleSidebarButton.addEventListener("click", () => {
  playSound(sidebarSound);
  sidebar.classList.toggle("open");
});

//open boardSettings
boardSettings.addEventListener("click", function () {
  dropdownContainer.classList.toggle("animate-opacity");
});

//Clear board
clearBoard.addEventListener("click", () => {
  playSound(sidebarSound);
  sidebar.classList.toggle("open");
  resetGame();
});

//Reset board size
boardSizeSelect.addEventListener("change", function () {
  boardSize = parseInt(this.value);
  resetGame();
});

//Reset match logic
boardWinSelect.addEventListener("change", function () {
  boardWin = parseInt(this.value);
  resetGame();
});

closeModal.addEventListener("click", hideModal);

resetScoreButton.addEventListener("click", function () {
  playSound(sidebarSound);
  sidebar.classList.toggle("open");
  showModal();
  playerXScore = 0;
  playerOScore = 0;

  modalText.innerHTML = `<div style="font-size: 15px;><span class="score"  "></span> ${playerXName}: ${playerXScore}:${playerOScore}: ${playerOName} </div>`;
  showModal();
});

createBoard();
