document.addEventListener("DOMContentLoaded", () => {
  const storageKey = "waft-flipped-fighter-" + window.location.pathname;

  function loadFlipState() {
    return localStorage.getItem(storageKey) === "true";
  }

  function saveFlipState(isFlipped) {
    localStorage.setItem(storageKey, isFlipped ? "true" : "false");
  }

  function applyInitialFlipState() {
    const buttons = document.querySelectorAll(".flip-button");

    buttons.forEach((button) => {
      const targetId = button.dataset.target;
      const img = document.getElementById(targetId);

      if (!img) return;

      img.classList.add("no-flip-transition");

      if (loadFlipState()) {
        img.classList.add("flipped");
      } else {
        img.classList.remove("flipped");
      }

      requestAnimationFrame(() => {
        img.classList.remove("no-flip-transition");
      });
    });
  }

  document.addEventListener("click", (e) => {
    const button = e.target.closest(".flip-button");
    if (!button) return;

    e.preventDefault();
    e.stopPropagation();

    const targetId = button.dataset.target;
    const img = document.getElementById(targetId);

    if (!img) return;

    img.classList.toggle("flipped");
    saveFlipState(img.classList.contains("flipped"));
  });

  applyInitialFlipState();
});