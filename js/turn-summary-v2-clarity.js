// WAFT Turn Summary V2 clarity layer.
// Adds information hierarchy without reintroducing the legacy wall of text:
// why a fighter moved first, useful action metadata, and RESULT / EFFECTS groups.

const STYLE_ID = "waft-turn-summary-v2-clarity-styles";

const RESULT_TYPES = new Set([
  "special",
  "critical",
  "hit",
  "damage",
  "miss",
  "heal",
  "ko"
]);

const EFFECT_TYPES = new Set([
  "status-applied",
  "status-expired",
  "buff",
  "debuff",
  "passive",
  "stamina"
]);

const PASSIVE_NAMES = [
  "Silent Stalk",
  "Hunting Inertia",
  "Momentum",
  "Predatory Pressure",
  "Reaction Chamber",
  "Scaled Retreat",
  "Perfect Camouflage",
  "Larval Gestation",
  "Parasitic Control",
  "Blood Pressure",
  "Suffocating Humidity",
  "Neotenic Regeneration",
  "Marine Echo",
  "Inverted Inertia",
  "Algae",
  "Fungi",
  "Bacteria",
  "Mites",
  "Lichens",
  "Colony"
];

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .waft-turn-v2.waft-turn-v2-clarified .waft-turn-v2-header {
      align-items: stretch;
    }

    .waft-turn-v2-order-reason {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .07em;
      text-transform: uppercase;
      color: rgba(248,250,252,.72);
    }

    .waft-turn-v2-order-reason strong {
      color: #fbbf24;
      font-weight: 950;
    }

    .waft-turn-v2-order span {
      display: grid;
      gap: 2px;
      min-width: 126px;
      padding: 6px 8px;
      border: 1px solid rgba(255,255,255,.07);
      opacity: 1;
    }

    .waft-turn-v2-order span:first-child {
      border-color: rgba(245,158,11,.30);
      background: rgba(245,158,11,.08);
    }

    .waft-turn-v2-order-main {
      font-size: 10px;
      font-weight: 950;
      color: #f8fafc;
    }

    .waft-turn-v2-order-action {
      font-size: 9px;
      font-weight: 800;
      color: rgba(226,232,240,.72);
    }

    .waft-turn-v2-order-meta {
      font-size: 8px;
      font-weight: 850;
      letter-spacing: .04em;
      color: rgba(148,163,184,.86);
    }

    .waft-turn-v2-phase-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin: -3px 0 8px;
    }

    .waft-turn-v2-phase-meta span {
      padding: 3px 6px;
      border-radius: 999px;
      background: rgba(255,255,255,.055);
      border: 1px solid rgba(255,255,255,.06);
      font-size: 8px;
      font-weight: 850;
      letter-spacing: .04em;
      color: rgba(226,232,240,.72);
      text-transform: uppercase;
    }

    .waft-turn-v2-group {
      display: grid;
      gap: 5px;
    }

    .waft-turn-v2-group + .waft-turn-v2-group {
      margin-top: 2px;
      padding-top: 7px;
      border-top: 1px solid rgba(255,255,255,.06);
    }

    .waft-turn-v2-group-label {
      font-size: 8px;
      font-weight: 950;
      letter-spacing: .13em;
      color: rgba(148,163,184,.72);
      text-transform: uppercase;
    }

    .waft-turn-v2-group-items {
      display: grid;
      gap: 5px;
    }

    .waft-turn-v2-event.waft-v2-key-result {
      min-height: 40px;
      border: 1px solid rgba(255,255,255,.10);
      background: linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.045));
    }

    .waft-turn-v2-event.waft-v2-key-result[data-event-type="critical"] {
      border-color: rgba(245,158,11,.42);
      background: linear-gradient(135deg, rgba(245,158,11,.17), rgba(120,53,15,.10));
    }

    .waft-turn-v2-event.waft-v2-key-result[data-event-type="ko"] {
      border-color: rgba(248,113,113,.42);
      background: linear-gradient(135deg, rgba(127,29,29,.28), rgba(69,10,10,.12));
    }

    .waft-turn-v2-event.waft-v2-key-result .waft-turn-v2-primary {
      font-size: 14px;
      font-weight: 950;
    }

    .waft-turn-v2-event[data-event-type="status-applied"],
    .waft-turn-v2-event[data-event-type="debuff"] {
      border-left: 2px solid rgba(248,113,113,.45);
    }

    .waft-turn-v2-event[data-event-type="buff"],
    .waft-turn-v2-event[data-event-type="heal"] {
      border-left: 2px solid rgba(74,222,128,.45);
    }

    .waft-turn-v2-primary.waft-v2-compacted {
      letter-spacing: .02em;
    }

    @media (max-width: 700px) {
      .waft-turn-v2-order {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .waft-turn-v2-order span {
        min-width: 0;
      }

      .waft-turn-v2-order-reason {
        font-size: 8px;
      }

      .waft-turn-v2-event.waft-v2-key-result .waft-turn-v2-primary {
        font-size: 12px;
      }
    }
  `;

  document.head.appendChild(style);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function metric(value) {
  const number = finiteNumber(value);
  return number == null ? null : Math.round(number);
}

function buildOrderReason(order) {
  if (!Array.isArray(order) || order.length === 0) return "";
  if (order.length === 1) return "Only action · opponent could not reply";

  const first = order[0];
  const second = order[1];
  const firstPriority = metric(first.priority);
  const secondPriority = metric(second.priority);
  const firstSpeed = metric(first.speed);
  const secondSpeed = metric(second.speed);

  if (firstPriority != null && secondPriority != null && firstPriority !== secondPriority) {
    return `First move · priority ${firstPriority} > ${secondPriority}`;
  }

  if (firstSpeed != null && secondSpeed != null) {
    const comparator = firstSpeed === secondSpeed ? "≥" : ">";
    return `First move · speed ${firstSpeed} ${comparator} ${secondSpeed}`;
  }

  return "Action order resolved";
}

function orderMeta(entry) {
  const parts = [];
  const priority = metric(entry?.priority);
  const speed = metric(entry?.speed);
  if (priority != null) parts.push(`PRI ${priority}`);
  if (speed != null) parts.push(`SPD ${speed}`);
  return parts.join(" · ");
}

function enrichHeader(root, sequence) {
  const header = root.querySelector(".waft-turn-v2-header");
  const round = root.querySelector(".waft-turn-v2-round");
  const order = Array.isArray(sequence?.order) ? sequence.order : [];
  if (!header || !round) return;

  const roundWrap = document.createElement("div");
  roundWrap.className = "waft-turn-v2-round-wrap";
  round.parentNode.insertBefore(roundWrap, round);
  roundWrap.appendChild(round);

  const reason = buildOrderReason(order);
  if (reason) {
    const reasonEl = document.createElement("div");
    reasonEl.className = "waft-turn-v2-order-reason";
    reasonEl.innerHTML = `<strong>⚡</strong><span>${reason}</span>`;
    roundWrap.appendChild(reasonEl);
  }

  const pills = Array.from(root.querySelectorAll(".waft-turn-v2-order > span"));
  pills.forEach((pill, index) => {
    const entry = order[index];
    if (!entry) return;
    pill.replaceChildren();

    const main = document.createElement("div");
    main.className = "waft-turn-v2-order-main";
    main.textContent = `${entry.position ?? index + 1}. ${entry.actorName || "Fighter"}`;

    const action = document.createElement("div");
    action.className = "waft-turn-v2-order-action";
    action.textContent = entry.actionLabel || entry.action || "Action";

    const meta = document.createElement("div");
    meta.className = "waft-turn-v2-order-meta";
    meta.textContent = orderMeta(entry);

    pill.append(main, action);
    if (meta.textContent) pill.appendChild(meta);
  });
}

function matchingOrderEntry(phase, order) {
  if (!phase || !Array.isArray(order)) return null;
  return order.find((entry) => {
    if (phase.actorId && entry.actorId) return phase.actorId === entry.actorId;
    return phase.actorName && entry.actorName && phase.actorName === entry.actorName;
  }) || null;
}

function addPhaseMeta(section, phase, order) {
  if (!section || phase?.type !== "action") return;
  const title = section.querySelector(".waft-turn-v2-phase-title");
  if (!title) return;

  const entry = matchingOrderEntry(phase, order);
  const meta = document.createElement("div");
  meta.className = "waft-turn-v2-phase-meta";

  const values = [];
  const target = phase.targetName || entry?.targetName;
  if (target) values.push(`🎯 ${target}`);

  const priority = metric(phase.priority ?? entry?.priority);
  const speed = metric(phase.speed ?? entry?.speed);
  if (priority != null) values.push(`PRI ${priority}`);
  if (speed != null) values.push(`SPD ${speed}`);

  values.forEach((value) => {
    const chip = document.createElement("span");
    chip.textContent = value;
    meta.appendChild(chip);
  });

  if (meta.childElementCount > 0) title.insertAdjacentElement("afterend", meta);
}

function compactPassiveText(text) {
  const raw = String(text || "").trim();
  const name = PASSIVE_NAMES.find((candidate) => raw.toLowerCase().includes(candidate.toLowerCase()));
  if (!name) return raw.length > 72 ? "PASSIVE TRIGGERED" : raw;

  const fraction = raw.match(/(\d+)\s*\/\s*(\d+)/);
  if (fraction) return `${name.toUpperCase()} · ${fraction[1]}/${fraction[2]}`;

  const stack = raw.match(/(\d+)\s+(stack|stacks|charge|charges|larva|larvae)/i);
  if (stack) return `${name.toUpperCase()} · ${stack[1]} ${stack[2].toUpperCase()}`;

  return name.toUpperCase();
}

function compactStaminaText(text) {
  const raw = String(text || "").trim();
  let match = raw.match(/(?:restores|recovers|gains)\s+(\d+)\s+stamina/i);
  if (match) return `STAMINA +${match[1]}`;

  match = raw.match(/(?:loses|spends|costs?)\s+(\d+)\s+stamina/i);
  if (match) return `STAMINA -${match[1]}`;

  match = raw.match(/(?:steals|absorbs|drains)\s+(\d+)\s+stamina/i);
  if (match) return `DRAINS ${match[1]} STAMINA`;

  return raw.length > 72 ? "STAMINA CHANGED" : raw;
}

function compactLongEvents(section) {
  section.querySelectorAll(".waft-turn-v2-event").forEach((eventEl) => {
    const type = eventEl.dataset.eventType || "";
    const primary = eventEl.querySelector(".waft-turn-v2-primary");
    if (!primary) return;

    const original = primary.textContent?.trim() || "";
    let compacted = original;

    if (type === "passive") compacted = compactPassiveText(original);
    if (type === "stamina") compacted = compactStaminaText(original);

    if (compacted !== original) {
      eventEl.title = original;
      primary.textContent = compacted;
      primary.classList.add("waft-v2-compacted");
    }
  });
}

function keyResult(nodes) {
  const priority = ["ko", "critical", "hit", "damage", "miss", "heal", "special"];
  for (const type of priority) {
    const match = nodes.find((node) => node.dataset.eventType === type);
    if (match) return match;
  }
  return nodes[0] || null;
}

function groupActionEvents(section) {
  const container = section.querySelector(".waft-turn-v2-events");
  if (!container || container.dataset.clarityGrouped === "true") return;

  const eventNodes = Array.from(container.children).filter((node) => node.classList.contains("waft-turn-v2-event"));
  if (!eventNodes.length) return;

  const resultNodes = eventNodes.filter((node) => RESULT_TYPES.has(node.dataset.eventType));
  const effectNodes = eventNodes.filter((node) => EFFECT_TYPES.has(node.dataset.eventType));
  const otherNodes = eventNodes.filter((node) => !RESULT_TYPES.has(node.dataset.eventType) && !EFFECT_TYPES.has(node.dataset.eventType));

  const main = keyResult(resultNodes);
  main?.classList.add("waft-v2-key-result");

  const groups = [
    ["RESULT", resultNodes],
    ["EFFECTS", effectNodes],
    ["OTHER", otherNodes]
  ].filter(([, nodes]) => nodes.length > 0);

  if (groups.length <= 1 && effectNodes.length === 0) return;

  container.replaceChildren();
  groups.forEach(([label, nodes]) => {
    const group = document.createElement("div");
    group.className = "waft-turn-v2-group";

    const labelEl = document.createElement("div");
    labelEl.className = "waft-turn-v2-group-label";
    labelEl.textContent = label;

    const items = document.createElement("div");
    items.className = "waft-turn-v2-group-items";
    nodes.forEach((node) => items.appendChild(node));

    group.append(labelEl, items);
    container.appendChild(group);
  });

  container.dataset.clarityGrouped = "true";
}

export function enhanceTurnSummaryV2(sequence, options = {}) {
  if (typeof document === "undefined" || !sequence) return false;
  ensureStyles();

  const boxId = options.boxId || "turnSummaryV2Host";
  const box = document.getElementById(boxId);
  const root = box?.querySelector(".waft-turn-v2");
  if (!root) return false;

  root.classList.add("waft-turn-v2-clarified");
  enrichHeader(root, sequence);

  const order = Array.isArray(sequence.order) ? sequence.order : [];
  const phases = Array.isArray(sequence.phases) ? sequence.phases : [];
  const sections = Array.from(root.querySelectorAll(".waft-turn-v2-phase"));

  sections.forEach((section) => {
    const index = Number(section.dataset.turnPhaseIndex);
    const phase = Number.isInteger(index) ? phases[index] : null;
    if (!phase) return;

    addPhaseMeta(section, phase, order);
    compactLongEvents(section);
    if (phase.type === "action") groupActionEvents(section);
  });

  return true;
}
