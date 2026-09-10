// WAFT shared battle VFX layer.
// Visual feedback is driven by structured turn events, not by UI-specific logs.

import { TURN_EVENT } from "./battle-turn-sequence.js";
import { playSignatureCataloguesVfx } from "./battle-vfx-signature-catalogues.js";
import { playAppliedStatusVfx } from "./battle-vfx-statuses.js";

const STYLE_ID = "waft-battle-vfx-styles";

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .waft-vfx-anchor {
      position: relative !important;
      overflow: visible !important;
    }

    .waft-vfx-float {
      position: absolute;
      left: 50%;
      top: 34%;
      z-index: 80;
      transform: translate(-50%, 0);
      pointer-events: none;
      font-family: inherit;
      font-weight: 950;
      letter-spacing: .03em;
      text-align: center;
      text-shadow: 0 2px 10px rgba(0,0,0,.9);
      animation: waft-vfx-float 850ms ease-out forwards;
      white-space: nowrap;
    }

    .waft-vfx-float.normal { font-size: 22px; }
    .waft-vfx-float.major { font-size: 28px; }
    .waft-vfx-float.quiet { font-size: 16px; opacity: .86; }

    .waft-vfx-special-banner {
      position: fixed;
      left: 50%;
      top: 20%;
      z-index: 9999;
      min-width: min(84vw, 430px);
      transform: translate(-50%, -12px) scale(.96);
      padding: 11px 18px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.24);
      background: rgba(5,8,14,.92);
      color: #fff;
      text-align: center;
      pointer-events: none;
      box-shadow: 0 18px 60px rgba(0,0,0,.45);
      animation: waft-vfx-banner 900ms ease-out forwards;
    }

    .waft-vfx-special-kicker {
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .18em;
      text-transform: uppercase;
      opacity: .7;
    }

    .waft-vfx-special-name {
      margin-top: 3px;
      font-size: 22px;
      font-weight: 950;
      line-height: 1.05;
    }

    .waft-vfx-hit { animation: waft-vfx-hit 260ms ease-out; }
    .waft-vfx-critical { animation: waft-vfx-critical 420ms cubic-bezier(.2,.8,.2,1); }
    .waft-vfx-heal { animation: waft-vfx-heal 520ms ease-out; }
    .waft-vfx-dodge { animation: waft-vfx-dodge 360ms ease-out; }
    .waft-vfx-status { animation: waft-vfx-status 480ms ease-out; }

    .waft-vfx-screen-flash {
      position: fixed;
      inset: 0;
      z-index: 9998;
      pointer-events: none;
      background: rgba(255,255,255,.34);
      animation: waft-vfx-screen-flash 180ms ease-out forwards;
    }

    @keyframes waft-vfx-float {
      0% { opacity: 0; transform: translate(-50%, 12px) scale(.8); }
      20% { opacity: 1; transform: translate(-50%, 0) scale(1.08); }
      100% { opacity: 0; transform: translate(-50%, -42px) scale(1); }
    }

    @keyframes waft-vfx-banner {
      0% { opacity: 0; transform: translate(-50%, -12px) scale(.96); }
      14% { opacity: 1; transform: translate(-50%, 0) scale(1); }
      72% { opacity: 1; transform: translate(-50%, 0) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -8px) scale(1.02); }
    }

    @keyframes waft-vfx-hit {
      0%,100% { transform: translate(0,0); filter: brightness(1); }
      35% { transform: translate(-5px,2px); filter: brightness(1.45); }
      65% { transform: translate(4px,-1px); }
    }

    @keyframes waft-vfx-critical {
      0%,100% { transform: translate(0,0) scale(1); filter: brightness(1); }
      18% { transform: translate(-10px,4px) scale(1.035); filter: brightness(1.8) contrast(1.2); }
      38% { transform: translate(9px,-4px) scale(.985); }
      58% { transform: translate(-6px,2px) scale(1.015); }
      78% { transform: translate(4px,-1px) scale(1); }
    }

    @keyframes waft-vfx-heal {
      0%,100% { filter: brightness(1); transform: scale(1); }
      50% { filter: brightness(1.35) saturate(1.2); transform: scale(1.015); }
    }

    @keyframes waft-vfx-dodge {
      0%,100% { transform: translateX(0); }
      35% { transform: translateX(18px); }
      65% { transform: translateX(-4px); }
    }

    @keyframes waft-vfx-status {
      0%,100% { filter: brightness(1); }
      45% { filter: brightness(1.4) saturate(1.45); }
    }

    @keyframes waft-vfx-screen-flash {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .waft-vfx-float,
      .waft-vfx-special-banner,
      .waft-vfx-hit,
      .waft-vfx-critical,
      .waft-vfx-heal,
      .waft-vfx-dodge,
      .waft-vfx-status,
      .waft-vfx-screen-flash {
        animation-duration: 1ms !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getWrap(side, context = {}) {
  if (typeof context.getWrap === "function") {
    const custom = context.getWrap(side);
    if (custom) return custom;
  }

  if (context.wraps?.[side]) {
    return context.wraps[side];
  }

  const id = side === "player" ? "playerImageWrap" : "enemyImageWrap";
  return document.getElementById(id);
}

function sideFromFighterId(fighterId, context = {}) {
  if (!fighterId) return null;
  if (context.playerId && fighterId === context.playerId) return "player";
  if (context.enemyId && fighterId === context.enemyId) return "enemy";
  return null;
}

function sideFromFighterName(fighterName, context = {}) {
  if (!fighterName) return null;
  if (context.playerName && fighterName === context.playerName) return "player";
  if (context.enemyName && fighterName === context.enemyName) return "enemy";
  return null;
}

function eventPrefersActor(event) {
  return [
    TURN_EVENT.HEAL,
    TURN_EVENT.BUFF,
    TURN_EVENT.SPECIAL,
    TURN_EVENT.PASSIVE
  ].includes(event?.type);
}

function sideForEvent(event, context = {}) {
  const actorSide = sideFromFighterId(event?.actorId, context) || sideFromFighterName(event?.actorName, context);
  const targetSide = sideFromFighterId(event?.targetId, context) || sideFromFighterName(event?.targetName, context);

  if (eventPrefersActor(event)) {
    return actorSide || targetSide || context.defaultSide || "enemy";
  }

  return targetSide || actorSide || context.defaultSide || "enemy";
}

function addClassBriefly(element, className, duration) {
  if (!element) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), duration);
}

function floatingText(wrap, text, emphasis = "normal") {
  if (!wrap || !text) return;
  wrap.classList.add("waft-vfx-anchor");

  const el = document.createElement("div");
  el.className = `waft-vfx-float ${emphasis}`;
  el.textContent = text;
  wrap.appendChild(el);
  window.setTimeout(() => el.remove(), 950);
}

function screenFlash() {
  const flash = document.createElement("div");
  flash.className = "waft-vfx-screen-flash";
  document.body.appendChild(flash);
  window.setTimeout(() => flash.remove(), 220);
}

function specialBanner(name) {
  const banner = document.createElement("div");
  banner.className = "waft-vfx-special-banner";
  banner.innerHTML = `
    <div class="waft-vfx-special-kicker">SPECIAL</div>
    <div class="waft-vfx-special-name"></div>
  `;
  banner.querySelector(".waft-vfx-special-name").textContent = name || "Special Attack";
  document.body.appendChild(banner);
  window.setTimeout(() => banner.remove(), 1000);
}

export function getBattleVfxCue(event, context = {}) {
  const side = sideForEvent(event, context);

  switch (event?.type) {
    case TURN_EVENT.CRITICAL:
      return { side, className: "waft-vfx-critical", text: `CRITICAL -${event.amount ?? ""}`.trim(), emphasis: "major", flash: true, duration: 430 };
    case TURN_EVENT.HIT:
    case TURN_EVENT.DAMAGE:
      return { side, className: "waft-vfx-hit", text: event.amount != null ? `-${event.amount}` : "HIT", emphasis: "normal", duration: 280 };
    case TURN_EVENT.MISS:
      return { side, className: "waft-vfx-dodge", text: "MISS", emphasis: "normal", duration: 370 };
    case TURN_EVENT.HEAL:
      return { side, className: "waft-vfx-heal", text: `+${event.amount ?? ""} HP`.trim(), emphasis: "normal", duration: 530 };
    case TURN_EVENT.STATUS_APPLIED:
      return { side, className: "waft-vfx-status", text: event.statusName || "STATUS", emphasis: "quiet", duration: 490 };
    case TURN_EVENT.BUFF:
      return { side, className: "waft-vfx-status", text: "BUFF ↑", emphasis: "quiet", duration: 490 };
    case TURN_EVENT.DEBUFF:
      return { side, className: "waft-vfx-status", text: "DEBUFF ↓", emphasis: "quiet", duration: 490 };
    case TURN_EVENT.KO:
      return { side, className: "waft-vfx-critical", text: "K.O.", emphasis: "major", flash: true, duration: 650 };
    case TURN_EVENT.SPECIAL:
      return { side, special: event.specialName || "Special Attack", duration: 720 };
    default:
      return null;
  }
}

export async function playBattleEventVfx(event, context = {}) {
  ensureStyles();
  const cue = getBattleVfxCue(event, context);
  if (!cue) return false;

  if (cue.special) {
    specialBanner(cue.special);

    // All ability-specific presentation now lives behind one catalogue entry
    // point. New VFX families no longer require edits to this central pipeline.
    await Promise.all([
      delay(cue.duration || 720),
      playSignatureCataloguesVfx(event, context)
    ]);
    return true;
  }

  const wrap = getWrap(cue.side, context);
  if (cue.flash) screenFlash();
  if (cue.className) addClassBriefly(wrap, cue.className, cue.duration || 350);
  if (cue.text) floatingText(wrap, cue.text, cue.emphasis || "normal");

  const supplemental = event?.type === TURN_EVENT.STATUS_APPLIED
    ? playAppliedStatusVfx(event, context)
    : Promise.resolve(false);

  await Promise.all([
    delay(Math.min(cue.duration || 300, 420)),
    supplemental
  ]);
  return true;
}

export async function playBattlePhaseVfx(phase, context = {}, options = {}) {
  const events = Array.isArray(phase?.events) ? phase.events : [];
  const gap = options.gap ?? 90;

  for (const event of events) {
    const played = await playBattleEventVfx(event, context);
    if (played && gap > 0) await delay(gap);
  }
}

export async function playTurnSequenceVfx(sequence, context = {}, options = {}) {
  if (!sequence) return;
  const phases = Array.isArray(sequence.phases) ? sequence.phases : [];
  const phaseGap = options.phaseGap ?? 120;

  for (const phase of phases) {
    await playBattlePhaseVfx(phase, context, options);
    if (phaseGap > 0) await delay(phaseGap);
  }
}
