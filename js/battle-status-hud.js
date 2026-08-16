// WAFT persistent battle status HUD.
// Shows active mechanical effects directly on each fighter so the player does
// not need to reread the turn log to know what is currently applied.

const STYLE_ID = "waft-battle-status-hud-styles";

const EFFECT_ICONS = {
  bleed: "🩸",
  "deep-bleed": "🩸",
  poison: "☠️",
  perforation: "✹",
  "costal-toxin": "☣️",
  "evasion-down": "👁️",
  "heavy-evasion-down": "👁️",
  "agility-down": "⬇️",
  "predatory-pressure": "🐾",
  "ink-sea": "🌑",
  "refresh-debuff": "⬇️",
  "neurotoxic-injection-debuff": "☣️",
  mutilation: "🩸",
  bite: "🦷",
  "falcon-debuff": "🪶"
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
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 4px 7px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.18);
      background: rgba(5,8,14,.82);
      color: #fff;
      box-shadow: 0 4px 16px rgba(0,0,0,.35);
      backdrop-filter: blur(6px);
      font-family: inherit;
      font-size: 12px;
      font-weight: 900;
      line-height: 1;
    }

    .waft-status-chip[data-status-kind="debuff"] {
      border-color: rgba(248,113,113,.34);
    }

    .waft-status-chip[data-status-kind="buff"] {
      border-color: rgba(74,222,128,.34);
    }

    .waft-status-turns {
      min-width: 12px;
      opacity: .82;
      font-size: 9px;
      text-align: center;
    }

    .waft-status-empty {
      display: none;
    }
  `;

  document.head.appendChild(style);
}

function getWrap(side) {
  return document.getElementById(side === "player" ? "playerImageWrap" : "enemyImageWrap");
}

function getOrCreateHud(side) {
  const wrap = getWrap(side);
  if (!wrap) return null;

  if (getComputedStyle(wrap).position === "static") {
    wrap.style.position = "relative";
  }

  const id = side === "player" ? "playerStatusHud" : "enemyStatusHud";
  let hud = document.getElementById(id);

  if (!hud) {
    hud = document.createElement("div");
    hud.id = id;
    hud.className = "waft-status-hud";
    wrap.appendChild(hud);
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
  if (name.includes("shell") || name.includes("guard") || name.includes("defense")) return "🛡️";
  return "◉";
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

function modifierText(modifiers = {}) {
  const labels = {
    attackPct: "ATK",
    defensePct: "DEF",
    speedPct: "SPD",
    agilityPct: "AGI",
    techniquePct: "TEC",
    explosivenessPct: "EXP",
    precisionPct: "PRE",
    evasionPct: "EVA"
  };

  return Object.entries(modifiers)
    .filter(([, value]) => typeof value === "number" && value !== 0)
    .map(([key, value]) => `${labels[key] || key} ${value > 0 ? "+" : ""}${value}%`)
    .join(" · ");
}

function effectTooltip(effect) {
  const parts = [effect?.name || effect?.id || "Status"];
  const turns = effectTurns(effect);
  const modifiers = modifierText(effect?.modifiers);

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

  const icon = document.createElement("span");
  icon.textContent = effectIcon(effect);
  chip.appendChild(icon);

  const turns = effectTurns(effect);
  if (turns !== "") {
    const count = document.createElement("span");
    count.className = "waft-status-turns";
    count.textContent = turns;
    chip.appendChild(count);
  }

  return chip;
}

export function renderFighterStatusHud(fighter, side) {
  ensureStyles();
  const hud = getOrCreateHud(side);
  if (!hud) return false;

  hud.innerHTML = "";
  const effects = Array.isArray(fighter?.effects) ? fighter.effects : [];

  for (const effect of effects) {
    hud.appendChild(createChip(effect));
  }

  return true;
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
