const socket = io();

let roomCode = null;

window.createRoom = function () {
  socket.emit("createRoom");
};

window.joinRoom = function () {
  const code = document.getElementById("roomInput").value;
  if (!code) return alert("Pon un código");
  socket.emit("joinRoom", code);
};

window.sendAction = function (action) {
  if (!roomCode) return;
  socket.emit("playerAction", { roomCode, action });
};

// 🔥 EVENTOS

socket.on("roomCreated", (code) => {
  roomCode = code;
  alert("Sala creada: " + code);
});

socket.on("startGame", () => {
  alert("Jugador conectado. ¡Empieza la batalla!");
});

socket.on("turnResolved", (data) => {
  console.log("Turno resuelto:", data);
});

socket.on("errorMessage", (msg) => {
  alert(msg);
});