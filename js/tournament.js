// Single Tournament V2 bootstrap.
import { animals } from "./animals.js";
import { installLegacyPresentationCompat } from "./legacy-presentation-compat.js";
import { installTurnSummaryV2Live } from "./turn-summary-v2-live.js";

function validRosterEntries() {
  return Object.entries(animals).filter(([, animal]) => animal?.name && animal?.stats);
}

function prewarmTournamentSelector() {
  const select = document.getElementById("playerFighter");
  if (!select || select.options.length > 0) return;

  const group = document.createElement("optgroup");
  group.label = "Fighters";

  for (const [fighterId, animal] of validRosterEntries()) {
    const option = document.createElement("option");
    option.value = fighterId;
    option.textContent = animal.name;
    group.appendChild(option);
  }

  select.replaceChildren(group);

  if (animals["sumatran-tiger"]) {
    select.value = "sumatran-tiger";
  }
}

function setTournamentBootstrapState(state, error = null) {
  const startButton = document.getElementById("startTournamentBtn");
  const status = document.getElementById("tournamentStatus");

  document.documentElement.dataset.tournamentBootstrap = state;

  if (state === "loading") {
    if (startButton) {
      startButton.disabled = true;
      startButton.textContent = "Loading Tournament…";
    }
    if (status) status.textContent = "Loading roster…";
    return;
  }

  if (state === "ready") {
    if (startButton) {
      startButton.disabled = false;
      startButton.textContent = "Start Tournament";
    }
    if (status && /loading/i.test(status.textContent || "")) {
      status.textContent = "Not started";
    }
    return;
  }

  if (startButton) {
    startButton.disabled = true;
    startButton.textContent = "Tournament unavailable";
  }
  if (status) {
    status.textContent = "Load error — refresh to retry";
    status.title = error?.message || String(error || "Tournament bootstrap failed");
  }
}

prewarmTournamentSelector();
setTournamentBootstrapState("loading");

installLegacyPresentationCompat();
installTurnSummaryV2Live({
  legacyBoxId: "turnSummaryBox",
  hideLegacy: true,
  playVfx: true,
  playerSide: "fighterA"
});

const preselectedFighter = document.getElementById("playerFighter")?.value || "sumatran-tiger";

import("./tournament-legacy.js")
  .then(() => {
    const select = document.getElementById("playerFighter");
    if (!select || select.options.length === 0) {
      throw new Error("Tournament roster did not initialize.");
    }

    if (preselectedFighter && [...select.options].some((option) => option.value === preselectedFighter)) {
      select.value = preselectedFighter;
    }

    setTournamentBootstrapState("ready");
  })
  .catch((error) => {
    console.error("WAFT Single Tournament legacy bootstrap failed:", error);
    setTournamentBootstrapState("error", error);
  });
