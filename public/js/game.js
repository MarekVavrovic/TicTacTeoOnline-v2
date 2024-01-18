//Game
const winSound = document.getElementById("winSound");
const clickSound = document.getElementById("clickSound");
const sidebarSound = document.getElementById("sidebarSound");

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
const playerXNameInput = document.getElementById("playerXName");
const playerONameInput = document.getElementById("playerOName");
//Chat
const chatForm = document.getElementById("chat-form");
const chatMessages = document.querySelector(".chat-messages");
const chatCircle = document.getElementById("chat-circle");
const chatBox = document.querySelector(".chat-box");
const chatBoxHeader = chatBox.querySelector(".chat-box-toggle");

//const roomName = document.getElementById("room");
import { outputRoomName, outputMessage } from "../utils/chat.js";
import { showModal, hideModal, playSound } from "../utils/gameFunctions.js";
const socket = io();

//CHAT STARTS
// 1.1 get username and room from the querystring
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

//1.2 emit querystring
socket.emit("joinRoom", {
  username,
  room,
  boardSize: parseInt(boardSizeSelect.value),
  boardWin: parseInt(boardWinSelect.value),
});

//1.3 Output room and users on DOM
socket.on("roomUsers", ({ room, users }) => {
  outputRoomName(room);
  updatePlayerNames(users);
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

  //emitting chat-input to the server
  socket.emit("chatMessage", msg);
  event.target.elements.msg.value = "";
  event.target.elements.msg.focus();
});

socket.on("roomFull", ({ room, usersInRoom }) => {
  // Redirect with query parameters
  const encodedRoom = encodeURIComponent(room);
  const encodedUsers = encodeURIComponent(usersInRoom.join(", "));
  const redirectUrl = `roomNotFound.html?room=${encodedRoom}&users=${encodedUsers}`;
  window.location.href = redirectUrl;
});

//CHAT END

// Global variables to store player names
let playerXName = "Player X";
let playerOName = "Player O";

function updatePlayerNames(users) {
  if (users.length > 0) {
    playerXName = users[0].username;
    playerXNameInput.value = playerXName;
    if (users.length > 1) {
      playerOName = users[1].username; 
      playerONameInput.value = playerOName;
    }
  } else {
    playerXNameInput.value = "Waiting for player X";
    playerONameInput.value = "Waiting for player O";
  }
}

let boardWin = parseInt(boardWinSelect.value);
let boardSize = parseInt(boardSizeSelect.value);

let currentPlayer = "X";

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
      cell.addEventListener("click", handleCellClick); // Attach event listener
      boardElement.appendChild(cell);
    }
  }
}


function handleCellClick(event) {
  const row = parseInt(event.target.dataset.row);
  const col = parseInt(event.target.dataset.col);

  // Check if row and col are within valid ranges - delete this if block at the end
  if (
    isNaN(row) ||
    isNaN(col) ||
    row < 0 ||
    row >= board.length ||
    col < 0 ||
    col >= board[row].length
  ) {
    console.error("Invalid row or col values");
    return;
  }

  if (board[row][col] === null) {
    // Send move to server instead of handling it locally
    socket.emit("playerMove", { room, row, col });
  }
}

socket.on("gameStateUpdate", (gameState) => {
  // Update the board based on gameState
  updateBoard(gameState.board);
  currentPlayer = gameState.currentPlayer;
  // Handle display of winner or draw
  if (gameState.isGameOver) {
    if (gameState.winner) {
      displayWinner(gameState.winner === "X" ? playerXName : playerOName);
    } else {
      // Handle draw scenario
      modalText.textContent = "It's a draw!";
      showModal();
    }
  }
});

//try to remove try catch block
function updateBoard(board) {
  try {
    if (!board || !Array.isArray(board)) {
      throw new Error("Invalid board data");
    }

    // Clear the existing board content
    boardElement.innerHTML = "";
    boardElement.style.gridTemplateColumns = `repeat(${board.length}, 50px)`;

    for (let row = 0; row < board.length; row++) {
      if (!Array.isArray(board[row])) {
        throw new Error(`Invalid row data at index ${row}`);
      }
      for (let col = 0; col < board[row].length; col++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = row;
        cell.dataset.col = col;        
        cell.textContent = board[row][col];
        cell.addEventListener("click", handleCellClick);
        boardElement.appendChild(cell);
      }
    }
  } catch (error) {
    console.error(error.message);
  }
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
    boardSizeSelect;
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

function resetGame() {
  socket.emit("resetGame", { room });
  board = new Array(boardSize)
    .fill(null)
    .map(() => new Array(boardSize).fill(null));
  currentPlayer = "X";
  boardElement.innerHTML = "";
  createBoard();
  boardSizeSelect.value = boardSize;
  boardWinSelect.value = boardWin;
}

//if one of the players leave the room
socket.on("resetGame", () => {
  // Reset local scores
  playerXScore = 0;
  playerOScore = 0;

  // Reset board size and winning match length to default values
  boardSize = 5; // Default board size (5x5)
  boardWin = 3; // Default match length (3)

  // Update UI elements
  boardSizeSelect.value = boardSize;
  boardWinSelect.value = boardWin;

  // Reset the board and update scores and probabilities
  createBoard();
  calculateWinProbability();
});

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

document.addEventListener("DOMContentLoaded", function () {
  const boardSizeSelect = document.getElementById("boardSizeSelect");
  const boardWinSelect = document.getElementById("boardWinSelect");

  let boardSize = parseInt(boardSizeSelect.value);
  let boardWin = parseInt(boardWinSelect.value);

  // Event listener for "Board Size" dropdown
 boardSizeSelect.addEventListener("change", function () {
   const selectedBoardSize = parseInt(boardSizeSelect.value);
   console.log(`Selected board size: ${selectedBoardSize}`);
   boardSize = selectedBoardSize;
   socket.emit("boardSettingsChanged", { room, boardSize, boardWin });
   resetGame();
 });

  // Event listener for "Match" dropdown
  boardWinSelect.addEventListener("change", function () {
    const selectedWinSize = parseInt(boardWinSelect.value);
    console.log(`Selected winning match size: ${selectedWinSize}`);
    boardWin = selectedWinSize;
    socket.emit("boardSettingsChanged", { room, boardSize, boardWin });
    resetGame();
  });

});

socket.on("boardSettingsUpdated", ({ newBoardSize, newBoardWin }) => {
  boardSize = newBoardSize;
  boardWin = newBoardWin;
  boardSizeSelect.value = newBoardSize;
  boardWinSelect.value = newBoardWin;
  resetGame();
});


closeModal.addEventListener("click", hideModal);


socket.on("resetScore", () => {
  // Reset local scores
  playerXScore = 0;
  playerOScore = 0;

  // Update UI with new scores
 const probabilityText = calculateWinProbability(playerXScore, playerOScore);

 modalText.innerHTML = `<div><span class="score">Score:</span> ${playerXName}  ( ${playerXScore} - ${playerOScore} )  ${playerOName}</div><div><span class="score">Probability Of Winning:</span></div><div>${probabilityText}</div>`;
 showModal();
});

resetScoreButton.addEventListener("click", function () {
  socket.emit("resetScore");
  console.log(`resetScoreButton clicked`);
  playSound(sidebarSound);
  sidebar.classList.toggle("open");
  showModal();
  playerXScore = 0;
  playerOScore = 0;

  modalText.innerHTML = `<div style="font-size: 15px;"><span class="score"></span> ${playerXName}: ${playerXScore} ${playerOName}: ${playerOScore}</div>`;
  showModal();

});


createBoard();
