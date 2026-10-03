const canvas = document.getElementById("game-board");
const context = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const messageElement = document.getElementById("game-message");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const directionButtons = document.querySelectorAll(".direction-button");
const introScreen = document.getElementById("intro-screen");
const gameCard = document.querySelector(".game-card");

const cellSize = 20;
const cellCount = canvas.width / cellSize;
const gameSpeed = 200;
const snakeColors = ["#dc3545", "#2878d0", "#e4b323", "#111827", "#e65b9a"];

let snake;
let previousSnake;
let food;
let direction;
let nextDirection;
let snakeColorIndex = -1;
let score = 0;
let gameTimer = null;
let animationFrame = null;
let turnLocked = false;
let gameActive = false;
let movementStartedAt = 0;

function drawBoard() {
  context.fillStyle = "#f8fbf8";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGame() {
  drawBoard();
  const snakeColor = snakeColors[Math.max(snakeColorIndex, 0)];
  const progress = gameActive
    ? Math.min((performance.now() - movementStartedAt) / gameSpeed, 1)
    : 1;
  const bodyPoints = snake.map((segment, index) => {
    const start = previousSnake[Math.min(index, previousSnake.length - 1)];
    const startX = start.x * cellSize + cellSize / 2;
    const startY = start.y * cellSize + cellSize / 2;
    const endX = segment.x * cellSize + cellSize / 2;
    const endY = segment.y * cellSize + cellSize / 2;
    return {
      x: startX + (endX - startX) * progress,
      y: startY + (endY - startY) * progress,
    };
  });

  if (food) {
    context.fillStyle = "#f0745f";
    context.beginPath();
    context.arc(
      food.x * cellSize + cellSize / 2,
      food.y * cellSize + cellSize / 2,
      cellSize * 0.34,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  if (bodyPoints.length > 1) {
    context.strokeStyle = snakeColor;
    context.lineWidth = cellSize * 0.72;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    bodyPoints.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.x, point.y);
      } else {
        const previous = bodyPoints[index - 1];
        const middleX = (previous.x + point.x) / 2;
        const middleY = (previous.y + point.y) / 2;
        context.quadraticCurveTo(previous.x, previous.y, middleX, middleY);
      }
    });
    const tailPoint = bodyPoints[bodyPoints.length - 1];
    context.lineTo(tailPoint.x, tailPoint.y);
    context.stroke();

    const tail = bodyPoints[bodyPoints.length - 1];
    const beforeTail = bodyPoints[bodyPoints.length - 2];
    const tailX = tail.x;
    const tailY = tail.y;
    const tailDirectionX = tail.x - beforeTail.x;
    const tailDirectionY = tail.y - beforeTail.y;
    const tailLength = Math.hypot(tailDirectionX, tailDirectionY) || 1;
    const unitTailX = tailDirectionX / tailLength;
    const unitTailY = tailDirectionY / tailLength;
    const sideX = -unitTailY;
    const sideY = unitTailX;

    context.fillStyle = snakeColor;
    context.beginPath();
    context.moveTo(
      tailX + unitTailX * cellSize * 0.55,
      tailY + unitTailY * cellSize * 0.55,
    );
    context.lineTo(
      tailX + sideX * cellSize * 0.3,
      tailY + sideY * cellSize * 0.3,
    );
    context.lineTo(
      tailX - sideX * cellSize * 0.3,
      tailY - sideY * cellSize * 0.3,
    );
    context.closePath();
    context.fill();
  }

  const headX = bodyPoints[0].x;
  const headY = bodyPoints[0].y;
  const headAngle = {
    right: 0,
    down: Math.PI / 2,
    left: Math.PI,
    up: -Math.PI / 2,
  }[direction];

  context.save();
  context.translate(headX, headY);
  context.rotate(headAngle);
  context.fillStyle = snakeColor;
  context.beginPath();
  context.ellipse(0, 0, cellSize * 0.52, cellSize * 0.42, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(3, -5, 2.5, 0, Math.PI * 2);
  context.arc(3, 5, 2.5, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#17251d";
  context.beginPath();
  context.arc(4, -5, 1.2, 0, Math.PI * 2);
  context.arc(4, 5, 1.2, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function animateSnake() {
  if (!gameActive) {
    return;
  }

  drawGame();
  animationFrame = window.requestAnimationFrame(animateSnake);
}

function placeFood() {
  const openCells = [];

  for (let y = 0; y < cellCount; y += 1) {
    for (let x = 0; x < cellCount; x += 1) {
      if (!snake.some((segment) => segment.x === x && segment.y === y)) {
        openCells.push({ x, y });
      }
    }
  }

  if (openCells.length === 0) {
    food = null;
    return false;
  }

  food = openCells[Math.floor(Math.random() * openCells.length)];
  return true;
}

function setDirection(newDirection) {
  if (!gameActive || turnLocked) {
    return;
  }

  const opposites = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };

  if (opposites[newDirection] === direction) {
    return;
  }

  nextDirection = newDirection;
  turnLocked = true;
}

function moveSnake() {
  previousSnake = snake.map((segment) => ({ ...segment }));
  movementStartedAt = performance.now();
  direction = nextDirection;

  const head = { ...snake[0] };
  if (direction === "up") head.y -= 1;
  if (direction === "down") head.y += 1;
  if (direction === "left") head.x -= 1;
  if (direction === "right") head.x += 1;

  const eating = food && head.x === food.x && head.y === food.y;
  const bodyToCheck = eating ? snake : snake.slice(0, -1);
  const hitWall =
    head.x < 0 || head.x >= cellCount || head.y < 0 || head.y >= cellCount;
  const hitBody = bodyToCheck.some(
    (segment) => segment.x === head.x && segment.y === head.y,
  );

  if (hitWall || hitBody) {
    endGame("Game Over — try again!");
    return;
  }

  snake.unshift(head);

  if (eating) {
    score += 1;
    scoreElement.textContent = score;

    if (!placeFood()) {
      drawGame();
      endGame("You filled the board. You win!");
      return;
    }
  } else {
    snake.pop();
  }

  turnLocked = false;
  drawGame();
}

function endGame(message) {
  gameActive = false;
  window.clearInterval(gameTimer);
  window.cancelAnimationFrame(animationFrame);
  gameTimer = null;
  animationFrame = null;
  drawGame();
  messageElement.textContent = message;
  messageElement.classList.remove("is-hidden");
  restartButton.hidden = false;
}

function startGame() {
  window.clearInterval(gameTimer);
  snakeColorIndex = (snakeColorIndex + 1) % snakeColors.length;
  snake = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
  ];
  previousSnake = snake.map((segment) => ({ ...segment }));
  movementStartedAt = performance.now();
  direction = "right";
  nextDirection = "right";
  score = 0;
  scoreElement.textContent = score;
  turnLocked = false;
  gameActive = true;
  placeFood();
  drawGame();

  messageElement.classList.add("is-hidden");
  restartButton.hidden = true;
  gameTimer = window.setInterval(moveSnake, gameSpeed);
  animationFrame = window.requestAnimationFrame(animateSnake);
}

const keyDirections = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

document.addEventListener("keydown", (event) => {
  const newDirection = keyDirections[event.key];
  if (!newDirection) {
    return;
  }

  event.preventDefault();
  setDirection(newDirection);
});

directionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDirection(button.dataset.direction);
  });
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
previousSnake = snake.map((segment) => ({ ...segment }));
drawGame();

window.setTimeout(() => {
  introScreen.classList.add("is-dismissed");
  introScreen.setAttribute("aria-hidden", "true");
  gameCard.removeAttribute("inert");
}, 5000);
