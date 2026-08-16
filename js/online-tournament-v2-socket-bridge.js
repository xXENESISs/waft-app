// Mirrors authoritative Online Tournament turn results into a small browser
// event consumed by the shared V2 presentation layer. Networking remains in
// the mature online-tournament implementation.

const INSTALL_FLAG = "__WAFT_ONLINE_TOURNAMENT_V2_SOCKET_BRIDGE__";
const RESULT_CACHE_KEY = "__WAFT_ONLINE_TOURNAMENT_V2_RESULTS__";
const PRESENTATION_HANDOFF_DELAY = 120;

function getResultCache() {
  if (!window[RESULT_CACHE_KEY]) {
    window[RESULT_CACHE_KEY] = new Map();
  }

  return window[RESULT_CACHE_KEY];
}

function emitResolvedTurn(data) {
  const result = data?.result;
  const battle = result?.battle;
  const sequence = result?.turnSequence || battle?.lastTurnSequence;

  if (!result?.matchId || !battle || !sequence) return;

  const detail = {
    matchId: result.matchId,
    battle,
    sequence,
    result,
    state: data?.state || null
  };

  // Online Tournament rebuilds its active-combat DOM frequently. Keep the
  // authoritative structured result so V2 can immediately restore the compact
  // summary if a later legacy render replaces the summary box.
  getResultCache().set(result.matchId, detail);
  window.__WAFT_ONLINE_TOURNAMENT_V2_LAST_EVENT__ = detail;

  window.dispatchEvent(
    new CustomEvent("waft:online-tournament-turn-resolved", { detail })
  );
}

export function installOnlineTournamentV2SocketBridge() {
  if (typeof window === "undefined" || typeof window.io !== "function") return false;
  if (window[INSTALL_FLAG]) return true;

  window[INSTALL_FLAG] = true;
  getResultCache();
  const originalIo = window.io;

  function wrappedIo(...args) {
    const socket = originalIo(...args);
    if (!socket || typeof socket.on !== "function") return socket;

    const originalOn = socket.on.bind(socket);

    socket.on = function waftOnlineTournamentV2On(eventName, handler) {
      if (eventName !== "onlineTournamentTurnResolved" || typeof handler !== "function") {
        return originalOn(eventName, handler);
      }

      return originalOn(eventName, (data) => {
        const returned = handler(data);

        // The mature tournament handler refreshes the dynamic combat DOM after
        // its short legacy animation pipeline. Hand V2 the result afterwards;
        // the cached result also protects against later DOM rebuilds.
        window.setTimeout(() => emitResolvedTurn(data), PRESENTATION_HANDOFF_DELAY);
        return returned;
      });
    };

    return socket;
  }

  try {
    Object.setPrototypeOf(wrappedIo, Object.getPrototypeOf(originalIo));
    Object.assign(wrappedIo, originalIo);
  } catch (error) {
    console.warn("WAFT V2 could not copy all Socket.IO helper properties:", error);
  }

  window.io = wrappedIo;
  return true;
}
