import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { World } from "./world.js";
import { Effects } from "./effects.js";
import { AudioSystem } from "./audio.js";
import { HUD } from "./hud.js";
import { Weapon } from "./weapon.js";
import { EnemyManager } from "./enemies.js";

const WAVE_COUNTS = [4, 6, 8, 10, 12];
const RAD_TO_DEG = 180 / Math.PI;

class Game {
  constructor(hud, audio) {
    this.hud = hud;
    this.audio = audio;
    this.canvas = document.getElementById("game-canvas");
    this.deployBtn = document.getElementById("deploy-btn");
    this.controlsBtn = document.getElementById("controls-btn");
    this.controlsDrawer = document.getElementById("controls-drawer");
    this.resumeBtn = document.getElementById("resume-btn");
    this.restartBtn = document.getElementById("restart-btn");
    this.quitBtn = document.getElementById("quit-btn");
    this.endRestart = document.getElementById("end-restart");
    this.endMenu = document.getElementById("end-menu");
    this.sensRange = document.getElementById("sens-range");
    this.sensOutput = document.getElementById("sens-output");
    this.volumeRange = document.getElementById("volume-range");
    this.volumeOutput = document.getElementById("volume-output");
    this.rotateHint = document.getElementById("rotate-hint");

    this.state = "loading";
    this.pointerLocked = false;
    this.input = { keys: {}, fire: false, ads: false, reload: false };
    this.jumpQueued = false;
    this.score = 0;
    this.kills = 0;
    this.hits = 0;
    this.wave = 1;
    this.wavesCleared = 0;
    this.waveActive = false;
    this.intermission = 0;
    this.victoryTimer = 0;
    this.hostilesShown = -1;
    this.health = 100;
    this.shield = 50;
    this.sinceDamage = 99;
    this.lastHealthShown = -1;
    this.lastShieldShown = -1;
    this.yaw = 0;
    this.pitch = 0;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.velocity = new THREE.Vector3();
    this.player = new THREE.Vector3(0, 1.72, 18);
    this.bobPhase = 0;
    this.stepTimer = 0;
    this.shake = 0;
    this.isMoving = false;
    this.isSprinting = false;
    this.adsActive = false;
    this.hintTimer = 0;
    this.gameTime = 0;
    this.clockTime = 0;
    this.lastTime = performance.now();
    this.sensitivity = 1;
    this.volume = 0.7;
    this.loadSettings();
  }

  loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem("blacksite.settings") || "{}");
      if (typeof stored.sensitivity === "number") this.sensitivity = stored.sensitivity;
      if (typeof stored.volume === "number") this.volume = stored.volume;
    } catch (error) {
      this.sensitivity = 1;
      this.volume = 0.7;
    }
    this.audio.setVolume(this.volume);
  }

  saveSettings() {
    try {
      localStorage.setItem("blacksite.settings", JSON.stringify({ sensitivity: this.sensitivity, volume: this.volume }));
    } catch (error) {
      return;
    }
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
      stencil: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x060809, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.05, 130);
    this.camera.rotation.order = "YXZ";
    this.scene.add(this.camera);
    const playerLight = new THREE.PointLight(0x9fc6da, 2.4, 14, 2);
    playerLight.position.set(0, 0, 0);
    this.camera.add(playerLight);

    this.world = new World(this.scene, this.renderer);
    this.effects = new Effects(this.scene);
    this.enemyManager = new EnemyManager({
      scene: this.scene,
      world: this.world,
      effects: this.effects,
      audio: this.audio,
      onPlayerHit: (damage, position) => this.onPlayerHit(damage, position),
      onEnemyKilled: (enemy, headshot, points) => this.onEnemyKilled(enemy, headshot, points)
    });
    this.weapon = new Weapon({
      camera: this.camera,
      effects: this.effects,
      audio: this.audio,
      hud: this.hud,
      fireRay: (origin, direction) => this.fireRay(origin, direction)
    });
    this.weapon.weaponScene.environment = this.world.environment;
    this.weapon.weaponScene.environmentIntensity = 0.35;
    this.weapon.group.visible = false;

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    const renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.72, 0.52, 0.76);
    const outputPass = new OutputPass();
    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(outputPass);

    this.weapon.setAspect(window.innerWidth / window.innerHeight);
    this.setupEvents();
    this.resize();
    this.hud.setHealth(100, 50);
    this.hud.setScore(0);
    this.hud.setWave(1, 5);
    this.hud.setHostiles(0);
    this.hud.setReticleSpread(6);
    this.hud.showMenu();
    this.state = "menu";
    this.camera.position.set(8.5, 4.4, 13);
    this.camera.lookAt(0, 2.3, -7.5);
    this.updateRotateHint();
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.animate(time));
  }

  setupEvents() {
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("blur", () => this.clearInput());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === "playing") this.pauseGame();
    });
    document.addEventListener("mousemove", (event) => {
      if (!this.pointerLocked || this.state !== "playing") return;
      const factor = this.sensitivity * 0.00185;
      this.yaw -= event.movementX * factor;
      this.pitch -= event.movementY * factor;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.42, 1.42);
      this.weapon.addLook(event.movementX, event.movementY);
    });
    window.addEventListener("mousedown", (event) => {
      if (this.state !== "playing") return;
      if (!this.pointerLocked) {
        this.requestLock();
        return;
      }
      if (event.button === 0) this.input.fire = true;
      if (event.button === 2) this.input.ads = true;
    });
    window.addEventListener("mouseup", (event) => {
      if (event.button === 0) this.input.fire = false;
      if (event.button === 2) this.input.ads = false;
    });
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("keyup", (event) => this.onKeyUp(event));
    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (!this.pointerLocked && this.state === "playing") this.pauseGame();
    });
    document.addEventListener("pointerlockerror", () => {
      this.pointerLocked = false;
    });

    this.deployBtn.addEventListener("click", () => this.deploy());
    this.controlsBtn.addEventListener("click", () => {
      const hidden = this.controlsDrawer.hasAttribute("hidden");
      if (hidden) this.controlsDrawer.removeAttribute("hidden");
      else this.controlsDrawer.setAttribute("hidden", "");
      this.controlsBtn.setAttribute("aria-expanded", String(hidden));
      this.audio.init();
      this.audio.click();
    });
    this.resumeBtn.addEventListener("click", () => this.resumeGame());
    this.restartBtn.addEventListener("click", () => this.restartRun());
    this.quitBtn.addEventListener("click", () => this.enterMenu());
    this.endRestart.addEventListener("click", () => this.restartRun());
    this.endMenu.addEventListener("click", () => this.enterMenu());

    this.sensRange.value = String(this.sensitivity);
    this.sensOutput.textContent = this.sensitivity.toFixed(1);
    this.volumeRange.value = String(this.volume);
    this.volumeOutput.textContent = `${Math.round(this.volume * 100)}%`;
    this.sensRange.addEventListener("input", () => {
      this.sensitivity = Number(this.sensRange.value);
      this.sensOutput.textContent = this.sensitivity.toFixed(1);
      this.saveSettings();
    });
    this.volumeRange.addEventListener("input", () => {
      this.volume = Number(this.volumeRange.value);
      this.volumeOutput.textContent = `${Math.round(this.volume * 100)}%`;
      this.audio.setVolume(this.volume);
      this.saveSettings();
    });
  }

  onKeyDown(event) {
    if (event.code === "Escape") {
      if (this.state === "paused") this.resumeGame();
      return;
    }
    if (this.state === "menu" && event.code === "Enter") {
      this.deploy();
      return;
    }
    if (this.state !== "playing") return;
    if (["Space", "KeyW", "KeyA", "KeyS", "KeyD", "KeyR", "ShiftLeft", "ShiftRight"].includes(event.code)) {
      event.preventDefault();
    }
    this.input.keys[event.code] = true;
    if (event.code === "KeyR" && !event.repeat) this.input.reload = true;
    if (event.code === "Space" && !event.repeat) this.jumpQueued = true;
  }

  onKeyUp(event) {
    this.input.keys[event.code] = false;
  }

  clearInput() {
    this.input.keys = {};
    this.input.fire = false;
    this.input.ads = false;
    this.input.reload = false;
    this.jumpQueued = false;
  }

  requestLock() {
    if (document.pointerLockElement === this.canvas) return;
    try {
      const request = this.canvas.requestPointerLock();
      if (request && typeof request.catch === "function") request.catch(() => {});
    } catch (error) {
      this.pointerLocked = false;
    }
  }

  deploy() {
    if (this.state !== "menu") return;
    this.audio.init();
    this.audio.setVolume(this.volume);
    this.audio.click();
    this.startRun();
    this.requestLock();
  }

  startRun() {
    this.hud.hideMenu();
    this.hud.hidePause();
    this.hud.hideEnd();
    this.hud.clearTransient();
    this.hud.showHud();
    this.hud.setAds(false);
    this.hud.setCrosshairHint(true);
    this.hintTimer = 8;

    this.score = 0;
    this.kills = 0;
    this.hits = 0;
    this.wave = 1;
    this.wavesCleared = 0;
    this.waveActive = false;
    this.intermission = 0;
    this.victoryTimer = 0;
    this.hostilesShown = -1;
    this.health = 100;
    this.shield = 50;
    this.sinceDamage = 99;
    this.lastHealthShown = -1;
    this.lastShieldShown = -1;
    this.player.set(0, 1.72, 18);
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
    this.grounded = true;
    this.bobPhase = 0;
    this.stepTimer = 0;
    this.shake = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.sensitivity = Number(this.sensRange.value);
    this.gameTime = 0;

    this.weapon.reset();
    this.weapon.group.visible = true;
    this.effects.reset();
    this.enemyManager.reset();
    this.camera.fov = 72;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.player);
    this.camera.rotation.set(0, 0, 0);

    this.hud.setScore(0);
    this.hud.setHealth(this.health, this.shield);
    this.hud.setReloadProgress(0);
    this.hud.setWave(1, 5);
    this.hud.setHostiles(0);
    this.hud.showHud();
    this.state = "playing";
    this.clearInput();
    this.startWave(1);
    this.lastTime = performance.now();
  }

  resumeGame() {
    if (this.state !== "paused") return;
    this.audio.init();
    this.hud.hidePause();
    this.state = "playing";
    this.clearInput();
    this.lastTime = performance.now();
    this.requestLock();
  }

  restartRun() {
    if (this.state !== "paused" && this.state !== "ended") return;
    this.audio.init();
    this.startRun();
    this.requestLock();
  }

  pauseGame() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.clearInput();
    this.hud.showPause(this.score, this.kills, this.wave);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  enterMenu() {
    this.state = "menu";
    this.clearInput();
    this.enemyManager.reset();
    this.effects.reset();
    this.weapon.group.visible = false;
    this.weapon.reset();
    this.hud.hideHud();
    this.hud.hidePause();
    this.hud.hideEnd();
    this.hud.clearTransient();
    this.hud.showMenu();
    this.hud.setAds(false);
    this.camera.fov = 62;
    this.camera.updateProjectionMatrix();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.lastTime = performance.now();
  }

  startWave(wave) {
    this.wave = wave;
    this.waveActive = true;
    this.intermission = 0;
    this.victoryTimer = 0;
    const count = WAVE_COUNTS[wave - 1];
    this.hud.setWave(wave, WAVE_COUNTS.length);
    this.hud.setHostiles(count);
    this.hostilesShown = count;
    this.enemyManager.beginWave(wave, count);
    this.hud.showWave(wave === WAVE_COUNTS.length ? "FINAL WAVE" : "HOSTILE WAVE", `WAVE 0${wave}`, `${count} CONTACTS // INBOUND`);
    this.audio.wave();
  }

  onPlayerHit(damage) {
    if (this.state !== "playing") return;
    let remaining = damage;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield -= absorbed;
      remaining -= absorbed;
    }
    if (remaining > 0) this.health -= remaining;
    this.sinceDamage = 0;
    this.shake = Math.min(0.65, this.shake + 0.32);
    this.hud.flashDamage(0.35 + Math.min(0.6, damage / 28));
    this.syncVitals(true);
    if (this.health <= 0) {
      this.health = 0;
      this.syncVitals(true);
      this.endRun(false);
    }
  }

  onEnemyKilled(enemy, headshot, points) {
    if (this.state !== "playing") return;
    this.kills += 1;
    this.score += points;
    this.hud.setScore(this.score);
    this.hud.addKill(headshot, points);
    this.hud.showHit("kill");
    this.audio.kill();
  }

  syncVitals(force = false) {
    const health = Math.ceil(Math.max(0, this.health));
    const shield = Math.ceil(Math.max(0, this.shield));
    if (!force && health === this.lastHealthShown && shield === this.lastShieldShown) return;
    this.lastHealthShown = health;
    this.lastShieldShown = shield;
    this.hud.setHealth(health, shield);
  }

  endRun(victory) {
    if (this.state === "ended") return;
    this.state = "ended";
    this.enemyManager.active = false;
    this.clearInput();
    this.weapon.group.visible = true;
    this.hud.setScore(this.score);
    this.hud.setHealth(this.health, this.shield);
    const accuracy = this.weapon.shotsFired > 0 ? (this.hits / this.weapon.shotsFired) * 100 : 0;
    this.hud.showEnd({
      victory,
      score: this.score,
      kills: this.kills,
      accuracy,
      waves: victory ? 5 : this.wavesCleared
    });
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  fireRay(origin, direction) {
    this.hintTimer = 0;
    this.hud.setCrosshairHint(false);
    const raycaster = new THREE.Raycaster(origin, direction, 0.08, 140);
    const worldHits = raycaster.intersectObjects(this.world.shootables, false);
    const enemyHits = raycaster.intersectObjects(this.enemyManager.getHitMeshes(), false);
    const worldHit = worldHits[0];
    const enemyHit = enemyHits[0];

    if (enemyHit && (!worldHit || enemyHit.distance < worldHit.distance)) {
      const enemy = enemyHit.object.userData.enemy;
      const headshot = enemyHit.object.userData.part === "head";
      const normal = enemyHit.face
        ? enemyHit.face.normal.clone().transformDirection(enemyHit.object.matrixWorld)
        : direction.clone().negate();
      this.hits += 1;
      const result = enemy.takeDamage(34 * (headshot ? 2.35 : 1), enemyHit.point, normal, headshot);
      if (!result.killed) this.hud.showHit(headshot ? "head" : "body");
      return { end: enemyHit.point.clone() };
    }

    if (worldHit) {
      const normal = worldHit.face
        ? worldHit.face.normal.clone().transformDirection(worldHit.object.matrixWorld)
        : direction.clone().negate();
      this.effects.spawnImpact(worldHit.point, normal);
      return { end: worldHit.point.clone() };
    }

    return { end: origin.clone().addScaledVector(direction, 110) };
  }

  updatePlayer(dt) {
    const keys = this.input.keys;
    const forward = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const moving = forward !== 0 || strafe !== 0;
    const sprintKey = keys.ShiftLeft || keys.ShiftRight;
    this.adsActive = this.input.ads && !sprintKey;
    this.isSprinting = sprintKey && moving && !this.adsActive;
    this.isMoving = moving;

    const speed = this.adsActive ? 3.2 : this.isSprinting ? 8.2 : 5.2;
    const wishX = -Math.sin(this.yaw) * forward + Math.cos(this.yaw) * strafe;
    const wishZ = -Math.cos(this.yaw) * forward - Math.sin(this.yaw) * strafe;
    const wishLength = Math.sqrt(wishX * wishX + wishZ * wishZ);
    const targetX = wishLength > 0 ? (wishX / wishLength) * speed : 0;
    const targetZ = wishLength > 0 ? (wishZ / wishLength) * speed : 0;
    const accel = this.grounded ? 13 : 3.5;
    const blend = 1 - Math.exp(-accel * dt);
    this.velocity.x += (targetX - this.velocity.x) * blend;
    this.velocity.z += (targetZ - this.velocity.z) * blend;
    this.player.x += this.velocity.x * dt;
    this.player.z += this.velocity.z * dt;
    this.world.resolvePlayer(this.player, 0.44);

    if (this.jumpQueued && this.grounded) {
      this.verticalVelocity = 7.1;
      this.grounded = false;
      this.audio.step();
    }
    this.jumpQueued = false;
    if (!this.grounded) {
      this.verticalVelocity -= 22 * dt;
      this.player.y += this.verticalVelocity * dt;
      if (this.player.y <= 1.72) {
        this.player.y = 1.72;
        this.verticalVelocity = 0;
        this.grounded = true;
      }
    }

    if (this.isMoving && this.grounded) {
      this.bobPhase += dt * (this.isSprinting ? 12.5 : 8.6);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.audio.step();
        this.stepTimer = this.isSprinting ? 0.29 : 0.4;
      }
    } else {
      this.bobPhase += dt * 1.1;
      this.stepTimer = 0;
    }

    this.sinceDamage += dt;
    if (this.sinceDamage > 4.5 && this.shield < 50) {
      this.shield = Math.min(50, this.shield + 10 * dt);
    }
    this.syncVitals();

    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hud.setCrosshairHint(false);
    }

    const targetFov = this.adsActive ? 58 : this.isSprinting ? 76 : 72;
    this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-dt * 9));
    this.camera.updateProjectionMatrix();

    const bobStrength = this.adsActive ? 0.2 : 1;
    const bobX = Math.sin(this.bobPhase) * 0.018 * bobStrength;
    const bobY = Math.sin(this.bobPhase * 2) * 0.024 * bobStrength;
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    this.camera.position.set(this.player.x + rightX * bobX, this.player.y + bobY, this.player.z + rightZ * bobX);

    this.shake *= Math.exp(-dt * 7.5);
    const shakeX = (Math.random() - 0.5) * this.shake * 0.02;
    const shakeY = (Math.random() - 0.5) * this.shake * 0.02;
    this.camera.rotation.set(this.pitch + this.weapon.cameraRecoil + shakeX, this.yaw + shakeY, 0);

    const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    const spread = Math.max(4, 5.5 + horizontalSpeed * 1.02 - this.weapon.adsProgress * 4 + this.weapon.recoil * 9);
    this.hud.setReticleSpread(spread);
    this.hud.setAds(this.adsActive);
    this.hud.setCompass(-this.yaw * RAD_TO_DEG);
  }

  updateWaves(dt) {
    const remaining = this.enemyManager.getRemaining();
    if (remaining !== this.hostilesShown) {
      this.hostilesShown = remaining;
      this.hud.setHostiles(remaining);
    }

    if (this.waveActive && remaining === 0) {
      this.waveActive = false;
      this.wavesCleared = this.wave;
      this.score += 250 * this.wave;
      this.hud.setScore(this.score);
      this.health = Math.min(100, this.health + 14);
      this.shield = 50;
      this.sinceDamage = 0;
      this.syncVitals(true);
      if (this.wave >= WAVE_COUNTS.length) {
        this.victoryTimer = 2.6;
        this.hud.showMessage("SECTOR CLEAR", "RELAY CORE STABILIZING");
      } else {
        this.intermission = 4.2;
        this.hud.showMessage("WAVE CLEARED", "REGROUP // SHIELDS RESTORED");
      }
    }

    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) this.startWave(this.wave + 1);
    }
    if (this.victoryTimer > 0) {
      this.victoryTimer -= dt;
      if (this.victoryTimer <= 0) this.endRun(true);
    }
  }

  updateMenuCamera() {
    const t = this.clockTime * 0.075;
    this.camera.position.set(Math.sin(t) * 8.4, 4.3 + Math.sin(t * 0.7) * 0.3, 12.5 + Math.cos(t) * 3.4);
    this.camera.lookAt(0, 2.25, -7.8);
  }

  updateRotateHint() {
    if (!this.rotateHint) return;
    const portrait = window.innerHeight > window.innerWidth;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    this.rotateHint.classList.toggle("show", portrait && coarse);
  }

  resize() {
    if (!this.renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.weapon.setAspect(width / height);
    this.composer.setSize(width, height);
    this.updateRotateHint();
  }

  animate(time) {
    requestAnimationFrame((next) => this.animate(next));
    const dt = Math.min(0.05, Math.max(0, (time - this.lastTime) / 1000));
    this.lastTime = time;
    this.clockTime += dt;

    if (this.state === "playing") {
      this.gameTime += dt;
      this.updatePlayer(dt);
      this.enemyManager.update(dt, this.gameTime, this.camera.position);
      if (this.state !== "playing") {
        this.render();
        return;
      }
      const reload = this.input.reload;
      this.input.reload = false;
      this.weapon.update(
        dt,
        {
          trigger: this.input.fire,
          ads: this.adsActive,
          moving: this.isMoving,
          sprinting: this.isSprinting,
          grounded: this.grounded,
          reload
        },
        this.gameTime
      );
      this.effects.update(dt);
      this.world.update(dt, this.clockTime);
      this.updateWaves(dt);
    } else if (this.state === "menu") {
      this.updateMenuCamera();
      this.effects.update(dt);
      this.world.update(dt, this.clockTime);
    }

    this.render();
  }

  render() {
    this.composer.render();
    if (this.weapon.group.visible) {
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.weapon.weaponScene, this.weapon.weaponCamera);
      this.renderer.autoClear = true;
    }
  }
}

const hud = new HUD();
const audio = new AudioSystem();
const game = new Game(hud, audio);
window.__game = game;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function boot() {
  try {
    hud.setLoadingProgress(0.08, "Establishing uplink");
    await wait(120);
    hud.setLoadingProgress(0.3, "Compiling sector geometry");
    await wait(90);
    game.init();
    hud.setLoadingProgress(0.72, "Calibrating optics");
    await wait(180);
    hud.setLoadingProgress(0.9, "Syncing hostile telemetry");
    await wait(160);
    hud.setLoadingProgress(1, "Uplink established");
    await wait(280);
    hud.finishLoading();
  } catch (error) {
    console.error(error);
    hud.setLoadingProgress(1, "Render link offline");
    hud.loadingText.textContent = "WEBGL UNAVAILABLE — TRY A MODERN BROWSER";
  }
}

boot();
