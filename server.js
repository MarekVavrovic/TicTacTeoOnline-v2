const path = require("path");
const http = require("http");
const express = require("express");
const socketIO = require("socket.io");
const formatMessage = require("./public/utils/messages");
const {
  userJoinChat,
  getCurrentUser,
  userLeftChat,
  getRoomUsers,
} = require("./public/utils/users");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

//game state
const games = {};
function createGameState(room, boardSize, boardWin) {
  return {
    board: Array(boardSize)
      .fill(null)
      .map(() => Array(boardSize).fill(null)),
    currentPlayer: "X",
    boardSize: boardSize,
    boardWin: boardWin,
    winner: null,
    isGameOver: false,
  };
}

function getGameState(room, boardSize, boardWin) {
  if (!games[room]) {
    games[room] = createGameState(room, boardSize, boardWin);
  }
  return games[room];
}

function checkWin(board, playerSymbol, boardWin) {
  const size = board.length;

  // Check rows and columns
  for (let i = 0; i < size; i++) {
    let rowWin = 0;
    let colWin = 0;

    for (let j = 0; j < size; j++) {
      if (board[i][j] === playerSymbol) {
        rowWin++;
      }
      if (board[j][i] === playerSymbol) {
        colWin++;
      }
    }

    if (rowWin === boardWin || colWin === boardWin) return true;
  }

  // Check diagonals
  let diag1Win = 0;
  let diag2Win = 0;
  for (let i = 0; i < size; i++) {
    if (board[i][i] === playerSymbol) {
      diag1Win++;
    }
    if (board[i][size - 1 - i] === playerSymbol) {
      diag2Win++;
    }
  }

  if (diag1Win === boardWin || diag2Win === boardWin) return true;

  return false; // No win found
}

function checkDraw(board) {
  // A draw occurs if there are no empty spaces left on the board
  for (let row of board) {
    if (row.some((cell) => cell === null)) {
      return false; // Found an empty cell, so not a draw
    }
  }
  return true; // No empty spaces, game is a draw
}

function resetGameState(room) {
  if (games[room]) {
    games[room].board = Array(games[room].boardSize)
      .fill(null)
      .map(() => Array(games[room].boardSize).fill(null));
    games[room].currentPlayer = "X";
    games[room].winner = null;
    games[room].isGameOver = false;
  }
}

app.use(express.static(path.join(__dirname, "public")));

const chatBot = "ChatBot ";

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room, boardSize, boardWin }) => {
    const roomUsers = getRoomUsers(room);

    if (roomUsers.length < 2) {
      const user = userJoinChat(socket.id, username, room);
      socket.join(user.room);
      getGameState(room, boardSize, boardWin);
      //users & room info for sidebar inputs
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });

      //welcome current user starts
      socket.emit("message", formatMessage(chatBot, " Welcome to the game"));
      socket.broadcast
        .to(user.room)
        .emit(
          "message",
          formatMessage(chatBot, `${user.username} has join the chat`)
        );

      //chat inputs
      socket.on("chatMessage", (received) => {
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit(
          "message",
          formatMessage(user.username, received)
        );
      });

      //GAME LOGIC START
      //handling win & board size is changed
      socket.on("boardSettingsChanged", ({ room, boardSize, boardWin }) => {
        const gameState = getGameState(room);
        gameState.boardSize = boardSize;
        gameState.boardWin = boardWin;
        gameState.board = Array(boardSize)
          .fill(null)
          .map(() => Array(boardSize).fill(null));
        gameState.currentPlayer = "X";
        gameState.winner = null;
        gameState.isGameOver = false;

        io.to(room).emit("boardSettingsUpdated", gameState);
      });

      socket.on("playerMove", ({ room, row, col }) => {
        const user = getCurrentUser(socket.id);
        const gameState = getGameState(room);

        if (
          user &&
          gameState.currentPlayer === user.symbol &&
          gameState.board[row][col] === null &&
          !gameState.isGameOver
        ) {
          gameState.board[row][col] = user.symbol;

          // Check for win or draw
          if (checkWin(gameState.board, user.symbol, gameState.boardWin)) {
            gameState.winner = user.symbol;
            gameState.isGameOver = true;
          } else if (checkDraw(gameState.board)) {
            gameState.isGameOver = true;
          }

          // Switch player if game is not over
          if (!gameState.isGameOver) {
            gameState.currentPlayer =
              gameState.currentPlayer === "X" ? "O" : "X";
          }

          io.to(room).emit("gameStateUpdate", gameState);
        }
      });

      socket.on("resetGame", ({ room }) => {
        resetGameState(room);
        const gameState = getGameState(room);
        io.to(room).emit("gameStateUpdate", gameState);
      });
      //GAME LOGIC END
    } else {
      const usersInRoom = roomUsers.map((user) => user.username);
      socket.emit("roomFull", {
        room: room,
        usersInRoom: usersInRoom,
      });
    }
  });

  socket.on("disconnect", () => {
    const user = userLeftChat(socket.id);
    if (user) {
      // Handle the disconnection in the game
      // For example, you could pause the game or assign a loss to the disconnected player
      const gameState = getGameState(user.room);
      if (gameState) {
        gameState.isGameOver = true; // Optionally, mark the game as over
        io.to(user.room).emit("gameStateUpdate", gameState);
      }
      // Notify other users in the room
      io.to(user.room).emit(
        "message",
        formatMessage(chatBot, `${user.username} has left the game`)
      );
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`ExpressServer on port ${PORT}`));
