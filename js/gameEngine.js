/**
 * gameEngine.js
 * "Catch the Fruits" 게임 로직
 *
 * 하늘에서 떨어지는 과일을 바구니로 받는 게임
 */

class GameEngine {
  constructor() {
    this.score = 0;
    this.life = 5;
    this.timeLimit = 60;
    this.items = []; // 떨어지는 아이템 관리 배열

    this.isRunning = false;
    this.animationId = null;
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.currentLevel = 1;

    // Lane Positions (Left: 16%, Center: 50%, Right: 84%)
    this.lanePositions = [16, 50, 84];
    this.playerLane = 1; // 0: Left, 1: Center, 2: Right

    // DOM Elements
    this.container = null;
    this.itemLayer = null;
    this.playerBasket = null;
    this.ui = {
      score: null,
      time: null,
      life: null,
      message: null
    };
  }

  /**
   * 게임 초기화 및 시작
   * @param {Object} config - { containerId: "game-container" }
   */
  start(config = {}) {
    this.container = document.getElementById(config.containerId || "game-container");
    this.itemLayer = document.getElementById("item-layer");
    this.playerBasket = document.getElementById("player-basket");

    this.ui.score = document.getElementById("score-board");
    this.ui.time = document.getElementById("time-board");
    this.ui.life = document.getElementById("life-board");
    this.ui.message = document.getElementById("game-message");

    // 초기 상태 설정
    this.score = 0;
    this.life = 5;
    this.timeLimit = 60;
    this.items = [];
    this.currentLevel = 1;
    this.playerLane = 1;
    this.isRunning = true;
    this.itemLayer.innerHTML = ""; // 기존 아이템 제거
    this.ui.message.classList.add("hidden");
    this.updateUI();
    this.updateBasketPosition();

    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.ui.message.innerText = `Game Over!\nScore: ${this.score}`;
    this.ui.message.classList.remove("hidden");
  }

  loop(timestamp) {
    if (!this.isRunning) return;

    const deltaTime = (timestamp - this.lastTime) / 1000; // seconds
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (isNaN(dt)) dt = 0;

    // 1. Timer
    this.timeLimit -= dt;
    if (this.timeLimit <= 0) {
      this.timeLimit = 0;
      this.stop();
      return;
    }

    // 2. Spawner
    this.spawnTimer += dt;
    // const spawnInterval = Math.max(0.5, 2.0 - (this.currentLevel * 0.1)); 
    const spawnInterval = Math.max(0.4, 1.2 - (this.currentLevel * 0.1)); // 더 빨리 떨어지도록 수정 (기본 1.1초 -> 레벨업마다 빨라짐)
    if (this.spawnTimer > spawnInterval) {
      this.spawnItem();
      this.spawnTimer = 0;
    }

    // 3. Item Movement & Collision
    // (DOM 조작 최소화를 위해 위치 데이터만 먼저 계산할 수도 있지만, 간단하게 직접 스타일 조작)
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];

      // Move down
      const fallSpeed = 100 + (this.currentLevel * 20); // pixels per second
      item.y += fallSpeed * dt;
      item.element.style.top = `${item.y}px`;

      // Collision with Basket (바구니 위치: y=160 (bottom 10 + height 30~40))
      // Canvas height 200. Basket height 40, bottom 10. So basket Top is 150.
      // Item size 30.
      // Collision with Basket (바구니 위치: y=160 (bottom 10 + height 30~40))
      // Canvas height 400. Basket height 40, bottom 10. So basket Top is 350.
      // Item size 30.
      if (item.y > 350 && item.y < 390) {
        if (item.lane === this.playerLane) {
          this.handleCollision(item);
          this.removeItem(i);
          continue;
        }
      }

      // Out of bounds (놓침)
      if (item.y > 410) {
        // 폭탄이 아닌데 놓쳤다면 라이프 감소
        if (item.data.type !== "bomb") {
          this.life--;
          if (this.life <= 0) {
            this.stop();
          }
        }
        this.removeItem(i);
      }
    }

    // 4. Update UI Text (every frame is overkill, but okay for simple game)
    this.updateUI();
  }

  spawnItem() {
    const lane = Math.floor(Math.random() * 3);
    const type = Math.random();
    let itemData = { type: "apple", icon: "🍎", score: 10 };

    // 5% Heart, 20% Bomb, 25% Orange, 20% Grape, 30% Apple
    if (type < 0.05) itemData = { type: "heart", icon: "💖", score: 0 };
    else if (type < 0.25) itemData = { type: "bomb", icon: "💣", score: -50 };
    else if (type < 0.50) itemData = { type: "orange", icon: "🍊", score: 30 };
    else if (type < 0.70) itemData = { type: "grape", icon: "🍇", score: 20 };

    const element = document.createElement("div");
    element.className = "item";
    element.innerText = itemData.icon;
    element.style.left = `${this.lanePositions[lane]}%`;
    element.style.top = "-30px";
    this.itemLayer.appendChild(element);

    this.items.push({
      y: -30,
      lane: lane,
      element: element,
      data: itemData
    });
  }

  removeItem(index) {
    const item = this.items[index];
    if (item.element.parentNode) {
      item.element.parentNode.removeChild(item.element);
    }
    this.items.splice(index, 1);
  }

  handleCollision(item) {
    if (item.data.type === "bomb") {
      this.playSound("bomb");
      this.life = 0; // 즉시 사망
      this.score += item.data.score;
      this.stop();
    } else if (item.data.type === "heart") {
      this.playSound("coin");
      this.life++; // 생명력 증가
    } else {
      this.playSound("coin");
      this.score += item.data.score;
    }

    // Level up every 100 points
    this.currentLevel = 1 + Math.floor(this.score / 100);
  }

  playSound(type) {
    // Web Audio API를 사용한 간단한 시네사이저 사운드
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    if (type === "coin") {
      // 띠링~ (High pitch sine wave)
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, this.audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.1);
    } else if (type === "bomb") {
      // 콰광! (Low pitch square with rapid drop)
      osc.type = "square";
      osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, this.audioCtx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.3);
    }
  }

  updateUI() {
    if (this.ui.score) this.ui.score.innerText = `Score: ${this.score}`;
    if (this.ui.time) this.ui.time.innerText = `Time: ${Math.ceil(this.timeLimit)}`;
    if (this.ui.life) this.ui.life.innerText = "❤️".repeat(Math.max(0, this.life));
  }

  /**
   * 외부(PoseEngine)에서 호출: 포즈 입력 처리
   * @param {string} poseLabel 
   */
  onPoseDetected(poseLabel) {
    if (!this.isRunning) return;

    if (poseLabel === "LEFT") this.playerLane = 0;
    else if (poseLabel === "CENTER") this.playerLane = 1;
    else if (poseLabel === "RIGHT") this.playerLane = 2;

    this.updateBasketPosition();
  }

  updateBasketPosition() {
    if (this.playerBasket) {
      this.playerBasket.style.left = `${this.lanePositions[this.playerLane]}%`;
    }
  }
}

window.GameEngine = GameEngine;
