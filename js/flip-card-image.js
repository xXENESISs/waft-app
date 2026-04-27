document.addEventListener("DOMContentLoaded", () => {
  const storageKey = "waft-flipped-cards-" + window.location.pathname;
  const fighterGrid = document.getElementById("fighter-grid");

  function loadFlippedState() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch {
      return {};
    }
  }

  function saveFlippedState(state) {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function applyFlippedState() {
    const state = loadFlippedState();
    const cards = document.querySelectorAll(".fighter-card-small");

    cards.forEach((card) => {
      const id = card.dataset.id;
      const img = card.querySelector("img");

      if (!id || !img) return;

      if (state[id]) {
        img.classList.add("flipped");
      } else {
        img.classList.remove("flipped");
      }
    });
  }

  document.addEventListener("click", (e) => {
    const button = e.target.closest(".card-flip-button");
    if (!button) return;

    e.preventDefault();
    e.stopPropagation();

    const card = button.closest(".fighter-card-small");
    if (!card) return;

    const img = card.querySelector("img");
    const id = card.dataset.id;

    if (!img || !id) return;

    img.classList.toggle("flipped");

    const state = loadFlippedState();
    state[id] = img.classList.contains("flipped");
    saveFlippedState(state);
  });

  applyFlippedState();

  if (fighterGrid) {
    const observer = new MutationObserver(() => {
      applyFlippedState();
    });

    observer.observe(fighterGrid, {
      childList: true,
      subtree: true
    });
  }
});