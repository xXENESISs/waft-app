import { animals } from "./animals.js";
import {
  createBattle,
  resolveTurn,
  canUseAction,
  getEffectiveStat
} from "./battle-engine.js";

let currentBattle = null;
let playerId = null;
let enemyId = null;

let lastPlayerAction = "-";
let lastEnemyAction = "-";
let lastTurnOutcome = "-";
let lastTurnSummaryLines = ["Start a battle to begin."];

let playerFlipped = false;
let enemyFlipped = true;

let isAnimatingTurn = false;
let summaryAnimationToken = 0;

let socket = null;
let multiplayerRoomCode = null;
let multiplayerPlayerNumber = null;
let multiplayerPlayerSocketId = null;
let multiplayerPlayer1SocketId = null;
let multiplayerPlayer2SocketId = null;
let isMultiplayer = false;
let isWaitingForOpponentAction = false;

const TYPEWRITER_CHAR_DELAY = 18;
const TYPEWRITER_LINE_PAUSE = 450;

const ACTION_POOL = ["normal", "quick", "precise", "explosive", "concentration", "special"];

const ACTION_INFO = {
  normal: {
    title: "Normal Attack",
    desc: "Balanced attack. Standard damage, normal priority, low stamina cost. Cost 5"
  },
  quick: {
    title: "Quick Attack",
    desc: "Acts before normal attacks thanks to higher priority. Cost 20"
  },
  precise: {
    title: "Precise Attack",
    desc: "Higher accuracy (+20% hit chance) and +10% damage. Cost 20"
  },
  explosive: {
    title: "Explosive Attack",
    desc: "Higher crit pressure (+20% critical chance) and +20% damage. Cost 30"
  },
  concentration: {
    title: "Concentration",
    desc: "Restores 20 Life and 20 Stamina, and grants +10% Defense for the turn. Cost 0"
  }
};

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function prettyActionLabel(action, fighter = null) {
  if (action === "special" && fighter?.special?.name) {
    return fighter.special.name;
  }

  const labels = {
    normal: "Normal Attack",
    quick: "Quick Attack",
    precise: "Precise Attack",
    explosive: "Explosive Attack",
    concentration: "Concentration",
    special: "Special Attack"
  };

  return labels[action] ?? action;
}

function getBiomeRelation(fighter, biome) {
  const animal = animals[fighter.id];
  if (!animal?.biomes) return "Neutral";

  if (animal.biomes.favorable?.includes(biome)) return "Favorable";
  if (animal.biomes.unfavorable?.includes(biome)) return "Unfavorable";
  return "Neutral";
}

function getBattleFighters() {
  if (!currentBattle) return { player: null, enemy: null };

  const player =
    currentBattle.fighterA.id === playerId
      ? currentBattle.fighterA
      : currentBattle.fighterB;

  const enemy =
    player === currentBattle.fighterA
      ? currentBattle.fighterB
      : currentBattle.fighterA;

  return { player, enemy };
}

function percent(current, max) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}

function getImageCandidates(id, animal) {
  const category = animal?.category ?? "";
  const direct = `./images/animals/${category}/${id}.png`;

  const legacy = {
    "sumatran-tiger": ["./images/animals/mammals/sumatran-tiger.png"],
    walrus: ["./images/animals/fish/walrus.png"],
    "shima-enaga": ["./images/animals/birds/shima-enaga.png"],
    "mantis-shrimp": ["./images/animals/fish/mantis-shrimp.png"],
    "dung-beetle": ["./images/animals/arthropods/dung-beetle.png"],
    caiman: ["./images/animals/reptiles/black-caiman.png"],
    axolotl: ["./images/animals/amphibians/axolotl.png"],
    "emerald-wasp": ["./images/animals/arthropods/emerald-jewel-wasp.png"],
    "peregrine-falcon": ["./images/animals/birds/peregrine-falcon.png"],
    sailfish: ["./images/animals/fish/sailfish.png"],
    "tibetan-macaque": ["./images/animals/mammals/tibetan-macaque.png"],
    iguana: ["./images/animals/reptiles/green-iguana.png"],
    "japanese-fire-bellied-newt": ["./images/animals/amphibians/japanese-fire-bellied-newt.png"],
    "honey-badger": ["./images/animals/mammals/honey-badger.png"],
    pufferfish: ["./images/animals/fish/pufferfish.png"]
  };

  return [direct, ...(legacy[id] ?? [])];
}

function loadFighterImage(imgEl, fighterId) {
  const animal = animals[fighterId];
  const candidates = getImageCandidates(fighterId, animal);
  let index = 0;

  function tryNext() {
    if (index >= candidates.length) {
      imgEl.removeAttribute("src");
      return;
    }

    imgEl.src = candidates[index];
    index += 1;
  }

  imgEl.onerror = tryNext;
  tryNext();
}

function applyFlipStates() {
  const playerImg = document.getElementById("playerImage");
  const enemyImg = document.getElementById("enemyImage");

  playerImg.classList.toggle("flipped", playerFlipped);
  enemyImg.classList.toggle("flipped", enemyFlipped);
}

function renderEffects(containerId, fighter) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!fighter || !fighter.effects || fighter.effects.length === 0) {
    const pill = document.createElement("div");
    pill.className = "status-pill";
    pill.textContent = "No effects";
    container.appendChild(pill);
    return;
  }

  fighter.effects.forEach((effect) => {
    const pill = document.createElement("div");
    pill.className = "status-pill";
    pill.textContent = `${effect.name} (${effect.duration === 99 ? "∞" : effect.duration})`;
    container.appendChild(pill);
  });
}

function formatStatArrowLine(fighter, statKey, label) {
  const animal = animals[fighter.id];
  const baseValue = animal.stats[statKey];

  const currentValue = ["attack", "defense", "speed", "agility", "technique", "explosiveness"].includes(statKey)
    ? Math.round(getEffectiveStat(fighter, statKey, currentBattle) * 10) / 10
    : fighter.stats[statKey];

  const roundedBase = Math.round(baseValue * 10) / 10;
  const roundedCurrent = Math.round(currentValue * 10) / 10;

  if (roundedBase === roundedCurrent) {
    return `${label}: ${roundedBase}`;
  }

  const diffPct = Math.round(((roundedCurrent - roundedBase) / roundedBase) * 100);
  return `${label}: ${roundedBase} → ${roundedCurrent} (${diffPct > 0 ? "+" : ""}${diffPct}%)`;
}

function getEffectDurationLines(fighter, battle) {
  const lines = [];

  if (!fighter.effects || fighter.effects.length === 0) {
    return "None";
  }

  fighter.effects.forEach((effect) => {
    const turnsLeft = effect.duration === 99 ? "∞" : effect.duration;
    lines.push(`${effect.name}: ${turnsLeft} turn${turnsLeft === 1 ? "" : "s"} left`);
  });

  return lines.join("\n");
}

function getBattlefieldDurationLines(battle, fighter) {
  const lines = [];

  if (!battle?.battleEffects || battle.battleEffects.length === 0) {
    return "None";
  }

  battle.battleEffects.forEach((effect) => {
    const turnsLeft = effect.duration === 99 ? "∞" : effect.duration;
    lines.push(`${effect.name}: ${turnsLeft} turn${turnsLeft === 1 ? "" : "s"} left`);
  });

  return lines.join("\n");
}

function getExtraResourceText(fighter) {
  if (!fighter) return "";

  if (fighter.passive && fighter.passive.id === "persistent-harassment") {
    return "Loot: " + fighter.macaqueLoot + "\nChain: " + fighter.macaqueHitChain;
  }

  if (fighter.passive && fighter.passive.id === "suffocating-humidity") {
    var quickDone = fighter.iguanaProgress && fighter.iguanaProgress.quick ? "YES" : "NO";
    var preciseDone = fighter.iguanaProgress && fighter.iguanaProgress.precise ? "YES" : "NO";
    var explosiveDone = fighter.iguanaProgress && fighter.iguanaProgress.explosive ? "YES" : "NO";

    var progressCount = 0;
    if (fighter.iguanaProgress && fighter.iguanaProgress.quick) progressCount += 1;
    if (fighter.iguanaProgress && fighter.iguanaProgress.precise) progressCount += 1;
    if (fighter.iguanaProgress && fighter.iguanaProgress.explosive) progressCount += 1;

    var humidityEffect = null;

    if (fighter.effects && fighter.effects.length > 0) {
      for (var i = 0; i < fighter.effects.length; i++) {
        if (fighter.effects[i].id === "humidity") {
          humidityEffect = fighter.effects[i];
          break;
        }
      }
    }

    if (humidityEffect) {
      return (
        "Humidity: ACTIVE (" +
        humidityEffect.duration +
        " turn" +
        (humidityEffect.duration === 1 ? "" : "s") +
        ")" +
        "\nQuick: YES  Precise: YES  Explosive: YES"
      );
    }

    return (
      "Humidity: " +
      progressCount +
      "/3" +
      "\nQuick: " +
      quickDone +
      "  Precise: " +
      preciseDone +
      "  Explosive: " +
      explosiveDone
    );
  }

  return "";
}

function formatTooltip(fighter) {
  if (!fighter || !currentBattle) return "";

  const animal = animals[fighter.id];

  const passiveText = animal.passive
    ? `${animal.passive.name}\n${animal.passive.description}`
    : "None";

  const specialText = animal.special
    ? `${animal.special.name}\n${animal.special.description}`
    : "None";

  const macaqueExtra =
    fighter.passive?.id === "persistent-harassment"
      ? `
    <div class="tooltip-section">
      <div class="tooltip-label">Loot</div>
      <div class="tooltip-text">Stored loot: ${fighter.macaqueLoot}\nHit chain: ${fighter.macaqueHitChain}</div>
    </div>
  `
      : "";

  const iguanaExtra =
    fighter.passive?.id === "suffocating-humidity"
      ? `
    <div class="tooltip-section">
      <div class="tooltip-label">Humidity Progress</div>
      <div class="tooltip-text">Quick hit: ${fighter.iguanaProgress?.quick ? "Yes" : "No"}\nPrecise hit: ${fighter.iguanaProgress?.precise ? "Yes" : "No"}\nExplosive hit: ${fighter.iguanaProgress?.explosive ? "Yes" : "No"}</div>
    </div>
  `
      : "";

  return `
    <h3>${animal.name}</h3>

    <div class="tooltip-section">
      <div class="tooltip-label">Passive</div>
      <div class="tooltip-text">${passiveText}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Special</div>
      <div class="tooltip-text">${specialText}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Stats</div>
      <div class="tooltip-text">${formatStatArrowLine(fighter, "life", "Life")}
${formatStatArrowLine(fighter, "attack", "Attack")}
${formatStatArrowLine(fighter, "defense", "Defense")}
${formatStatArrowLine(fighter, "resistance", "Resistance")}
${formatStatArrowLine(fighter, "technique", "Technique")}
${formatStatArrowLine(fighter, "speed", "Speed")}
${formatStatArrowLine(fighter, "agility", "Agility")}
${formatStatArrowLine(fighter, "explosiveness", "Explosiveness")}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Fighter Effects</div>
      <div class="tooltip-text">${getEffectDurationLines(fighter, currentBattle)}</div>
    </div>

    <div class="tooltip-section">
      <div class="tooltip-label">Battlefield Effects</div>
      <div class="tooltip-text">${getBattlefieldDurationLines(currentBattle, fighter)}</div>
    </div>

    ${macaqueExtra}
    ${iguanaExtra}
  `;
}

function renderFighter(prefix, fighter) {
  const hpPct = percent(fighter.hp, fighter.maxHp);
  const staminaPct = percent(fighter.stamina, fighter.maxStamina);

  document.getElementById(`${prefix}Name`).textContent = fighter.name;

  document.getElementById(`${prefix}HpText`).textContent =
    `${fighter.hp}/${fighter.maxHp} (${hpPct}%)`;
  document.getElementById(`${prefix}HpBar`).style.width = `${hpPct}%`;

  document.getElementById(`${prefix}StaminaText`).textContent =
    `${fighter.stamina}/${fighter.maxStamina} (${staminaPct}%)`;
  document.getElementById(`${prefix}StaminaBar`).style.width = `${staminaPct}%`;

  const specialMax = fighter.special?.chargeHits ?? 0;
  const specialReady = specialMax > 0 && fighter.specialCharge >= specialMax;

  document.getElementById(`${prefix}SpecialText`).textContent =
    specialReady ? "READY" : `${fighter.specialCharge}/${specialMax}`;
  document.getElementById(`${prefix}SpecialBar`).style.width =
    `${specialMax > 0 ? percent(fighter.specialCharge, specialMax) : 0}%`;

  const extraResourceEl = document.getElementById(`${prefix}ExtraResource`);
  if (extraResourceEl) {
    const extraResourceText = getExtraResourceText(fighter);

    if (extraResourceText) {
      extraResourceEl.textContent = extraResourceText;
      extraResourceEl.style.display = "block";
    } else {
      extraResourceEl.textContent = "";
      extraResourceEl.style.display = "none";
    }
  }

  renderEffects(`${prefix}Effects`, fighter);
}

function renderTopPanel() {
  if (!currentBattle) return;

  const { player, enemy } = getBattleFighters();

  document.getElementById("turnValue").textContent = currentBattle.turn;
  document.getElementById("biomeValue").textContent = currentBattle.biome?.toUpperCase() ?? "-";
  document.getElementById("biomeStatValue").textContent = currentBattle.biomeStat?.toUpperCase() ?? "-";
  document.getElementById("playerBiomeRelationValue").textContent = getBiomeRelation(player, currentBattle.biome);
  document.getElementById("enemyBiomeRelationValue").textContent = getBiomeRelation(enemy, currentBattle.biome);

  document.getElementById("playerActionValue").textContent = lastPlayerAction;
  document.getElementById("enemyActionValue").textContent = lastEnemyAction;

  const outcomeEl = document.getElementById("turnOutcomeValue");
  if (outcomeEl) {
    outcomeEl.textContent = lastTurnOutcome;
  }

  if (!currentBattle.finished) {
    document.getElementById("resultValue").textContent = "In progress";
  } else if (currentBattle.winner === "draw") {
    document.getElementById("resultValue").textContent = "Draw";
  } else {
    const winner =
      currentBattle.fighterA.id === currentBattle.winner
        ? currentBattle.fighterA.name
        : currentBattle.fighterB.name;
    document.getElementById("resultValue").textContent = winner;
  }
}

function renderSummary() {
  document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");
}

async function typeTurnSummary(lines) {
  const token = ++summaryAnimationToken;
  const box = document.getElementById("turnSummaryBox");

  box.textContent = "";

  for (let i = 0; i < lines.length; i++) {
    if (token !== summaryAnimationToken) return;

    if (box.textContent.length > 0) {
      box.textContent += "\n";
    }

    const line = lines[i];

    for (let j = 0; j < line.length; j++) {
      if (token !== summaryAnimationToken) return;

      box.textContent += line[j];
      await delay(TYPEWRITER_CHAR_DELAY);
    }

    await delay(TYPEWRITER_LINE_PAUSE);
  }
}

function renderLog() {
  const logEl = document.getElementById("battleLog");
  if (!currentBattle) {
    logEl.textContent = "";
    return;
  }

  logEl.textContent = currentBattle.log
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");

  logEl.scrollTop = logEl.scrollHeight;
}

function updateSpecialButton(player) {
  const specialBtn = document.getElementById("specialActionBtn");
  const titleEl = document.getElementById("btn-special-title");
  const descEl = document.getElementById("btn-special-desc");

  if (!player?.special) {
    titleEl.textContent = "Special Attack";
    descEl.textContent = "No special available.";
    specialBtn.classList.remove("special-ready");
    return;
  }

  const needed = player.special.chargeHits ?? 0;
  const ready = player.specialCharge >= needed;

  titleEl.textContent = player.special.name;
  descEl.textContent = `${player.special.description} ${ready ? "READY" : `Charge: ${player.specialCharge}/${needed}`}`;

  if (ready) {
    specialBtn.classList.add("special-ready");
  } else {
    specialBtn.classList.remove("special-ready");
  }
}

function updateStaticActionButtons() {
  document.getElementById("btn-normal-title").textContent = ACTION_INFO.normal.title;
  document.getElementById("btn-normal-desc").textContent = ACTION_INFO.normal.desc;

  document.getElementById("btn-quick-title").textContent = ACTION_INFO.quick.title;
  document.getElementById("btn-quick-desc").textContent = ACTION_INFO.quick.desc;

  document.getElementById("btn-precise-title").textContent = ACTION_INFO.precise.title;
  document.getElementById("btn-precise-desc").textContent = ACTION_INFO.precise.desc;

  document.getElementById("btn-explosive-title").textContent = ACTION_INFO.explosive.title;
  document.getElementById("btn-explosive-desc").textContent = ACTION_INFO.explosive.desc;

  document.getElementById("btn-concentration-title").textContent = ACTION_INFO.concentration.title;
  document.getElementById("btn-concentration-desc").textContent = ACTION_INFO.concentration.desc;
}

function updateActionButtons() {
  const { player } = getBattleFighters();
  const buttons = document.querySelectorAll(".action-btn");

  if (
    !currentBattle ||
    !player ||
    currentBattle.finished ||
    isAnimatingTurn ||
    isWaitingForOpponentAction
  ) {
    buttons.forEach((btn) => (btn.disabled = true));
    return;
  }

  buttons.forEach((btn) => {
    const action = btn.dataset.action;
    btn.disabled = !canUseAction(player, action, currentBattle);
  });
}

function renderBattle() {
  if (!currentBattle) return;

  const { player, enemy } = getBattleFighters();

  renderTopPanel();
  renderFighter("player", player);
  renderFighter("enemy", enemy);
  renderSummary();
  renderLog();
  updateStaticActionButtons();
  updateSpecialButton(player);
  updateActionButtons();

  document.getElementById("playerTooltip").innerHTML = formatTooltip(player);
  document.getElementById("enemyTooltip").innerHTML = formatTooltip(enemy);

  const endMessage = document.getElementById("endMessage");
  if (!currentBattle.finished) {
    endMessage.textContent = "";
    return;
  }

  if (currentBattle.winner === "draw") {
    endMessage.textContent = "The battle ends in a draw.";
    return;
  }

  const winnerName =
    currentBattle.fighterA.id === currentBattle.winner
      ? currentBattle.fighterA.name
      : currentBattle.fighterB.name;

  endMessage.textContent = `${winnerName} wins the battle.`;
}

function chooseEnemyAction(fighter) {
  const possible = ACTION_POOL.filter((action) =>
    canUseAction(fighter, action, currentBattle)
  );

  if (possible.length === 0) {
    return "concentration";
  }

  if (
    fighter.special &&
    fighter.specialCharge >= fighter.special.chargeHits &&
    canUseAction(fighter, "special", currentBattle)
  ) {
    return "special";
  }

  return randomChoice(possible);
}

function buildTurnSummary(newLines) {
  const filtered = [];
  const summary = [];

  const fightersWhoUsedSpecial = new Set();

  for (const line of newLines) {
    if (line.includes("gains effect: Neurotoxic Injection")) continue;
    if (line.includes("calc →")) continue;
    if (line.startsWith("Damage calc")) continue;
    if (line.startsWith("Critical calc")) continue;
    if (line.includes("→ HP:")) continue;
    if (line.startsWith("--- Turn")) continue;

    filtered.push(line);

    const specialUseMatch =
      line.match(/^(.+?) uses Lethal Bite\b/) ||
      line.match(/^(.+?) uses Arctic Storm\b/) ||
      line.match(/^(.+?) uses Illusory Dance\b/) ||
      line.match(/^(.+?) uses Ballistic Strike\b/) ||
      line.match(/^(.+?) uses Dung Throw\b/) ||
      line.match(/^(.+?) uses Death Roll\b/) ||
      line.match(/^(.+?) uses Total Regeneration\b/) ||
      line.match(/^(.+?) uses Nervous Disruption\b/) ||
      line.match(/^(.+?) uses Deadly Dive\b/) ||
      line.match(/^(.+?) uses Phantom Current\b/) ||
      line.match(/^(.+?) uses Looting Burst\b/) ||
      line.match(/^(.+?) uses Refresh\b/) ||
      line.match(/^(.+?) uses Mutilation\b/) ||
      line.match(/^(.+?) uses Neurotoxic Injection \(Tetrodotoxin\)\b/) ||
      line.match(/^(.+?) uses Overinflation\b/) ||
      line.match(/^(.+?) explodes\b/);

    if (specialUseMatch) {
      fightersWhoUsedSpecial.add(specialUseMatch[1]);
    }
  }

  for (const line of filtered) {
    if (
      line.includes("Honey Badger has fallen below") &&
      line.includes("fatigue")
    ) {
      summary.push(
        "Honey Badger enters Savage Endurance: fatigue has no effect."
      );
      continue;
    }

    if (
      line.includes("enters Savage Endurance") &&
      line.includes("below 25% HP")
    ) {
      summary.push(
        "Honey Badger enters Savage Endurance: below 25% HP, it becomes immune to critical hits and gains +20% Attack and +20% Explosiveness."
      );
      continue;
    }

    const cannotUseSpecialMatch = line.match(/^(.+?) cannot use Special Attack\.$/);

    if (cannotUseSpecialMatch) {
      const fighterName = cannotUseSpecialMatch[1];

      if (fightersWhoUsedSpecial.has(fighterName)) {
        continue;
      }
    }

    const important =
      line.includes(" uses ") ||
      line.includes(" hits ") ||
      line.includes("(CRITICAL)") ||
      line.includes("misses") ||
      line.includes("gains effect") ||
      line.includes("reduces") ||
      line.includes("Battle effect activated") ||
      line.includes("Battle effect expired") ||
      line.includes("suffers") ||
      line.includes("restores") ||
      line.includes("has expired") ||
      line.includes("Special Attack is ready") ||
      line.includes("has been defeated") ||
      line.includes("Illusory Dance") ||
      line.includes("Hail begins") ||
      line.includes("cannot use") ||
      line.includes("Inverted Inertia") ||
      line.includes("counterattacks") ||
      line.includes("Momentum rises") ||
      line.includes("Momentum resets") ||
      line.includes("Hunting Inertia rises") ||
      line.includes("Hunting Inertia grants") ||
      line.includes("Hunting Inertia resets") ||
      line.includes("Marine Echo triggers") ||
      line.includes("Phantom Current") ||
      line.includes("Persistent Harassment") ||
      line.includes("steals") ||
      line.includes("stores loot") ||
      line.includes("Looting Burst") ||
      line.includes("fulfills Humidity requirement") ||
      line.includes("activates Suffocating Humidity") ||
      line.includes("Suffocating Humidity restores") ||
      line.includes("Refresh") ||
      line.includes("Mutilation") ||
      line.includes("Neurotoxic Injection (Tetrodotoxin)") ||
      line.includes("Overinflation") ||
      line.includes("Tetrodotoxin") ||
      line.includes("explodes");

    if (important) {
      summary.push(line);
    }
  }

  return summary.length > 0 ? summary : ["No major events this turn."];
}

function deriveTurnOutcome(summaryLines) {
  const joined = summaryLines.join(" ");

  if (joined.includes("has been defeated")) return "Defeat";
  if (joined.includes("(CRITICAL)")) return "Critical Hit";
  if (joined.includes("Mutilation")) return "Special Triggered";
  if (joined.includes("Neurotoxic Injection (Tetrodotoxin)")) return "Special Triggered";
  if (joined.includes("Overinflation")) return "Special Triggered";
  if (joined.includes("explodes")) return "Special Triggered";
  if (joined.includes("Refresh")) return "Special Triggered";
  if (joined.includes("Looting Burst")) return "Special Triggered";
  if (joined.includes("Phantom Current")) return "Special Triggered";
  if (joined.includes("Deadly Dive")) return "Special Triggered";
  if (joined.includes("Nervous Disruption")) return "Special Triggered";
  if (joined.includes("Total Regeneration")) return "Special Triggered";
  if (joined.includes("Death Roll")) return "Special Triggered";
  if (joined.includes("Dung Throw")) return "Special Triggered";
  if (joined.includes("Ballistic Strike")) return "Special Triggered";
  if (joined.includes("Illusory Dance")) return "Special Triggered";
  if (joined.includes("Arctic Storm")) return "Special Triggered";
  if (joined.includes("Lethal Bite")) return "Special Triggered";
  if (joined.includes("misses")) return "Miss";
  if (joined.includes("Battle effect activated")) return "Battlefield Changed";
  if (joined.includes("restores 20 Life and 20 Stamina")) return "Concentration";
  if (joined.includes("gains effect")) return "Effect Applied";
  if (joined.includes("suffers")) return "Damage / Effect Tick";
  if (joined.includes("activates Suffocating Humidity")) return "Humidity Activated";
  if (joined.includes("cannot use")) return "Action Blocked";

  return "Resolved";
}

function clearAnimationClasses() {
  const playerWrap = document.getElementById("playerImageWrap");
  const enemyWrap = document.getElementById("enemyImageWrap");

  const classes = [
    "move-attacker-left",
    "move-attacker-right",
    "hit-defender-left",
    "hit-defender-right",
    "hit-defender-left-crit",
    "hit-defender-right-crit"
  ];

  playerWrap.classList.remove(...classes);
  enemyWrap.classList.remove(...classes);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runShakeSequence(newLines, player, enemy) {
  clearAnimationClasses();

  const playerWrap = document.getElementById("playerImageWrap");
  const enemyWrap = document.getElementById("enemyImageWrap");

  const events = [];

  for (const line of newLines) {
    let match;

    match = line.match(/^(.+?) uses (.+?) but misses (.+?)\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[3],
        hit: false,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) hits (.+?) with (.+?) for (\d+) damage( \(CRITICAL\))?\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[2],
        hit: true,
        critical: Boolean(match[5])
      });
      continue;
    }

    match = line.match(/^(.+?) uses Lethal Bite, dealing (\d+) damage, ignoring 50% Defense and applying Bleed\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[1] === player.name ? enemy.name : player.name,
        hit: true,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) uses Ballistic Strike and deals (\d+) damage( \(CRITICAL\))?\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[1] === player.name ? enemy.name : player.name,
        hit: true,
        critical: Boolean(match[3])
      });
      continue;
    }

    match = line.match(/^(.+?) uses Ballistic Strike but misses\./);
    if (match) {
      events.push({
        actor: match[1],
        target: match[1] === player.name ? enemy.name : player.name,
        hit: false,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) uses Looting Burst, consuming (\d+) loot to deal (\d+) damage\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[1] === player.name ? enemy.name : player.name,
        hit: true,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) strikes from Phantom Current for (\d+) damage\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[1] === player.name ? enemy.name : player.name,
        hit: true,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) uses Refresh, restoring (\d+) HP and (\d+) Stamina, and reducing (.+?)'s Technique and Agility by 20% for 1 turn\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[4],
        hit: false,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) uses Mutilation, dealing (\d+) damage and applying Mutilation to (.+?)\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[3],
        hit: true,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) uses Neurotoxic Injection \(Tetrodotoxin\), dealing (\d+) damage, reducing (.+?)'s Agility, Technique and Speed by 25% for 1 turn, and applying 30 fixed damage over time\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[3],
        hit: true,
        critical: false
      });
      continue;
    }

    match = line.match(/^(.+?) explodes, dealing (\d+) damage to (.+?) and dropping to 1 HP\.$/);
    if (match) {
      events.push({
        actor: match[1],
        target: match[3],
        hit: true,
        critical: false
      });
      continue;
    }
  }

  for (const event of events) {
    const actorIsPlayer = event.actor === player.name;
    const attackerWrap = actorIsPlayer ? playerWrap : enemyWrap;
    const defenderWrap = actorIsPlayer ? enemyWrap : playerWrap;

    attackerWrap.classList.add(actorIsPlayer ? "move-attacker-left" : "move-attacker-right");
    await delay(220);
    attackerWrap.classList.remove(actorIsPlayer ? "move-attacker-left" : "move-attacker-right");

    if (event.hit) {
      const hitClass = actorIsPlayer
        ? event.critical
          ? "hit-defender-right-crit"
          : "hit-defender-right"
        : event.critical
        ? "hit-defender-left-crit"
        : "hit-defender-left";

      defenderWrap.classList.add(hitClass);
      await delay(event.critical ? 260 : 220);
      defenderWrap.classList.remove(hitClass);
    }

    await delay(60);
  }
}

function startBattle() {
  const playerSelect = document.getElementById("playerFighter");
  const enemySelect = document.getElementById("enemyFighter");

  playerId = playerSelect.value;
  enemyId = enemySelect.value;

  if (playerId === enemyId && !isMultiplayer) {
    alert("Choose two different fighters.");
    return;
  }

  summaryAnimationToken += 1;
  isAnimatingTurn = false;
  isWaitingForOpponentAction = false;

  if (isMultiplayer) {
    if (!multiplayerRoomCode || !socket) {
      alert("Create or join a room first.");
      return;
    }

    lastPlayerAction = "-";
    lastEnemyAction = "-";
    lastTurnOutcome = "Waiting";
    lastTurnSummaryLines = ["Fighter selected. Waiting for opponent..."];

    socket.emit("selectFighter", {
      roomCode: multiplayerRoomCode,
      fighterId: playerId
    });

    document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");
    updateActionButtons();
    return;
  }

  currentBattle = createBattle(playerId, enemyId);

  playerFlipped = false;
  enemyFlipped = true;

  loadFighterImage(document.getElementById("playerImage"), playerId);
  loadFighterImage(document.getElementById("enemyImage"), enemyId);
  applyFlipStates();

  lastPlayerAction = "-";
  lastEnemyAction = "-";
  lastTurnOutcome = "-";
  lastTurnSummaryLines = ["Battle started. Choose your first action."];

  renderBattle();
}

async function resolveLocalTurn(playerAction) {
  if (!currentBattle || currentBattle.finished || isAnimatingTurn) return;

  isAnimatingTurn = true;

  const { player, enemy } = getBattleFighters();
  const enemyAction = chooseEnemyAction(enemy);
  const oldLogLength = currentBattle.log.length;

  lastPlayerAction = prettyActionLabel(playerAction, player);
  lastEnemyAction = prettyActionLabel(enemyAction, enemy);

  if (currentBattle.fighterA.id === player.id) {
    resolveTurn(currentBattle, playerAction, enemyAction);
  } else {
    resolveTurn(currentBattle, enemyAction, playerAction);
  }

  const newLines = currentBattle.log.slice(oldLogLength);
  const summaryLines = buildTurnSummary(newLines);

  lastTurnSummaryLines = [""];
  lastTurnOutcome = deriveTurnOutcome(summaryLines);

  renderBattle();

  await runShakeSequence(newLines, player, enemy);
  await typeTurnSummary(summaryLines);

  lastTurnSummaryLines = summaryLines;
  isAnimatingTurn = false;

  renderBattle();
}

async function resolveMultiplayerTurnFromServer(data) {
  if (!currentBattle || isAnimatingTurn) return;

  isAnimatingTurn = true;
  isWaitingForOpponentAction = false;

  currentBattle = data.battle;

  const ownAction =
    multiplayerPlayerSocketId === data.player1 ? data.action1 : data.action2;

  const opponentAction =
    multiplayerPlayerSocketId === data.player1 ? data.action2 : data.action1;

  const { player, enemy } = getBattleFighters();

  lastPlayerAction = prettyActionLabel(ownAction, player);
  lastEnemyAction = prettyActionLabel(opponentAction, enemy);

  const newLines = data.newLines || [];
  const summaryLines = buildTurnSummary(newLines);

  lastTurnSummaryLines = [""];
  lastTurnOutcome = deriveTurnOutcome(summaryLines);

  renderBattle();

  await runShakeSequence(newLines, player, enemy);
  await typeTurnSummary(summaryLines);

  lastTurnSummaryLines = summaryLines;
  isAnimatingTurn = false;

  renderBattle();
}

async function playTurn(playerAction) {
  if (!currentBattle || currentBattle.finished || isAnimatingTurn || isWaitingForOpponentAction) return;

  if (isMultiplayer) {
    if (!socket || !multiplayerRoomCode) return;

    const { player } = getBattleFighters();

    lastPlayerAction = prettyActionLabel(playerAction, player);
    lastEnemyAction = "Waiting...";
    lastTurnOutcome = "Waiting";
    lastTurnSummaryLines = ["Action selected. Waiting for opponent..."];

    isWaitingForOpponentAction = true;

    renderBattle();

    socket.emit("playerAction", {
      roomCode: multiplayerRoomCode,
      action: playerAction
    });

    return;
  }

  await resolveLocalTurn(playerAction);
}

function initFlipButtons() {
  document.getElementById("playerFlipBtn").addEventListener("click", () => {
    playerFlipped = !playerFlipped;
    applyFlipStates();
  });

  document.getElementById("enemyFlipBtn").addEventListener("click", () => {
    enemyFlipped = !enemyFlipped;
    applyFlipStates();
  });
}

function setupMultiplayer() {
  if (typeof io === "undefined") {
    return;
  }

  socket = io();

  socket.on("connect", () => {
    multiplayerPlayerSocketId = socket.id;
  });

  window.createRoom = function () {
    socket.emit("createRoom");
  };

  window.joinRoom = function () {
    const input = document.getElementById("roomInput");
    const code = input ? input.value.trim() : "";

    if (!code) {
      alert("Enter a room code.");
      return;
    }

    socket.emit("joinRoom", code);
  };

  socket.on("roomCreated", (data) => {
    multiplayerRoomCode = data.roomCode;
    multiplayerPlayerNumber = data.playerNumber;
    isMultiplayer = true;

    alert("Sala creada: " + multiplayerRoomCode);

    lastTurnSummaryLines = [`Room created: ${multiplayerRoomCode}. Waiting for opponent...`];
    document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");
  });

  socket.on("roomJoined", (data) => {
    multiplayerRoomCode = data.roomCode;
    multiplayerPlayerNumber = data.playerNumber;
    isMultiplayer = true;

    alert("Joined room: " + multiplayerRoomCode);

    lastTurnSummaryLines = [`Joined room: ${multiplayerRoomCode}. Choose your fighter and press Start Battle.`];
    document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");
  });

  socket.on("playersReady", () => {
    isMultiplayer = true;
    lastTurnSummaryLines = ["Both players connected. Choose your fighter and press Start Battle."];
    document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");
  });

  socket.on("fighterSelected", () => {
    lastTurnSummaryLines = ["A fighter has been selected. Waiting for both players..."];
    document.getElementById("turnSummaryBox").textContent = lastTurnSummaryLines.join("\n");
  });

  socket.on("battleStarted", (data) => {
    currentBattle = data.battle;

    multiplayerPlayer1SocketId = data.player1;
    multiplayerPlayer2SocketId = data.player2;

    if (multiplayerPlayerSocketId === data.player1) {
      playerId = data.fighter1;
      enemyId = data.fighter2;
    } else {
      playerId = data.fighter2;
      enemyId = data.fighter1;
    }

    playerFlipped = false;
    enemyFlipped = true;

    loadFighterImage(document.getElementById("playerImage"), playerId);
    loadFighterImage(document.getElementById("enemyImage"), enemyId);
    applyFlipStates();

    lastPlayerAction = "-";
    lastEnemyAction = "-";
    lastTurnOutcome = "-";
    lastTurnSummaryLines = ["Multiplayer battle started. Choose your action."];

    isWaitingForOpponentAction = false;
    isAnimatingTurn = false;
    summaryAnimationToken += 1;

    renderBattle();
  });

  socket.on("waitingForOpponentAction", () => {
    isWaitingForOpponentAction = true;
    updateActionButtons();
  });

  socket.on("turnResolved", async (data) => {
    await resolveMultiplayerTurnFromServer(data);
  });

  socket.on("opponentDisconnected", () => {
    alert("Opponent disconnected.");
    isWaitingForOpponentAction = false;
    isAnimatingTurn = false;
    updateActionButtons();
  });

  socket.on("errorMessage", (msg) => {
    alert(msg);
  });
}

function init() {
  setupMultiplayer();

  document.getElementById("startBattleBtn").addEventListener("click", startBattle);

  document.querySelectorAll(".action-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action;
      await playTurn(action);
    });
    btn.disabled = true;
  });

  initFlipButtons();
  updateStaticActionButtons();
}

init();