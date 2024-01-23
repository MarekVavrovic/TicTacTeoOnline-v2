document.addEventListener("DOMContentLoaded", (event) => {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get("room");
  const users = urlParams.get("users");

  if (room && users) {
    const message = `Room ${decodeURIComponent(room)} is already taken. Users in the room: ${decodeURIComponent(
      users)}. Please create another room or something bad will happen!`;
    document.querySelector(".output").innerText = message;
  }
});
