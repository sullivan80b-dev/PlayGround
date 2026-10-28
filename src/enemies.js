import * as THREE from "three";
import { glowTexture } from "./textures.js";

const tmpEye = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();

class Sentinel {
  constructor(manager, position, options) {
    this.manager = manager;
    this.world = manager.world;
    this.effects = manager.effects;
    this.audio = manager.audio;
    this.wave = options.wave;
    this.maxHealth = 85 + this.wave * 13;
    this.health = this.maxHealth;
    this.dead = false;
    this.spawnDuration = 0.75;
    this.spawnTimer = this.spawnDuration;
    this.hoverHeight = 2.15 + Math.random() * 0.8;
    this.orbitAngle = Math.atan2(position.z, position.x) + (Math.random() - 0.5) * 0.7;
    this.strafeDirection = Math.random() > 0.5 ? 1 : -1;
    this.strafeTimer = 2 + Math.random() * 2.5;
    this.velocity = new THREE.Vector3();
    this.charge = 0;
    this.attackCooldown = 1.4 + Math.random() * 1.8;
    this.losTimer = 0;
    this.hasLineOfSight = true;
    this.hitFlash = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.time = 0;
    this.position = this.hoverHeight;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.position.y = 0.9;
    this.group.scale.setScalar(0.15);
    this.build();
    manager.scene.add(this.group);
  }

  build() {
    const shellMaterial = new THREE.MeshStandardMaterial({
      color: 0x1d2527,
      emissive: 0xff3b2a,
      emissiveIntensity: 0.12,
      metalness: 0.78,
      roughness: 0.38,
      flatShading: true
    });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x0e1213, metalness: 0.6, roughness: 0.5, flatShading: true });
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x7c2a12,
      emissive: 0xff5a18,
      emissiveIntensity: 3.0,
      metalness: 0.6,
      roughness: 0.3
    });
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3b1c,
      emissive: 0xff2a10,
      emissiveIntensity: 3.8,
      roughness: 0.2
    });
    this.shellMaterial = shellMaterial;
    this.ringMaterial = ringMaterial;
    this.eyeMaterial = eyeMaterial;

    const shell = new THREE.Mesh(new THREE.OctahedronGeometry(0.74, 0), shellMaterial);
    shell.castShadow = true;
    this.group.add(shell);

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), darkMaterial);
    core.castShadow = true;
    this.group.add(core);

    const shellEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(shell.geometry, 18),
      new THREE.LineBasicMaterial({ color: 0xff6a28, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    shellEdges.scale.setScalar(1.01);
    this.group.add(shellEdges);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.028, 8, 40), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);
    this.ring = ring;

    const ringTwo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.02, 8, 32), ringMaterial);
    ringTwo.rotation.x = Math.PI / 2 + 0.4;
    this.group.add(ringTwo);
    this.ringTwo = ringTwo;

    for (let i = 0; i < 3; i += 1) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.34), darkMaterial);
      const angle = (i / 3) * Math.PI * 2;
      fin.position.set(Math.cos(angle) * 0.58, -0.22, Math.sin(angle) * 0.58);
      fin.rotation.y = -angle;
      fin.rotation.z = 0.18;
      fin.castShadow = true;
      this.group.add(fin);
    }

    const eyeHousing = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), darkMaterial);
    eyeHousing.position.set(0, 0.08, 0.53);
    this.group.add(eyeHousing);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.088, 12, 10), eyeMaterial);
    eye.position.set(0, 0.08, 0.66);
    this.group.add(eye);
    this.eye = eye;

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.36, 8), darkMaterial);
    antenna.position.set(0, 0.78, 0);
    this.group.add(antenna);
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMaterial);
    antennaTip.position.set(0, 0.96, 0);
    this.group.add(antennaTip);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: 0xff4a20,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.scale.set(2.4, 2.4, 1);
    this.group.add(halo);

    const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
    const bodyHit = new THREE.Mesh(new THREE.SphereGeometry(0.52, 8, 6), hitMaterial);
    bodyHit.userData.enemy = this;
    bodyHit.userData.part = "body";
    this.group.add(bodyHit);
    const headHit = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), hitMaterial);
    headHit.position.set(0, 0.8, 0);
    headHit.userData.enemy = this;
    headHit.userData.part = "head";
    this.group.add(headHit);
    this.hitMeshes = [bodyHit, headHit];
  }

  getHitMeshes() {
    return this.hitMeshes;
  }

  takeDamage(amount, point, normal, headshot) {
    if (this.dead) return { killed: false, damage: 0 };
    const damage = Math.round(amount);
    this.health -= damage;
    this.hitFlash = 0.16;
    this.effects.spawnEnemyImpact(point, normal, headshot);
    this.audio.hit(headshot);
    if (this.health <= 0) {
      this.dead = true;
      this.manager.destroySentinel(this, headshot);
      return { killed: true, damage };
    }
    return { killed: false, damage };
  }

  fire(playerPos) {
    this.eye.getWorldPosition(tmpEye);
    const speed = 15.5 + this.wave * 0.7;
    const spread = 0.035;
    tmpTarget.copy(playerPos);
    tmpTarget.x += (Math.random() - 0.5) * spread * 20;
    tmpTarget.y += (Math.random() - 0.5) * spread * 12;
    tmpTarget.z += (Math.random() - 0.5) * spread * 20;
    this.manager.spawnProjectile(tmpEye.clone(), tmpTarget, speed, 7 + this.wave);
    this.effects.spawnFlash(tmpEye.clone(), 0xff5a20, 0.6, 0.12);
    this.audio.enemyShoot();
    this.attackCooldown = Math.max(1.15, 2.6 - this.wave * 0.16) + Math.random() * 0.8;
    this.charge = 0;
  }

  update(dt, time, playerPos) {
    this.time += dt;
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      this.shellMaterial.emissiveIntensity = 0.12 + Math.max(0, this.hitFlash / 0.16) * 2.6;
    } else {
      this.shellMaterial.emissiveIntensity = 0.12;
    }

    const spawnProgress = 1 - Math.max(0, this.spawnTimer) / this.spawnDuration;
    if (this.spawnTimer > 0) {
      this.spawnTimer -= dt;
      const eased = 1 - Math.pow(1 - Math.min(1, spawnProgress), 3);
      this.group.scale.setScalar(0.15 + eased * 0.85);
      this.group.position.y = 0.9 + eased * (this.hoverHeight - 0.9);
      this.group.rotation.y += dt * 2;
      this.group.lookAt(playerPos.x, this.group.position.y, playerPos.z);
      return;
    }

    this.group.scale.setScalar(1);
    this.ring.rotation.z += dt * (0.8 + this.charge * 4);
    this.ringTwo.rotation.z -= dt * (1.2 + this.charge * 5);
    this.ring.position.y = Math.sin(time * 1.7 + this.phase) * 0.045;
    this.ringTwo.position.y = Math.cos(time * 1.3 + this.phase) * 0.08;

    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafeDirection *= -1;
      this.strafeTimer = 2.5 + Math.random() * 3;
    }

    const dx = this.group.position.x - playerPos.x;
    const dz = this.group.position.z - playerPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const preferredRadius = 8.5 + Math.sin(this.time * 0.35 + this.phase) * 1.8;

    this.orbitAngle += this.strafeDirection * dt * 0.22;
    if (distance < 5.5) this.orbitAngle += dt * 1.2;
    if (distance > 17) this.orbitAngle -= dt * 0.8;

    const desiredX = playerPos.x + Math.cos(this.orbitAngle) * preferredRadius;
    const desiredZ = playerPos.z + Math.sin(this.orbitAngle) * preferredRadius;
    const desiredY = this.hoverHeight + Math.sin(time * 1.5 + this.phase) * 0.22;
    const toX = desiredX - this.group.position.x;
    const toY = desiredY - this.group.position.y;
    const toZ = desiredZ - this.group.position.z;
    const toLength = Math.max(0.001, Math.sqrt(toX * toX + toY * toY + toZ * toZ));
    const speed = 2.5 + this.wave * 0.18;
    const desiredVelocity = new THREE.Vector3((toX / toLength) * speed, (toY / toLength) * speed * 0.7, (toZ / toLength) * speed);
    this.velocity.lerp(desiredVelocity, 1 - Math.exp(-dt * 2.6));
    this.group.position.addScaledVector(this.velocity, dt);
    this.world.resolveFlying(this.group.position, 0.8, this.group.position.y);

    this.group.lookAt(playerPos.x, playerPos.y - 0.2, playerPos.z);

    this.attackCooldown -= dt;
    this.losTimer -= dt;
    if (this.losTimer <= 0) {
      const eyePosition = this.eye.getWorldPosition(tmpEye);
      this.hasLineOfSight = !this.world.lineBlocked(eyePosition, playerPos);
      this.losTimer = 0.24;
    }

    if (this.attackCooldown <= 0 && this.hasLineOfSight) {
      this.charge += dt;
      this.eyeMaterial.emissiveIntensity = 3.8 + this.charge * 12;
      this.eye.scale.setScalar(1 + this.charge * 0.9);
      if (this.charge >= 0.42) {
        this.eye.scale.setScalar(1);
        this.eyeMaterial.emissiveIntensity = 3.8;
        this.fire(playerPos);
      }
    } else {
      this.charge = Math.max(0, this.charge - dt * 1.4);
      this.eyeMaterial.emissiveIntensity = 3.8 + this.charge * 12;
      this.eye.scale.setScalar(1 + this.charge * 0.9);
    }
  }

  dispose() {
    this.group.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      }
    });
    this.manager.scene.remove(this.group);
  }
}

class Projectile {
  constructor(manager, origin, target, speed, damage) {
    this.manager = manager;
    this.damage = damage;
    this.life = 3.6;
    this.position = origin.clone();
    this.velocity = target.clone().sub(origin).normalize().multiplyScalar(speed);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff6a2a,
      emissive: 0xff2a00,
      emissiveIntensity: 4.5,
      roughness: 0.2
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), material);
    this.mesh.position.copy(this.position);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: manager.glow,
        color: 0xff5a20,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    glow.scale.set(0.75, 0.75, 1);
    this.mesh.add(glow);
    manager.scene.add(this.mesh);
  }

  update(dt, playerPos) {
    this.life -= dt;
    this.position.addScaledVector(this.velocity, dt);
    this.mesh.position.copy(this.position);
    if (this.position.distanceTo(playerPos) < 0.62) {
      this.manager.projectileHit(this, playerPos);
      return false;
    }
    if (this.life <= 0 || this.position.y < 0.08) {
      this.manager.projectileExpired(this);
      return false;
    }
    return true;
  }

  dispose() {
    this.manager.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.children.forEach((child) => {
      if (child.material) child.material.dispose();
    });
  }
}

export class EnemyManager {
  constructor({ scene, world, effects, audio, onPlayerHit, onEnemyKilled }) {
    this.scene = scene;
    this.world = world;
    this.effects = effects;
    this.audio = audio;
    this.onPlayerHit = onPlayerHit;
    this.onEnemyKilled = onEnemyKilled;
    this.enemies = [];
    this.projectiles = [];
    this.pending = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 0.8;
    this.maxActive = 5;
    this.wave = 1;
    this.glow = glowTexture();
    this.active = true;
  }

  beginWave(wave, count) {
    this.wave = wave;
    this.pending = count;
    this.spawnTimer = 0.2;
    this.spawnInterval = Math.max(0.32, 0.88 - wave * 0.07);
    this.maxActive = Math.min(9, 4 + wave);
    this.active = true;
  }

  spawnSentinel(playerPos) {
    const points = [...this.world.spawnPoints];
    points.sort((a, b) => b.distanceToSquared(playerPos) - a.distanceToSquared(playerPos));
    const pool = points.slice(0, Math.min(3, points.length));
    const point = pool[Math.floor(Math.random() * pool.length)].clone();
    point.x += (Math.random() - 0.5) * 3;
    point.z += (Math.random() - 0.5) * 3;
    point.y = 0.9;
    const sentinel = new Sentinel(this, point, { wave: this.wave });
    this.enemies.push(sentinel);
    this.effects.spawnBurst(new THREE.Vector3(point.x, 1.2, point.z), 0xff5a20, 10, {
      speed: 2,
      size: 0.06,
      life: 0.4,
      gravity: 2
    });
  }

  spawnProjectile(origin, target, speed, damage) {
    this.projectiles.push(new Projectile(this, origin, target, speed, damage));
  }

  projectileHit(projectile, playerPos) {
    this.effects.spawnBurst(playerPos.clone(), 0xff3b1c, 6, { speed: 2.4, size: 0.05, life: 0.24, gravity: 4 });
    this.audio.playerHit();
    if (this.onPlayerHit) this.onPlayerHit(projectile.damage, projectile.position);
    this.removeProjectile(projectile);
  }

  projectileExpired(projectile) {
    this.effects.spawnFlash(projectile.position.clone(), 0xff3b1c, 0.35, 0.1);
    this.removeProjectile(projectile);
  }

  removeProjectile(projectile) {
    const index = this.projectiles.indexOf(projectile);
    if (index !== -1) this.projectiles.splice(index, 1);
    projectile.dispose();
  }

  destroySentinel(sentinel, headshot) {
    const index = this.enemies.indexOf(sentinel);
    if (index !== -1) this.enemies.splice(index, 1);
    const position = sentinel.group.position.clone();
    this.effects.spawnExplosion(position, 1);
    this.audio.explosion();
    const points = 100 + this.wave * 25 + (headshot ? 75 : 0);
    if (this.onEnemyKilled) this.onEnemyKilled(sentinel, headshot, points);
    sentinel.dispose();
  }

  getHitMeshes() {
    const meshes = [];
    this.enemies.forEach((enemy) => {
      if (!enemy.dead) {
        enemy.group.updateMatrixWorld(true);
        meshes.push(...enemy.hitMeshes);
      }
    });
    return meshes;
  }

  getAlive() {
    return this.enemies.length;
  }

  getRemaining() {
    return this.enemies.length + this.pending;
  }

  update(dt, time, playerPos) {
    if (!this.active) return;
    if (this.pending > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemies.length < this.maxActive) {
        this.spawnSentinel(playerPos);
        this.pending -= 1;
        this.spawnTimer = this.spawnInterval;
      }
    }

    for (let i = 0; i < this.enemies.length; i += 1) {
      this.enemies[i].update(dt, time, playerPos);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      if (!this.projectiles[i].update(dt, playerPos)) continue;
    }
  }

  reset() {
    this.enemies.forEach((enemy) => enemy.dispose());
    this.enemies.length = 0;
    this.projectiles.forEach((projectile) => projectile.dispose());
    this.projectiles.length = 0;
    this.pending = 0;
    this.spawnTimer = 0;
    this.active = true;
  }
}
