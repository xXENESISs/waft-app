// WAFT transform / body-state signature VFX.
//
// These effects communicate specials that visibly change the user's body or
// defensive state. They plug into the same structured SPECIAL event used by
// every battle mode, and safely return false for unknown specials.

const STYLE_ID = "waft-transform-signature-vfx-styles";

const TRANSFORM_SIGNATURES = Object.freeze({
  "Caudal Autotomy": {
    kind: "caudal-autotomy",
    focus: "actor",
    duration: 880
  },
  Overinflation: {
    kind: "overinflation",
    focus: "actor",
    duration: 900
  },
  "Total Regeneration": {
    kind: "total-regeneration",
    focus: "actor",
    duration: 980
  },
  "Costal Eversion": {
    kind: "costal-eversion",
    focus: "actor",
    duration: 900
  },
  "Perfect Adaptation": {
    kind: "perfect-adaptation",
    focus: "actor",
    duration: 920
  }
});

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .waft-transform-vfx-local {
      position: absolute;
      inset: 0;
      z-index: 72;
      overflow: hidden;
      border-radius: inherit;
      pointer-events: none;
      transform-origin: center;
    }

    .waft-transform-vfx-local.caudal-autotomy {
      background: radial-gradient(circle at 50% 55%, rgba(246,210,141,.18), transparent 58%);
      animation: waft-transform-body-pulse 880ms ease-out forwards;
    }

    .waft-transform-tail {
      position: absolute;
      left: 52%;
      top: 58%;
      width: 42%;
      height: 19%;
      border-right: 11px solid rgba(226,183,112,.96);
      border-bottom: 9px solid rgba(226,183,112,.96);
      border-radius: 0 0 82% 0;
      filter: drop-shadow(0 0 9px rgba(236,195,121,.72));
      transform-origin: 2% 18%;
      animation: waft-transform-tail-detach 820ms cubic-bezier(.18,.76,.18,1) forwards;
    }

    .waft-transform-sever-flash {
      position: absolute;
      left: 48%;
      top: 54%;
      width: 15%;
      aspect-ratio: 1;
      border-radius: 50%;
      border: 3px solid rgba(255,246,214,.94);
      box-shadow: 0 0 22px rgba(255,209,119,.88);
      animation: waft-transform-sever-flash 500ms ease-out forwards;
    }

    .waft-transform-vfx-local.overinflation {
      background:
        radial-gradient(circle at 50% 50%, rgba(224,249,255,.22) 0 24%, rgba(115,196,220,.13) 38%, transparent 63%),
        radial-gradient(circle at 50% 50%, transparent 48%, rgba(160,224,242,.10) 58%, transparent 72%);
      animation: waft-transform-inflate-body 900ms cubic-bezier(.18,.82,.2,1) forwards;
    }

    .waft-transform-inflation-ring {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 66%;
      aspect-ratio: 1;
      border-radius: 48% 52% 46% 54% / 52% 47% 53% 48%;
      border: 2px solid rgba(208,243,252,.34);
      background: radial-gradient(circle, transparent 48%, rgba(157,221,240,.10) 59%, transparent 71%);
      box-shadow:
        0 0 30px rgba(117,205,234,.30),
        inset 0 0 28px rgba(95,177,205,.13);
      filter: blur(.35px);
      transform: translate(-50%, -50%) scale(.42);
      animation: waft-transform-inflation-ring 850ms cubic-bezier(.2,.8,.2,1) forwards;
    }

    .waft-transform-spike {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 5px;
      height: 28%;
      border-radius: 999px 999px 45% 45%;
      background: linear-gradient(
        180deg,
        rgba(249,254,255,.98) 0%,
        rgba(145,213,235,.88) 34%,
        rgba(104,177,203,.42) 44%,
        transparent 46%,
        transparent 100%
      );
      filter: drop-shadow(0 0 6px rgba(151,220,241,.58));
      transform-origin: 50% 100%;
      opacity: 0;
      animation: waft-transform-spike 760ms ease-out forwards;
    }

    .waft-transform-vfx-local.total-regeneration {
      background: radial-gradient(circle at 50% 54%, rgba(85,255,194,.25), transparent 62%);
      animation: waft-transform-regen-glow 980ms ease-out forwards;
    }

    .waft-transform-regen-ring {
      position: absolute;
      left: 50%;
      top: 58%;
      width: 72%;
      height: 19%;
      border: 3px solid rgba(142,255,215,.84);
      border-radius: 50%;
      box-shadow: 0 0 20px rgba(80,236,184,.56);
      transform: translate(-50%, -50%) scale(.45);
      animation: waft-transform-regen-ring 880ms ease-out forwards;
    }

    .waft-transform-regen-particle {
      position: absolute;
      width: 7px;
      height: 16px;
      border-radius: 999px;
      background: rgba(177,255,226,.92);
      box-shadow: 0 0 10px rgba(90,245,191,.78);
      animation: waft-transform-regen-particle 820ms ease-out forwards;
    }

    .waft-transform-vfx-local.costal-eversion {
      background: radial-gradient(circle at 50% 52%, rgba(188,27,52,.14), rgba(77,0,17,.2) 58%, transparent 72%);
      animation: waft-transform-rib-pulse 900ms ease-out forwards;
    }

    .waft-transform-rib {
      position: absolute;
      top: 50%;
      width: 35%;
      height: 14%;
      border-top: 5px solid rgba(255,223,205,.92);
      border-radius: 50%;
      filter: drop-shadow(0 0 7px rgba(217,37,70,.84));
      opacity: 0;
      animation: waft-transform-rib-evert 760ms cubic-bezier(.18,.82,.2,1) forwards;
    }

    .waft-transform-rib.left { right: 49%; transform-origin: 100% 50%; }
    .waft-transform-rib.right { left: 49%; transform-origin: 0 50%; }

    .waft-transform-vfx-local.perfect-adaptation {
      background:
        radial-gradient(circle at 50% 50%, rgba(95,226,255,.18), transparent 45%),
        radial-gradient(circle at 50% 60%, rgba(194,112,255,.12), transparent 66%);
      animation: waft-transform-adaptation-pulse 920ms ease-out forwards;
    }

    .waft-transform-adapt-orbit {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 72%;
      height: 30%;
      border: 3px solid rgba(198,243,255,.82);
      border-left-color: rgba(114,219,255,.18);
      border-right-color: rgba(217,143,255,.52);
      border-radius: 50%;
      transform: translate(-50%, -50%) rotate(0deg) scale(.5);
      animation: waft-transform-adapt-orbit 860ms cubic-bezier(.18,.8,.2,1) forwards;
    }

    .waft-transform-adapt-shard {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 9px;
      height: 9px;
      transform: translate(-50%, -50%) rotate(45deg);
      background: rgba(229,250,255,.95);
      box-shadow: 0 0 12px rgba(116,219,255,.84);
      animation: waft-transform-adapt-shard 780ms ease-out forwards;
    }

    @keyframes waft-transform-body-pulse {
      0% { opacity: 0; filter: brightness(1); }
      22% { opacity: 1; filter: brightness(1.35); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-transform-tail-detach {
      0% { opacity: 0; transform: rotate(6deg) translate(0,0) scale(.8); }
      20% { opacity: 1; }
      55% { opacity: 1; transform: rotate(24deg) translate(14%,8%) scale(1); }
      100% { opacity: 0; transform: rotate(78deg) translate(52%,38%) scale(.72); }
    }

    @keyframes waft-transform-sever-flash {
      0% { opacity: 0; transform: scale(.2); }
      30% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(2.2); }
    }

    @keyframes waft-transform-inflate-body {
      0% { opacity: 0; transform: scale(.93); filter: brightness(1); }
      22% { opacity: 1; transform: scale(1.01); filter: brightness(1.12); }
      64% { opacity: .96; transform: scale(1.07); filter: brightness(1.2); }
      100% { opacity: 0; transform: scale(1.1); filter: brightness(1); }
    }

    @keyframes waft-transform-inflation-ring {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(.52) rotate(-3deg); }
      26% { opacity: .48; transform: translate(-50%, -50%) scale(.91) rotate(1deg); }
      70% { opacity: .36; transform: translate(-50%, -50%) scale(1.06) rotate(-1deg); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(1.22) rotate(3deg); }
    }

    @keyframes waft-transform-spike {
      0% { opacity: 0; transform: translate(-50%, -100%) rotate(var(--rotation)) scaleY(.35); }
      24% { opacity: 1; transform: translate(-50%, -100%) rotate(var(--rotation)) scaleY(.88); }
      66% { opacity: .92; transform: translate(-50%, -100%) rotate(var(--rotation)) scaleY(1.08); }
      100% { opacity: 0; transform: translate(-50%, -100%) rotate(var(--rotation)) scaleY(1.3); }
    }

    @keyframes waft-transform-regen-glow {
      0% { opacity: 0; filter: brightness(1); }
      26% { opacity: 1; filter: brightness(1.45) saturate(1.25); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-transform-regen-ring {
      0% { opacity: 0; transform: translate(-50%, 30%) scale(.4); }
      25% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, -230%) scale(1.08); }
    }

    @keyframes waft-transform-regen-particle {
      0% { opacity: 0; transform: translateY(28px) scale(.45); }
      25% { opacity: 1; }
      100% { opacity: 0; transform: translateY(-110px) scale(1.2); }
    }

    @keyframes waft-transform-rib-pulse {
      0% { opacity: 0; filter: brightness(1); }
      30% { opacity: 1; filter: brightness(1.35); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-transform-rib-evert {
      0% { opacity: 0; transform: scaleX(.08); }
      28% { opacity: 1; transform: scaleX(1.05); }
      78% { opacity: .9; }
      100% { opacity: 0; transform: scaleX(1.22); }
    }

    @keyframes waft-transform-adaptation-pulse {
      0% { opacity: 0; filter: hue-rotate(0deg) brightness(1); }
      28% { opacity: 1; filter: hue-rotate(40deg) brightness(1.3); }
      72% { opacity: .9; filter: hue-rotate(150deg) brightness(1.18); }
      100% { opacity: 0; filter: hue-rotate(260deg) brightness(1); }
    }

    @keyframes waft-transform-adapt-orbit {
      0% { opacity: 0; transform: translate(-50%, -50%) rotate(-60deg) scale(.45); }
      25% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, -50%) rotate(300deg) scale(1.18); }
    }

    @keyframes waft-transform-adapt-shard {
      0% { opacity: 0; transform: translate(-50%, -50%) rotate(45deg) translateX(0) scale(.4); }
      25% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--rotation)) translateX(115px) scale(1.15); }
    }

    @media (prefers-reduced-motion: reduce) {
      .waft-transform-vfx-local,
      .waft-transform-vfx-local * {
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
  layer.className = `waft-transform-vfx-local ${kind}`;
  wrap.appendChild(layer);
  return layer;
}

function populateCaudalAutotomy(layer) {
  const tail = document.createElement("div");
  tail.className = "waft-transform-tail";
  layer.appendChild(tail);

  const flash = document.createElement("div");
  flash.className = "waft-transform-sever-flash";
  layer.appendChild(flash);
}

function populateOverinflation(layer) {
  const ring = document.createElement("div");
  ring.className = "waft-transform-inflation-ring";
  layer.appendChild(ring);

  for (let i = 0; i < 12; i += 1) {
    const spike = document.createElement("div");
    spike.className = "waft-transform-spike";
    spike.style.setProperty("--rotation", `${i * 30}deg`);
    spike.style.animationDelay = `${(i % 4) * 28}ms`;
    layer.appendChild(spike);
  }
}

function populateTotalRegeneration(layer) {
  for (let i = 0; i < 3; i += 1) {
    const ring = document.createElement("div");
    ring.className = "waft-transform-regen-ring";
    ring.style.animationDelay = `${i * 95}ms`;
    layer.appendChild(ring);
  }

  for (let i = 0; i < 12; i += 1) {
    const particle = document.createElement("div");
    particle.className = "waft-transform-regen-particle";
    particle.style.left = `${12 + ((i * 19) % 76)}%`;
    particle.style.top = `${58 + ((i * 13) % 30)}%`;
    particle.style.animationDelay = `${(i % 5) * 48}ms`;
    layer.appendChild(particle);
  }
}

function populateCostalEversion(layer) {
  for (let i = 0; i < 4; i += 1) {
    for (const side of ["left", "right"]) {
      const rib = document.createElement("div");
      rib.className = `waft-transform-rib ${side}`;
      rib.style.top = `${34 + i * 11}%`;
      rib.style.animationDelay = `${i * 48}ms`;
      layer.appendChild(rib);
    }
  }
}

function populatePerfectAdaptation(layer) {
  for (let i = 0; i < 3; i += 1) {
    const orbit = document.createElement("div");
    orbit.className = "waft-transform-adapt-orbit";
    orbit.style.transform = `translate(-50%, -50%) rotate(${i * 60}deg) scale(.5)`;
    orbit.style.animationDelay = `${i * 55}ms`;
    layer.appendChild(orbit);
  }

  for (let i = 0; i < 8; i += 1) {
    const shard = document.createElement("div");
    shard.className = "waft-transform-adapt-shard";
    shard.style.setProperty("--rotation", `${45 + i * 45}deg`);
    shard.style.animationDelay = `${(i % 4) * 42}ms`;
    layer.appendChild(shard);
  }
}

export function getTransformSignatureVfxDefinition(specialName) {
  const definition = TRANSFORM_SIGNATURES[specialName];
  return definition ? { ...definition } : null;
}

export async function playTransformSignatureVfx(event, context = {}) {
  if (typeof document === "undefined") return false;

  const definition = getTransformSignatureVfxDefinition(event?.specialName);
  if (!definition) return false;

  ensureStyles();
  const side = actorSide(event, context);
  const layer = createLocalLayer(getWrap(side, context), definition.kind);
  if (!layer) return false;

  if (definition.kind === "caudal-autotomy") populateCaudalAutotomy(layer);
  if (definition.kind === "overinflation") populateOverinflation(layer);
  if (definition.kind === "total-regeneration") populateTotalRegeneration(layer);
  if (definition.kind === "costal-eversion") populateCostalEversion(layer);
  if (definition.kind === "perfect-adaptation") populatePerfectAdaptation(layer);

  window.setTimeout(() => layer.remove(), definition.duration + 140);
  await delay(definition.duration);
  return true;
}
