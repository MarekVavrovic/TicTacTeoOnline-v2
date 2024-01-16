const users = [];

function userJoinChat(id, username, room) {
  const existingUser = users.find(
    (user) => user.room === room && user.id === id
  );

  if (existingUser) {
    return existingUser;
  }

  const userCountInRoom = users.filter((user) => user.room === room).length;
  const symbol = userCountInRoom === 0 ? "X" : "O";

  const user = { id, username, room, symbol };
  users.push(user);
  return user;
}

function getCurrentUser(id) {
  return users.find((user) => user.id === id);
}

function userLeftChat(id) {
  const index = users.findIndex((user) => user.id === id);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

function getRoomUsers(room) {
  return users.filter((user) => user.room === room);
}

module.exports = {
  userJoinChat,
  getCurrentUser,
  userLeftChat,
  getRoomUsers
  
};