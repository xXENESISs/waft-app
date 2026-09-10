// WAFT control / resource signature VFX.
//
// This catalogue covers specials whose identity is not just an impact: they
// attach control, transfer stored resources, heal while debuffing, or combine a
// hit with a recovery effect. Like the other catalogues it is mode-agnostic.

const STYLE_ID = "waft-control-signature-vfx-styles";

const CONTROL_SIGNATURES = Object.freeze({
  "Zombie Cockroach": {
    kind: "zombie-cockroach",
    focus: "target",
    duration: 980
  },
  Refresh: {
    kind: "refresh",
    focus: "both",
    duration: 900
  },
  "Looting Burst": {
    kind: "looting-burst",
    focus: "both",
    duration: 860
  },
  "Dung Throw": {
    kind: "dung-throw",
    focus: "target",
    duration: 820
  },
  "Nocturnal Hunt": {
    kind: "nocturnal-hunt",
    focus: "both",
    duration: 940
  }
});

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .waft-control-vfx-local {
      position: absolute;
      inset: 0;
      z-index: 74;
      overflow: hidden;
      border-radius: inherit;
      pointer-events: none;
    }

    .waft-control-vfx-local.zombie-cockroach {
      background:
        radial-gradient(circle at 50% 46%, rgba(166,255,123,.23) 0 14%, rgba(72,178,71,.18) 29%, rgba(15,49,22,.30) 48%, transparent 72%);
      animation: waft-control-parasite-pulse 980ms ease-out forwards;
    }

    .waft-control-parasite-halo {
      position: absolute;
      left: 50%;
      top: 46%;
      width: 47%;
      aspect-ratio: 1;
      border-radius: 50%;
      border: 3px solid rgba(180,255,128,.78);
      box-shadow:
        0 0 22px rgba(113,255,102,.62),
        inset 0 0 22px rgba(76,213,84,.20);
      transform: translate(-50%, -50%) scale(.28);
      opacity: 0;
      animation: waft-control-parasite-halo 840ms cubic-bezier(.18,.82,.2,1) forwards;
    }

    .waft-control-cockroach {
      position: absolute;
      left: 50%;
      top: 45%;
      width: 44px;
      height: 62px;
      border-radius: 48% 48% 55% 55%;
      background:
        linear-gradient(90deg, transparent 46%, rgba(207,255,149,.55) 48% 52%, transparent 54%),
        linear-gradient(180deg, rgba(91,137,49,.99), rgba(15,37,15,.99));
      border: 3px solid rgba(193,255,136,.92);
      box-shadow:
        0 0 8px rgba(228,255,188,.9),
        0 0 25px rgba(109,255,98,.78);
      transform: translate(-50%, -50%) rotate(8deg) scale(.25);
      animation: waft-control-cockroach-attach 840ms cubic-bezier(.18,.82,.2,1) forwards;
    }

    .waft-control-cockroach::before,
    .waft-control-cockroach::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 42%;
      width: 76px;
      height: 3px;
      border-radius: 999px;
      background: rgba(192,255,139,.92);
      filter: drop-shadow(0 0 4px rgba(116,255,106,.72));
      transform: translateX(-50%) rotate(24deg);
      box-shadow: 0 15px 0 rgba(192,255,139,.80), 0 -15px 0 rgba(192,255,139,.80);
    }

    .waft-control-cockroach::after {
      transform: translateX(-50%) rotate(-24deg);
    }

    .waft-control-drain-thread {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 4px;
      height: 31%;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(209,255,157,.98), rgba(89,235,88,.74) 45%, transparent 100%);
      box-shadow: 0 0 9px rgba(112,255,104,.58);
      transform-origin: 50% 0;
      opacity: 0;
      animation: waft-control-drain-thread 720ms ease-out forwards;
    }

    .waft-control-vfx-local.refresh.actor {
      background: radial-gradient(circle at 50% 58%, rgba(92,245,222,.34), rgba(34,135,147,.15) 50%, transparent 69%);
      animation: waft-control-refresh-actor 900ms ease-out forwards;
    }

    .waft-control-vfx-local.refresh.target {
      background: radial-gradient(circle at 50% 50%, rgba(71,160,210,.12), rgba(84,65,178,.27) 56%, transparent 73%);
      animation: waft-control-refresh-target 900ms ease-out forwards;
    }

    .waft-control-refresh-ring {
      position: absolute;
      left: 50%;
      top: 66%;
      width: 66%;
      height: 18%;
      border: 4px solid rgba(161,255,241,.92);
      border-radius: 50%;
      box-shadow: 0 0 22px rgba(91,231,216,.68);
      transform: translate(-50%, -50%) scale(.35);
      animation: waft-control-refresh-ring 760ms ease-out forwards;
    }

    .waft-control-debuff-wave {
      position: absolute;
      left: 10%;
      width: 80%;
      height: 7px;
      border-radius: 999px;
      background: linear-gradient(90deg, transparent, rgba(163,169,255,.98), rgba(119,101,246,.86), transparent);
      box-shadow: 0 0 14px rgba(116,111,255,.70);
      opacity: 0;
      animation: waft-control-debuff-wave 620ms ease-out forwards;
    }

    .waft-control-vfx-local.looting-burst.actor {
      background: radial-gradient(circle at 50% 54%, rgba(255,216,85,.2), transparent 62%);
      animation: waft-control-loot-actor 860ms ease-out forwards;
    }

    .waft-control-vfx-local.looting-burst.target {
      background: radial-gradient(circle at 50% 50%, rgba(255,186,51,.2), rgba(97,55,8,.12) 52%, transparent 68%);
      animation: waft-control-loot-target 860ms ease-out forwards;
    }

    .waft-control-loot-shard {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 9px;
      height: 14px;
      border-radius: 2px;
      background: linear-gradient(180deg, rgba(255,246,170,.98), rgba(231,163,34,.9));
      box-shadow: 0 0 9px rgba(255,198,53,.58);
      opacity: 0;
      animation: waft-control-loot-shard 700ms ease-out forwards;
    }

    .waft-control-vfx-local.dung-throw {
      background: radial-gradient(circle at 50% 53%, rgba(137,101,55,.18), rgba(70,48,24,.10) 45%, transparent 70%);
      animation: waft-control-earth-impact 820ms ease-out forwards;
    }

    .waft-control-earth-splat {
      position: absolute;
      left: 50%;
      top: 52%;
      width: 24%;
      aspect-ratio: 1;
      border-radius: 42% 58% 53% 47% / 58% 42% 56% 44%;
      background: rgba(103,71,35,.82);
      box-shadow:
        0 0 0 7px rgba(141,104,59,.22),
        0 0 18px rgba(82,56,31,.42);
      transform: translate(-50%, -50%) scale(.12) rotate(-20deg);
      animation: waft-control-earth-splat 680ms cubic-bezier(.18,.82,.2,1) forwards;
    }

    .waft-control-dust {
      position: absolute;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: rgba(188,154,104,.75);
      opacity: 0;
      animation: waft-control-dust 620ms ease-out forwards;
    }

    .waft-control-vfx-local.nocturnal-hunt.actor {
      background: radial-gradient(circle at 50% 50%, rgba(122,207,169,.14), rgba(18,28,61,.30) 62%, transparent 78%);
      animation: waft-control-night-return 940ms ease-out forwards;
    }

    .waft-control-vfx-local.nocturnal-hunt.target {
      background: radial-gradient(circle at 50% 50%, rgba(153,172,255,.12), rgba(7,10,29,.34) 60%, transparent 78%);
      animation: waft-control-night-strike 940ms ease-out forwards;
    }

    .waft-control-crescent {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 58%;
      aspect-ratio: 1;
      border-radius: 50%;
      border: 8px solid rgba(202,216,255,.92);
      border-left-color: transparent;
      border-bottom-color: transparent;
      filter: drop-shadow(0 0 12px rgba(116,139,255,.7));
      transform: translate(-50%, -50%) rotate(-42deg) scale(.2);
      animation: waft-control-crescent-slash 720ms cubic-bezier(.16,.82,.2,1) forwards;
    }

    .waft-control-return-orb {
      position: absolute;
      left: 50%;
      top: 58%;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: rgba(144,255,202,.94);
      box-shadow: 0 0 11px rgba(88,242,169,.72);
      opacity: 0;
      animation: waft-control-return-orb 760ms ease-out forwards;
    }

    @keyframes waft-control-parasite-pulse {
      0% { opacity: 0; filter: brightness(1); }
      20% { opacity: 1; filter: brightness(1.34) saturate(1.38); }
      70% { opacity: .96; filter: brightness(1.22) saturate(1.30); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-control-parasite-halo {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(.22); }
      28% { opacity: .95; transform: translate(-50%, -50%) scale(.92); }
      72% { opacity: .72; transform: translate(-50%, -50%) scale(1.06); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(1.24); }
    }

    @keyframes waft-control-cockroach-attach {
      0% { opacity: 0; transform: translate(-50%, -125%) rotate(-28deg) scale(.18); }
      28% { opacity: 1; transform: translate(-50%, -50%) rotate(8deg) scale(1.12); }
      72% { opacity: 1; transform: translate(-50%, -50%) rotate(2deg) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) rotate(2deg) scale(.96); }
    }

    @keyframes waft-control-drain-thread {
      0% { opacity: 0; transform: rotate(var(--rotation)) scaleY(.08); }
      28% { opacity: 1; transform: rotate(var(--rotation)) scaleY(1); }
      74% { opacity: .82; transform: rotate(var(--rotation)) scaleY(.9); }
      100% { opacity: 0; transform: rotate(var(--rotation)) scaleY(.45); }
    }

    @keyframes waft-control-refresh-actor {
      0% { opacity: 0; filter: brightness(1); }
      28% { opacity: 1; filter: brightness(1.42) saturate(1.22); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-control-refresh-target {
      0% { opacity: 0; filter: brightness(1); }
      32% { opacity: 1; filter: brightness(.78) saturate(.78); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-control-refresh-ring {
      0% { opacity: 0; transform: translate(-50%, 30%) scale(.35); }
      25% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, -260%) scale(1.08); }
    }

    @keyframes waft-control-debuff-wave {
      0% { opacity: 0; transform: translateY(-20px) scaleX(.25); }
      28% { opacity: 1; transform: translateY(0) scaleX(1); }
      100% { opacity: 0; transform: translateY(60px) scaleX(.78); }
    }

    @keyframes waft-control-loot-actor {
      0% { opacity: 0; filter: brightness(1); }
      26% { opacity: 1; filter: brightness(1.32); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-control-loot-target {
      0% { opacity: 0; filter: brightness(1); }
      30% { opacity: 1; filter: brightness(1.5); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-control-loot-shard {
      0% { opacity: 0; transform: translate(-50%, -50%) rotate(0deg) translateX(0) scale(.4); }
      24% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--rotation)) translateX(var(--distance)) scale(1.15); }
    }

    @keyframes waft-control-earth-impact {
      0% { opacity: 0; filter: brightness(1); }
      22% { opacity: 1; filter: brightness(1.2); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-control-earth-splat {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(.12) rotate(-20deg); }
      28% { opacity: 1; transform: translate(-50%, -50%) scale(1.15) rotate(8deg); }
      76% { opacity: .82; transform: translate(-50%, -50%) scale(1) rotate(3deg); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(.92) rotate(3deg); }
    }

    @keyframes waft-control-dust {
      0% { opacity: 0; transform: translate(0,0) scale(.4); }
      25% { opacity: .82; }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.35); }
    }

    @keyframes waft-control-night-return {
      0% { opacity: 0; filter: brightness(.85); }
      28% { opacity: 1; filter: brightness(1.18); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-control-night-strike {
      0% { opacity: 0; filter: brightness(1); }
      26% { opacity: 1; filter: brightness(.72) contrast(1.1); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-control-crescent-slash {
      0% { opacity: 0; transform: translate(-50%, -50%) rotate(-80deg) scale(.18); }
      30% { opacity: 1; transform: translate(-50%, -50%) rotate(-25deg) scale(1.05); }
      100% { opacity: 0; transform: translate(-50%, -50%) rotate(30deg) scale(1.24); }
    }

    @keyframes waft-control-return-orb {
      0% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--rotation)) translateX(95px) scale(.45); }
      24% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--rotation)) translateX(8px) scale(1.1); }
    }

    @media (prefers-reduced-motion: reduce) {
      .waft-control-vfx-local,
      .waft-control-vfx-local * {
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

function createLocalLayer(wrap, kind, role = "") {
  if (!wrap) return null;

  if (getComputedStyle(wrap).position === "static") {
    wrap.style.position = "relative";
  }

  const layer = document.createElement("div");
  layer.className = `waft-control-vfx-local ${kind}${role ? ` ${role}` : ""}`;
  wrap.appendChild(layer);
  return layer;
}

function populateZombieCockroach(layer) {
  const halo = document.createElement("div");
  halo.className = "waft-control-parasite-halo";
  layer.appendChild(halo);

  const cockroach = document.createElement("div");
  cockroach.className = "waft-control-cockroach";
  layer.appendChild(cockroach);

  for (let i = 0; i < 4; i += 1) {
    const thread = document.createElement("div");
    thread.className = "waft-control-drain-thread";
    thread.style.setProperty("--rotation", `${-54 + i * 36}deg`);
    thread.style.animationDelay = `${i * 55}ms`;
    layer.appendChild(thread);
  }
}

function populateRefresh(actorLayer, targetLayer) {
  for (let i = 0; i < 3; i += 1) {
    const ring = document.createElement("div");
    ring.className = "waft-control-refresh-ring";
    ring.style.animationDelay = `${i * 85}ms`;
    actorLayer.appendChild(ring);
  }

  for (let i = 0; i < 3; i += 1) {
    const wave = document.createElement("div");
    wave.className = "waft-control-debuff-wave";
    wave.style.top = `${34 + i * 14}%`;
    wave.style.animationDelay = `${i * 80}ms`;
    targetLayer.appendChild(wave);
  }
}

function populateLootingBurst(actorLayer, targetLayer) {
  for (let i = 0; i < 8; i += 1) {
    const actorShard = document.createElement("div");
    actorShard.className = "waft-control-loot-shard";
    actorShard.style.setProperty("--rotation", `${i * 45}deg`);
    actorShard.style.setProperty("--distance", `${58 + (i % 3) * 16}px`);
    actorShard.style.animationDelay = `${(i % 4) * 42}ms`;
    actorLayer.appendChild(actorShard);

    const targetShard = document.createElement("div");
    targetShard.className = "waft-control-loot-shard";
    targetShard.style.setProperty("--rotation", `${22 + i * 45}deg`);
    targetShard.style.setProperty("--distance", `${42 + (i % 2) * 14}px`);
    targetShard.style.animationDelay = `${80 + (i % 4) * 38}ms`;
    targetLayer.appendChild(targetShard);
  }
}

function populateDungThrow(layer) {
  const splat = document.createElement("div");
  splat.className = "waft-control-earth-splat";
  layer.appendChild(splat);

  const dustVectors = [
    [-62, -30], [-38, -58], [0, -72], [42, -52], [66, -22],
    [-58, 34], [-20, 56], [28, 52], [61, 28]
  ];

  dustVectors.forEach(([dx, dy], index) => {
    const dust = document.createElement("div");
    dust.className = "waft-control-dust";
    dust.style.left = `${47 + (index % 3) * 3}%`;
    dust.style.top = `${49 + (index % 2) * 4}%`;
    dust.style.setProperty("--dx", `${dx}px`);
    dust.style.setProperty("--dy", `${dy}px`);
    dust.style.animationDelay = `${(index % 4) * 30}ms`;
    layer.appendChild(dust);
  });
}

function populateNocturnalHunt(actorLayer, targetLayer) {
  const crescent = document.createElement("div");
  crescent.className = "waft-control-crescent";
  targetLayer.appendChild(crescent);

  for (let i = 0; i < 8; i += 1) {
    const orb = document.createElement("div");
    orb.className = "waft-control-return-orb";
    orb.style.setProperty("--rotation", `${i * 45}deg`);
    orb.style.animationDelay = `${140 + (i % 4) * 45}ms`;
    actorLayer.appendChild(orb);
  }
}

export function getControlSignatureVfxDefinition(specialName) {
  const definition = CONTROL_SIGNATURES[specialName];
  return definition ? { ...definition } : null;
}

export async function playControlSignatureVfx(event, context = {}) {
  if (typeof document === "undefined") return false;

  const definition = getControlSignatureVfxDefinition(event?.specialName);
  if (!definition) return false;

  ensureStyles();
  const actor = actorSide(event, context);
  const target = targetSide(event, context);
  let layers = [];

  if (definition.focus === "both") {
    const actorLayer = createLocalLayer(getWrap(actor, context), definition.kind, "actor");
    const targetLayer = createLocalLayer(getWrap(target, context), definition.kind, "target");
    if (!actorLayer || !targetLayer) {
      actorLayer?.remove();
      targetLayer?.remove();
      return false;
    }

    layers = [actorLayer, targetLayer];
    if (definition.kind === "refresh") populateRefresh(actorLayer, targetLayer);
    if (definition.kind === "looting-burst") populateLootingBurst(actorLayer, targetLayer);
    if (definition.kind === "nocturnal-hunt") populateNocturnalHunt(actorLayer, targetLayer);
  } else {
    const side = definition.focus === "target" ? target : actor;
    const layer = createLocalLayer(getWrap(side, context), definition.kind);
    if (!layer) return false;

    layers = [layer];
    if (definition.kind === "zombie-cockroach") populateZombieCockroach(layer);
    if (definition.kind === "dung-throw") populateDungThrow(layer);
  }

  window.setTimeout(() => layers.forEach((layer) => layer.remove()), definition.duration + 140);
  await delay(definition.duration);
  return true;
}
