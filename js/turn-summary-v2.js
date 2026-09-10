// WAFT Turn Summary V2
// Compact, ordered, Pokemon-style presentation for battle turn sequences.

import { TURN_PHASE, TURN_EVENT, getActionLabel } from "./battle-turn-sequence.js";

const STYLE_ID = "waft-turn-summary-v2-styles";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .waft-turn-v2 {
      display: grid;
      gap: 10px;
      font-family: inherit;
      color: #f8fafc;
    }

    .waft-turn-v2-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(255,255,255,.055);
      border: 1px solid rgba(255,255,255,.08);
    }

    .waft-turn-v2-round {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .12em;
      text-transform: uppercase;
      opacity: .85;
    }

    .waft-turn-v2-order {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 5px;
      font-size: 10px;
      opacity: .78;
    }

    .waft-turn-v2-order span {
      padding: 3px 6px;
      border-radius: 999px;
      background: rgba(255,255,255,.07);
    }

    .waft-turn-v2-phase {
      border-radius: 12px;
      padding: 10px;
      background: rgba(8,12,20,.62);
      border: 1px solid rgba(255,255,255,.07);
      overflow: hidden;
      transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
    }

    .waft-turn-v2-phase.action-phase {
      border-color: rgba(255,255,255,.11);
    }

    .waft-turn-v2-phase.active-phase {
      border-color: rgba(245,158,11,.55);
      background: rgba(36,27,10,.72);
      transform: translateY(-1px);
      box-shadow: 0 0 18px rgba(245,158,11,.09);
    }

    .waft-turn-v2-phase-title {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }

    .waft-turn-v2-actor {
      font-size: 14px;
      font-weight: 950;
    }

    .waft-turn-v2-action {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .06em;
      text-transform: uppercase;
      opacity: .68;
    }

    .waft-turn-v2-events {
      display: grid;
      gap: 6px;
    }

    .waft-turn-v2-event {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 28px;
      padding: 6px 8px;
      border-radius: 9px;
      background: rgba(255,255,255,.045);
      line-height: 1.25;
    }

    .waft-turn-v2-event.major {
      min-height: 34px;
      font-weight: 900;
      background: rgba(255,255,255,.085);
    }

    .waft-turn-v2-event.quiet {
      font-size: 10px;
      opacity: .7;
    }

    .waft-turn-v2-icon {
      width: 22px;
      flex: 0 0 22px;
      text-align: center;
      font-size: 16px;
    }

    .waft-turn-v2-copy {
      min-width: 0;
      flex: 1;
    }

    .waft-turn-v2-primary {
      font-size: 12px;
      font-weight: 850;
    }

    .waft-turn-v2-secondary {
      margin-top: 2px;
      font-size: 9px;
      opacity: .64;
    }

    .waft-turn-v2-empty {
      padding: 7px 8px;
      font-size: 10px;
      opacity: .55;
    }

    @media (max-width: 700px) {
      .waft-turn-v2 {
        gap: 7px;
      }

      .waft-turn-v2-header {
        align-items: flex-start;
        flex-direction: column;
        gap: 6px;
      }

      .waft-turn-v2-order {
        justify-content: flex-start;
        font-size: 9px;
      }

      .waft-turn-v2-phase {
        padding: 8px;
      }

      .waft-turn-v2-actor {
        font-size: 12px;
      }

      .waft-turn-v2-primary {
        font-size: 11px;
      }
    }
  `;

  document.head.appendChild(style);
}

function eventIcon(event) {
  switch (event?.type) {
    case TURN_EVENT.CRITICAL: return "💥";
    case TURN_EVENT.HIT:
    case TURN_EVENT.DAMAGE: return "⚔️";
    case TURN_EVENT.MISS: return "💨";
    case TURN_EVENT.HEAL: return "💚";
    case TURN_EVENT.STATUS_APPLIED: return "◉";
    case TURN_EVENT.STATUS_EXPIRED: return "○";
    case TURN_EVENT.BUFF: return "⬆️";
    case TURN_EVENT.DEBUFF: return "⬇️";
    case TURN_EVENT.SPECIAL: return "🔥";
    case TURN_EVENT.PASSIVE: return "✦";
    case TURN_EVENT.FIELD: return "🌍";
    case TURN_EVENT.KO: return "☠️";
    case TURN_EVENT.STAMINA: return "⚡";
    default: return "•";
  }
}

function parseCompactStatChange(event) {
  const line = String(event?.text || "");
  const match = line.match(/\breduc(?:es|ing)\s+(.+?)'s\s+(.+?)\s+by\s+(\d+)%\s+for\s+(\d+)\s+turn/i);
  if (!match) return null;

  const stats = match[2]
    .replace(/,\s*/g, " / ")
    .replace(/\s+and\s+/gi, " / ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return {
    targetName: match[1],
    stats,
    amount: Number(match[3]),
    turns: Number(match[4])
  };
}

function eventPrimary(event) {
  if (!event) return "";

  if (event.type === TURN_EVENT.CRITICAL) {
    return `CRITICAL · ${event.amount ?? "?"} DAMAGE`;
  }

  if (event.type === TURN_EVENT.HIT || event.type === TURN_EVENT.DAMAGE) {
    return event.amount != null ? `${event.amount} DAMAGE` : event.text;
  }

  if (event.type === TURN_EVENT.MISS) return "MISS";
  if (event.type === TURN_EVENT.HEAL) return `+${event.amount ?? "?"} HP`;
  if (event.type === TURN_EVENT.STATUS_APPLIED) return event.statusName || "STATUS APPLIED";
  if (event.type === TURN_EVENT.STATUS_EXPIRED) return "STATUS EXPIRED";
  if (event.type === TURN_EVENT.SPECIAL) return event.specialName || "SPECIAL";
  if (event.type === TURN_EVENT.KO) return "K.O.";

  if (event.type === TURN_EVENT.DEBUFF) {
    const compact = parseCompactStatChange(event);
    if (compact) {
      return `${compact.stats} -${compact.amount}% · ${compact.turns}T`;
    }
    return "DEBUFF";
  }

  if (event.type === TURN_EVENT.BUFF) return "BUFF";
  return event.text;
}

function eventSecondary(event) {
  if (!event) return "";

  if (event.type === TURN_EVENT.CRITICAL || event.type === TURN_EVENT.HIT) {
    return event.targetName ? `Target: ${event.targetName}` : "";
  }

  if (event.type === TURN_EVENT.DEBUFF) {
    const compact = parseCompactStatChange(event);
    return compact?.targetName ? `Target: ${compact.targetName}` : "";
  }

  return "";
}

function isRedundantStatusEvent(event, events) {
  if (event?.type !== TURN_EVENT.STATUS_APPLIED) return false;

  const statusName = String(event.statusName || "");
  if (!/(down|debuff)/i.test(statusName)) return false;

  const normalizedStatus = statusName
    .replace(/\b(down|debuff)\b/gi, "")
    .replace(/[^a-z]/gi, "")
    .toLowerCase();

  return events.some((candidate) => {
    if (candidate?.type !== TURN_EVENT.DEBUFF) return false;
    const compact = parseCompactStatChange(candidate);
    if (!compact) return false;

    if (!normalizedStatus) return true;
    const normalizedStats = compact.stats.replace(/[^a-z]/gi, "").toLowerCase();
    return normalizedStats.includes(normalizedStatus);
  });
}

function compactPhaseEvents(events) {
  const visible = events.filter((event) => event && event.type !== TURN_EVENT.INFO);
  return visible.filter((event) => !isRedundantStatusEvent(event, visible));
}

function renderEvent(event) {
  const primary = eventPrimary(event);
  const secondary = eventSecondary(event);
  const emphasis = event?.emphasis || "normal";

  return `
    <div class="waft-turn-v2-event ${escapeHtml(emphasis)}" data-event-type="${escapeHtml(event?.type || "info")}">
      <div class="waft-turn-v2-icon">${eventIcon(event)}</div>
      <div class="waft-turn-v2-copy">
        <div class="waft-turn-v2-primary">${escapeHtml(primary)}</div>
        ${secondary ? `<div class="waft-turn-v2-secondary">${escapeHtml(secondary)}</div>` : ""}
      </div>
    </div>
  `;
}

function phaseTitle(phase) {
  if (phase.type === TURN_PHASE.ROUND_START) {
    return { actor: "ROUND START", action: "Field & opening effects" };
  }

  if (phase.type === TURN_PHASE.ROUND_END) {
    return { actor: "ROUND END", action: "Residual effects & expirations" };
  }

  return {
    actor: phase.actorName || "Fighter",
    action: phase.actionLabel || getActionLabel(phase.action)
  };
}

function renderPhase(phase, index, activePhaseIndex) {
  const title = phaseTitle(phase);
  const events = Array.isArray(phase.events) ? phase.events : [];
  const visibleEvents = compactPhaseEvents(events);
  const fallbackEvents = visibleEvents.length > 0 ? visibleEvents : events.slice(0, 1);
  const activeClass = index === activePhaseIndex ? " active-phase" : "";

  return `
    <section class="waft-turn-v2-phase ${phase.type === TURN_PHASE.ACTION ? "action-phase" : "system-phase"}${activeClass}" data-turn-phase="${escapeHtml(phase.type)}" data-turn-phase-index="${index}">
      <div class="waft-turn-v2-phase-title">
        <div class="waft-turn-v2-actor">${escapeHtml(title.actor)}</div>
        <div class="waft-turn-v2-action">${escapeHtml(title.action)}</div>
      </div>
      <div class="waft-turn-v2-events">
        ${fallbackEvents.length > 0
          ? fallbackEvents.map(renderEvent).join("")
          : `<div class="waft-turn-v2-empty">No visible event.</div>`}
      </div>
    </section>
  `;
}

export function buildTurnSummaryV2Html(sequence, options = {}) {
  if (!sequence) {
    return `<div class="waft-turn-v2-empty">Waiting for the next round.</div>`;
  }

  const order = Array.isArray(sequence.order) ? sequence.order : [];
  const allPhases = Array.isArray(sequence.phases) ? sequence.phases : [];
  const visiblePhaseCount = Number.isFinite(options.visiblePhaseCount)
    ? Math.max(0, Math.min(allPhases.length, options.visiblePhaseCount))
    : allPhases.length;
  const activePhaseIndex = Number.isFinite(options.activePhaseIndex)
    ? options.activePhaseIndex
    : -1;
  const phases = allPhases.slice(0, visiblePhaseCount);

  const orderHtml = order.length
    ? order.map((entry) => `<span>${escapeHtml(entry.position)}. ${escapeHtml(entry.actorName)} · ${escapeHtml(entry.actionLabel)}</span>`).join("")
    : "";

  return `
    <div class="waft-turn-v2">
      <div class="waft-turn-v2-header">
        <div class="waft-turn-v2-round">ROUND ${escapeHtml(sequence.turn ?? "-")}</div>
        ${orderHtml ? `<div class="waft-turn-v2-order">${orderHtml}</div>` : ""}
      </div>
      ${phases.length
        ? phases.map((phase, index) => renderPhase(phase, index, activePhaseIndex)).join("")
        : `<div class="waft-turn-v2-empty">Resolving round…</div>`}
    </div>
  `;
}

export function renderTurnSummaryV2(sequence, options = {}) {
  ensureStyles();

  const boxId = options.boxId || "turnSummaryBox";
  const box = document.getElementById(boxId);
  if (!box) return false;

  box.innerHTML = buildTurnSummaryV2Html(sequence, options);
  box.dataset.turnSummaryVersion = "2";
  return true;
}

export function clearTurnSummaryV2(options = {}) {
  const boxId = options.boxId || "turnSummaryBox";
  const box = document.getElementById(boxId);
  if (!box) return false;

  box.innerHTML = "";
  box.dataset.turnSummaryVersion = "2";
  return true;
}
