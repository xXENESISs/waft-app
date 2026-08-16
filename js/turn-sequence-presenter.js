// Sequential presenter shared by every WAFT battle mode.
// Reveals one resolved phase at a time while its VFX plays, then leaves the
// complete compact round summary visible.

import { renderTurnSummaryV2 } from "./turn-summary-v2.js";
import { playBattlePhaseVfx } from "./battle-vfx.js";

const TOKENS = new Map();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextToken(boxId) {
  const token = (TOKENS.get(boxId) || 0) + 1;
  TOKENS.set(boxId, token);
  return token;
}

function isCurrent(boxId, token) {
  return TOKENS.get(boxId) === token;
}

export function cancelTurnSequencePresentation(boxId = "turnSummaryV2Host") {
  nextToken(boxId);
}

export async function presentTurnSequenceV2(sequence, options = {}) {
  if (!sequence) return false;

  const boxId = options.boxId || "turnSummaryV2Host";
  const phases = Array.isArray(sequence.phases) ? sequence.phases : [];
  const vfxContext = options.vfxContext || {};
  const eventGap = options.eventGap ?? 70;
  const phaseGap = options.phaseGap ?? 110;
  const playVfx = options.playVfx !== false;
  const token = nextToken(boxId);

  renderTurnSummaryV2(sequence, {
    boxId,
    visiblePhaseCount: 0,
    activePhaseIndex: -1
  });

  if (!phases.length) return true;

  for (let index = 0; index < phases.length; index += 1) {
    if (!isCurrent(boxId, token)) return false;

    renderTurnSummaryV2(sequence, {
      boxId,
      visiblePhaseCount: index + 1,
      activePhaseIndex: index
    });

    const box = document.getElementById(boxId);
    const activePhase = box?.querySelector(`[data-turn-phase-index="${index}"]`);
    activePhase?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });

    if (playVfx) {
      await playBattlePhaseVfx(phases[index], vfxContext, { gap: eventGap });
    }

    if (!isCurrent(boxId, token)) return false;

    if (phaseGap > 0 && index < phases.length - 1) {
      await delay(phaseGap);
    }
  }

  if (!isCurrent(boxId, token)) return false;

  renderTurnSummaryV2(sequence, {
    boxId,
    visiblePhaseCount: phases.length,
    activePhaseIndex: -1
  });

  return true;
}
