const CARDINALS = {
  0: "N",
  45: "NE",
  90: "E",
  135: "SE",
  180: "S",
  225: "SW",
  270: "W",
  315: "NW"
};

export class HUD {
  constructor() {
    this.loading = document.getElementById("loading");
    this.loadingBar = document.getElementById("loading-bar");
    this.loadingText = document.getElementById("loading-text");
    this.menu = document.getElementById("menu");
    this.hud = document.getElementById("hud");
    this.compassTrack = document.getElementById("compass-track");
    this.compassDeg = document.getElementById("compass-deg");
    this.scoreValue = document.getElementById("score-value");
    this.waveValue = document.getElementById("wave-value");
    this.hostileValue = document.getElementById("hostile-value");
    this.killfeed = document.getElementById("killfeed");
    this.reticle = document.getElementById("reticle");
    this.hitmarker = document.getElementById("hitmarker");
    this.healthValue = document.getElementById("health-value");
    this.healthBar = document.getElementById("health-bar");
    this.shieldValue = document.getElementById("shield-value");
    this.shieldBar = document.getElementById("shield-bar");
    this.damageState = document.getElementById("damage-state");
    this.ammoValue = document.getElementById("ammo-value");
    this.reserveValue = document.getElementById("reserve-value");
    this.reloadFill = document.getElementById("reload-fill");
    this.weaponState = document.getElementById("weapon-state");
    this.crosshairHint = document.getElementById("crosshair-hint");
    this.damageFlash = document.getElementById("damage-flash");
    this.lowHealth = document.getElementById("low-health");
    this.waveBanner = document.getElementById("wave-banner");
    this.bannerKicker = document.getElementById("banner-kicker");
    this.bannerTitle = document.getElementById("banner-title");
    this.bannerSub = document.getElementById("banner-sub");
    this.gameMessage = document.getElementById("game-message");
    this.messageTitle = document.getElementById("message-title");
    this.messageSub = document.getElementById("message-sub");
    this.pauseScreen = document.getElementById("pause-screen");
    this.pauseScore = document.getElementById("pause-score");
    this.pauseKills = document.getElementById("pause-kills");
    this.pauseWave = document.getElementById("pause-wave");
    this.endScreen = document.getElementById("end-screen");
    this.endKicker = document.getElementById("end-kicker");
    this.endTitle = document.getElementById("end-title");
    this.endCopy = document.getElementById("end-copy");
    this.endScore = document.getElementById("end-score");
    this.endKills = document.getElementById("end-kills");
    this.endAccuracy = document.getElementById("end-accuracy");
    this.endWaves = document.getElementById("end-waves");
    this.rotateHint = document.getElementById("rotate-hint");
    this.compassTicks = [];
    this.hitTimer = 0;
    this.damageTimer = 0;
    this.bannerTimer = 0;
    this.messageTimer = 0;
    this.crosshairTimer = 0;
    this.buildCompass();
  }

  buildCompass() {
    const fragment = document.createDocumentFragment();
    for (let deg = -180; deg <= 540; deg += 15) {
      const normalized = ((deg % 360) + 360) % 360;
      const major = normalized % 45 === 0;
      const tick = document.createElement("span");
      tick.className = major ? "compass-tick major" : "compass-tick";
      let label = "";
      if (major) label = CARDINALS[normalized] ?? String(normalized).padStart(3, "0");
      tick.textContent = label;
      fragment.appendChild(tick);
      this.compassTicks.push(tick);
    }
    this.compassTrack.appendChild(fragment);
  }

  setLoadingProgress(progress, text) {
    this.loadingBar.style.width = `${Math.round(progress * 100)}%`;
    if (text) this.loadingText.textContent = text;
  }

  finishLoading() {
    this.loading.classList.add("done");
    setTimeout(() => this.loading.classList.add("hidden"), 550);
  }

  hideMenu() {
    this.menu.classList.add("exiting");
    setTimeout(() => this.menu.classList.add("hidden"), 450);
  }

  showMenu() {
    this.menu.classList.remove("hidden");
    requestAnimationFrame(() => this.menu.classList.remove("exiting"));
  }

  showHud() {
    this.hud.classList.remove("hidden");
  }

  hideHud() {
    this.hud.classList.add("hidden");
  }

  setScore(score) {
    this.scoreValue.textContent = String(Math.max(0, Math.round(score))).padStart(6, "0");
  }

  setWave(wave, total = 5) {
    this.waveValue.textContent = String(wave).padStart(2, "0");
    const totalEl = this.waveValue.nextElementSibling;
    if (totalEl) totalEl.textContent = `/ ${String(total).padStart(2, "0")}`;
  }

  setHostiles(count) {
    this.hostileValue.textContent = String(Math.max(0, count)).padStart(2, "0");
  }

  setHealth(health, shield) {
    const hp = Math.max(0, Math.min(100, health));
    const sp = Math.max(0, Math.min(50, shield));
    this.healthValue.textContent = String(Math.round(hp));
    this.shieldValue.textContent = String(Math.round(sp));
    this.healthBar.style.width = `${hp}%`;
    this.shieldBar.style.width = `${(sp / 50) * 100}%`;
    this.healthBar.classList.toggle("low", hp <= 30);
    this.damageState.classList.toggle("hurt", hp <= 40);
    this.damageState.textContent = hp <= 30 ? "CRITICAL" : hp <= 60 ? "WOUNDED" : "NOMINAL";
    this.lowHealth.classList.toggle("on", hp <= 30);
  }

  setAmmo(ammo, reserve) {
    this.ammoValue.textContent = String(ammo).padStart(2, "0");
    this.reserveValue.textContent = String(reserve).padStart(3, "0");
    this.ammoValue.style.color = ammo === 0 ? "var(--red)" : ammo <= 6 ? "var(--orange)" : "";
  }

  setReloadProgress(progress) {
    this.reloadFill.style.width = `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`;
  }

  setWeaponState(text) {
    this.weaponState.textContent = text;
  }

  setCompass(degrees) {
    const heading = ((degrees % 360) + 360) % 360;
    this.compassDeg.textContent = String(Math.round(heading) % 360).padStart(3, "0");
    const first = this.compassTicks[0];
    if (!first || first.offsetWidth === 0) return;
    const index = (heading + 180) / 15;
    const lower = Math.floor(index);
    const upper = Math.min(this.compassTicks.length - 1, lower + 1);
    const fraction = index - lower;
    const lowerTick = this.compassTicks[lower];
    const upperTick = this.compassTicks[upper];
    const lowerX = lowerTick.offsetLeft + lowerTick.offsetWidth / 2;
    const upperX = upperTick.offsetLeft + upperTick.offsetWidth / 2;
    const position = lowerX + (upperX - lowerX) * fraction;
    this.compassTrack.style.transform = `translateX(${-position}px)`;
  }

  setReticleSpread(pixels) {
    this.reticle.style.setProperty("--spread", `${pixels.toFixed(1)}px`);
  }

  setAds(active) {
    this.reticle.style.opacity = active ? "0.2" : "1";
  }

  setCrosshairHint(visible) {
    this.crosshairHint.classList.toggle("fade", !visible);
  }

  showHit(kind = "body") {
    clearTimeout(this.hitTimer);
    this.hitmarker.classList.remove("show", "head", "kill");
    void this.hitmarker.offsetWidth;
    if (kind === "head") this.hitmarker.classList.add("head");
    if (kind === "kill") this.hitmarker.classList.add("kill");
    this.hitmarker.classList.add("show");
    this.hitTimer = setTimeout(() => {
      this.hitmarker.classList.remove("show", "head", "kill");
    }, 260);
  }

  addKill(headshot, points) {
    const line = document.createElement("div");
    line.className = `killfeed-line${headshot ? " head" : ""}`;
    line.innerHTML = `<b>VK-77</b> <em>//</em> SENTINEL ${headshot ? "HEADSHOT" : "DESTROYED"} <em>+${points}</em>`;
    this.killfeed.appendChild(line);
    while (this.killfeed.children.length > 5) this.killfeed.firstElementChild.remove();
    setTimeout(() => line.remove(), 4200);
  }

  flashDamage(intensity = 1) {
    clearTimeout(this.damageTimer);
    this.damageFlash.style.opacity = String(Math.min(1, intensity));
    this.damageTimer = setTimeout(() => {
      this.damageFlash.style.opacity = "0";
    }, 90);
  }

  showWave(kicker, title, sub) {
    clearTimeout(this.bannerTimer);
    this.waveBanner.classList.remove("show");
    this.bannerKicker.textContent = kicker;
    this.bannerTitle.textContent = title;
    this.bannerSub.textContent = sub;
    void this.waveBanner.offsetWidth;
    this.waveBanner.classList.add("show");
    this.bannerTimer = setTimeout(() => this.waveBanner.classList.remove("show"), 3300);
  }

  showMessage(title, sub) {
    clearTimeout(this.messageTimer);
    this.gameMessage.classList.remove("show");
    this.messageTitle.textContent = title;
    this.messageSub.textContent = sub;
    void this.gameMessage.offsetWidth;
    this.gameMessage.classList.add("show");
    this.messageTimer = setTimeout(() => this.gameMessage.classList.remove("show"), 3500);
  }

  showPause(score, kills, wave) {
    this.pauseScore.textContent = String(Math.round(score)).padStart(6, "0");
    this.pauseKills.textContent = String(kills);
    this.pauseWave.textContent = `${String(wave).padStart(2, "0")} / 05`;
    this.pauseScreen.classList.remove("hidden");
  }

  hidePause() {
    this.pauseScreen.classList.add("hidden");
  }

  showEnd({ victory, score, kills, accuracy, waves }) {
    this.endScreen.classList.toggle("victory", victory);
    this.endKicker.textContent = victory ? "OPERATION COMPLETE" : "OPERATION TERMINATED";
    this.endTitle.textContent = victory ? "SECTOR SECURED" : "SIGNAL LOST";
    this.endCopy.textContent = victory
      ? "All five sentinel waves have been neutralized. The relay core is stable and Sector 07 is back online."
      : "Your integrity has failed. The swarm remains in control of Sector 07. Redeploy and try again.";
    this.endScore.textContent = String(Math.round(score)).padStart(6, "0");
    this.endKills.textContent = String(kills);
    this.endAccuracy.textContent = `${Math.round(accuracy)}%`;
    this.endWaves.textContent = `${Math.min(waves, 5)} / 5`;
    this.endScreen.classList.remove("hidden");
  }

  hideEnd() {
    this.endScreen.classList.add("hidden");
    this.endScreen.classList.remove("victory");
  }

  clearTransient() {
    clearTimeout(this.hitTimer);
    clearTimeout(this.damageTimer);
    clearTimeout(this.bannerTimer);
    clearTimeout(this.messageTimer);
    this.hitmarker.classList.remove("show", "head", "kill");
    this.damageFlash.style.opacity = "0";
    this.waveBanner.classList.remove("show");
    this.gameMessage.classList.remove("show");
    this.lowHealth.classList.remove("on");
    this.killfeed.innerHTML = "";
  }
}
