// WAFT signature VFX registry.
//
// Universal battle feedback lives in battle-vfx.js. This module adds a second
// optional layer for specials whose identity deserves a distinctive visual
// language. It remains completely mode-agnostic: every battle page passes the
// same structured SPECIAL event and fighter context.

const STYLE_ID = "waft-signature-vfx-styles";

const SIGNATURE_VFX = Object.freeze({
  "Ink Sea": {
    kind: "ink-sea",
    focus: "screen",
    duration: 900
  },
  "Chain Reaction": {
    kind: "chain-reaction",
    focus: "screen",
    duration: 820
  },
  "Arctic Storm": {
    kind: "arctic-storm",
    focus: "screen",
    duration: 980
  },
  "Throat Bite": {
    kind: "throat-bite",
    focus: "target",
    duration: 620
  },
  "Bloody Gouging": {
    kind: "bloody-gouging",
    focus: "target",
    duration: 700
  },
  "Coconut Fortress": {
    kind: "coconut-fortress",
    focus: "actor",
    duration: 760
  },
  "Phantom Current": {
    kind: "phantom-current",
    focus: "actor",
    duration: 780
  },
  "Illusory Dance": {
    kind: "illusory-dance",
    focus: "actor",
    duration: 760
  },
  "Microecosystem Ancestral": {
    kind: "microecosystem",
    focus: "actor",
    duration: 920
  }
});

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .waft-signature-layer {
      position: fixed;
      inset: 0;
      z-index: 9997;
      pointer-events: none;
      overflow: hidden;
    }

    .waft-signature-local {
      position: absolute;
      inset: 0;
      z-index: 70;
      pointer-events: none;
      overflow: hidden;
      border-radius: inherit;
    }

    .waft-signature-layer.ink-sea {
      background:
        radial-gradient(circle at 18% 28%, rgba(27,18,54,.88), transparent 29%),
        radial-gradient(circle at 82% 62%, rgba(3,8,20,.94), transparent 35%),
        rgba(2,4,12,.52);
      animation: waft-signature-ink-layer 900ms ease-out forwards;
    }

    .waft-signature-ink-blob {
      position: absolute;
      width: 30vmax;
      aspect-ratio: 1;
      border-radius: 44% 56% 62% 38% / 45% 35% 65% 55%;
      background: rgba(9,6,24,.92);
      filter: blur(8px);
      animation: waft-signature-ink-blob 900ms cubic-bezier(.2,.8,.2,1) forwards;
    }

    .waft-signature-layer.chain-reaction {
      background:
        radial-gradient(circle at 42% 50%, rgba(255,174,0,.24), transparent 23%),
        radial-gradient(circle at 58% 50%, rgba(77,173,255,.25), transparent 23%);
      animation: waft-signature-reaction-flash 820ms ease-out forwards;
    }

    .waft-signature-reaction-ring {
      position: absolute;
      left: 50%;
      top: 50%;
      width: min(30vw, 320px);
      aspect-ratio: 1;
      border-radius: 50%;
      border: 8px solid rgba(255,255,255,.8);
      transform: translate(-50%, -50%) scale(.15);
      box-shadow:
        0 0 28px rgba(255,174,0,.8),
        inset 0 0 28px rgba(77,173,255,.72);
      animation: waft-signature-reaction-ring 720ms cubic-bezier(.15,.8,.2,1) forwards;
    }

    .waft-signature-layer.arctic-storm {
      background: linear-gradient(180deg, rgba(201,232,255,.18), rgba(8,24,48,.25));
      backdrop-filter: saturate(.7) brightness(1.08);
      animation: waft-signature-arctic-layer 980ms ease-out forwards;
    }

    .waft-signature-ice-streak {
      position: absolute;
      width: 3px;
      height: 90px;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255,255,255,0), rgba(235,248,255,.92));
      transform: rotate(24deg);
      animation: waft-signature-ice-streak 780ms linear forwards;
    }

    .waft-signature-local.throat-bite::before,
    .waft-signature-local.throat-bite::after {
      content: "";
      position: absolute;
      left: 14%;
      top: 46%;
      width: 72%;
      height: 7px;
      border-radius: 999px;
      background: linear-gradient(90deg, transparent, rgba(255,225,225,.96), rgba(194,24,48,.94), transparent);
      box-shadow: 0 0 18px rgba(225,35,58,.72);
      transform: rotate(-18deg) scaleX(.1);
      transform-origin: center;
      animation: waft-signature-slash 560ms cubic-bezier(.2,.8,.2,1) forwards;
    }

    .waft-signature-local.throat-bite::after {
      top: 54%;
      transform: rotate(14deg) scaleX(.1);
      animation-delay: 70ms;
    }

    .waft-signature-local.bloody-gouging {
      background: radial-gradient(circle at 50% 46%, rgba(178,16,34,.06), rgba(111,0,16,.48));
      animation: waft-signature-blood-pulse 700ms ease-out forwards;
    }

    .waft-signature-local.bloody-gouging::before {
      content: "";
      position: absolute;
      left: 28%;
      top: 34%;
      width: 44%;
      height: 32%;
      border: 4px solid rgba(255,78,91,.9);
      border-radius: 50%;
      box-shadow: 0 0 22px rgba(208,25,45,.7);
      animation: waft-signature-gouge-ring 620ms ease-out forwards;
    }

    .waft-signature-local.coconut-fortress::before,
    .waft-signature-local.coconut-fortress::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: 72%;
      aspect-ratio: 1;
      border-radius: 50%;
      border: 6px double rgba(214,174,103,.95);
      transform: translate(-50%, -50%) scale(.35);
      box-shadow:
        0 0 24px rgba(236,196,118,.42),
        inset 0 0 28px rgba(72,42,13,.52);
      animation: waft-signature-fortress 760ms cubic-bezier(.2,.8,.2,1) forwards;
    }

    .waft-signature-local.coconut-fortress::after {
      width: 54%;
      border-width: 3px;
      animation-delay: 80ms;
    }

    .waft-signature-local.phantom-current {
      background:
        linear-gradient(100deg, transparent 10%, rgba(85,220,255,.23) 42%, rgba(255,255,255,.36) 50%, rgba(70,143,255,.18) 58%, transparent 90%);
      background-size: 220% 100%;
      filter: blur(.2px);
      animation: waft-signature-current 780ms ease-out forwards;
    }

    .waft-signature-local.illusory-dance::before,
    .waft-signature-local.illusory-dance::after {
      content: "";
      position: absolute;
      inset: 8% 12%;
      border: 2px solid rgba(236,214,255,.58);
      border-radius: 18px;
      box-shadow: 0 0 28px rgba(184,104,255,.35);
      animation: waft-signature-illusion 760ms ease-out forwards;
    }

    .waft-signature-local.illusory-dance::after {
      transform: translateX(14%);
      opacity: .55;
      animation-delay: 80ms;
    }

    .waft-signature-local.microecosystem {
      background: radial-gradient(circle at 50% 70%, rgba(44,160,75,.35), transparent 55%);
      animation: waft-signature-ecosystem 920ms ease-out forwards;
    }

    .waft-signature-spore {
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(188,255,173,.9);
      box-shadow: 0 0 12px rgba(95,224,113,.8);
      animation: waft-signature-spore 820ms ease-out forwards;
    }

    @keyframes waft-signature-ink-layer {
      0% { opacity: 0; }
      22% { opacity: 1; }
      72% { opacity: .92; }
      100% { opacity: 0; }
    }

    @keyframes waft-signature-ink-blob {
      0% { opacity: 0; transform: scale(.25) rotate(0deg); }
      28% { opacity: .92; transform: scale(1) rotate(18deg); }
      100% { opacity: 0; transform: scale(1.25) rotate(35deg); }
    }

    @keyframes waft-signature-reaction-flash {
      0% { opacity: 0; filter: brightness(1); }
      18% { opacity: 1; filter: brightness(1.9); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-signature-reaction-ring {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(.12); }
      20% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(3.2); }
    }

    @keyframes waft-signature-arctic-layer {
      0% { opacity: 0; }
      20% { opacity: 1; }
      76% { opacity: .82; }
      100% { opacity: 0; }
    }

    @keyframes waft-signature-ice-streak {
      0% { opacity: 0; transform: translate(0,-120px) rotate(24deg); }
      12% { opacity: 1; }
      100% { opacity: 0; transform: translate(260px,110vh) rotate(24deg); }
    }

    @keyframes waft-signature-slash {
      0% { opacity: 0; transform: rotate(-18deg) scaleX(.1); }
      22% { opacity: 1; transform: rotate(-18deg) scaleX(1.08); }
      100% { opacity: 0; transform: rotate(-18deg) scaleX(1.2); }
    }

    @keyframes waft-signature-blood-pulse {
      0% { opacity: 0; }
      28% { opacity: 1; }
      100% { opacity: 0; }
    }

    @keyframes waft-signature-gouge-ring {
      0% { opacity: 0; transform: scale(.35); }
      30% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.35); }
    }

    @keyframes waft-signature-fortress {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(.35) rotate(-18deg); }
      28% { opacity: 1; transform: translate(-50%, -50%) scale(1.02) rotate(0deg); }
      82% { opacity: .9; }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(1.15) rotate(6deg); }
    }

    @keyframes waft-signature-current {
      0% { opacity: 0; background-position: 110% 0; }
      24% { opacity: 1; }
      100% { opacity: 0; background-position: -110% 0; }
    }

    @keyframes waft-signature-illusion {
      0% { opacity: 0; transform: translateX(-14%) scale(.92); }
      25% { opacity: .9; }
      65% { opacity: .42; transform: translateX(12%) scale(1.02); }
      100% { opacity: 0; transform: translateX(24%) scale(1.06); }
    }

    @keyframes waft-signature-ecosystem {
      0% { opacity: 0; filter: saturate(1); }
      28% { opacity: 1; filter: saturate(1.5); }
      100% { opacity: 0; filter: saturate(1); }
    }

    @keyframes waft-signature-spore {
      0% { opacity: 0; transform: translateY(30px) scale(.4); }
      25% { opacity: 1; }
      100% { opacity: 0; transform: translateY(-110px) scale(1.4); }
    }

    @media (prefers-reduced-motion: reduce) {
      .waft-signature-layer,
      .waft-signature-local,
      .waft-signature-layer *,
      .waft-signature-local * {
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
  layer.className = `waft-signature-local ${kind}`;
  wrap.appendChild(layer);
  return layer;
}

function createScreenLayer(kind) {
  const layer = document.createElement("div");
  layer.className = `waft-signature-layer ${kind}`;
  document.body.appendChild(layer);
  return layer;
}

function populateInk(layer) {
  const positions = [
    ["-7%", "12%"],
    ["20%", "54%"],
    ["58%", "-9%"],
    ["74%", "48%"]
  ];

  positions.forEach(([left, top], index) => {
    const blob = document.createElement("div");
    blob.className = "waft-signature-ink-blob";
    blob.style.left = left;
    blob.style.top = top;
    blob.style.animationDelay = `${index * 45}ms`;
    layer.appendChild(blob);
  });
}

function populateReaction(layer) {
  const ring = document.createElement("div");
  ring.className = "waft-signature-reaction-ring";
  layer.appendChild(ring);
}

function populateArcticStorm(layer) {
  for (let i = 0; i < 18; i += 1) {
    const streak = document.createElement("div");
    streak.className = "waft-signature-ice-streak";
    streak.style.left = `${(i * 13) % 100}%`;
    streak.style.top = `${-15 - (i % 5) * 12}%`;
    streak.style.animationDelay = `${(i % 6) * 35}ms`;
    layer.appendChild(streak);
  }
}

function populateMicroecosystem(layer) {
  for (let i = 0; i < 12; i += 1) {
    const spore = document.createElement("div");
    spore.className = "waft-signature-spore";
    spore.style.left = `${10 + ((i * 17) % 80)}%`;
    spore.style.top = `${58 + ((i * 11) % 28)}%`;
    spore.style.animationDelay = `${(i % 5) * 55}ms`;
    layer.appendChild(spore);
  }
}

export function getSignatureVfxDefinition(specialName) {
  const definition = SIGNATURE_VFX[specialName];
  return definition ? { ...definition } : null;
}

export async function playSignatureSpecialVfx(event, context = {}) {
  if (typeof document === "undefined") return false;

  const definition = getSignatureVfxDefinition(event?.specialName);
  if (!definition) return false;

  ensureStyles();
  let layer = null;

  if (definition.focus === "screen") {
    layer = createScreenLayer(definition.kind);
  } else {
    const side = definition.focus === "target"
      ? targetSide(event, context)
      : actorSide(event, context);
    layer = createLocalLayer(getWrap(side, context), definition.kind);
  }

  if (!layer) return false;

  if (definition.kind === "ink-sea") populateInk(layer);
  if (definition.kind === "chain-reaction") populateReaction(layer);
  if (definition.kind === "arctic-storm") populateArcticStorm(layer);
  if (definition.kind === "microecosystem") populateMicroecosystem(layer);

  window.setTimeout(() => layer.remove(), definition.duration + 120);
  await delay(definition.duration);
  return true;
}
