import * as THREE from "three";
import { glowTexture } from "./textures.js";

export class Weapon {
  constructor({ camera, effects, audio, hud, fireRay }) {
    this.camera = camera;
    this.effects = effects;
    this.audio = audio;
    this.hud = hud;
    this.fireRay = fireRay;

    this.magSize = 30;
    this.ammo = 30;
    this.reserve = 150;
    this.reloadTime = 1.85;
    this.fireInterval = 0.092;
    this.cooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.autoReloadCooldown = 0;
    this.shotsFired = 0;
    this.cameraRecoil = 0;
    this.recoil = 0;
    this.adsProgress = 0;
    this.bobPhase = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.muzzleTimer = 0;
    this.sprintBlend = 0;

    this.weaponScene = new THREE.Scene();
    this.weaponCamera = new THREE.PerspectiveCamera(55, 1, 0.01, 5);
    this.group = new THREE.Group();
    this.weaponScene.add(this.group);
    this.build();
    this.setupLights();

    this.hipPosition = new THREE.Vector3(0.255, -0.3, -0.48);
    this.adsPosition = new THREE.Vector3(0, -0.142, -0.4);
    this.hipRotation = new THREE.Euler(0.055, -0.035, 0.008);
    this.adsRotation = new THREE.Euler(0, 0, 0);
    this.group.scale.setScalar(0.74);
    this.group.position.copy(this.hipPosition);
    this.group.rotation.copy(this.hipRotation);

    this.hud.setAmmo(this.ammo, this.reserve);
    this.hud.setWeaponState("FULL AUTO");
  }

  build() {
    const gunmetal = new THREE.MeshStandardMaterial({ color: 0x2b3134, metalness: 0.88, roughness: 0.32 });
    const darkmetal = new THREE.MeshStandardMaterial({ color: 0x161b1d, metalness: 0.7, roughness: 0.46 });
    const polymer = new THREE.MeshStandardMaterial({ color: 0x1d2223, metalness: 0.18, roughness: 0.78 });
    const tan = new THREE.MeshStandardMaterial({ color: 0x252823, metalness: 0.2, roughness: 0.78 });
    const glove = new THREE.MeshStandardMaterial({ color: 0x151a19, metalness: 0.12, roughness: 0.86 });
    const accent = new THREE.MeshStandardMaterial({ color: 0xff8a24, emissive: 0xff5a00, emissiveIntensity: 0.65, metalness: 0.4, roughness: 0.3 });
    const opticGlass = new THREE.MeshStandardMaterial({
      color: 0x03110f,
      emissive: 0x21d6a4,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.6,
      roughness: 0.08,
      metalness: 0.5
    });

    const add = (geometry, material, position, rotation = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      this.group.add(mesh);
      return mesh;
    };

    add(new THREE.BoxGeometry(0.14, 0.15, 0.5), gunmetal, [0, 0.01, 0]);
    add(new THREE.BoxGeometry(0.146, 0.05, 0.38), darkmetal, [0, 0.098, -0.01]);
    add(new THREE.BoxGeometry(0.09, 0.22, 0.09), tan, [0, -0.16, 0.105], [0.24, 0, 0]);
    add(new THREE.BoxGeometry(0.095, 0.055, 0.2), darkmetal, [0, -0.245, 0.15], [0.24, 0, 0]);

    add(new THREE.BoxGeometry(0.085, 0.21, 0.13), darkmetal, [0, -0.17, -0.045], [0.13, 0, 0]);
    add(new THREE.BoxGeometry(0.088, 0.045, 0.135), accent, [0, -0.26, -0.056], [0.13, 0, 0]);

    add(new THREE.BoxGeometry(0.11, 0.13, 0.3), polymer, [0, 0.005, 0.34]);
    add(new THREE.BoxGeometry(0.12, 0.17, 0.045), darkmetal, [0, -0.005, 0.5]);
    add(new THREE.BoxGeometry(0.095, 0.045, 0.22), tan, [0, 0.078, 0.32]);

    add(new THREE.BoxGeometry(0.108, 0.108, 0.44), polymer, [0, 0.035, -0.33]);
    add(new THREE.BoxGeometry(0.115, 0.025, 0.42), gunmetal, [0, 0.1, -0.33]);
    add(new THREE.BoxGeometry(0.016, 0.035, 0.3), darkmetal, [0.09, 0.055, -0.33]);
    add(new THREE.BoxGeometry(0.016, 0.035, 0.3), darkmetal, [-0.09, 0.055, -0.33]);

    for (let i = 0; i < 4; i += 1) {
      add(new THREE.BoxGeometry(0.02, 0.035, 0.05), darkmetal, [0.062, 0.045, -0.19 - i * 0.085]);
      add(new THREE.BoxGeometry(0.02, 0.035, 0.05), darkmetal, [-0.062, 0.045, -0.19 - i * 0.085]);
    }

    add(new THREE.CylinderGeometry(0.021, 0.021, 0.4, 12), darkmetal, [0, 0.035, -0.55], [Math.PI / 2, 0, 0]);
    add(new THREE.CylinderGeometry(0.036, 0.03, 0.14, 10), gunmetal, [0, 0.035, -0.79], [Math.PI / 2, 0, 0]);
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 10), accent, [0, 0.035, -0.73], [Math.PI / 2, 0, 0]);
    add(new THREE.BoxGeometry(0.035, 0.11, 0.03), gunmetal, [0, 0.08, -0.4]);

    add(new THREE.BoxGeometry(0.072, 0.03, 0.2), darkmetal, [0, 0.135, -0.02]);
    add(new THREE.BoxGeometry(0.062, 0.07, 0.15), gunmetal, [0, 0.18, 0.01]);
    add(new THREE.TorusGeometry(0.044, 0.009, 8, 24), darkmetal, [0, 0.195, -0.065]);
    add(new THREE.TorusGeometry(0.04, 0.007, 8, 24), darkmetal, [0, 0.19, 0.075]);
    add(new THREE.CircleGeometry(0.035, 24), opticGlass, [0, 0.195, -0.069]);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), accent);
    dot.position.set(0, 0.195, -0.055);
    this.group.add(dot);
    add(new THREE.BoxGeometry(0.02, 0.022, 0.06), accent, [0, 0.222, -0.02]);

    add(new THREE.BoxGeometry(0.11, 0.12, 0.16), glove, [0.012, -0.155, 0.12], [0.18, 0, -0.03]);
    add(new THREE.BoxGeometry(0.045, 0.09, 0.05), glove, [0.058, -0.095, 0.03], [0.3, 0, 0.2]);
    add(new THREE.BoxGeometry(0.1, 0.09, 0.15), glove, [-0.01, -0.04, -0.33], [0.1, 0, 0.05]);
    add(new THREE.BoxGeometry(0.09, 0.05, 0.06), glove, [-0.012, 0.012, -0.36], [0, 0, 0.05]);
    add(new THREE.BoxGeometry(0.14, 0.2, 0.2), polymer, [-0.02, -0.27, 0.02], [0.15, 0, 0.05]);

    const flashMaterial = new THREE.SpriteMaterial({
      map: glowTexture(),
      color: 0xffb05c,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false
    });
    this.muzzleFlash = new THREE.Sprite(flashMaterial);
    this.muzzleFlash.position.set(0, 0.035, -0.88);
    this.muzzleFlash.scale.set(0.34, 0.34, 1);
    this.muzzleFlash.visible = false;
    this.group.add(this.muzzleFlash);

    this.muzzleLight = new THREE.PointLight(0xffa04a, 0, 1.8, 2);
    this.muzzleLight.position.set(0, 0.05, -0.85);
    this.group.add(this.muzzleLight);
  }

  setupLights() {
    this.weaponScene.add(new THREE.HemisphereLight(0xbfd4dd, 0x1c1510, 0.9));
    const key = new THREE.DirectionalLight(0xffe6c8, 1.2);
    key.position.set(1.8, 2.4, 1.4);
    this.weaponScene.add(key);
    const rim = new THREE.DirectionalLight(0x5f8ba6, 0.7);
    rim.position.set(-2, 0.5, -1.8);
    this.weaponScene.add(rim);
    const warm = new THREE.PointLight(0xff7a18, 1.5, 3, 2);
    warm.position.set(-0.6, -0.3, -0.2);
    this.weaponScene.add(warm);
  }

  setAspect(aspect) {
    this.weaponCamera.aspect = aspect;
    this.weaponCamera.updateProjectionMatrix();
  }

  addLook(dx, dy) {
    this.swayX += dx * 0.00055;
    this.swayY += dy * 0.00055;
    this.swayX = THREE.MathUtils.clamp(this.swayX, -0.03, 0.03);
    this.swayY = THREE.MathUtils.clamp(this.swayY, -0.025, 0.025);
  }

  startReload() {
    if (this.reloading || this.ammo >= this.magSize || this.reserve <= 0) return;
    this.reloading = true;
    this.reloadTimer = 0;
    this.hud.setWeaponState("RELOADING");
    this.audio.reload();
  }

  finishReload() {
    const needed = this.magSize - this.ammo;
    const taken = Math.min(needed, this.reserve);
    this.ammo += taken;
    this.reserve -= taken;
    this.reloading = false;
    this.reloadTimer = 0;
    this.hud.setAmmo(this.ammo, this.reserve);
    this.hud.setReloadProgress(0);
    this.hud.setWeaponState("FULL AUTO");
  }

  shoot(state) {
    if (this.reloading) return;
    if (this.ammo <= 0) {
      if (this.autoReloadCooldown <= 0) {
        this.audio.empty();
        this.autoReloadCooldown = 0.35;
        if (this.reserve > 0) this.startReload();
      }
      return;
    }

    this.ammo -= 1;
    this.shotsFired += 1;
    this.cooldown = this.fireInterval;
    this.recoil = Math.min(1, this.recoil + 0.15);
    this.cameraRecoil += 0.009 + Math.random() * 0.004;
    this.muzzleTimer = 0.05;
    this.muzzleFlash.visible = true;
    this.muzzleFlash.material.rotation = Math.random() * Math.PI * 2;
    const flashScale = 0.26 + Math.random() * 0.16;
    this.muzzleFlash.scale.set(flashScale, flashScale, 1);
    this.muzzleLight.intensity = 4.5;
    this.audio.shoot();
    this.hud.setAmmo(this.ammo, this.reserve);

    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

    const movingPenalty = state.moving ? (state.sprinting ? 0.022 : 0.008) : 0;
    const baseSpread = THREE.MathUtils.lerp(0.014, 0.0032, this.adsProgress) + movingPenalty * (1 - this.adsProgress * 0.7);
    const radians = Math.sqrt(Math.random()) * baseSpread;
    const angle = Math.random() * Math.PI * 2;
    direction.addScaledVector(right, Math.cos(angle) * radians);
    direction.addScaledVector(up, Math.sin(angle) * radians);
    direction.normalize();

    const result = this.fireRay(origin, direction);
    if (result) {
      const start = origin.clone().addScaledVector(right, 0.12).addScaledVector(up, -0.1).addScaledVector(direction, 0.35);
      this.effects.spawnTracer(start, result.end.clone());
    }

    if (this.ammo === 0 && this.reserve > 0) {
      setTimeout(() => {
        if (this.ammo === 0 && !this.reloading) this.startReload();
      }, 220);
    }
  }

  update(dt, state, time) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.autoReloadCooldown = Math.max(0, this.autoReloadCooldown - dt);
    this.recoil *= Math.exp(-dt * 10);
    this.cameraRecoil *= Math.exp(-dt * 7.5);
    this.swayX *= Math.exp(-dt * 8);
    this.swayY *= Math.exp(-dt * 8);

    if (this.reloading) {
      this.reloadTimer += dt;
      const progress = Math.min(1, this.reloadTimer / this.reloadTime);
      this.hud.setReloadProgress(progress);
      if (progress >= 1) this.finishReload();
    }

    if (state.reload) this.startReload();
    if (state.trigger && this.cooldown <= 0) this.shoot(state);

    const adsTarget = state.ads && !this.reloading ? 1 : 0;
    this.adsProgress += (adsTarget - this.adsProgress) * (1 - Math.exp(-dt * 13));
    const sprintTarget = state.sprinting && state.moving ? 1 : 0;
    this.sprintBlend += (sprintTarget - this.sprintBlend) * (1 - Math.exp(-dt * 9));

    if (state.moving && state.grounded) {
      this.bobPhase += dt * (state.sprinting ? 11 : 7);
    }
    const bobAmount = state.moving && state.grounded ? (state.sprinting ? 0.014 : 0.007) : 0.0014;
    const bobX = Math.sin(this.bobPhase) * bobAmount;
    const bobY = Math.abs(Math.cos(this.bobPhase)) * bobAmount * 0.8;
    const breathX = Math.sin(time * 1.4) * 0.0015;
    const breathY = Math.cos(time * 1.9) * 0.0018;

    const targetX = THREE.MathUtils.lerp(this.hipPosition.x, this.adsPosition.x, this.adsProgress);
    const targetY = THREE.MathUtils.lerp(this.hipPosition.y, this.adsPosition.y, this.adsProgress);
    const targetZ = THREE.MathUtils.lerp(this.hipPosition.z, this.adsPosition.z, this.adsProgress);

    const sprintDrop = this.sprintBlend * (1 - this.adsProgress);
    const reloadTilt = this.reloading ? Math.sin(Math.min(1, this.reloadTimer / this.reloadTime) * Math.PI) : 0;

    this.group.position.set(
      targetX + bobX + this.swayX + sprintDrop * 0.05,
      targetY - bobY + breathY + this.swayY - sprintDrop * 0.11 - reloadTilt * 0.1,
      targetZ + this.recoil * 0.045 + sprintDrop * 0.04
    );

    this.group.rotation.set(
      THREE.MathUtils.lerp(this.hipRotation.x, this.adsRotation.x, this.adsProgress) + this.recoil * 0.055 + sprintDrop * 0.22 + reloadTilt * 0.32,
      THREE.MathUtils.lerp(this.hipRotation.y, this.adsRotation.y, this.adsProgress) + this.swayX * 0.8,
      THREE.MathUtils.lerp(this.hipRotation.z, this.adsRotation.z, this.adsProgress) - sprintDrop * 0.38 - reloadTilt * 0.22
    );

    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 80);
      if (this.muzzleTimer <= 0) {
        this.muzzleFlash.visible = false;
        this.muzzleLight.intensity = 0;
      }
    }

    if (!this.reloading) {
      const stateLabel = this.adsProgress > 0.55 ? "OPTIC / ADS" : "FULL AUTO";
      if (this.hud.weaponState.textContent !== stateLabel) this.hud.setWeaponState(stateLabel);
    }
  }

  reset() {
    this.ammo = this.magSize;
    this.reserve = 150;
    this.reloading = false;
    this.reloadTimer = 0;
    this.cooldown = 0;
    this.autoReloadCooldown = 0;
    this.shotsFired = 0;
    this.recoil = 0;
    this.cameraRecoil = 0;
    this.adsProgress = 0;
    this.sprintBlend = 0;
    this.muzzleTimer = 0;
    this.muzzleFlash.visible = false;
    this.muzzleLight.intensity = 0;
    this.hud.setAmmo(this.ammo, this.reserve);
    this.hud.setReloadProgress(0);
    this.hud.setWeaponState("FULL AUTO");
  }
}
