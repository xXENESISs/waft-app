import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createBattle, resolveTurn } from "./js/battle-engine.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("."));

const PORT = process.env.PORT || 3000;
const rooms = {};

function generateRoomCode() {
  return "WAFT-" + Math.floor(1000 + Math.random() * 9000);
}

function normalizeLarvalCommand(command) {
  if (!command) return null;

  const normalized = {
    attack: Math.max(0, Math.floor(Number(command.attack) || 0)),
    defense: Math.max(0, Math.min(2, Math.floor(Number(command.defense) || 0))),
    sacrifice: Math.max(0, Math.floor(Number(command.sacrifice) || 0))
  };

  const total =
    normalized.attack +
    normalized.defense +
    normalized.sacrifice;

  if (total <= 0) return null;

  return normalized;
}

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

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
    const room = rooms[code];

    if (!room) {
      socket.emit("errorMessage", "Sala no existe");
      return;
    }

    if (room.players.length >= 2) {
      socket.emit("errorMessage", "Sala llena");
      return;
    }

    room.players.push(socket.id);
    socket.join(code);

    socket.emit("roomJoined", {
      roomCode: code,
      playerNumber: 2
    });

    io.to(code).emit("playersReady", {
      players: room.players
    });
  });

  socket.on("selectFighter", ({ roomCode, fighterId }) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.fighters[socket.id] = fighterId;

    io.to(roomCode).emit("fighterSelected", {
      playerId: socket.id,
      fighterId
    });

    if (room.players.length === 2 && Object.keys(room.fighters).length === 2) {
      const [p1, p2] = room.players;

      room.battle = createBattle(room.fighters[p1], room.fighters[p2]);
      room.actions = {};

      io.to(roomCode).emit("battleStarted", {
        battle: room.battle,
        player1: p1,
        player2: p2,
        fighter1: room.fighters[p1],
        fighter2: room.fighters[p2]
      });
    }
  });

  socket.on("playerAction", ({ roomCode, action, larvalCommand = null }) => {
    const room = rooms[roomCode];
    if (!room || !room.battle) return;

    room.actions[socket.id] = {
      action,
      larvalCommand: normalizeLarvalCommand(larvalCommand)
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

      const oldLogLength = room.battle.log.length;

      resolveTurn(room.battle, action1, action2);

      const newLines = room.battle.log.slice(oldLogLength);

      io.to(roomCode).emit("turnResolved", {
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
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 WAFT server running on port ${PORT}`);
});