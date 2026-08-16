// Live bridge between current WAFT battle pages and Turn Summary V2.
// It leaves mature page logic running for compatibility while replacing the
// wall-of-text presentation with ordered phases, VFX, and persistent statuses.

import { renderTurnSummaryV2 } from "./turn-summary-v2.js";
import { playTurnSequenceVfx } from "./battle-vfx.js";
import { renderBattleStatusHuds } from "./battle-status-hud.js";

const LIVE_STYLE_ID = "waft-turn-summary-v2-live-styles";

function ensureLiveStyles() {
  if (document.getElementById(LIVE_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = LIVE_STYLE_ID;
  style.textContent = `
    #turnSummaryV2Host {
      width: 100%;
      min-height: 92px;
    }

    .waft-turn-v2-system-message {
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.05);
      color: #f8fafc;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.4;
    }
  `;
  document.head.appendChild(style);
}

function createHost(legacyBox) {
  let host = document.getElementById("turnSummaryV2Host");
  if (host) return host;

  host = document.createElement("div");
  host.id = "turnSummaryV2Host";
  host.innerHTML = `<div class="waft-turn-v2-system-message">Battle ready. Choose your action.</div>`;

  legacyBox.insertAdjacentElement("beforebegin", host);
  return host;
}

function renderSmallSystemMessage(host, text) {
  const safeText = String(text || "").trim();
  if (!safeText) return;

  host.innerHTML = "";
  const message = document.createElement("div");
  message.className = "waft-turn-v2-system-message";
  message.textContent = safeText;
  host.appendChild(message);
}

function resolvePlayerSide(detail, fallback = "fighterA") {
  return detail?.playerSide === "fighterB" ? "fighterB" : fallback;
}

export function installTurnSummaryV2Live(options = {}) {
  const {
    legacyBoxId = "turnSummaryBox",
    playVfx = true,
    hideLegacy = true,
    playerSide = "fighterA"
  } = options;

  const install = () => {
    const legacyBox = document.getElementById(legacyBoxId);
    if (!legacyBox) return false;
    if (legacyBox.dataset.turnSummaryV2LiveInstalled === "true") return true;

    ensureLiveStyles();
    const host = createHost(legacyBox);

    legacyBox.dataset.turnSummaryV2LiveInstalled = "true";

    if (hideLegacy) {
      legacyBox.style.display = "none";
      legacyBox.setAttribute("aria-hidden", "true");
    }

    let lastResolvedAt = 0;

    const onBattleState = (event) => {
      const detail = event?.detail || {};
      const battle = detail.battle;
      if (!battle) return;

      const effectivePlayerSide = resolvePlayerSide(detail, playerSide);
      renderBattleStatusHuds(battle, { playerSide: effectivePlayerSide });

      if (detail.message) {
        renderSmallSystemMessage(host, detail.message);
      }
    };

    const onTurnResolved = (event) => {
      const detail = event?.detail || {};
      const sequence = detail.sequence;
      const battle = detail.battle;
      if (!sequence) return;

      const effectivePlayerSide = resolvePlayerSide(detail, playerSide);

      lastResolvedAt = Date.now();
      renderTurnSummaryV2(sequence, { boxId: host.id });

      if (battle) {
        renderBattleStatusHuds(battle, { playerSide: effectivePlayerSide });
      }

      if (playVfx && battle) {
        const player = effectivePlayerSide === "fighterB" ? battle.fighterB : battle.fighterA;
        const enemy = effectivePlayerSide === "fighterB" ? battle.fighterA : battle.fighterB;

        playTurnSequenceVfx(
          sequence,
          {
            playerId: player?.id ?? null,
            enemyId: enemy?.id ?? null
          },
          {
            gap: 70,
            phaseGap: 90
          }
        ).catch((error) => {
          console.warn("WAFT VFX sequence failed:", error);
        });
      }
    };

    window.addEventListener("waft:battle-state", onBattleState);
    window.addEventListener("waft:turn-resolved", onTurnResolved);

    const observer = new MutationObserver(() => {
      if (Date.now() - lastResolvedAt < 900) return;

      const text = legacyBox.textContent?.trim() || "";
      if (!text) return;

      const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.length > 4 || text.length > 420) return;

      renderSmallSystemMessage(host, lines.join(" · "));
    });

    observer.observe(legacyBox, {
      childList: true,
      characterData: true,
      subtree: true
    });

    return true;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
    return true;
  }

  return install();
}
