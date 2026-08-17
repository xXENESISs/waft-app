// WAFT persistent battle status HUD.
// Shows active mechanical effects directly on each fighter so the player does
// not need to reread the turn log to know what is currently applied.

const STYLE_ID = "waft-battle-status-hud-styles";
let dynamicHudCounter = 0;

const EFFECT_ICONS = {
  bleed: "🩸",
  "deep-bleed": "🩸",
  poison: "☠️",
  perforation: "✹",
  "costal-toxin": "☣️",
  tetrodotoxin: "☣️",
  "evasion-down": "👁️",
  "heavy-evasion-down": "👁️",
  "agility-down": "⬇️",
  blindness: "👁️",
  "irritant-secretion": "🧪",
  destabilization: "🌀",
  anchor: "⚓",
  momentum: "💨",
  "hunting-inertia": "🎯",
  humidity: "💧",
  "predatory-pressure": "🐾",
  "ink-sea": "🌑",
  "refresh-debuff": "⬇️",
  "neurotoxic-injection-debuff": "☣️",
  mutilation: "🩸",
  bite: "🦷",
  "falcon-debuff": "🪶"
};

const EFFECT_LABELS = {
  bleed: "BLEED",
  "deep-bleed": "DEEP BLEED",
  poison: "POISON",
  perforation: "PERF",
  "costal-toxin": "TOXIN",
  tetrodotoxin: "TETRO",
  "evasion-down": "EVA↓",
  "heavy-evasion-down": "EVA↓↓",
  "agility-down": "AGI↓",
  blindness: "BLIND",
  "irritant-secretion": "IRRIT",
  destabilization: "DESTAB",
  anchor: "ANCHOR",
  momentum: "MOM",
  "hunting-inertia": "INERTIA",
  humidity: "HUMID",
  "predatory-pressure": "PRESS",
  "ink-sea": "INK",
  "refresh-debuff": "REF↓",
  "neurotoxic-injection-debuff": "NEURO",
  mutilation: "MUTIL",
  bite: "BITE",
  "falcon-debuff": "FALCON"
};

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .waft-status-hud {
      position: absolute;
      left: 8px;
      right: 8px;
      bottom: 8px;
      z-index: 35;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      pointer-events: none;
    }

    .waft-status-chip {
      min-width: 31px;
      min-height: 29px;
      max-width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 4px 7px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.18);
      background: rgba(5,8,14,.86);
      color: #fff;
      box-shadow: 0 4px 16px rgba(0,0,0,.35);
      backdrop-filter: blur(6px);
      font-family: inherit;
      font-size: 11px;
      font-weight: 900;
      line-height: 1;
      white-space: nowrap;
    }

    .waft-status-chip[data-status-kind="debuff"] {
      border-color: rgba(248,113,113,.42);
      background: rgba(36,10,14,.88);
    }

    .waft-status-chip[data-status-kind="buff"] {
      border-color: rgba(74,222,128,.40);
      background: rgba(8,33,22,.88);
    }

    .waft-status-name {
      font-size: 8px;
      font-weight: 950;
      letter-spacing: .045em;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .waft-status-turns {
      min-width: 12px;
      opacity: .88;
      font-size: 8px;
      font-weight: 950;
      text-align: center;
    }

    @media (max-width: 700px) {
      .waft-status-hud {
        left: 5px;
        right: 5px;
        bottom: 5px;
        gap: 3px;
      }

      .waft-status-chip {
        min-height: 25px;
        padding: 3px 5px;
        gap: 3px;
      }

      .waft-status-name,
      .waft-status-turns {
        font-size: 7px;
      }
    }
  `;

  document.head.appendChild(style);
}

function getWrap(side) {
  return document.getElementById(side === "player" ? "playerImageWrap" : "enemyImageWrap");
}

function normalizeWrap(wrap) {
  if (!wrap) return null;

  if (getComputedStyle(wrap).position === "static") {
    wrap.style.position = "relative";
  }

  return wrap;
}

function getOrCreateHudInWrap(wrap, hudId = null) {
  const target = normalizeWrap(wrap);
  if (!target) return null;

  let hud = hudId ? document.getElementById(hudId) : target.querySelector(":scope > .waft-status-hud");

  if (!hud) {
    hud = document.createElement("div");
    hud.id = hudId || `waftDynamicStatusHud${++dynamicHudCounter}`;
    hud.className = "waft-status-hud";
    target.appendChild(hud);
  }

  return hud;
}

function effectIcon(effect) {
  if (!effect) return "◉";
  if (EFFECT_ICONS[effect.id]) return EFFECT_ICONS[effect.id];

  const name = String(effect.name || "").toLowerCase();
  if (name.includes("bleed")) return "🩸";
  if (name.includes("poison") || name.includes("toxin") || name.includes("neurotoxic")) return "☣️";
  if (name.includes("blind") || name.includes("vision")) return "👁️";
  if (name.includes("burn")) return "🔥";
  if (name.includes("stun") || name.includes("paraly")) return "⚡";
  if (name.includes("humidity")) return "💧";
  if (name.includes("anchor")) return "⚓";
  if (name.includes("momentum") || name.includes("inertia")) return "💨";
  if (name.includes("shell") || name.includes("guard") || name.includes("defense")) return "🛡️";
  return "◉";
}

function effectShortName(effect) {
  const id = String(effect?.id || "").toLowerCase();
  if (EFFECT_LABELS[id]) return EFFECT_LABELS[id];

  const raw = String(effect?.name || effect?.id || "").trim();
  if (!raw) return "";

  const firstWord = raw.split(/\s+/)[0].replace(/[^a-z0-9↓↑-]/gi, "").toUpperCase();
  return firstWord.length <= 9 ? firstWord : "";
}

function effectKind(effect) {
  const modifiers = effect?.modifiers || {};
  const values = Object.values(modifiers).filter((value) => typeof value === "number");

  if (values.some((value) => value < 0)) return "debuff";
  if (values.some((value) => value > 0)) return "buff";
  return "status";
}

function effectTurns(effect) {
  const duration = Number(effect?.duration);
  if (!Number.isFinite(duration) || duration >= 90) return "";
  return Math.max(0, duration);
}

function effectBadge(effect) {
  const stacks = Number(effect?.stacks);
  if (Number.isFinite(stacks) && stacks > 0) return `×${stacks}`;

  const turns = effectTurns(effect);
  return turns === "" ? "" : `${turns}T`;
}

function modifierText(modifiers = {}) {
  const labels = {
    attackPct: "ATK",
    defensePct: "DEF",
    speedPct: "SPD",
    agilityPct: "AGI",
    techniquePct: "TEC",
    explosivenessPct: "EXP",
    precisionPct: "PRE",
    evasionPct: "EVA",
    damagePct: "DMG"
  };

  return Object.entries(modifiers)
    .filter(([, value]) => typeof value === "number" && value !== 0)
    .map(([key, value]) => `${labels[key] || key} ${value > 0 ? "+" : ""}${value}%`)
    .join(" · ");
}

function effectTooltip(effect) {
  const parts = [effect?.name || effect?.id || "Status"];
  const turns = effectTurns(effect);
  const stacks = Number(effect?.stacks);
  const modifiers = modifierText(effect?.modifiers);

  if (Number.isFinite(stacks) && stacks > 0) parts.push(`${stacks} stack${stacks === 1 ? "" : "s"}`);
  if (turns !== "") parts.push(`${turns} turn${turns === 1 ? "" : "s"} remaining`);
  if (modifiers) parts.push(modifiers);
  return parts.join(" — ");
}

function createChip(effect) {
  const chip = document.createElement("div");
  chip.className = "waft-status-chip";
  chip.dataset.statusId = effect?.id || "unknown";
  chip.dataset.statusKind = effectKind(effect);
  chip.title = effectTooltip(effect);
  chip.setAttribute("aria-label", chip.title);

  const icon = document.createElement("span");
  icon.className = "waft-status-icon";
  icon.textContent = effectIcon(effect);
  chip.appendChild(icon);

  const shortName = effectShortName(effect);
  if (shortName) {
    const label = document.createElement("span");
    label.className = "waft-status-name";
    label.textContent = shortName;
    chip.appendChild(label);
  }

  const badge = effectBadge(effect);
  if (badge) {
    const count = document.createElement("span");
    count.className = "waft-status-turns";
    count.textContent = badge;
    chip.appendChild(count);
  }

  return chip;
}

export function renderFighterStatusHudInto(fighter, wrap, options = {}) {
  ensureStyles();
  const hud = getOrCreateHudInWrap(wrap, options.hudId || null);
  if (!hud) return false;

  hud.replaceChildren();
  const effects = Array.isArray(fighter?.effects) ? fighter.effects : [];

  for (const effect of effects) {
    hud.appendChild(createChip(effect));
  }

  return true;
}

export function renderFighterStatusHud(fighter, side) {
  const wrap = getWrap(side);
  const hudId = side === "player" ? "playerStatusHud" : "enemyStatusHud";
  return renderFighterStatusHudInto(fighter, wrap, { hudId });
}

export function renderBattleStatusHuds(battle, options = {}) {
  if (!battle) return false;

  const playerSide = options.playerSide || "fighterA";
  const player = playerSide === "fighterB" ? battle.fighterB : battle.fighterA;
  const enemy = playerSide === "fighterB" ? battle.fighterA : battle.fighterB;

  renderFighterStatusHud(player, "player");
  renderFighterStatusHud(enemy, "enemy");
  return true;
}

export function clearBattleStatusHuds() {
  document.getElementById("playerStatusHud")?.replaceChildren();
  document.getElementById("enemyStatusHud")?.replaceChildren();
}
