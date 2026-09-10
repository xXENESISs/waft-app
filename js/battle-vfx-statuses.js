// WAFT applied-status VFX.
//
// Persistent state remains in battle-status-hud.js. This module is only the
// short visual hit that tells the player what kind of condition was just
// applied, without making them read the log.

const STYLE_ID = "waft-status-application-vfx-styles";

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .waft-status-application {
      position: absolute;
      inset: 0;
      z-index: 76;
      pointer-events: none;
      overflow: hidden;
      border-radius: inherit;
    }

    .waft-status-application.toxin {
      background: radial-gradient(circle at 50% 55%, rgba(94,205,94,.20), rgba(57,20,91,.18), transparent 68%);
      animation: waft-status-toxin-pulse 620ms ease-out forwards;
    }

    .waft-status-bubble {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid rgba(184,255,153,.86);
      box-shadow: 0 0 10px rgba(101,255,127,.55);
      animation: waft-status-bubble 560ms ease-out forwards;
    }

    .waft-status-application.bleed {
      background: radial-gradient(circle at 50% 48%, rgba(194,20,44,.08), rgba(89,0,13,.38));
      animation: waft-status-bleed-pulse 620ms ease-out forwards;
    }

    .waft-status-drop {
      position: absolute;
      width: 7px;
      height: 15px;
      border-radius: 60% 60% 70% 70% / 70% 70% 40% 40%;
      background: rgba(220,45,62,.9);
      box-shadow: 0 0 9px rgba(211,31,51,.5);
      animation: waft-status-drop 560ms ease-in forwards;
    }

    .waft-status-application.blindness {
      background: linear-gradient(90deg, rgba(0,0,0,.15), rgba(0,0,0,.82) 48%, rgba(0,0,0,.15));
      animation: waft-status-blindness 700ms ease-out forwards;
    }

    .waft-status-application.blindness::before,
    .waft-status-application.blindness::after {
      content: "";
      position: absolute;
      left: 16%;
      width: 68%;
      height: 3px;
      top: 49%;
      border-radius: 999px;
      background: rgba(230,235,245,.7);
      box-shadow: 0 0 14px rgba(255,255,255,.22);
      transform: rotate(12deg) scaleX(.2);
      animation: waft-status-eye-slash 650ms ease-out forwards;
    }

    .waft-status-application.blindness::after {
      transform: rotate(-12deg) scaleX(.2);
    }

    .waft-status-application.perforation::before,
    .waft-status-application.perforation::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: 18%;
      aspect-ratio: 1;
      border-radius: 50%;
      border: 4px solid rgba(255,244,209,.9);
      box-shadow: 0 0 18px rgba(255,198,78,.55);
      transform: translate(-50%, -50%) scale(.2);
      animation: waft-status-perforation-ring 600ms cubic-bezier(.2,.8,.2,1) forwards;
    }

    .waft-status-application.perforation::after {
      animation-delay: 80ms;
    }

    .waft-status-application.stat-down {
      background: linear-gradient(180deg, rgba(232,79,79,.18), transparent 55%);
      animation: waft-status-stat-down-layer 600ms ease-out forwards;
    }

    .waft-status-chevron {
      position: absolute;
      left: var(--waft-chevron-left, 50%);
      top: 12%;
      width: 16px;
      height: 16px;
      border-right: 4px solid rgba(255,113,113,.92);
      border-bottom: 4px solid rgba(255,113,113,.92);
      transform: rotate(45deg);
      animation: waft-status-chevron-down 560ms ease-in forwards;
    }

    @keyframes waft-status-toxin-pulse {
      0% { opacity: 0; filter: saturate(1); }
      28% { opacity: 1; filter: saturate(1.5); }
      100% { opacity: 0; filter: saturate(1); }
    }

    @keyframes waft-status-bubble {
      0% { opacity: 0; transform: translateY(30px) scale(.4); }
      20% { opacity: 1; }
      100% { opacity: 0; transform: translateY(-72px) scale(1.45); }
    }

    @keyframes waft-status-bleed-pulse {
      0% { opacity: 0; }
      28% { opacity: 1; }
      100% { opacity: 0; }
    }

    @keyframes waft-status-drop {
      0% { opacity: 0; transform: translateY(-16px) scale(.7); }
      18% { opacity: 1; }
      100% { opacity: 0; transform: translateY(74px) scale(1); }
    }

    @keyframes waft-status-blindness {
      0% { opacity: 0; }
      25% { opacity: 1; }
      72% { opacity: .9; }
      100% { opacity: 0; }
    }

    @keyframes waft-status-eye-slash {
      0% { opacity: 0; transform: rotate(12deg) scaleX(.2); }
      28% { opacity: 1; transform: rotate(12deg) scaleX(1); }
      100% { opacity: 0; transform: rotate(12deg) scaleX(1.15); }
    }

    @keyframes waft-status-perforation-ring {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(.2); }
      28% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(2.4); }
    }

    @keyframes waft-status-stat-down-layer {
      0% { opacity: 0; }
      28% { opacity: 1; }
      100% { opacity: 0; }
    }

    @keyframes waft-status-chevron-down {
      0% { opacity: 0; transform: translateY(-18px) rotate(45deg) scale(.7); }
      20% { opacity: 1; }
      100% { opacity: 0; transform: translateY(92px) rotate(45deg) scale(1.05); }
    }

    @media (prefers-reduced-motion: reduce) {
      .waft-status-application,
      .waft-status-application * {
        animation-duration: 1ms !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeStatusName(statusName) {
  return String(statusName || "").trim().toLowerCase();
}

export function getAppliedStatusVfxDefinition(statusName) {
  const name = normalizeStatusName(statusName);
  if (!name) return null;

  if (/poison|toxin|tetrodotoxin|neurotoxic/.test(name)) {
    return { kind: "toxin", duration: 620 };
  }

  if (/bleed|mutilation/.test(name)) {
    return { kind: "bleed", duration: 620 };
  }

  if (/blind|vision/.test(name)) {
    return { kind: "blindness", duration: 700 };
  }

  if (/perforation/.test(name)) {
    return { kind: "perforation", duration: 600 };
  }

  if (/down|debuff|pressure/.test(name)) {
    return { kind: "stat-down", duration: 600 };
  }

  return null;
}

function sideFromIdentity(id, name, context = {}) {
  if (id && context.playerId && id === context.playerId) return "player";
  if (id && context.enemyId && id === context.enemyId) return "enemy";
  if (name && context.playerName && name === context.playerName) return "player";
  if (name && context.enemyName && name === context.enemyName) return "enemy";
  return null;
}

function getWrap(side, context = {}) {
  if (typeof context.getWrap === "function") {
    const custom = context.getWrap(side);
    if (custom) return custom;
  }

  if (context.wraps?.[side]) return context.wraps[side];
  const id = side === "player" ? "playerImageWrap" : "enemyImageWrap";
  return document.getElementById(id);
}

function targetWrap(event, context = {}) {
  const targetSide = sideFromIdentity(event?.targetId, event?.targetName, context);
  if (targetSide) return getWrap(targetSide, context);

  const actorSide = sideFromIdentity(event?.actorId, event?.actorName, context);
  if (actorSide === "player") return getWrap("enemy", context);
  if (actorSide === "enemy") return getWrap("player", context);
  return getWrap(context.defaultSide || "enemy", context);
}

function createLayer(wrap, kind) {
  if (!wrap) return null;

  if (getComputedStyle(wrap).position === "static") {
    wrap.style.position = "relative";
  }

  const layer = document.createElement("div");
  layer.className = `waft-status-application ${kind}`;
  wrap.appendChild(layer);
  return layer;
}

function populateToxin(layer) {
  for (let i = 0; i < 8; i += 1) {
    const bubble = document.createElement("div");
    bubble.className = "waft-status-bubble";
    bubble.style.left = `${14 + ((i * 19) % 72)}%`;
    bubble.style.top = `${50 + ((i * 13) % 32)}%`;
    bubble.style.animationDelay = `${(i % 4) * 45}ms`;
    layer.appendChild(bubble);
  }
}

function populateBleed(layer) {
  for (let i = 0; i < 6; i += 1) {
    const drop = document.createElement("div");
    drop.className = "waft-status-drop";
    drop.style.left = `${24 + ((i * 17) % 52)}%`;
    drop.style.top = `${28 + ((i * 11) % 22)}%`;
    drop.style.animationDelay = `${(i % 3) * 60}ms`;
    layer.appendChild(drop);
  }
}

function populateStatDown(layer) {
  [28, 50, 72].forEach((left, index) => {
    const chevron = document.createElement("div");
    chevron.className = "waft-status-chevron";
    chevron.style.setProperty("--waft-chevron-left", `${left}%`);
    chevron.style.animationDelay = `${index * 55}ms`;
    layer.appendChild(chevron);
  });
}

export async function playAppliedStatusVfx(event, context = {}) {
  if (typeof document === "undefined") return false;

  const definition = getAppliedStatusVfxDefinition(event?.statusName);
  if (!definition) return false;

  ensureStyles();
  const layer = createLayer(targetWrap(event, context), definition.kind);
  if (!layer) return false;

  if (definition.kind === "toxin") populateToxin(layer);
  if (definition.kind === "bleed") populateBleed(layer);
  if (definition.kind === "stat-down") populateStatDown(layer);

  window.setTimeout(() => layer.remove(), definition.duration + 100);
  await delay(definition.duration);
  return true;
}
