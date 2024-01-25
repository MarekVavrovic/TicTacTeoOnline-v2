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
const { username, room} = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const lowercaseRoom = room.toLowerCase();
//1.2 emit querystring
socket.emit("joinRoom", {
  username,
  room :lowercaseRoom,
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
  const redirectUrl = `roomAlreadyExists.html?room=${encodedRoom}&users=${encodedUsers}`;
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
  console.log(`handleCellClick`);
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
   
    socket.emit("playerMove", { room: room.toLowerCase(), row, col });
    playSound(clickSound);
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
      const probabilityText = calculateWinProbability(
        playerXScore,
        playerOScore
      );

      // SVG icon for the player
      const playerIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="player-icon">
      <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clip-rule="evenodd" />
    </svg>`;

      // Display the score and probability in the modal
      modalText.innerHTML = `
    <div class="winner-card">
      <h2>It's a draw!</h2>
      <div class="player-info">
        <div class="avatar">
          ${playerIconSVG}
          <p>${playerXName.slice(0, 10)}</p>
          <p class="score">${playerXScore}</p>
        </div>
        <div class="avatar">
          ${playerIconSVG}
          <p>${playerOName.slice(0, 10)}</p>
          <p class="score">${playerOScore}</p>
        </div>
      </div>
       <div class="probability">
     <p>Winning probability</p><span class="score"><div class="avatar"> ${playerXName.slice(
       0,
       10
     )}: 50% </div><div class="avatar"> ${playerOName.slice(
        0,
        10
      )}: 50%</div> </span>     
    </div>
    </div>`;

      showModal();
      resetGame();
    }
  }
});


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

  // SVG icon for the player
  const playerIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="player-icon">
      <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clip-rule="evenodd" />
    </svg>`;

  // Display the score and probability in the modal
  modalText.innerHTML = `
       <div class="winner-card">
      <h2>${player} wins!</h2>
      <div class="player-info">
        <div class="avatar">
          ${playerIconSVG}
          <p>${playerXName.slice(0, 10)}</p>
          <p class="score">${playerXScore}</p>
        </div>
        <div class="avatar">
          ${playerIconSVG}
          <p>${playerOName.slice(0, 10)}</p>
          <p class="score">${playerOScore}</p>
        </div>
      </div>
      <div class="probability">
     <p>Winning probability</p><span class="score"><div class="avatar"> ${playerXName.slice(
       0,
       10
     )}: ${
    probabilityText.playerXProbability
  }% </div><div class="avatar"> ${playerOName.slice(0, 10)}: ${
    probabilityText.playerOProbability
  }%</div> </span>     
    </div>
    </div>`;
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

// Initialize probability variables to 50%
let probabilityX = 50;
let probabilityO = 50;
//Game Score, Probability outcome
function calculateWinProbability(playerXScore, playerOScore) {
  const totalGames = playerXScore + playerOScore;
  let playerXProbability = 0;
  let playerOProbability = 0;

  if (totalGames > 0) {
    playerXProbability = (playerXScore / totalGames) * 100;
    playerOProbability = (playerOScore / totalGames) * 100;
  }

  return {
    playerXProbability: playerXProbability.toFixed(0),
    playerOProbability: playerOProbability.toFixed(0),
  };
}

//LISTENERS
toggleSidebarButton.addEventListener("click", () => {
  playSound(sidebarSound);
  sidebar.classList.toggle("open");
});

boardSettings.addEventListener("click", function () {
  dropdownContainer.classList.toggle("animate-opacity");
});

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

  boardSizeSelect.addEventListener("change", function () {
    const selectedBoardSize = parseInt(boardSizeSelect.value);
    boardSize = selectedBoardSize;
    socket.emit("boardSettingsChanged", { room, boardSize, boardWin });
    resetGame();
  });

  boardWinSelect.addEventListener("change", function () {
    const selectedWinSize = parseInt(boardWinSelect.value);
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

//on player leaves the room
socket.on("gameReset", () => {
  
  playerXScore = 0;
  playerOScore = 0;

  board = new Array(boardSize)
    .fill(null)
    .map(() => new Array(boardSize).fill(null));
  currentPlayer = "X";
  updateBoard(board);

  boardSize = 6;
  boardWin = 3;

  boardSizeSelect.value = boardSize;
  boardWinSelect.value = boardWin;

  resetGame();
  // Emit board settings changes to the server
  socket.emit("boardSettingsChanged", { room, boardSize, boardWin });
});

socket.on("resetScore", () => {
  playerXScore = 0;
  playerOScore = 0;

  // Calculate the updated probabilities
  const probabilityText = calculateWinProbability(playerXScore, playerOScore);

  // SVG icon for the player
  const playerIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="player-icon">
      <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clip-rule="evenodd" />
    </svg>`;

  // Display the updated scores and probabilities in the modal
  modalText.innerHTML = `
    <div class="winner-card">
      <h2>Scores Reset</h2>
      <div class="player-info">
        <div class="avatar">
          ${playerIconSVG}
          <p>${playerXName.slice(0, 10)}</p>
          <p class="score">${playerXScore}</p>
        </div>
        <div class="avatar">
          ${playerIconSVG}
          <p>${playerOName.slice(0, 10)}</p>
          <p class="score">${playerOScore}</p>
        </div>
      </div>
       <div class="probability">
     <p>Winning probability</p><span class="score"><div class="avatar"> ${playerXName.slice(
       0,
       10
     )}: 50% </div><div class="avatar"> ${playerOName.slice(
    0,
    10
  )}: 50%</div> </span>     
    </div>
    </div>`;
  resetGame()    
  showModal();
  clearBoard()
});

// Reset Score button event listener
resetScoreButton.addEventListener("click", function () {
  socket.emit("resetScore");
  playSound(sidebarSound);
  sidebar.classList.toggle("open");
});

// Update the player names and scores when the page loads or when a user joins a room
function updatePlayerNamesAndScores(users) {
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

// Call the updatePlayerNamesAndScores function when the page loads
document.addEventListener("DOMContentLoaded", function () {
  updatePlayerNamesAndScores([]);
});

createBoard();
