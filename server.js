import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createBattle, resolveTurn, canUseAction, transformCoconutOctopus, setCoconutOctopusPerfectAdaptationChoice } from "./js/battle-engine.js";
import { animals } from "./js/animals.js";
import { chooseAndApplyAIAction } from "./js/ai-controller.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("."));

const PORT = process.env.PORT || 3000;

// Standard online battle rooms.
const rooms = {};

// Online tournament rooms.
const onlineTournamentRooms = {};
const MAX_ONLINE_TOURNAMENT_PLAYERS = 16;
const MIN_ONLINE_TOURNAMENT_PLAYERS = 2;
const ONLINE_TOURNAMENT_ACTION_POOL = ["normal", "quick", "precise", "explosive", "concentration", "special"];
const ONLINE_TOURNAMENT_BOT_TURN_DELAY_MS = 900;

function generateRoomCode() {
  return "WAFT-" + Math.floor(1000 + Math.random() * 9000);
}

function normalizeRoomCode(code) {
  return String(code || "").trim().toUpperCase();
}

function normalizeLarvalCommand(command) {
  if (!command) return null;

  const normalized = {
    attack: Math.max(0, Math.floor(Number(command.attack) || 0)),
    defense: Math.max(0, Math.min(2, Math.floor(Number(command.defense) || 0))),
    sacrifice: Math.max(0, Math.floor(Number(command.sacrifice) || 0))
  };

  const total = normalized.attack + normalized.defense + normalized.sacrifice;
  if (total <= 0) return null;

  return normalized;
}

function getAvailableFighterIds() {
  return Object.keys(animals).filter((fighterId) => {
    const animal = animals[fighterId];
    return animal && animal.name && animal.stats;
  });
}

function getAnimalName(fighterId) {
  return animals[fighterId]?.name || fighterId || "TBD";
}

function shuffleArray(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }

  return copy;
}

function cloneBattleForReplay(battle) {
  return JSON.parse(JSON.stringify(battle));
}

function createOnlineTournamentReplayFrame(battle, summaryLines, label) {
  return {
    battle: cloneBattleForReplay(battle),
    summaryLines: Array.isArray(summaryLines) && summaryLines.length
      ? [...summaryLines]
      : ["No major events this turn."],
    label: label || "Turn " + battle.turn
  };
}

function createInitialOnlineTournamentReplay(match, battle) {
  return [
    createOnlineTournamentReplayFrame(
      battle,
      [
        "Combat ready.",
        (match.fighterA?.name || "Fighter A") + " vs " + (match.fighterB?.name || "Fighter B") + "."
      ],
      "Start"
    )
  ];
}

function createParticipant({ slotId, fighterId, type, socketId = null, playerNumber = null }) {
  return {
    slotId,
    fighterId,
    name: getAnimalName(fighterId),
    type,
    socketId,
    playerNumber
  };
}

function createEmptyOnlineTournamentRounds() {
  return [
    { name: "Round of 16", key: "round16", matches: [] },
    {
      name: "Quarterfinals",
      key: "quarterfinals",
      matches: [
        { id: "qf-1", fighterA: null, fighterB: null, winner: null, resolved: false },
        { id: "qf-2", fighterA: null, fighterB: null, winner: null, resolved: false },
        { id: "qf-3", fighterA: null, fighterB: null, winner: null, resolved: false },
        { id: "qf-4", fighterA: null, fighterB: null, winner: null, resolved: false }
      ]
    },
    {
      name: "Semifinals",
      key: "semifinals",
      matches: [
        { id: "sf-1", fighterA: null, fighterB: null, winner: null, resolved: false },
        { id: "sf-2", fighterA: null, fighterB: null, winner: null, resolved: false }
      ]
    },
    {
      name: "Final",
      key: "final",
      matches: [
        { id: "final-1", fighterA: null, fighterB: null, winner: null, resolved: false }
      ]
    },
    {
      name: "Champion",
      key: "champion",
      matches: [
        { id: "champion", fighterA: null, fighterB: null, winner: null, resolved: false }
      ]
    }
  ];
}

function buildOnlineTournamentBracket(room) {
  const playerParticipants = room.players.map((socketId, index) => {
    const fighterId = room.fighters[socketId];

    return createParticipant({
      slotId: "player-" + (index + 1),
      fighterId,
      type: "player",
      socketId,
      playerNumber: index + 1
    });
  });

  const selectedFighterIds = playerParticipants.map((participant) => participant.fighterId);
  const availableBotFighters = getAvailableFighterIds().filter((fighterId) => !selectedFighterIds.includes(fighterId));
  const botCount = 16 - playerParticipants.length;
  const botFighterIds = shuffleArray(availableBotFighters).slice(0, botCount);

  if (botFighterIds.length < botCount) {
    throw new Error("Not enough fighters to fill a 16-fighter online tournament bracket.");
  }

  const botParticipants = botFighterIds.map((fighterId, index) =>
    createParticipant({
      slotId: "bot-" + (index + 1),
      fighterId,
      type: "bot"
    })
  );

  const participants = shuffleArray([
    ...playerParticipants,
    ...botParticipants
  ]).map((participant, index) => ({
    ...participant,
    position: index + 1
  }));

  const rounds = createEmptyOnlineTournamentRounds();

  for (let i = 0; i < 16; i += 2) {
    rounds[0].matches.push({
      id: "r16-" + (i / 2 + 1),
      fighterA: participants[i],
      fighterB: participants[i + 1],
      winner: null,
      resolved: false,
      active: false,
      battleLog: []
    });
  }

  return {
    active: true,
    finished: false,
    createdAt: Date.now(),
    currentRoundIndex: 0,
    champion: null,
    rounds
  };
}

function getParticipantKey(participant) {
  if (!participant) return null;
  return participant.type === "player" ? participant.socketId : participant.slotId;
}

function getOnlineTournamentMatchHumanSocketIds(match) {
  const ids = [];

  if (match?.fighterA?.type === "player" && match.fighterA.socketId) ids.push(match.fighterA.socketId);
  if (match?.fighterB?.type === "player" && match.fighterB.socketId) ids.push(match.fighterB.socketId);

  return ids;
}

function getOnlineTournamentParticipantForWinner(match, battleWinner, battle = null) {
  if (!match) return null;

  if (battleWinner === match.fighterA?.fighterId) return match.fighterA;
  if (battleWinner === match.fighterB?.fighterId) return match.fighterB;

  if (battle) {
    const scoreA =
      (battle.fighterA?.hp || 0) +
      (battle.fighterA?.stamina || 0) * 0.35 +
      ((battle.fighterA?.specialCharge || 0) * 10);

    const scoreB =
      (battle.fighterB?.hp || 0) +
      (battle.fighterB?.stamina || 0) * 0.35 +
      ((battle.fighterB?.specialCharge || 0) * 10);

    return scoreA >= scoreB ? match.fighterA : match.fighterB;
  }

  return match.fighterA || match.fighterB || null;
}

function chooseOnlineTournamentBotActionData(fighter, battle) {
  const decision = chooseAndApplyAIAction(battle, fighter);

  return {
    action: decision.action,
    larvalCommand: decision.larvalCommand || null,
    coconutPerfectAdaptationChoice: decision.coconutPerfectAdaptationChoice || null
  };
}

function chooseOnlineTournamentBotAction(fighter, battle) {
  return chooseOnlineTournamentBotActionData(fighter, battle).action;
}

function isOnlineTournamentBotOnlyMatch(match) {
  return Boolean(match?.fighterA && match?.fighterB && match.fighterA.type === "bot" && match.fighterB.type === "bot");
}

function findOnlineTournamentMatchById(bracket, matchId) {
  if (!bracket || !matchId) return null;

  for (let roundIndex = 0; roundIndex < bracket.rounds.length; roundIndex++) {
    const round = bracket.rounds[roundIndex];
    const matchIndex = round.matches.findIndex((match) => match.id === matchId);

    if (matchIndex !== -1) {
      return { round, match: round.matches[matchIndex], roundIndex, matchIndex };
    }
  }

  return null;
}

function placeOnlineTournamentWinner(room, roundIndex, matchIndex, winnerParticipant) {
  const bracket = room.bracket;
  if (!bracket || !winnerParticipant) return;

  const currentRound = bracket.rounds[roundIndex];
  const match = currentRound?.matches?.[matchIndex];
  if (!match) return;

  match.winner = winnerParticipant;
  match.resolved = true;
  match.active = false;

  delete room.activeMatches[match.id];

  if (roundIndex === 3) {
    const championRound = bracket.rounds[4];
    const championMatch = championRound.matches[0];

    championMatch.fighterA = winnerParticipant;
    championMatch.winner = winnerParticipant;
    championMatch.resolved = true;

    bracket.champion = winnerParticipant;
    bracket.finished = true;
    return;
  }

  const nextRound = bracket.rounds[roundIndex + 1];
  const nextMatchIndex = Math.floor(matchIndex / 2);
  const nextMatch = nextRound.matches[nextMatchIndex];

  if (matchIndex % 2 === 0) {
    nextMatch.fighterA = winnerParticipant;
  } else {
    nextMatch.fighterB = winnerParticipant;
  }
}

function getCurrentPlayableRoundIndex(bracket) {
  if (!bracket || bracket.finished) return null;

  for (let roundIndex = 0; roundIndex <= 3; roundIndex++) {
    const round = bracket.rounds[roundIndex];
    if (!round) continue;

    if (round.matches.some((match) => !match.resolved)) {
      bracket.currentRoundIndex = roundIndex;
      return roundIndex;
    }
  }

  return null;
}

function simulateOnlineTournamentBotMatch(room, roundIndex, matchIndex) {
  const match = room.bracket.rounds[roundIndex].matches[matchIndex];
  const battle = createBattle(match.fighterA.fighterId, match.fighterB.fighterId);
  const replay = createInitialOnlineTournamentReplay(match, battle);

  let safety = 0;

  while (!battle.finished && safety < 160) {
    const oldLogLength = battle.log.length;
    const actionDataA = chooseOnlineTournamentBotActionData(battle.fighterA, battle);
    const actionDataB = chooseOnlineTournamentBotActionData(battle.fighterB, battle);

    battle.fighterA.darwinsLarvalCommand = normalizeLarvalCommand(actionDataA.larvalCommand);
    battle.fighterB.darwinsLarvalCommand = normalizeLarvalCommand(actionDataB.larvalCommand);

    applyCoconutPerfectAdaptationChoiceIfNeeded(battle.fighterA, actionDataA.coconutPerfectAdaptationChoice);
    applyCoconutPerfectAdaptationChoiceIfNeeded(battle.fighterB, actionDataB.coconutPerfectAdaptationChoice);

    resolveTurn(battle, actionDataA.action, actionDataB.action);

    const newLines = battle.log.slice(oldLogLength);
    replay.push(
      createOnlineTournamentReplayFrame(
        battle,
        newLines,
        "Turn " + Math.max(1, battle.turn - 1)
      )
    );

    safety += 1;
  }

  const winnerParticipant = getOnlineTournamentParticipantForWinner(match, battle.winner, battle);

  match.battleLog = battle.log.slice(-80);
  match.battleReplay = replay;
  match.turns = battle.turn;
  placeOnlineTournamentWinner(room, roundIndex, matchIndex, winnerParticipant);

  return { match, battle, winnerParticipant };
}

function createOnlineTournamentActiveMatch(room, roundIndex, matchIndex) {
  const match = room.bracket.rounds[roundIndex].matches[matchIndex];
  const battle = createBattle(match.fighterA.fighterId, match.fighterB.fighterId);

  match.active = true;

  room.activeMatches[match.id] = {
    roundIndex,
    matchIndex,
    matchId: match.id,
    battle,
    actions: {},
    replay: createInitialOnlineTournamentReplay(match, battle),
    createdAt: Date.now()
  };

  return room.activeMatches[match.id];
}

function getPublicOnlineTournamentActiveMatches(room) {
  if (!room?.activeMatches || !room.bracket) return [];

  return Object.values(room.activeMatches).map((active) => {
    const round = room.bracket.rounds[active.roundIndex];
    const match = round?.matches?.[active.matchIndex];

    if (!round || !match) return null;

    return {
      roundIndex: active.roundIndex,
      matchIndex: active.matchIndex,
      matchId: active.matchId,
      roundName: round.name,
      fighterA: match.fighterA,
      fighterB: match.fighterB,
      battle: active.battle,
      submittedSocketIds: Object.keys(active.actions || {})
    };
  }).filter(Boolean);
}

function generateAvailableOnlineTournamentCombats(room) {
  if (!room.bracket || room.bracket.finished) return { type: "finished", autoResolvedCount: 0, createdMatches: [] };

  if (Object.keys(room.activeMatches).length > 0) {
    return { type: "active", autoResolvedCount: 0, createdMatches: [] };
  }

  let autoResolvedCount = 0;
  const createdMatches = [];
  let safety = 0;

  while (safety < 20 && Object.keys(room.activeMatches).length === 0 && !room.bracket.finished) {
    safety += 1;

    const roundIndex = getCurrentPlayableRoundIndex(room.bracket);

    if (roundIndex === null) {
      room.bracket.finished = true;
      return { type: "finished", autoResolvedCount, createdMatches };
    }

    const round = room.bracket.rounds[roundIndex];
    const readyMatches = round.matches
      .map((match, matchIndex) => ({ match, matchIndex }))
      .filter(({ match }) =>
        !match.resolved &&
        !match.active &&
        match.fighterA &&
        match.fighterB
      );

    if (readyMatches.length === 0) {
      return { type: "waiting", autoResolvedCount, createdMatches };
    }

    for (const { match, matchIndex } of readyMatches) {
      const humanSocketIds = getOnlineTournamentMatchHumanSocketIds(match);

      createOnlineTournamentActiveMatch(room, roundIndex, matchIndex);
      createdMatches.push({
        matchId: match.id,
        roundName: round.name,
        matchIndex,
        fighterA: match.fighterA,
        fighterB: match.fighterB
      });

      if (humanSocketIds.length === 0) {
        continue;
      }
    }

    if (createdMatches.length > 0) {
      return { type: "active", autoResolvedCount, createdMatches };
    }
  }

  return {
    type: room.bracket.finished ? "finished" : "waiting",
    autoResolvedCount,
    createdMatches
  };
}

function resolveOnlineTournamentActiveTurn(room, matchId) {
  const active = room.activeMatches[matchId];
  if (!active || !room.bracket) return null;

  const found = findOnlineTournamentMatchById(room.bracket, matchId);
  if (!found) return null;

  const { match, roundIndex, matchIndex } = found;
  const battle = active.battle;

  if (!match || !battle || battle.finished) return null;

  const keyA = getParticipantKey(match.fighterA);
  const keyB = getParticipantKey(match.fighterB);

  const actionDataA = match.fighterA.type === "bot"
    ? chooseOnlineTournamentBotActionData(battle.fighterA, battle)
    : active.actions[keyA];

  const actionDataB = match.fighterB.type === "bot"
    ? chooseOnlineTournamentBotActionData(battle.fighterB, battle)
    : active.actions[keyB];

  if (!actionDataA || !actionDataB) return null;

  battle.fighterA.darwinsLarvalCommand = normalizeLarvalCommand(actionDataA.larvalCommand);
  battle.fighterB.darwinsLarvalCommand = normalizeLarvalCommand(actionDataB.larvalCommand);

  applyCoconutPerfectAdaptationChoiceIfNeeded(battle.fighterA, actionDataA.coconutPerfectAdaptationChoice);
  applyCoconutPerfectAdaptationChoiceIfNeeded(battle.fighterB, actionDataB.coconutPerfectAdaptationChoice);

  const oldLogLength = battle.log.length;

  resolveTurn(battle, actionDataA.action, actionDataB.action);

  const newLines = battle.log.slice(oldLogLength);
  active.actions = {};

  if (!Array.isArray(active.replay)) {
    active.replay = createInitialOnlineTournamentReplay(match, battle);
  }

  active.replay.push(
    createOnlineTournamentReplayFrame(
      battle,
      newLines,
      "Turn " + Math.max(1, battle.turn - 1)
    )
  );

  let winnerParticipant = null;

  if (battle.finished) {
    winnerParticipant = getOnlineTournamentParticipantForWinner(match, battle.winner, battle);
    match.battleLog = battle.log.slice(-60);
    match.battleReplay = active.replay;
    match.turns = battle.turn;
    placeOnlineTournamentWinner(room, roundIndex, matchIndex, winnerParticipant);
  }

  return {
    matchId,
    battle,
    newLines,
    actionA: actionDataA.action,
    actionB: actionDataB.action,
    winnerParticipant,
    finished: battle.finished
  };
}

function scheduleOnlineTournamentBotMatch(roomCode, matchId) {
  const room = onlineTournamentRooms[roomCode];
  if (!room?.activeMatches?.[matchId]) return;

  const active = room.activeMatches[matchId];
  const found = findOnlineTournamentMatchById(room.bracket, matchId);
  const match = found?.match;

  if (!isOnlineTournamentBotOnlyMatch(match)) return;
  if (active.botTimer) return;

  active.botTimer = setTimeout(() => {
    active.botTimer = null;
    advanceOnlineTournamentBotMatch(roomCode, matchId);
  }, ONLINE_TOURNAMENT_BOT_TURN_DELAY_MS);
}

function scheduleOnlineTournamentBotMatches(roomCode) {
  const room = onlineTournamentRooms[roomCode];
  if (!room?.activeMatches) return;

  Object.keys(room.activeMatches).forEach((matchId) => {
    scheduleOnlineTournamentBotMatch(roomCode, matchId);
  });
}

function advanceOnlineTournamentBotMatch(roomCode, matchId) {
  const room = onlineTournamentRooms[roomCode];
  if (!room?.activeMatches?.[matchId]) return;

  const found = findOnlineTournamentMatchById(room.bracket, matchId);
  if (!isOnlineTournamentBotOnlyMatch(found?.match)) return;

  const result = resolveOnlineTournamentActiveTurn(room, matchId);

  if (result) {
    io.to(roomCode).emit("onlineTournamentTurnResolved", {
      result,
      state: getOnlineTournamentPublicState(room)
    });
  }

  emitOnlineTournamentState(roomCode);

  if (!result || !result.finished) {
    scheduleOnlineTournamentBotMatch(roomCode, matchId);
    return;
  }

  const generationResult = generateAvailableOnlineTournamentCombats(room);

  io.to(roomCode).emit("onlineTournamentCombatGenerated", {
    result: generationResult,
    state: getOnlineTournamentPublicState(room)
  });

  emitOnlineTournamentState(roomCode);
  scheduleOnlineTournamentBotMatches(roomCode);
}

function getOnlineTournamentPublicState(room) {
  return {
    roomCode: room.code,
    hostId: room.hostId,
    bracketLocked: Boolean(room.bracket),
    maxPlayers: MAX_ONLINE_TOURNAMENT_PLAYERS,
    minPlayers: MIN_ONLINE_TOURNAMENT_PLAYERS,
    botCount: Math.max(0, 16 - room.players.length),
    players: room.players.map((socketId, index) => ({
      id: socketId,
      playerNumber: index + 1,
      isHost: socketId === room.hostId,
      fighterId: room.fighters[socketId] || null,
      fighterName: room.fighters[socketId] ? getAnimalName(room.fighters[socketId]) : null,
      ready: Boolean(room.ready[socketId])
    })),
    bracket: room.bracket,
    activeMatches: getPublicOnlineTournamentActiveMatches(room)
  };
}

function emitOnlineTournamentState(roomCode) {
  const room = onlineTournamentRooms[roomCode];
  if (!room) return;

  io.to(roomCode).emit("onlineTournamentState", getOnlineTournamentPublicState(room));
}

function isOnlineTournamentPlayer(room, socketId) {
  return Boolean(room && room.players.includes(socketId));
}


function normalizeCoconutPerfectAdaptationChoice(choice) {
  const allowed = ["tentacle-storm", "coconut-fortress", "ink-sea"];
  return allowed.includes(choice) ? choice : null;
}

function applyCoconutPerfectAdaptationChoiceIfNeeded(fighter, choice) {
  const normalized = normalizeCoconutPerfectAdaptationChoice(choice);
  if (!normalized) return;
  if (!fighter || fighter.id !== "coconut-octopus") return;
  setCoconutOctopusPerfectAdaptationChoice(fighter, normalized);
}

function getBattleFighterForSocket(room, socketId) {
  if (!room?.battle || !room.players) return null;
  if (room.players[0] === socketId) return room.battle.fighterA;
  if (room.players[1] === socketId) return room.battle.fighterB;
  return null;
}

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  // ==========================================================
  // STANDARD ONLINE BATTLE
  // ==========================================================

  socket.on("createRoom", () => {
    const code = generateRoomCode();

    rooms[code] = {
      players: [socket.id],
      fighters: {},
      actions: {},
      battle: null
    };

    socket.join(code);

    socket.emit("roomCreated", {
      roomCode: code,
      playerNumber: 1
    });
  });

  socket.on("joinRoom", (code) => {
    const normalizedCode = normalizeRoomCode(code);
    const room = rooms[normalizedCode];

    if (!room) {
      socket.emit("errorMessage", "Sala no existe");
      return;
    }

    if (room.players.length >= 2) {
      socket.emit("errorMessage", "Sala llena");
      return;
    }

    room.players.push(socket.id);
    socket.join(normalizedCode);

    socket.emit("roomJoined", {
      roomCode: normalizedCode,
      playerNumber: 2
    });

    io.to(normalizedCode).emit("playersReady", {
      players: room.players
    });
  });

  socket.on("selectFighter", ({ roomCode, fighterId }) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = rooms[normalizedCode];
    if (!room) return;

    room.fighters[socket.id] = fighterId;

    io.to(normalizedCode).emit("fighterSelected", {
      playerId: socket.id,
      fighterId
    });

    if (room.players.length === 2 && Object.keys(room.fighters).length === 2) {
      const [p1, p2] = room.players;

      room.battle = createBattle(room.fighters[p1], room.fighters[p2]);
      room.actions = {};

      io.to(normalizedCode).emit("battleStarted", {
        battle: room.battle,
        player1: p1,
        player2: p2,
        fighter1: room.fighters[p1],
        fighter2: room.fighters[p2]
      });
    }
  });

  socket.on("transformCoconutOctopusMultiplayer", ({ roomCode, formId }) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = rooms[normalizedCode];
    if (!room || !room.battle) return;

    const fighter = getBattleFighterForSocket(room, socket.id);
    if (!fighter || fighter.id !== "coconut-octopus") {
      socket.emit("errorMessage", "Only Coconut Octopus can transform.");
      return;
    }

    const result = transformCoconutOctopus(fighter, formId, room.battle);
    if (!result.ok) {
      socket.emit("errorMessage", result.message || "Coconut Octopus adaptation failed.");
      return;
    }

    io.to(normalizedCode).emit("battleUpdated", {
      battle: room.battle,
      outcome: "Adaptation",
      message: result.message
    });
  });

  socket.on("playerAction", ({ roomCode, action, larvalCommand = null, coconutPerfectAdaptationChoice = null }) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = rooms[normalizedCode];
    if (!room || !room.battle) return;

    room.actions[socket.id] = {
      action,
      larvalCommand: normalizeLarvalCommand(larvalCommand),
      coconutPerfectAdaptationChoice: normalizeCoconutPerfectAdaptationChoice(coconutPerfectAdaptationChoice)
    };

    socket.emit("waitingForOpponentAction");

    if (Object.keys(room.actions).length === 2) {
      const [p1, p2] = room.players;

      const player1ActionData = room.actions[p1];
      const player2ActionData = room.actions[p2];

      const action1 = player1ActionData.action;
      const action2 = player2ActionData.action;

      const larvalCommand1 = player1ActionData.larvalCommand;
      const larvalCommand2 = player2ActionData.larvalCommand;

      room.battle.fighterA.darwinsLarvalCommand = larvalCommand1;
      room.battle.fighterB.darwinsLarvalCommand = larvalCommand2;

      applyCoconutPerfectAdaptationChoiceIfNeeded(room.battle.fighterA, player1ActionData.coconutPerfectAdaptationChoice);
      applyCoconutPerfectAdaptationChoiceIfNeeded(room.battle.fighterB, player2ActionData.coconutPerfectAdaptationChoice);

      const oldLogLength = room.battle.log.length;

      resolveTurn(room.battle, action1, action2);

      const newLines = room.battle.log.slice(oldLogLength);

      io.to(normalizedCode).emit("turnResolved", {
        battle: room.battle,
        newLines,
        action1,
        action2,
        larvalCommand1,
        larvalCommand2,
        player1: p1,
        player2: p2
      });

      room.actions = {};
    }
  });

  // ==========================================================
  // ONLINE TOURNAMENT
  // ==========================================================

  socket.on("createOnlineTournamentRoom", () => {
    const code = generateRoomCode();

    onlineTournamentRooms[code] = {
      code,
      hostId: socket.id,
      players: [socket.id],
      fighters: {},
      ready: {},
      bracket: null,
      activeMatches: {},
      createdAt: Date.now()
    };

    socket.join(code);

    socket.emit("onlineTournamentRoomCreated", {
      roomCode: code,
      playerNumber: 1,
      playerId: socket.id
    });

    emitOnlineTournamentState(code);
  });

  socket.on("joinOnlineTournamentRoom", (code) => {
    const normalizedCode = normalizeRoomCode(code);
    const room = onlineTournamentRooms[normalizedCode];

    if (!room) {
      socket.emit("onlineTournamentError", "Tournament room does not exist.");
      return;
    }

    if (room.bracket) {
      socket.emit("onlineTournamentError", "This tournament has already started.");
      return;
    }

    if (room.players.includes(socket.id)) {
      socket.emit("onlineTournamentRoomJoined", {
        roomCode: normalizedCode,
        playerNumber: room.players.indexOf(socket.id) + 1,
        playerId: socket.id
      });
      emitOnlineTournamentState(normalizedCode);
      return;
    }

    if (room.players.length >= MAX_ONLINE_TOURNAMENT_PLAYERS) {
      socket.emit("onlineTournamentError", "Tournament room is full. Maximum 16 human players.");
      return;
    }

    room.players.push(socket.id);
    socket.join(normalizedCode);

    socket.emit("onlineTournamentRoomJoined", {
      roomCode: normalizedCode,
      playerNumber: room.players.length,
      playerId: socket.id
    });

    emitOnlineTournamentState(normalizedCode);
  });

  socket.on("selectOnlineTournamentFighter", ({ roomCode, fighterId }) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = onlineTournamentRooms[normalizedCode];

    if (!isOnlineTournamentPlayer(room, socket.id)) return;

    if (room.bracket) {
      socket.emit("onlineTournamentError", "Fighters are locked after bracket generation.");
      return;
    }

    if (!animals[fighterId]) {
      socket.emit("onlineTournamentError", "Invalid fighter.");
      return;
    }

    const alreadySelected = Object.entries(room.fighters).some(
      ([playerId, selectedFighterId]) => playerId !== socket.id && selectedFighterId === fighterId
    );

    if (alreadySelected) {
      socket.emit("onlineTournamentError", "That fighter is already selected by another player.");
      return;
    }

    room.fighters[socket.id] = fighterId;
    room.ready[socket.id] = false;

    emitOnlineTournamentState(normalizedCode);
  });

  socket.on("setOnlineTournamentReady", ({ roomCode, ready }) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = onlineTournamentRooms[normalizedCode];

    if (!isOnlineTournamentPlayer(room, socket.id)) return;

    if (room.bracket) {
      socket.emit("onlineTournamentError", "Ready status is locked after bracket generation.");
      return;
    }

    if (!room.fighters[socket.id]) {
      socket.emit("onlineTournamentError", "Choose a fighter before marking ready.");
      return;
    }

    room.ready[socket.id] = Boolean(ready);

    emitOnlineTournamentState(normalizedCode);
  });

  socket.on("startOnlineTournament", ({ roomCode }) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = onlineTournamentRooms[normalizedCode];

    if (!isOnlineTournamentPlayer(room, socket.id)) return;

    if (room.hostId !== socket.id) {
      socket.emit("onlineTournamentError", "Only the room host can generate the bracket.");
      return;
    }

    if (room.bracket) {
      socket.emit("onlineTournamentError", "Bracket already generated.");
      return;
    }

    if (room.players.length < MIN_ONLINE_TOURNAMENT_PLAYERS) {
      socket.emit("onlineTournamentError", "At least 2 human players are required to generate an online tournament bracket.");
      return;
    }

    const allPlayersHaveFighters = room.players.every((playerId) => Boolean(room.fighters[playerId]));
    if (!allPlayersHaveFighters) {
      socket.emit("onlineTournamentError", "All joined players must choose a fighter.");
      return;
    }

    const allPlayersReady = room.players.every((playerId) => Boolean(room.ready[playerId]));
    if (!allPlayersReady) {
      socket.emit("onlineTournamentError", "All joined players must be ready.");
      return;
    }

    try {
      room.bracket = buildOnlineTournamentBracket(room);
      room.activeMatches = {};
    } catch (error) {
      socket.emit("onlineTournamentError", error.message || "Could not generate bracket.");
      return;
    }

    io.to(normalizedCode).emit("onlineTournamentBracketCreated", getOnlineTournamentPublicState(room));
    emitOnlineTournamentState(normalizedCode);
  });

  socket.on("generateOnlineTournamentNextCombat", ({ roomCode }) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = onlineTournamentRooms[normalizedCode];

    if (!isOnlineTournamentPlayer(room, socket.id)) return;

    if (room.hostId !== socket.id) {
      socket.emit("onlineTournamentError", "Only the room host can generate the next combats.");
      return;
    }

    if (!room.bracket) {
      socket.emit("onlineTournamentError", "Generate the bracket before generating combats.");
      return;
    }

    if (Object.keys(room.activeMatches).length > 0) {
      socket.emit("onlineTournamentError", "There are active combats. Wait until they finish before generating the next batch.");
      return;
    }

    const result = generateAvailableOnlineTournamentCombats(room);

    io.to(normalizedCode).emit("onlineTournamentCombatGenerated", {
      result,
      state: getOnlineTournamentPublicState(room)
    });

    emitOnlineTournamentState(normalizedCode);
    scheduleOnlineTournamentBotMatches(normalizedCode);
  });

  socket.on("transformCoconutOctopusOnlineTournament", ({ roomCode, matchId, formId }) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = onlineTournamentRooms[normalizedCode];

    if (!isOnlineTournamentPlayer(room, socket.id)) return;
    if (!room.bracket || !room.activeMatches[matchId]) {
      socket.emit("onlineTournamentError", "There is no active combat for that match.");
      return;
    }

    const active = room.activeMatches[matchId];
    const found = findOnlineTournamentMatchById(room.bracket, matchId);
    if (!found) return;

    const match = found.match;
    const localIsA = match.fighterA?.socketId === socket.id;
    const localIsB = match.fighterB?.socketId === socket.id;

    if (!localIsA && !localIsB) {
      socket.emit("onlineTournamentError", "You are spectating this combat.");
      return;
    }

    const fighter = localIsA ? active.battle.fighterA : active.battle.fighterB;
    if (!fighter || fighter.id !== "coconut-octopus") {
      socket.emit("onlineTournamentError", "Only Coconut Octopus can transform.");
      return;
    }

    const result = transformCoconutOctopus(fighter, formId, active.battle);
    if (!result.ok) {
      socket.emit("onlineTournamentError", result.message || "Coconut Octopus adaptation failed.");
      return;
    }

    io.to(normalizedCode).emit("onlineTournamentBattleUpdated", {
      matchId,
      message: result.message,
      state: getOnlineTournamentPublicState(room)
    });

    emitOnlineTournamentState(normalizedCode);
  });

  socket.on("onlineTournamentPlayerAction", ({ roomCode, matchId, action, larvalCommand = null, coconutPerfectAdaptationChoice = null }) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = onlineTournamentRooms[normalizedCode];

    if (!isOnlineTournamentPlayer(room, socket.id)) return;

    if (!room.bracket || !room.activeMatches[matchId]) {
      socket.emit("onlineTournamentError", "There is no active combat for that match.");
      return;
    }

    const active = room.activeMatches[matchId];
    const found = findOnlineTournamentMatchById(room.bracket, matchId);
    if (!found) return;

    const match = found.match;
    const humanSocketIds = getOnlineTournamentMatchHumanSocketIds(match);

    if (!humanSocketIds.includes(socket.id)) {
      socket.emit("onlineTournamentError", "You are spectating this combat.");
      return;
    }

    const localIsA = match.fighterA?.socketId === socket.id;
    const fighter = localIsA ? active.battle.fighterA : active.battle.fighterB;

    if (!canUseAction(fighter, action, active.battle)) {
      socket.emit("onlineTournamentError", "That action cannot be used right now.");
      return;
    }

    active.actions[socket.id] = {
      action,
      larvalCommand: normalizeLarvalCommand(larvalCommand),
      coconutPerfectAdaptationChoice: normalizeCoconutPerfectAdaptationChoice(coconutPerfectAdaptationChoice)
    };

    socket.emit("onlineTournamentWaitingForOpponentAction", { matchId });

    const requiredHumanActions = humanSocketIds.every((playerId) => Boolean(active.actions[playerId]));

    if (!requiredHumanActions) {
      emitOnlineTournamentState(normalizedCode);
      return;
    }

    const result = resolveOnlineTournamentActiveTurn(room, matchId);

    if (!result) {
      emitOnlineTournamentState(normalizedCode);
      return;
    }

    io.to(normalizedCode).emit("onlineTournamentTurnResolved", {
      result,
      state: getOnlineTournamentPublicState(room)
    });

    emitOnlineTournamentState(normalizedCode);
    scheduleOnlineTournamentBotMatches(normalizedCode);
  });

  socket.on("resetOnlineTournamentRoom", ({ roomCode }) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = onlineTournamentRooms[normalizedCode];

    if (!isOnlineTournamentPlayer(room, socket.id)) return;

    if (room.hostId !== socket.id) {
      socket.emit("onlineTournamentError", "Only the room host can reset the tournament.");
      return;
    }

    if (room.activeMatches) {
      Object.values(room.activeMatches).forEach((active) => {
        if (active.botTimer) clearTimeout(active.botTimer);
      });
    }

    room.bracket = null;
    room.activeMatches = {};
    room.ready = {};

    emitOnlineTournamentState(normalizedCode);
  });

  socket.on("disconnect", () => {
    console.log("Jugador desconectado:", socket.id);

    for (const code in rooms) {
      const room = rooms[code];
      if (!room.players.includes(socket.id)) continue;

      socket.to(code).emit("opponentDisconnected");

      room.players = room.players.filter((id) => id !== socket.id);
      delete room.fighters[socket.id];
      delete room.actions[socket.id];

      if (room.players.length === 0) {
        delete rooms[code];
      }
    }

    for (const code in onlineTournamentRooms) {
      const room = onlineTournamentRooms[code];
      if (!room.players.includes(socket.id)) continue;

      socket.to(code).emit("onlineTournamentOpponentDisconnected");

      if (!room.bracket) {
        room.players = room.players.filter((id) => id !== socket.id);
        delete room.fighters[socket.id];
        delete room.ready[socket.id];

        if (room.hostId === socket.id) {
          room.hostId = room.players[0] || null;
        }
      }

      if (room.players.length === 0) {
        delete onlineTournamentRooms[code];
      } else {
        emitOnlineTournamentState(code);
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 WAFT server running on port ${PORT}`);
});
