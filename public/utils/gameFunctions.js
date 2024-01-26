const modal = document.getElementById("myModal");

export function showModal() {
  modal.style.visibility = "visible";
  modal.style.zIndex = 10;
  setTimeout(hideModal, 4000);
}

export function hideModal() {
  modal.style.visibility = "hidden";
}

export function playSound(soundElement) {
  soundElement.currentTime = 0;
  soundElement.play();
}
