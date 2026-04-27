document.addEventListener("DOMContentLoaded", () => {
  const fighterGrid = document.getElementById("fighter-grid");
  const resetBtn = document.getElementById("reset-order-btn");

  if (!fighterGrid) return;

  const topRow = fighterGrid.querySelector(".top-row");
  const bottomRow = fighterGrid.querySelector(".bottom-row");

  if (!topRow || !bottomRow) return;

  const storageKey = "waft-order-" + window.location.pathname;
  let draggedCard = null;

  function getAllCards() {
    return Array.from(fighterGrid.querySelectorAll(".fighter-card-small"));
  }

  const originalOrder = getAllCards().map(card => card.dataset.id);

  function saveOrder() {
    const order = getAllCards().map(card => card.dataset.id);
    localStorage.setItem(storageKey, JSON.stringify(order));
  }

  function renderRows(cards) {
    topRow.innerHTML = "";
    bottomRow.innerHTML = "";

    cards.forEach((card, index) => {
      if (index < 3) {
        topRow.appendChild(card);
      } else {
        bottomRow.appendChild(card);
      }
    });

    bindCards();
  }

  function swapCards(cardA, cardB) {
    const cards = getAllCards();
    const indexA = cards.indexOf(cardA);
    const indexB = cards.indexOf(cardB);

    if (indexA === -1 || indexB === -1 || indexA === indexB) return;

    const swapped = [...cards];
    [swapped[indexA], swapped[indexB]] = [swapped[indexB], swapped[indexA]];

    renderRows(swapped);
    saveOrder();
  }

  function makeCardDraggable(card) {
    card.setAttribute("draggable", "true");

    const innerImg = card.querySelector("img");
    const innerButton = card.querySelector("button");

    if (innerImg) innerImg.setAttribute("draggable", "false");
    if (innerButton) innerButton.setAttribute("draggable", "false");

    card.addEventListener("dragstart", (e) => {
      draggedCard = card;
      fighterGrid.classList.add("reordering");
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", card.dataset.id || "");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      fighterGrid.classList.remove("reordering");
      getAllCards().forEach(c => c.classList.remove("drag-over"));
      draggedCard = null;
    });

    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    card.addEventListener("dragenter", (e) => {
      e.preventDefault();
      if (card !== draggedCard) {
        card.classList.add("drag-over");
      }
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("drag-over");
    });

    card.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!draggedCard || draggedCard === card) return;

      getAllCards().forEach(c => c.classList.remove("drag-over"));
      swapCards(draggedCard, card);
    });

    card.addEventListener("click", (e) => {
      if (fighterGrid.classList.contains("reordering")) {
        e.preventDefault();
      }
    });
  }

  function bindCards() {
    getAllCards().forEach((card) => {
      const cloned = card.cloneNode(true);
      card.parentNode.replaceChild(cloned, card);
    });

    getAllCards().forEach(makeCardDraggable);
  }

  function loadOrder() {
    const saved = localStorage.getItem(storageKey);

    if (!saved) {
      bindCards();
      return;
    }

    const order = JSON.parse(saved);
    const currentCards = getAllCards();
    const map = {};

    currentCards.forEach(card => {
      map[card.dataset.id] = card;
    });

    const orderedCards = [];
    order.forEach(id => {
      if (map[id]) orderedCards.push(map[id]);
    });

    currentCards.forEach(card => {
      if (!orderedCards.includes(card)) {
        orderedCards.push(card);
      }
    });

    renderRows(orderedCards);
  }

  resetBtn?.addEventListener("click", () => {
    localStorage.removeItem(storageKey);

    const cards = getAllCards();
    const map = {};

    cards.forEach(card => {
      map[card.dataset.id] = card;
    });

    const ordered = originalOrder.map(id => map[id]).filter(Boolean);
    renderRows(ordered);
  });

  loadOrder();
});