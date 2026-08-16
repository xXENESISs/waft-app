// Intercepts the Socket.IO client used by the mature Online Battle page and
// mirrors battle state into the shared WAFT V2 presentation events.
//
// This keeps multiplayer networking logic untouched while letting the new
// summary/VFX layer consume the authoritative server result.

const INSTALL_FLAG = "__WAFT_ONLINE_BATTLE_V2_SOCKET_BRIDGE__";

function emitBattleState(data, socket, message = null) {
  const battle = data?.battle;
  if (!battle) return;

  const playerSide = socket?.id && data?.player2 && socket.id === data.player2
    ? "fighterB"
    : "fighterA";

  window.dispatchEvent(
    new CustomEvent("waft:battle-state", {
      detail: {
        battle,
        playerSide,
        message
      }
    })
  );
}

function emitTurnResolved(data, socket) {
  const battle = data?.battle;
  const sequence = data?.turnSequence || battle?.lastTurnSequence;
  if (!battle || !sequence) return;

  const playerSide = socket?.id && data?.player2 && socket.id === data.player2
    ? "fighterB"
    : "fighterA";

  window.dispatchEvent(
    new CustomEvent("waft:turn-resolved", {
      detail: {
        battle,
        sequence,
        playerSide,
        actionA: data.action1,
        actionB: data.action2
      }
    })
  );
}

export function installOnlineBattleV2SocketBridge() {
  if (typeof window === "undefined" || typeof window.io !== "function") return false;
  if (window[INSTALL_FLAG]) return true;

  window[INSTALL_FLAG] = true;

  const originalIo = window.io;

  function wrappedIo(...args) {
    const socket = originalIo(...args);
    if (!socket || typeof socket.on !== "function") return socket;

    const originalOn = socket.on.bind(socket);

    socket.on = function waftV2On(eventName, handler) {
      if (typeof handler !== "function") {
        return originalOn(eventName, handler);
      }

      if (eventName === "battleStarted") {
        return originalOn(eventName, (data) => {
          const result = handler(data);
          queueMicrotask(() => emitBattleState(data, socket, "Multiplayer battle started. Choose your action."));
          return result;
        });
      }

      if (eventName === "battleUpdated") {
        return originalOn(eventName, (data) => {
          const result = handler(data);
          queueMicrotask(() => emitBattleState(data, socket, data?.message || "Battle state updated."));
          return result;
        });
      }

      if (eventName === "turnResolved") {
        return originalOn(eventName, (data) => {
          const result = handler(data);
          queueMicrotask(() => emitTurnResolved(data, socket));
          return result;
        });
      }

      return originalOn(eventName, handler);
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
