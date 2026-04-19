const backButton = document.getElementById("back-button");

backButton?.addEventListener("click", () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "./index.html";
  }
});
