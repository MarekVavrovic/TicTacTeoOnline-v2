const users = [];

function userJoinChat(id, username, room) {
  // Check if the user already exists in the room
  const existingUser = users.find(
    (user) => user.id === id && user.room === room
  );

  if (existingUser) {
    // Return the existing user
    return existingUser;
  }

  // Create a new user and add them to the room
  const user = { id, username, room, symbol: "" };
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