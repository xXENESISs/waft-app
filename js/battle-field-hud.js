// WAFT persistent battlefield HUD.
// Keeps global battle state separate from fighter statuses: biome, modified
// stat, circadian phase and active battlefield effects such as Hail or Oasis.

const STYLE_ID = "waft-battle-field-hud-styles";
let dynamicHudCounter = 0;

const FIELD_ICONS = {
  hail: "🌨️",
  oasis: "🏝️",
  sandstorm: "🌪️"
};

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .waft-field-hud {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
      font-family: inherit;
    }

    .waft-field-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 27px;
      padding: 5px 8px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.055);
      color: #f8fafc;
      font-size: 10px;
      font-weight: 850;
      line-height: 1;
      white-space: nowrap;
    }

    .waft-field-chip.active-effect {
      border-color: rgba(245,158,11,.30);
      background: rgba(245,158,11,.08);
    }

    .waft-field-duration {
      opacity: .68;
      font-size: 9px;
    }
  `;
  document.head.appendChild(style);
}

function upper(value, fallback = "-") {
  const text = String(value || "").trim();
  return text ? text.toUpperCase() : fallback;
}

function circadianPhase(turn) {
  const safeTurn = Math.max(1, Number(turn) || 1);
  const isDay = Math.floor((safeTurn - 1) / 2) % 2 === 0;
  return isDay
    ? { icon: "☀️", label: "DAY" }
    : { icon: "🌙", label: "NIGHT" };
}

function effectDuration(effect) {
  const duration = Number(effect?.duration);
  if (!Number.isFinite(duration) || duration >= 90) return "";
  return `${Math.max(0, duration)}T`;
}

function buildChip(icon, label, options = {}) {
  const chip = document.createElement("div");
  chip.className = `waft-field-chip${options.activeEffect ? " active-effect" : ""}`;

  const iconEl = document.createElement("span");
  iconEl.textContent = icon;
  chip.appendChild(iconEl);

  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  chip.appendChild(labelEl);

  if (options.duration) {
    const durationEl = document.createElement("span");
    durationEl.className = "waft-field-duration";
    durationEl.textContent = options.duration;
    chip.appendChild(durationEl);
  }

  if (options.title) chip.title = options.title;
  return chip;
}

function getOrCreateHud(anchor, hudId = null) {
  if (!anchor) return null;

  const parent = anchor.parentElement || anchor;
  let hud = hudId ? document.getElementById(hudId) : null;

  if (!hud) {
    hud = document.createElement("div");
    hud.id = hudId || `waftBattleFieldHud${++dynamicHudCounter}`;
    hud.className = "waft-field-hud";
    anchor.insertAdjacentElement?.("beforebegin", hud);

    if (!hud.isConnected && parent) {
      parent.insertBefore(hud, anchor);
    }
  }

  return hud;
}

export function renderBattleFieldHudInto(battle, anchor, options = {}) {
  if (!battle || !anchor) return false;
  ensureStyles();

  const hud = getOrCreateHud(anchor, options.hudId || null);
  if (!hud) return false;
  hud.replaceChildren();

  hud.appendChild(
    buildChip("🌍", upper(battle.biome), {
      title: "Current biome"
    })
  );

  hud.appendChild(
    buildChip("⚙️", upper(battle.biomeStat), {
      title: "Biome-modified stat"
    })
  );

  const circadian = circadianPhase(battle.turn);
  hud.appendChild(
    buildChip(circadian.icon, circadian.label, {
      title: `Circadian phase for turn ${battle.turn}`
    })
  );

  const battleEffects = Array.isArray(battle.battleEffects) ? battle.battleEffects : [];

  for (const effect of battleEffects) {
    const icon = FIELD_ICONS[effect?.id] || "✦";
    const name = upper(effect?.name || effect?.id || "FIELD EFFECT");
    const duration = effectDuration(effect);

    hud.appendChild(
      buildChip(icon, name, {
        activeEffect: true,
        duration,
        title: duration ? `${name} · ${duration} remaining` : name
      })
    );
  }

  return true;
}

export function renderBattleFieldHud(battle, options = {}) {
  const anchorId = options.anchorId || "turnSummaryV2Host";
  const anchor = document.getElementById(anchorId);
  if (!anchor) return false;

  return renderBattleFieldHudInto(battle, anchor, {
    hudId: options.hudId || "waftBattleFieldHud"
  });
}
