import * as THREE from "three";
import { glowTexture, bulletHoleTexture } from "./textures.js";

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.glow = glowTexture();
    this.hole = bulletHoleTexture();
    this.particles = [];
    this.maxParticles = 480;
    this.tracers = [];
    this.flashes = [];
    this.decals = [];
    this.maxDecals = 44;

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.alphas = new Float32Array(this.maxParticles);
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("aColor", new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute("aSize", new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute("aAlpha", new THREE.BufferAttribute(this.alphas, 1));
    this.geometry.setDrawRange(0, 0);

    const material = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: this.glow } },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (420.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vColor, 1.0) * tex * vAlpha;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    scene.add(this.points);

    this.flashLight = new THREE.PointLight(0xff7a18, 0, 18, 2);
    this.flashLight.position.set(0, 3, 0);
    scene.add(this.flashLight);
    this.flashLightLife = 0;

    this.dust = this.createDust();
    scene.add(this.dust.points);
  }

  createDust() {
    const count = 340;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 46;
      positions[i * 3 + 1] = 0.4 + Math.random() * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 46;
      speeds[i] = 0.04 + Math.random() * 0.1;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      size: 0.035,
      map: this.glow,
      color: 0xd9c5a8,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return { points, geometry, positions, speeds, count };
  }

  spawnBurst(point, color, count, options = {}) {
    const speed = options.speed ?? 3.2;
    const size = options.size ?? 0.07;
    const life = options.life ?? 0.45;
    const gravity = options.gravity ?? 7;
    const spread = options.spread ?? 1;
    const base = new THREE.Color(color);
    for (let i = 0; i < count; i += 1) {
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.35) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      const velocity = direction.multiplyScalar(speed * (0.35 + Math.random() * spread));
      if (options.normal) {
        velocity.addScaledVector(options.normal, speed * 0.5);
      }
      const maxLife = life * (0.5 + Math.random() * 0.9);
      const particleColor = base.clone().offsetHSL((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.3) * 0.18);
      this.particles.push({
        position: point.clone(),
        velocity,
        life: maxLife,
        maxLife,
        color: particleColor,
        size: size * (0.6 + Math.random() * 1.1),
        gravity,
        alpha: options.alpha ?? 1,
        drag: options.drag ?? 0.985
      });
    }
    if (this.particles.length > this.maxParticles) {
      this.particles.splice(0, this.particles.length - this.maxParticles);
    }
  }

  spawnImpact(point, normal) {
    this.spawnBurst(point, 0xffa14a, 7, { speed: 2.5 + Math.random() * 2, size: 0.05, life: 0.32, gravity: 9, normal });
    this.spawnFlash(point, 0xff8a2a, 0.32 + Math.random() * 0.25, 0.11);
    this.addDecal(point, normal);
  }

  spawnEnemyImpact(point, normal, headshot) {
    this.spawnBurst(point, headshot ? 0xffc46d : 0xff7040, headshot ? 12 : 8, { speed: 3, size: 0.06, life: 0.34, gravity: 7, normal });
    this.spawnFlash(point, headshot ? 0xffc46d : 0xff8a2a, 0.3, 0.12);
  }

  spawnExplosion(point, scale = 1) {
    this.spawnBurst(point, 0xff7a18, 26, { speed: 4.8 * scale, size: 0.11, life: 0.65, gravity: 5, spread: 1.5 });
    this.spawnBurst(point, 0xffd08a, 12, { speed: 2.6 * scale, size: 0.07, life: 0.4, gravity: 3 });
    this.spawnFlash(point, 0xff8a2a, 1.5 * scale, 0.26);
    this.spawnFlash(point, 0xffd9a6, 0.9 * scale, 0.12);
    this.flashLight.position.copy(point);
    this.flashLight.color.setHex(0xff7a18);
    this.flashLight.intensity = 8 * scale;
    this.flashLightLife = 0.18;
  }

  spawnFlash(point, color, size, life) {
    const material = new THREE.SpriteMaterial({
      map: this.glow,
      color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(point);
    sprite.scale.setScalar(size);
    sprite.renderOrder = 3;
    this.scene.add(sprite);
    this.flashes.push({ sprite, life, maxLife: life });
  }

  spawnTracer(start, end) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
      color: 0xffb35c,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 2;
    this.scene.add(line);
    this.tracers.push({ line, life: 0.075, maxLife: 0.075 });
  }

  addDecal(point, normal) {
    const material = new THREE.MeshBasicMaterial({
      map: this.hole,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), material);
    mesh.position.copy(point).addScaledVector(normal, 0.012);
    mesh.lookAt(point.clone().add(normal));
    mesh.rotation.z = Math.random() * Math.PI * 2;
    mesh.renderOrder = 1;
    this.scene.add(mesh);
    this.decals.push(mesh);
    if (this.decals.length > this.maxDecals) {
      const oldest = this.decals.shift();
      this.scene.remove(oldest);
      oldest.geometry.dispose();
      oldest.material.dispose();
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      particle.velocity.y -= particle.gravity * dt;
      particle.velocity.multiplyScalar(particle.drag);
      particle.position.addScaledVector(particle.velocity, dt);
      if (particle.position.y < 0.03) {
        particle.position.y = 0.03;
        particle.velocity.y *= -0.25;
        particle.velocity.x *= 0.7;
        particle.velocity.z *= 0.7;
      }
    }

    const count = Math.min(this.particles.length, this.maxParticles);
    for (let i = 0; i < count; i += 1) {
      const particle = this.particles[i];
      const fade = Math.max(0, particle.life / particle.maxLife);
      this.positions[i * 3] = particle.position.x;
      this.positions[i * 3 + 1] = particle.position.y;
      this.positions[i * 3 + 2] = particle.position.z;
      this.colors[i * 3] = particle.color.r;
      this.colors[i * 3 + 1] = particle.color.g;
      this.colors[i * 3 + 2] = particle.color.b;
      this.sizes[i] = particle.size;
      this.alphas[i] = fade * fade * particle.alpha;
    }
    this.geometry.setDrawRange(0, count);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;

    for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
      const tracer = this.tracers[i];
      tracer.life -= dt;
      tracer.line.material.opacity = Math.max(0, tracer.life / tracer.maxLife) * 0.9;
      if (tracer.life <= 0) {
        this.scene.remove(tracer.line);
        tracer.line.geometry.dispose();
        tracer.line.material.dispose();
        this.tracers.splice(i, 1);
      }
    }

    for (let i = this.flashes.length - 1; i >= 0; i -= 1) {
      const flash = this.flashes[i];
      flash.life -= dt;
      flash.sprite.material.opacity = Math.max(0, flash.life / flash.maxLife) * 0.9;
      if (flash.life <= 0) {
        this.scene.remove(flash.sprite);
        flash.sprite.material.dispose();
        this.flashes.splice(i, 1);
      }
    }

    if (this.flashLightLife > 0) {
      this.flashLightLife -= dt;
      this.flashLight.intensity *= Math.pow(0.001, dt);
      if (this.flashLightLife <= 0) this.flashLight.intensity = 0;
    }

    const positions = this.dust.positions;
    for (let i = 0; i < this.dust.count; i += 1) {
      positions[i * 3 + 1] += this.dust.speeds[i] * dt;
      positions[i * 3] += Math.sin(i + performance.now() * 0.0001) * 0.0008;
      if (positions[i * 3 + 1] > 9.6) positions[i * 3 + 1] = 0.4;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
  }

  reset() {
    this.particles.length = 0;
    this.geometry.setDrawRange(0, 0);
    this.tracers.forEach((tracer) => {
      this.scene.remove(tracer.line);
      tracer.line.geometry.dispose();
      tracer.line.material.dispose();
    });
    this.tracers.length = 0;
    this.flashes.forEach((flash) => {
      this.scene.remove(flash.sprite);
      flash.sprite.material.dispose();
    });
    this.flashes.length = 0;
    this.decals.forEach((decal) => {
      this.scene.remove(decal);
      decal.geometry.dispose();
      decal.material.dispose();
    });
    this.decals.length = 0;
    this.flashLight.intensity = 0;
    this.flashLightLife = 0;
  }
}
