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

app.use(express.static(path.join(__dirname, "public")));

const chatBot = "ChatBot ";

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    const roomUsers = getRoomUsers(room);

    if (roomUsers.length < 2) {
      const user = userJoinChat(socket.id, username, room);
      socket.join(user.room);
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
      io.emit(
        "message",
        formatMessage(chatBot, `${user.username} has left the chat`)
      );

      //users & room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`ExpressServer on port ${PORT}`));
