const roomName = document.getElementById("room");

//1.4
export function outputRoomName(room) {
  roomName.value = room;
}

export function outputMessage(inputMsg) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");
  const p = document.createElement("p");
  p.classList.add("meta");
  p.innerText = inputMsg.username + " ";
  p.innerHTML += `<span>${inputMsg.time}</span>`;
  messageDiv.appendChild(p);
  const para = document.createElement("p");
  para.innerText =inputMsg.text ;
  messageDiv.appendChild(para);
  document.querySelector(".chat-messages").appendChild(messageDiv);
}

export function getQueryParams() {
  const queryParams = {};
  const queryString = window.location.search.substring(1);
  const queryParts = queryString.split("&");

  for (const part of queryParts) {
    const [key, encodedValue] = part.split("=");
    const value = decodeURIComponent(encodedValue.replace(/\+/g, " ")); 
    queryParams[key] = value;
  }

  return queryParams;
}
