// WAFT tactical signature VFX.
//
// Specials here communicate a tactical state change or an attack pattern that
// carries an important secondary meaning: multi-arm pressure, toxin injection,
// action suppression, or a defensive retreat/reflect stance.

const STYLE_ID = "waft-tactical-signature-vfx-styles";

const TACTICAL_SIGNATURES = Object.freeze({
  "Tentacle Storm": {
    kind: "tentacle-storm",
    focus: "target",
    duration: 940
  },
  "Neurotoxic Injection (Tetrodotoxin)": {
    kind: "neurotoxic-injection",
    focus: "target",
    duration: 900
  },
  Mutilation: {
    kind: "mutilation",
    focus: "target",
    duration: 900
  },
  "Ancestral Retreat": {
    kind: "ancestral-retreat",
    focus: "actor",
    duration: 960
  }
});

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .waft-tactical-vfx-local {
      position: absolute;
      inset: 0;
      z-index: 75;
      overflow: hidden;
      border-radius: inherit;
      pointer-events: none;
    }

    .waft-tactical-vfx-local.tentacle-storm {
      background: radial-gradient(circle at 50% 50%, rgba(104,74,159,.18), rgba(25,15,48,.22) 56%, transparent 76%);
      animation: waft-tactical-storm-pulse 940ms ease-out forwards;
    }

    .waft-tactical-tentacle {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 68%;
      height: 18px;
      border-radius: 999px 55% 55% 999px;
      background: linear-gradient(90deg, transparent, rgba(211,177,255,.25) 16%, rgba(165,105,232,.94) 52%, rgba(234,214,255,.88));
      box-shadow: 0 0 13px rgba(172,111,235,.58);
      transform-origin: 0 50%;
      opacity: 0;
      animation: waft-tactical-tentacle-sweep 480ms cubic-bezier(.16,.82,.22,1) forwards;
    }

    .waft-tactical-vfx-local.neurotoxic-injection {
      background: radial-gradient(circle at 50% 50%, rgba(94,255,158,.20), rgba(18,71,46,.23) 48%, transparent 72%);
      animation: waft-tactical-toxin-pulse 900ms ease-out forwards;
    }

    .waft-tactical-needle {
      position: absolute;
      left: -16%;
      top: 48%;
      width: 82%;
      height: 7px;
      border-radius: 999px;
      background: linear-gradient(90deg, transparent 0 12%, rgba(231,255,242,.98) 30%, rgba(111,255,166,.96) 82%, rgba(243,255,248,.98) 100%);
      box-shadow: 0 0 18px rgba(89,255,154,.78);
      transform: rotate(-12deg) scaleX(.16);
      transform-origin: 100% 50%;
      animation: waft-tactical-needle-strike 650ms cubic-bezier(.12,.86,.18,1) forwards;
    }

    .waft-tactical-toxin-ring {
      position: absolute;
      left: 56%;
      top: 49%;
      width: 20%;
      aspect-ratio: 1;
      border-radius: 50%;
      border: 4px solid rgba(137,255,178,.88);
      box-shadow: 0 0 18px rgba(72,246,137,.62);
      transform: translate(-50%, -50%) scale(.1);
      opacity: 0;
      animation: waft-tactical-toxin-ring 650ms ease-out forwards;
    }

    .waft-tactical-toxin-particle {
      position: absolute;
      left: 56%;
      top: 49%;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(150,255,181,.96);
      box-shadow: 0 0 8px rgba(78,240,137,.74);
      opacity: 0;
      animation: waft-tactical-toxin-particle 650ms ease-out forwards;
    }

    .waft-tactical-vfx-local.mutilation {
      background: radial-gradient(circle at 50% 50%, rgba(173,26,52,.22), rgba(58,8,20,.26) 55%, transparent 76%);
      animation: waft-tactical-mutilation-pulse 900ms ease-out forwards;
    }

    .waft-tactical-mutilation-slash {
      position: absolute;
      left: 13%;
      top: 50%;
      width: 74%;
      height: 9px;
      border-radius: 999px;
      background: linear-gradient(90deg, transparent, rgba(255,215,218,.95), rgba(227,38,68,.98), transparent);
      box-shadow: 0 0 16px rgba(221,31,62,.70);
      opacity: 0;
      animation: waft-tactical-mutilation-slash 540ms cubic-bezier(.16,.82,.22,1) forwards;
    }

    .waft-tactical-lock {
      position: absolute;
      left: 50%;
      bottom: 17%;
      width: 42px;
      height: 34px;
      border: 5px solid rgba(255,184,194,.92);
      border-radius: 7px;
      transform: translateX(-50%) scale(.25);
      opacity: 0;
      box-shadow: 0 0 13px rgba(226,53,77,.64);
      animation: waft-tactical-lock 620ms ease-out 160ms forwards;
    }

    .waft-tactical-lock::before {
      content: "";
      position: absolute;
      left: 50%;
      top: -28px;
      width: 25px;
      height: 27px;
      border: 5px solid rgba(255,184,194,.92);
      border-bottom: 0;
      border-radius: 50% 50% 0 0;
      transform: translateX(-50%);
    }

    .waft-tactical-vfx-local.ancestral-retreat {
      background: radial-gradient(circle at 50% 55%, rgba(207,191,137,.24), rgba(70,61,33,.18) 48%, transparent 72%);
      animation: waft-tactical-retreat-pulse 960ms ease-out forwards;
    }

    .waft-tactical-shell {
      position: absolute;
      left: 50%;
      top: 51%;
      width: 66%;
      height: 52%;
      border-radius: 50% 50% 44% 44%;
      border: 6px solid rgba(230,211,149,.92);
      background:
        radial-gradient(circle at 50% 50%, transparent 0 22%, rgba(167,142,76,.28) 23% 27%, transparent 28% 39%, rgba(167,142,76,.28) 40% 44%, transparent 45%),
        rgba(77,69,40,.24);
      box-shadow:
        0 0 22px rgba(232,211,143,.48),
        inset 0 0 28px rgba(231,216,164,.22);
      transform: translate(-50%, -50%) scale(.25);
      opacity: 0;
      animation: waft-tactical-shell-close 820ms cubic-bezier(.18,.82,.2,1) forwards;
    }

    .waft-tactical-retreat-ring {
      position: absolute;
      left: 50%;
      top: 70%;
      width: 62%;
      height: 17%;
      border: 3px solid rgba(184,255,205,.78);
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(.3);
      opacity: 0;
      box-shadow: 0 0 13px rgba(112,231,155,.48);
      animation: waft-tactical-retreat-ring 760ms ease-out forwards;
    }

    .waft-tactical-reflect-chevron {
      position: absolute;
      left: 50%;
      top: 30%;
      width: 38%;
      height: 38%;
      border-left: 7px solid rgba(255,236,179,.88);
      border-top: 7px solid rgba(255,236,179,.88);
      transform: translate(-50%, -50%) rotate(45deg) scale(.2);
      opacity: 0;
      filter: drop-shadow(0 0 8px rgba(241,213,134,.58));
      animation: waft-tactical-reflect 660ms ease-out 180ms forwards;
    }

    @keyframes waft-tactical-storm-pulse {
      0% { opacity: 0; filter: brightness(1); }
      22% { opacity: 1; filter: brightness(1.22); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-tactical-tentacle-sweep {
      0% { opacity: 0; transform: rotate(var(--rotation)) translateX(-18%) scaleX(.15) scaleY(.55); }
      28% { opacity: 1; transform: rotate(var(--rotation)) translateX(-3%) scaleX(1) scaleY(1); }
      100% { opacity: 0; transform: rotate(var(--rotation)) translateX(18%) scaleX(1.12) scaleY(.72); }
    }

    @keyframes waft-tactical-toxin-pulse {
      0% { opacity: 0; filter: brightness(1); }
      24% { opacity: 1; filter: brightness(1.3) saturate(1.3); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-tactical-needle-strike {
      0% { opacity: 0; transform: rotate(-12deg) scaleX(.12); }
      28% { opacity: 1; transform: rotate(-12deg) scaleX(1.04); }
      68% { opacity: .94; transform: rotate(-12deg) scaleX(.96); }
      100% { opacity: 0; transform: rotate(-12deg) scaleX(.72); }
    }

    @keyframes waft-tactical-toxin-ring {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(.1); }
      32% { opacity: .95; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(2.7); }
    }

    @keyframes waft-tactical-toxin-particle {
      0% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--rotation)) translateX(0) scale(.4); }
      28% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--rotation)) translateX(var(--distance)) scale(1.2); }
    }

    @keyframes waft-tactical-mutilation-pulse {
      0% { opacity: 0; filter: brightness(1); }
      22% { opacity: 1; filter: brightness(1.38) contrast(1.08); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-tactical-mutilation-slash {
      0% { opacity: 0; transform: rotate(var(--rotation)) scaleX(.08); }
      26% { opacity: 1; transform: rotate(var(--rotation)) scaleX(1.05); }
      100% { opacity: 0; transform: rotate(var(--rotation)) scaleX(1.18); }
    }

    @keyframes waft-tactical-lock {
      0% { opacity: 0; transform: translateX(-50%) scale(.25); }
      35% { opacity: .95; transform: translateX(-50%) scale(1.08); }
      100% { opacity: 0; transform: translateX(-50%) scale(.92); }
    }

    @keyframes waft-tactical-retreat-pulse {
      0% { opacity: 0; filter: brightness(1); }
      25% { opacity: 1; filter: brightness(1.24); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-tactical-shell-close {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(.22) rotate(-7deg); }
      30% { opacity: .96; transform: translate(-50%, -50%) scale(1.04) rotate(1deg); }
      78% { opacity: .9; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(.96); }
    }

    @keyframes waft-tactical-retreat-ring {
      0% { opacity: 0; transform: translate(-50%, 25%) scale(.3); }
      28% { opacity: .9; }
      100% { opacity: 0; transform: translate(-50%, -230%) scale(1.05); }
    }

    @keyframes waft-tactical-reflect {
      0% { opacity: 0; transform: translate(-50%, -50%) rotate(45deg) scale(.2); }
      34% { opacity: .9; transform: translate(-50%, -50%) rotate(45deg) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -78%) rotate(45deg) scale(1.25); }
    }

    @media (prefers-reduced-motion: reduce) {
      .waft-tactical-vfx-local,
      .waft-tactical-vfx-local * {
        animation-duration: 1ms !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sideFromIdentity(id, name, context = {}) {
  if (id && context.playerId && id === context.playerId) return "player";
  if (id && context.enemyId && id === context.enemyId) return "enemy";
  if (name && context.playerName && name === context.playerName) return "player";
  if (name && context.enemyName && name === context.enemyName) return "enemy";
  return null;
}

function actorSide(event, context = {}) {
  return sideFromIdentity(event?.actorId, event?.actorName, context) || context.defaultSide || "player";
}

function targetSide(event, context = {}) {
  return sideFromIdentity(event?.targetId, event?.targetName, context) ||
    (actorSide(event, context) === "player" ? "enemy" : "player");
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

function createLocalLayer(wrap, kind) {
  if (!wrap) return null;

  if (getComputedStyle(wrap).position === "static") {
    wrap.style.position = "relative";
  }

  const layer = document.createElement("div");
  layer.className = `waft-tactical-vfx-local ${kind}`;
  wrap.appendChild(layer);
  return layer;
}

function populateTentacleStorm(layer) {
  const rotations = [-58, -40, -23, -8, 10, 27, 44, 61];
  rotations.forEach((rotation, index) => {
    const tentacle = document.createElement("div");
    tentacle.className = "waft-tactical-tentacle";
    tentacle.style.setProperty("--rotation", `${rotation}deg`);
    tentacle.style.animationDelay = `${index * 58}ms`;
    layer.appendChild(tentacle);
  });
}

function populateNeurotoxicInjection(layer) {
  const needle = document.createElement("div");
  needle.className = "waft-tactical-needle";
  layer.appendChild(needle);

  const ring = document.createElement("div");
  ring.className = "waft-tactical-toxin-ring";
  ring.style.animationDelay = "140ms";
  layer.appendChild(ring);

  for (let i = 0; i < 10; i += 1) {
    const particle = document.createElement("div");
    particle.className = "waft-tactical-toxin-particle";
    particle.style.setProperty("--rotation", `${i * 36}deg`);
    particle.style.setProperty("--distance", `${44 + (i % 3) * 16}px`);
    particle.style.animationDelay = `${160 + (i % 5) * 35}ms`;
    layer.appendChild(particle);
  }
}

function populateMutilation(layer) {
  [-22, 0, 22].forEach((rotation, index) => {
    const slash = document.createElement("div");
    slash.className = "waft-tactical-mutilation-slash";
    slash.style.setProperty("--rotation", `${rotation}deg`);
    slash.style.top = `${40 + index * 10}%`;
    slash.style.animationDelay = `${index * 95}ms`;
    layer.appendChild(slash);
  });

  const lock = document.createElement("div");
  lock.className = "waft-tactical-lock";
  layer.appendChild(lock);
}

function populateAncestralRetreat(layer) {
  const shell = document.createElement("div");
  shell.className = "waft-tactical-shell";
  layer.appendChild(shell);

  for (let i = 0; i < 3; i += 1) {
    const ring = document.createElement("div");
    ring.className = "waft-tactical-retreat-ring";
    ring.style.animationDelay = `${i * 90}ms`;
    layer.appendChild(ring);
  }

  const reflect = document.createElement("div");
  reflect.className = "waft-tactical-reflect-chevron";
  layer.appendChild(reflect);
}

export function getTacticalSignatureVfxDefinition(specialName) {
  const definition = TACTICAL_SIGNATURES[specialName];
  return definition ? { ...definition } : null;
}

export async function playTacticalSignatureVfx(event, context = {}) {
  if (typeof document === "undefined") return false;

  const definition = getTacticalSignatureVfxDefinition(event?.specialName);
  if (!definition) return false;

  ensureStyles();
  const side = definition.focus === "target"
    ? targetSide(event, context)
    : actorSide(event, context);
  const layer = createLocalLayer(getWrap(side, context), definition.kind);
  if (!layer) return false;

  if (definition.kind === "tentacle-storm") populateTentacleStorm(layer);
  if (definition.kind === "neurotoxic-injection") populateNeurotoxicInjection(layer);
  if (definition.kind === "mutilation") populateMutilation(layer);
  if (definition.kind === "ancestral-retreat") populateAncestralRetreat(layer);

  window.setTimeout(() => layer.remove(), definition.duration + 140);
  await delay(definition.duration);
  return true;
}
