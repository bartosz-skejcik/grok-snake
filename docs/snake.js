// snake.js

// Game State
let snake = [{ x: 10, y: 10 }];
let dx = 0,
  dy = 0;
let food = { x: 15, y: 15 };
let mushrooms = [];
let score = 0;
let gameLoop;
let gameRunning = false;
let players = {};

let localStream;
let localPeerConnection;
let remoteConnections = {};

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function createPeerConnection(otherId) {
  let peerConnection = new RTCPeerConnection(configuration);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      sendToPeer(otherId, { type: "candidate", candidate: event.candidate });
    }
  };

  peerConnection.ontrack = (event) => {
    console.log("Received remote stream");
  };

  let dataChannel = peerConnection.createDataChannel("gameState");
  dataChannel.onopen = () => console.log("Channel opened");
  dataChannel.onmessage = (event) => handleIncomingData(event.data, otherId);

  remoteConnections[otherId] = { peerConnection, dataChannel };
  return peerConnection;
}

function handleIncomingData(data, fromId) {
  let state = JSON.parse(data);
  players[fromId] = state;
  drawGame(); // Redraw game with updated states
}

function sendToPeer(toId, data) {
  if (
    remoteConnections[toId] &&
    remoteConnections[toId].dataChannel.readyState === "open"
  ) {
    remoteConnections[toId].dataChannel.send(JSON.stringify(data));
  }
}

function hostGame(playerName) {
  gameRunning = true;
  players[playerName] = { snake: [{ x: 10, y: 10 }], score: 0 };
  localPeerConnection = new RTCPeerConnection(configuration);
  // Here you would add local stream or setup data channels for P2P communication
}

function joinGame(playerName) {
  // Mock peer joining for now, would need signaling for real connection
  players[playerName] = { snake: [{ x: 5, y: 5 }], score: 0 };
}

function startGame() {
  gameLoop = setInterval(() => {
    moveSnake();
    drawGame();
    Object.keys(players).forEach((id) => {
      if (id !== getPlayerName()) {
        // Don't send to self
        sendToPeer(id, {
          snake: snake,
          score: score,
          food: food,
          mushrooms: mushrooms,
        });
      }
    });
  }, 100);
}

function moveSnake() {
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    generateFood();
  } else {
    snake.pop();
  }

  if (
    head.x < 0 ||
    head.x >= canvas.width / gridSize ||
    head.y < 0 ||
    head.y >= canvas.height / gridSize ||
    snake
      .slice(1)
      .some((segment) => segment.x === head.x && segment.y === head.y)
  ) {
    clearInterval(gameLoop);
    alert("Game Over!");
    return;
  }
}

function generateFood() {
  food.x = Math.floor(Math.random() * (canvas.width / gridSize));
  food.y = Math.floor(Math.random() * (canvas.height / gridSize));
}

function drawGame() {
  const ctx = document.getElementById("gameCanvas").getContext("2d");
  const gridSize = 20;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw all players' snakes
  Object.entries(players).forEach(([id, player]) => {
    ctx.fillStyle = id === getPlayerName() ? "lime" : "blue"; // Differentiate local player
    player.snake.forEach((segment) => {
      ctx.fillRect(
        segment.x * gridSize,
        segment.y * gridSize,
        gridSize - 2,
        gridSize - 2,
      );
    });
  });

  // Draw food
  ctx.fillStyle = "red";
  ctx.fillRect(
    food.x * gridSize,
    food.y * gridSize,
    gridSize - 2,
    gridSize - 2,
  );

  // Draw mushrooms (assuming mushrooms are part of the game state)
  // This would need to be implemented if mushrooms are used

  document.getElementById("score").textContent = score;
}

function getPlayerName() {
  return document.getElementById("playerName").value;
}

function updatePlayerList() {
  const playerList = document.getElementById("playerList");
  playerList.innerHTML = "";
  Object.keys(players).forEach((playerId) => {
    const li = document.createElement("li");
    li.textContent = playerId;
    playerList.appendChild(li);
  });
}

// Event listeners would be set up in the HTML file to call these functions
window.hostGame = hostGame;
window.joinGame = joinGame;
window.startGame = startGame;

// On load setup
document.addEventListener("DOMContentLoaded", () => {
  const playerNameInput = document.getElementById("playerName");
  playerNameInput.value =
    localStorage.getItem("playerName") || playerNameInput.value;
  localStorage.setItem("playerName", playerNameInput.value);
  players[playerNameInput.value] = { snake: [{ x: 10, y: 10 }], score: 0 };
  updatePlayerList();
});
