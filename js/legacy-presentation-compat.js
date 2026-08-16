// Compatibility shim used while WAFT's mature battle pages are migrated to
// the structured Turn Summary V2 presentation layer.
//
// It does NOT change combat timing or mechanics. It only removes delays and
// CSS motion belonging to the legacy log/typewriter presentation so the new
// shared VFX is not played on top of an old animation sequence.

const INSTALL_FLAG = "__WAFT_LEGACY_PRESENTATION_COMPAT__";
const LEGACY_FILE_PATTERN = /(test-battle|online-battle|tournament|online-tournament)-legacy\.js/i;
const LEGACY_PRESENTATION_DELAYS = new Set([8, 60, 180, 220, 260]);

export function installLegacyPresentationCompat() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (window[INSTALL_FLAG]) return true;

  window[INSTALL_FLAG] = true;

  const originalSetTimeout = window.setTimeout.bind(window);

  window.setTimeout = function waftV2SetTimeout(handler, timeout = 0, ...args) {
    const delay = Number(timeout);

    if (LEGACY_PRESENTATION_DELAYS.has(delay)) {
      const stack = String(new Error().stack || "");
      if (LEGACY_FILE_PATTERN.test(stack)) {
        return originalSetTimeout(handler, 0, ...args);
      }
    }

    return originalSetTimeout(handler, timeout, ...args);
  };

  const style = document.createElement("style");
  style.id = "waft-v2-legacy-presentation-compat";
  style.textContent = `
    .move-attacker-left,
    .move-attacker-right,
    .hit-defender-left,
    .hit-defender-right,
    .hit-defender-left-crit,
    .hit-defender-right-crit {
      animation: none !important;
    }
  `;
  document.head.appendChild(style);

  return true;
}
