// Shared V2 presentation for the Online Tournament's dynamically rendered
// combat/spectator area. Only the match currently visible is animated.

import { buildTurnSummaryV2Html } from "./turn-summary-v2.js";
import { playTurnSequenceVfx } from "./battle-vfx.js";
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

  return { area, summaryBox, wrapA, wrapB };
}

function renderVisibleStatuses(battle, elements) {
  if (!battle || !elements) return;

  renderFighterStatusHudInto(battle.fighterA, elements.wrapA, {
    hudId: "onlineTournamentStatusHudA"
  });

  renderFighterStatusHudInto(battle.fighterB, elements.wrapB, {
    hudId: "onlineTournamentStatusHudB"
  });
}

async function renderResolvedTurn(detail) {
  const { matchId, battle, sequence } = detail || {};
  if (!matchId || !battle || !sequence) return false;

  const elements = getVisibleMatchElements(matchId);
  if (!elements) return false;

  ensureStyles();

  elements.summaryBox.innerHTML = buildTurnSummaryV2Html(sequence);
  elements.summaryBox.dataset.turnSummaryVersion = "2";
  renderVisibleStatuses(battle, elements);

  await playTurnSequenceVfx(
    sequence,
    {
      playerId: battle.fighterA?.id ?? null,
      enemyId: battle.fighterB?.id ?? null,
      playerName: battle.fighterA?.name ?? null,
      enemyName: battle.fighterB?.name ?? null,
      wraps: {
        player: elements.wrapA,
        enemy: elements.wrapB
      }
    },
    {
      gap: 70,
      phaseGap: 90
    }
  );

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
