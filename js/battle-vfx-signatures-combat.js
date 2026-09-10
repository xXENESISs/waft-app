// WAFT action-pattern signature VFX.
//
// Specials in this catalogue are defined by how the action unfolds: chained
// strikes, dives, grapples, drain attacks or resource generation. The module is
// mode-agnostic and consumes the same structured SPECIAL event everywhere.

const STYLE_ID = "waft-combat-signature-vfx-styles";

const COMBAT_SIGNATURES = Object.freeze({
  "Darwinian Expulsion": {
    kind: "darwinian-expulsion",
    focus: "actor",
    duration: 900
  },
  "Raptorial Chain": {
    kind: "raptorial-chain",
    focus: "target",
    duration: 900
  },
  "Anubis' Staff": {
    kind: "anubis-staff",
    focus: "both",
    duration: 960
  },
  "Deadly Dive": {
    kind: "deadly-dive",
    focus: "target",
    duration: 860
  },
  "Death Roll": {
    kind: "death-roll",
    focus: "target",
    duration: 900
  },
  "Ballistic Strike": {
    kind: "ballistic-strike",
    focus: "target",
    duration: 820
  }
});

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .waft-combat-vfx-local {
      position: absolute;
      inset: 0;
      z-index: 73;
      overflow: hidden;
      border-radius: inherit;
      pointer-events: none;
    }

    .waft-combat-vfx-local.darwinian-expulsion {
      background: radial-gradient(circle at 50% 72%, rgba(217,255,185,.2), transparent 54%);
      animation: waft-combat-expulsion-pulse 900ms ease-out forwards;
    }

    .waft-combat-larva {
      position: absolute;
      width: 12px;
      height: 25px;
      border-radius: 65% 40% 60% 45%;
      background: linear-gradient(180deg, rgba(237,255,210,.96), rgba(133,197,92,.78));
      box-shadow: 0 0 10px rgba(173,238,115,.65);
      animation: waft-combat-larva-rise 820ms cubic-bezier(.18,.8,.2,1) forwards;
    }

    .waft-combat-vfx-local.raptorial-chain {
      background: radial-gradient(circle at 50% 50%, rgba(214,255,166,.08), rgba(48,84,18,.16), transparent 68%);
      animation: waft-combat-chain-pulse 900ms ease-out forwards;
    }

    .waft-combat-raptorial-slash {
      position: absolute;
      left: 11%;
      top: 50%;
      width: 78%;
      height: 6px;
      border-radius: 999px;
      background: linear-gradient(90deg, transparent, rgba(233,255,197,.96), rgba(110,216,64,.82), transparent);
      box-shadow: 0 0 14px rgba(127,225,71,.6);
      opacity: 0;
      transform-origin: center;
      animation: waft-combat-raptorial-slash 430ms cubic-bezier(.16,.82,.22,1) forwards;
    }

    .waft-combat-vfx-local.anubis-staff.actor {
      background: radial-gradient(circle at 50% 60%, rgba(255,219,116,.25), transparent 60%);
      animation: waft-combat-anubis-actor 960ms ease-out forwards;
    }

    .waft-combat-vfx-local.anubis-staff.target {
      background: radial-gradient(circle at 50% 48%, rgba(82,46,9,.08), rgba(14,8,2,.36), transparent 70%);
      animation: waft-combat-anubis-target 960ms ease-out forwards;
    }

    .waft-combat-staff {
      position: absolute;
      left: 50%;
      top: 12%;
      width: 7px;
      height: 72%;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255,245,192,.98), rgba(213,156,39,.94));
      box-shadow: 0 0 16px rgba(255,211,83,.8);
      transform: translateX(-50%) rotate(-12deg) scaleY(.25);
      transform-origin: 50% 100%;
      animation: waft-combat-staff-strike 720ms cubic-bezier(.18,.82,.2,1) forwards;
    }

    .waft-combat-drain-orb {
      position: absolute;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(255,222,116,.94);
      box-shadow: 0 0 11px rgba(255,195,58,.76);
      animation: waft-combat-drain-orb 820ms ease-in-out forwards;
    }

    .waft-combat-vfx-local.deadly-dive {
      background: linear-gradient(180deg, rgba(222,246,255,.08), rgba(28,77,111,.28) 48%, transparent 74%);
      animation: waft-combat-dive-pulse 860ms ease-out forwards;
    }

    .waft-combat-dive-streak {
      position: absolute;
      left: 50%;
      top: -25%;
      width: 8px;
      height: 70%;
      border-radius: 999px;
      background: linear-gradient(180deg, transparent, rgba(239,251,255,.98));
      box-shadow: 0 0 20px rgba(145,221,255,.8);
      transform: translateX(-50%) rotate(7deg);
      animation: waft-combat-dive-streak 620ms cubic-bezier(.08,.8,.14,1) forwards;
    }

    .waft-combat-impact-ring {
      position: absolute;
      left: 50%;
      top: 58%;
      width: 48%;
      aspect-ratio: 1;
      border-radius: 50%;
      border: 5px solid rgba(229,249,255,.86);
      transform: translate(-50%, -50%) scale(.08);
      opacity: 0;
      animation: waft-combat-impact-ring 520ms ease-out 260ms forwards;
    }

    .waft-combat-vfx-local.death-roll {
      background: radial-gradient(circle at 50% 50%, rgba(65,145,115,.12), rgba(9,45,37,.3), transparent 72%);
      animation: waft-combat-roll-pulse 900ms ease-out forwards;
    }

    .waft-combat-roll-ring {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 70%;
      height: 34%;
      border: 5px solid rgba(185,237,217,.82);
      border-left-color: transparent;
      border-right-color: rgba(55,145,112,.38);
      border-radius: 50%;
      animation: waft-combat-roll-ring 760ms cubic-bezier(.18,.78,.18,1) forwards;
    }

    .waft-combat-vfx-local.ballistic-strike {
      background: radial-gradient(circle at 50% 52%, rgba(255,255,255,.28), rgba(79,214,255,.14) 30%, transparent 64%);
      animation: waft-combat-ballistic-flash 820ms ease-out forwards;
    }

    .waft-combat-ballistic-line {
      position: absolute;
      left: -18%;
      top: 48%;
      width: 138%;
      height: 8px;
      border-radius: 999px;
      background: linear-gradient(90deg, transparent, rgba(234,252,255,.96), rgba(72,219,255,.82), transparent);
      box-shadow: 0 0 24px rgba(73,208,255,.82);
      transform: scaleX(.08);
      animation: waft-combat-ballistic-line 520ms cubic-bezier(.12,.85,.18,1) forwards;
    }

    @keyframes waft-combat-expulsion-pulse {
      0% { opacity: 0; filter: brightness(1); }
      24% { opacity: 1; filter: brightness(1.3) saturate(1.3); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-combat-larva-rise {
      0% { opacity: 0; transform: translateY(35px) rotate(-10deg) scale(.45); }
      25% { opacity: 1; }
      72% { opacity: .94; }
      100% { opacity: 0; transform: translateY(-95px) rotate(18deg) scale(1.12); }
    }

    @keyframes waft-combat-chain-pulse {
      0% { opacity: 0; }
      22% { opacity: 1; }
      100% { opacity: 0; }
    }

    @keyframes waft-combat-raptorial-slash {
      0% { opacity: 0; transform: rotate(var(--rotation)) scaleX(.08); }
      25% { opacity: 1; transform: rotate(var(--rotation)) scaleX(1.04); }
      100% { opacity: 0; transform: rotate(var(--rotation)) scaleX(1.18); }
    }

    @keyframes waft-combat-anubis-actor {
      0% { opacity: 0; filter: brightness(1); }
      28% { opacity: 1; filter: brightness(1.38); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-combat-anubis-target {
      0% { opacity: 0; filter: brightness(1); }
      30% { opacity: 1; filter: brightness(.72); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-combat-staff-strike {
      0% { opacity: 0; transform: translateX(-50%) rotate(-25deg) translateY(-18%) scaleY(.25); }
      24% { opacity: 1; }
      62% { opacity: 1; transform: translateX(-50%) rotate(16deg) translateY(8%) scaleY(1); }
      100% { opacity: 0; transform: translateX(-50%) rotate(24deg) translateY(12%) scaleY(1.05); }
    }

    @keyframes waft-combat-drain-orb {
      0% { opacity: 0; transform: translate(0,0) scale(.45); }
      28% { opacity: 1; }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.2); }
    }

    @keyframes waft-combat-dive-pulse {
      0% { opacity: 0; filter: brightness(1); }
      24% { opacity: 1; }
      52% { filter: brightness(1.55); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-combat-dive-streak {
      0% { opacity: 0; transform: translate(-50%, -30%) rotate(7deg) scaleY(.35); }
      22% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, 185%) rotate(7deg) scaleY(1.15); }
    }

    @keyframes waft-combat-impact-ring {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(.08); }
      30% { opacity: .95; }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(2.1); }
    }

    @keyframes waft-combat-roll-pulse {
      0% { opacity: 0; filter: brightness(1); }
      28% { opacity: 1; filter: brightness(1.28); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-combat-roll-ring {
      0% { opacity: 0; transform: translate(-50%, -50%) rotate(0deg) scale(.45); }
      25% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, -50%) rotate(720deg) scale(1.22); }
    }

    @keyframes waft-combat-ballistic-flash {
      0% { opacity: 0; filter: brightness(1); }
      20% { opacity: 1; filter: brightness(2); }
      100% { opacity: 0; filter: brightness(1); }
    }

    @keyframes waft-combat-ballistic-line {
      0% { opacity: 0; transform: scaleX(.08); }
      22% { opacity: 1; transform: scaleX(1.02); }
      100% { opacity: 0; transform: scaleX(1.2); }
    }

    @media (prefers-reduced-motion: reduce) {
      .waft-combat-vfx-local,
      .waft-combat-vfx-local * {
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
  layer.className = `waft-combat-vfx-local ${kind}${role ? ` ${role}` : ""}`;
  wrap.appendChild(layer);
  return layer;
}

function populateDarwinianExpulsion(layer) {
  for (let i = 0; i < 5; i += 1) {
    const larva = document.createElement("div");
    larva.className = "waft-combat-larva";
    larva.style.left = `${18 + ((i * 17) % 64)}%`;
    larva.style.top = `${66 + ((i * 11) % 20)}%`;
    larva.style.animationDelay = `${i * 65}ms`;
    layer.appendChild(larva);
  }
}

function populateRaptorialChain(layer) {
  const rotations = [-22, 16, -9, 25, -16];
  rotations.forEach((rotation, index) => {
    const slash = document.createElement("div");
    slash.className = "waft-combat-raptorial-slash";
    slash.style.setProperty("--rotation", `${rotation}deg`);
    slash.style.top = `${35 + index * 8}%`;
    slash.style.animationDelay = `${index * 105}ms`;
    layer.appendChild(slash);
  });
}

function populateAnubis(actorLayer, targetLayer) {
  const staff = document.createElement("div");
  staff.className = "waft-combat-staff";
  targetLayer.appendChild(staff);

  for (let i = 0; i < 8; i += 1) {
    const orb = document.createElement("div");
    orb.className = "waft-combat-drain-orb";
    orb.style.left = `${18 + ((i * 23) % 65)}%`;
    orb.style.top = `${24 + ((i * 17) % 54)}%`;
    orb.style.setProperty("--dx", `${-55 + (i % 4) * 34}px`);
    orb.style.setProperty("--dy", `${-35 - (i % 3) * 24}px`);
    orb.style.animationDelay = `${(i % 4) * 65}ms`;
    targetLayer.appendChild(orb);
  }

  const halo = document.createElement("div");
  halo.className = "waft-combat-impact-ring";
  halo.style.top = "54%";
  actorLayer.appendChild(halo);
}

function populateDeadlyDive(layer) {
  const streak = document.createElement("div");
  streak.className = "waft-combat-dive-streak";
  layer.appendChild(streak);

  const ring = document.createElement("div");
  ring.className = "waft-combat-impact-ring";
  layer.appendChild(ring);
}

function populateDeathRoll(layer) {
  for (let i = 0; i < 3; i += 1) {
    const ring = document.createElement("div");
    ring.className = "waft-combat-roll-ring";
    ring.style.animationDelay = `${i * 80}ms`;
    ring.style.width = `${70 - i * 12}%`;
    ring.style.height = `${34 + i * 9}%`;
    layer.appendChild(ring);
  }
}

function populateBallisticStrike(layer) {
  const line = document.createElement("div");
  line.className = "waft-combat-ballistic-line";
  layer.appendChild(line);

  const ring = document.createElement("div");
  ring.className = "waft-combat-impact-ring";
  ring.style.animationDelay = "120ms";
  layer.appendChild(ring);
}

export function getCombatSignatureVfxDefinition(specialName) {
  const definition = COMBAT_SIGNATURES[specialName];
  return definition ? { ...definition } : null;
}

export async function playCombatSignatureVfx(event, context = {}) {
  if (typeof document === "undefined") return false;

  const definition = getCombatSignatureVfxDefinition(event?.specialName);
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
    if (definition.kind === "anubis-staff") populateAnubis(actorLayer, targetLayer);
  } else {
    const side = definition.focus === "target" ? target : actor;
    const layer = createLocalLayer(getWrap(side, context), definition.kind);
    if (!layer) return false;
    layers = [layer];

    if (definition.kind === "darwinian-expulsion") populateDarwinianExpulsion(layer);
    if (definition.kind === "raptorial-chain") populateRaptorialChain(layer);
    if (definition.kind === "deadly-dive") populateDeadlyDive(layer);
    if (definition.kind === "death-roll") populateDeathRoll(layer);
    if (definition.kind === "ballistic-strike") populateBallisticStrike(layer);
  }

  window.setTimeout(() => layers.forEach((layer) => layer.remove()), definition.duration + 140);
  await delay(definition.duration);
  return true;
}
