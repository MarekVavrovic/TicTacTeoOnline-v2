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

// Static folder
app.use(express.static(path.join(__dirname, "public")));

const chatBot = "ChatBot ";


// Socket.IO listeners for connection events
io.on("connection", (socket) => {
 socket.on("joinRoom", ({ username, room }) => {
    const user = userJoinChat(socket.id, username, room);
    socket.join(user.room);

    //welcome current user starts
    socket.emit("message", formatMessage(chatBot, " Welcome to the game"));
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(chatBot, `${user.username} has join the chat`)
      );

      //users & room info for sidebar inputs
      io.to(user.room).emit("roomUsers",{
        room: user.room,
        users: getRoomUsers(user.room)
      })
  });
  //welcome current user ends

  //chat inputs
  socket.on("chatMessage", (received) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("message", formatMessage(user.username, received));
  });

  socket.on("disconnect", () => {
    const user = userLeftChat(socket.id);

    // if block on disconnect
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
