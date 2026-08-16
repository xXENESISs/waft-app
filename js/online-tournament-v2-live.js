// Shared V2 presentation for the Online Tournament's dynamically rendered
// combat/spectator area. Only the match currently visible is animated.

import { presentTurnSequenceV2 } from "./turn-sequence-presenter.js";
import { renderFighterStatusHudInto } from "./battle-status-hud.js";

const STYLE_ID = "waft-online-tournament-v2-live-styles";

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
  `;
  document.head.appendChild(style);
}

function safeDomIdPart(value) {
  return String(value || "match").replace(/[^a-zA-Z0-9_-]/g, "-");
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

async function renderResolvedTurn(detail) {
  const { matchId, battle, sequence } = detail || {};
  if (!matchId || !battle || !sequence) return false;

  const elements = getVisibleMatchElements(matchId);
  if (!elements) return false;

  ensureStyles();
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
  return true;
}

export function installOnlineTournamentV2Live() {
  if (typeof window === "undefined") return false;
  if (window.__WAFT_ONLINE_TOURNAMENT_V2_LIVE__) return true;

  window.__WAFT_ONLINE_TOURNAMENT_V2_LIVE__ = true;
  ensureStyles();

  window.addEventListener("waft:online-tournament-turn-resolved", (event) => {
    renderResolvedTurn(event?.detail).catch((error) => {
      console.warn("WAFT Online Tournament V2 presentation failed:", error);
    });
  });

  return true;
}
