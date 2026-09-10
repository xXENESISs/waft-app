// Shared V2 presentation for the Online Tournament's dynamically rendered
// combat/spectator area. Only the match currently visible is animated.

import { presentTurnSequenceV2 } from "./turn-sequence-presenter.js";
import { renderTurnSummaryV2 } from "./turn-summary-v2.js";
import { renderFighterStatusHudInto } from "./battle-status-hud.js";
import { renderBattleFieldHudInto } from "./battle-field-hud.js";

const STYLE_ID = "waft-online-tournament-v2-live-styles";
const RESULT_CACHE_KEY = "__WAFT_ONLINE_TOURNAMENT_V2_RESULTS__";

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .online-summary-box[data-turn-summary-version="2"] {
      max-height: min(42vh, 420px);
      white-space: normal;
      overflow: auto;
    }

    .online-summary-box[data-turn-summary-version="2"] .waft-turn-v2 {
      min-width: 0;
    }

    .online-summary-box[data-turn-summary-version="2"] .waft-turn-v2-phase {
      padding: 8px;
    }

    .waft-v2-online-log-collapsed > :not(.waft-v2-online-log-toggle) {
      display: none !important;
    }

    .waft-v2-online-log-toggle {
      width: 100%;
      min-height: 34px;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,.09);
      background: rgba(255,255,255,.055);
      color: #dbe3ee;
      font: inherit;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

function safeDomIdPart(value) {
  return String(value || "match").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function getResultCache() {
  return window[RESULT_CACHE_KEY] instanceof Map
    ? window[RESULT_CACHE_KEY]
    : null;
}

function getVisibleMatchElements(matchId) {
  const area = document.getElementById("activeCombatArea");
  if (!area || !matchId) return null;

  const escaped = typeof CSS !== "undefined" && CSS.escape
    ? CSS.escape(String(matchId))
    : String(matchId).replace(/["\\]/g, "\\$&");

  const summaryBox = area.querySelector(`[data-turn-summary-match-id="${escaped}"]`);
  if (!summaryBox) return null;

  const wrapA = area.querySelector('.online-battle-fighter-image[data-combat-side="A"]');
  const wrapB = area.querySelector('.online-battle-fighter-image[data-combat-side="B"]');

  summaryBox.id = `onlineTournamentTurnSummaryV2-${safeDomIdPart(matchId)}`;
  return { area, summaryBox, wrapA, wrapB };
}

function isCombatLogPanel(panel) {
  if (!panel) return false;
  if (panel.classList.contains("online-combat-log-panel")) return true;

  const title = panel.querySelector(".online-summary-title")?.textContent?.trim().toLowerCase();
  return panel.classList.contains("online-summary-panel") && title === "combat log";
}

function installCombatLogToggle(panel) {
  if (!panel || panel.dataset.waftV2LogToggle === "true" || !isCombatLogPanel(panel)) return;

  panel.dataset.waftV2LogToggle = "true";
  panel.classList.add("waft-v2-online-log-collapsed");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "waft-v2-online-log-toggle";
  button.textContent = "Battle Log";
  button.setAttribute("aria-expanded", "false");

  button.addEventListener("click", () => {
    const collapsed = panel.classList.toggle("waft-v2-online-log-collapsed");
    button.textContent = collapsed ? "Battle Log" : "Hide Battle Log";
    button.setAttribute("aria-expanded", collapsed ? "false" : "true");
  });

  panel.insertAdjacentElement("afterbegin", button);
}

function syncCombatLogToggles() {
  const area = document.getElementById("activeCombatArea");
  if (!area) return;

  area.querySelectorAll(".online-combat-log-panel, .online-summary-panel").forEach((panel) => {
    if (isCombatLogPanel(panel)) installCombatLogToggle(panel);
  });
}

function renderVisibleStatuses(battle, elements, matchId) {
  if (!battle || !elements) return;
  const idPart = safeDomIdPart(matchId);

  renderFighterStatusHudInto(battle.fighterA, elements.wrapA, {
    hudId: `onlineTournamentStatusHudA-${idPart}`
  });

  renderFighterStatusHudInto(battle.fighterB, elements.wrapB, {
    hudId: `onlineTournamentStatusHudB-${idPart}`
  });
}

function renderVisibleFieldState(battle, elements, matchId) {
  if (!battle || !elements?.summaryBox) return;

  renderBattleFieldHudInto(battle, elements.summaryBox, {
    hudId: `onlineTournamentFieldHud-${safeDomIdPart(matchId)}`
  });
}

function restoreCachedVisibleSummaries() {
  const area = document.getElementById("activeCombatArea");
  const cache = getResultCache();
  if (!area || !cache) return;

  area.querySelectorAll(".online-summary-box[data-turn-summary-match-id]").forEach((summaryBox) => {
    const matchId = summaryBox.getAttribute("data-turn-summary-match-id");
    const detail = cache.get(matchId);
    if (!matchId || !detail?.battle || !detail?.sequence) return;

    const alreadyV2 =
      summaryBox.dataset.turnSummaryVersion === "2" &&
      Boolean(summaryBox.querySelector(".waft-turn-v2"));

    if (alreadyV2) return;

    const elements = getVisibleMatchElements(matchId);
    if (!elements) return;

    // This path is only a repair after the mature tournament code rebuilds the
    // dynamic combat DOM. Restore the final compact summary immediately, but do
    // not replay VFX that the player has already seen.
    renderTurnSummaryV2(detail.sequence, { boxId: elements.summaryBox.id });
    renderVisibleStatuses(detail.battle, elements, matchId);
    renderVisibleFieldState(detail.battle, elements, matchId);
  });
}

function syncDynamicCombatPresentation() {
  syncCombatLogToggles();
  restoreCachedVisibleSummaries();
}

function observeDynamicCombatArea() {
  const area = document.getElementById("activeCombatArea");
  if (!area || area.dataset.waftV2PresentationObserver === "true") return;

  area.dataset.waftV2PresentationObserver = "true";
  const observer = new MutationObserver(() => syncDynamicCombatPresentation());
  observer.observe(area, { childList: true, subtree: true });
  syncDynamicCombatPresentation();
}

async function renderResolvedTurn(detail) {
  const { matchId, battle, sequence } = detail || {};
  if (!matchId || !battle || !sequence) return false;

  const elements = getVisibleMatchElements(matchId);
  if (!elements) return false;

  ensureStyles();
  syncCombatLogToggles();
  elements.summaryBox.dataset.turnSummaryVersion = "2";

  await presentTurnSequenceV2(sequence, {
    boxId: elements.summaryBox.id,
    playVfx: true,
    vfxContext: {
      playerId: battle.fighterA?.id ?? null,
      enemyId: battle.fighterB?.id ?? null,
      playerName: battle.fighterA?.name ?? null,
      enemyName: battle.fighterB?.name ?? null,
      wraps: {
        player: elements.wrapA,
        enemy: elements.wrapB
      }
    },
    eventGap: 70,
    phaseGap: 110
  });

  renderVisibleStatuses(battle, elements, matchId);
  renderVisibleFieldState(battle, elements, matchId);
  syncDynamicCombatPresentation();
  return true;
}

export function installOnlineTournamentV2Live() {
  if (typeof window === "undefined") return false;
  if (window.__WAFT_ONLINE_TOURNAMENT_V2_LIVE__) return true;

  window.__WAFT_ONLINE_TOURNAMENT_V2_LIVE__ = true;
  ensureStyles();
  observeDynamicCombatArea();

  window.addEventListener("waft:online-tournament-turn-resolved", (event) => {
    renderResolvedTurn(event?.detail).catch((error) => {
      console.warn("WAFT Online Tournament V2 presentation failed:", error);
    });
  });

  return true;
}
