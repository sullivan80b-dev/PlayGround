import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  floorTexture,
  concreteTexture,
  metalTexture,
  hazardTexture,
  crateTexture,
  glowTexture,
  signTexture,
  lightConeTexture
} from "./textures.js";

const HALF = 26;

export class World {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.colliders = [];
    this.shootables = [];
    this.coreRings = [];
    this.lampLights = [];
    this.lampHousings = [];
    this.time = 0;
    this.spawnPoints = [
      new THREE.Vector3(-22, 2.1, -4),
      new THREE.Vector3(22, 2.1, -3),
      new THREE.Vector3(0, 2.1, -23),
      new THREE.Vector3(18, 2.1, 18),
      new THREE.Vector3(-18, 2.1, 18)
    ];
    this.playerStart = new THREE.Vector3(0, 1.72, 18);
    this.playerYaw = 0;

    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.environment = pmrem.fromScene(environment, 0.04).texture;
    scene.environment = this.environment;
    scene.environmentIntensity = 0.22;
    if (typeof environment.dispose === "function") environment.dispose();
    pmrem.dispose();

    scene.background = new THREE.Color(0x060809);
    scene.fog = new THREE.FogExp2(0x070a0b, 0.021);

    this.makeMaterials();
    this.buildFloor();
    this.buildShell();
    this.buildStructures();
    this.buildCore();
    this.buildLights();
    this.buildSigns();
  }

  makeMaterials() {
    const floorMap = floorTexture();
    const concreteMap = concreteTexture();
    const metalMap = metalTexture();
    const hazardMap = hazardTexture();
    const crateMap = crateTexture();
    const anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    [floorMap, concreteMap, metalMap, hazardMap, crateMap].forEach((map) => {
      map.anisotropy = anisotropy;
    });

    this.materials = {
      floor: new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.7, metalness: 0.18 }),
      wall: new THREE.MeshStandardMaterial({ map: concreteMap, roughness: 0.9, metalness: 0.06 }),
      metal: new THREE.MeshStandardMaterial({ map: metalMap, roughness: 0.42, metalness: 0.78 }),
      darkMetal: new THREE.MeshStandardMaterial({ map: metalMap, color: 0x697477, roughness: 0.46, metalness: 0.86 }),
      crate: new THREE.MeshStandardMaterial({ map: crateMap, roughness: 0.52, metalness: 0.42 }),
      hazard: new THREE.MeshStandardMaterial({ map: hazardMap, roughness: 0.65, metalness: 0.2 }),
      orange: new THREE.MeshStandardMaterial({ color: 0xff7a18, emissive: 0xff5a00, emissiveIntensity: 2.1, roughness: 0.35, metalness: 0.3 }),
      orangeDim: new THREE.MeshStandardMaterial({ color: 0x6e3a13, emissive: 0xff5a00, emissiveIntensity: 0.7, roughness: 0.5, metalness: 0.4 }),
      lamp: new THREE.MeshStandardMaterial({ color: 0xffe3b8, emissive: 0xffc27d, emissiveIntensity: 5.4, roughness: 0.3 }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x39220d,
        emissive: 0xff6a0a,
        emissiveIntensity: 1.6,
        transparent: true,
        opacity: 0.42,
        roughness: 0.12,
        metalness: 0.35
      })
    };
  }

  addBox({ x, y, z, w, h, d, material, rotY = 0, collide = true, shootable = true, castShadow = true, receiveShadow = true }) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    this.scene.add(mesh);
    if (shootable) this.shootables.push(mesh);
    if (collide) {
      const cos = Math.abs(Math.cos(rotY));
      const sin = Math.abs(Math.sin(rotY));
      const halfX = (cos * w + sin * d) / 2;
      const halfZ = (sin * w + cos * d) / 2;
      this.colliders.push({
        minX: x - halfX,
        maxX: x + halfX,
        minZ: z - halfZ,
        maxZ: z + halfZ,
        top: y + h / 2
      });
    }
    return mesh;
  }

  addCylinder({ x, y, z, radius, height, material, segments = 20, collide = false, shootable = true }) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    if (shootable) this.shootables.push(mesh);
    if (collide) {
      this.colliders.push({ minX: x - radius, maxX: x + radius, minZ: z - radius, maxZ: z + radius, top: y + height / 2 });
    }
    return mesh;
  }

  buildFloor() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 2, HALF * 2 + 2), this.materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.shootables.push(floor);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 4.34, 96),
      new THREE.MeshBasicMaterial({ color: 0xff7a18, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.015, -9);
    this.scene.add(ring);

    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 2.76, 64),
      new THREE.MeshBasicMaterial({ color: 0xffb15c, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.set(0, 0.016, -9);
    this.scene.add(innerRing);

    for (let i = 0; i < 8; i += 1) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(5.4, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x141717, transparent: true, opacity: 0.55, depthWrite: false })
      );
      line.rotation.x = -Math.PI / 2;
      line.rotation.z = (i / 8) * Math.PI * 2;
      line.position.set(0, 0.018, -9);
      this.scene.add(line);
    }

    this.addBox({ x: -13, y: 0.03, z: 8, w: 6, h: 0.06, d: 0.18, material: this.materials.hazard, collide: false, castShadow: false });
    this.addBox({ x: 9, y: 0.03, z: -6, w: 0.18, h: 0.06, d: 7, material: this.materials.hazard, collide: false, castShadow: false });
    this.addBox({ x: 0, y: 0.03, z: 21, w: 9, h: 0.06, d: 0.18, material: this.materials.hazard, collide: false, castShadow: false });
  }

  buildShell() {
    const wallHeight = 9.4;
    const wallY = wallHeight / 2;
    this.addBox({ x: 0, y: wallY, z: -HALF, w: HALF * 2 + 2, h: wallHeight, d: 1, material: this.materials.wall });
    this.addBox({ x: 0, y: wallY, z: HALF, w: HALF * 2 + 2, h: wallHeight, d: 1, material: this.materials.wall });
    this.addBox({ x: -HALF, y: wallY, z: 0, w: 1, h: wallHeight, d: HALF * 2 + 2, material: this.materials.wall });
    this.addBox({ x: HALF, y: wallY, z: 0, w: 1, h: wallHeight, d: HALF * 2 + 2, material: this.materials.wall });

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 2, HALF * 2 + 2), this.materials.darkMetal);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 10.2;
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);
    this.shootables.push(ceiling);

    for (let z = -20; z <= 20; z += 8) {
      this.addBox({ x: 0, y: 9.7, z, w: HALF * 2, h: 0.3, d: 0.45, material: this.materials.metal, collide: false });
      this.addBox({ x: 0, y: 9.46, z, w: HALF * 2 - 2, h: 0.04, d: 0.08, material: this.materials.orangeDim, collide: false, castShadow: false });
    }

    for (let x = -21; x <= 21; x += 7) {
      this.addBox({ x, y: 9.78, z: 0, w: 0.18, h: 0.18, d: HALF * 2, material: this.materials.metal, collide: false });
    }

    this.addBox({ x: 0, y: 0.22, z: -HALF + 1.1, w: 10, h: 0.44, d: 0.5, material: this.materials.hazard, collide: false, castShadow: false });
    this.addBox({ x: -HALF + 1.1, y: 0.22, z: 0, w: 0.5, h: 0.44, d: 10, material: this.materials.hazard, collide: false, castShadow: false });

    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 5; i += 1) {
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 5.5), this.materials.orange);
        light.position.set(side * (HALF - 0.6), 1.1, -18 + i * 9);
        this.scene.add(light);
      }
    }

    const pipeMaterial = this.materials.metal;
    for (let i = 0; i < 3; i += 1) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 46, 10), pipeMaterial);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(-HALF + 1.6 + i * 0.48, 6.2 + i * 0.42, 0);
      pipe.castShadow = true;
      this.scene.add(pipe);
      this.shootables.push(pipe);
    }
    for (let i = 0; i < 6; i += 1) {
      const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 6, 16, Math.PI), pipeMaterial);
      clamp.rotation.y = Math.PI / 2;
      clamp.position.set(-HALF + 1.9, 6.4, -19 + i * 7.6);
      this.scene.add(clamp);
    }

    for (const x of [-18, 18]) {
      for (const z of [-12, 12]) {
        this.addBox({ x, y: 4.7, z, w: 1.1, h: 9.4, d: 1.1, material: this.materials.metal });
        this.addBox({ x, y: 0.55, z, w: 1.9, h: 1.1, d: 1.9, material: this.materials.hazard });
      }
    }
  }

  buildStructures() {
    this.addBox({ x: -11, y: 1.45, z: -2.5, w: 7, h: 2.9, d: 2.8, material: this.materials.metal });
    this.addBox({ x: -11, y: 4.35, z: -2.5, w: 7, h: 2.9, d: 2.8, material: this.materials.crate });
    this.addBox({ x: -7.28, y: 3.35, z: -2.5, w: 0.25, h: 5.8, d: 2.9, material: this.materials.hazard, collide: false });

    this.addBox({ x: 10.4, y: 1.45, z: 4.8, w: 6, h: 2.9, d: 2.7, material: this.materials.metal });
    this.addBox({ x: 10.4, y: 0.55, z: 7.2, w: 5.2, h: 1.1, d: 1.9, material: this.materials.hazard });

    this.addBox({ x: -15, y: 0.75, z: 6.8, w: 4.6, h: 1.5, d: 0.55, material: this.materials.metal });
    this.addBox({ x: -15, y: 1.52, z: 6.8, w: 4.6, h: 0.06, d: 0.55, material: this.materials.hazard, collide: false, castShadow: false });

    this.addBox({ x: 6.4, y: 0.75, z: -1.2, w: 0.55, h: 1.5, d: 5.2, material: this.materials.metal });
    this.addBox({ x: 6.4, y: 1.52, z: -1.2, w: 0.55, h: 0.06, d: 5.2, material: this.materials.hazard, collide: false, castShadow: false });

    this.addBox({ x: 1.8, y: 0.65, z: 9.4, w: 4.2, h: 1.3, d: 0.5, material: this.materials.metal });
    this.addBox({ x: 1.8, y: 1.33, z: 9.4, w: 4.2, h: 0.06, d: 0.5, material: this.materials.hazard, collide: false, castShadow: false });

    const crateLayout = [
      { x: 4.8, z: -7.2, size: 1.4, stacked: true },
      { x: 6.3, z: -7.2, size: 1.4 },
      { x: 5.55, z: -5.9, size: 1.3 },
      { x: 12.5, z: -3.8, size: 1.3, stacked: true },
      { x: 13.9, z: -3.8, size: 1.3 },
      { x: -14, z: 11.5, size: 1.5 },
      { x: -12.4, z: 11.5, size: 1.5, stacked: true },
      { x: 14.6, z: 12.8, size: 1.4 },
      { x: 14.6, z: 11.3, size: 1.4 },
      { x: 16.1, z: 12.8, size: 1.4, stacked: true },
      { x: -7.3, z: 16.2, size: 1.4 },
      { x: -5.8, z: 16.2, size: 1.4 },
      { x: 8.5, z: 18.4, size: 1.3 },
      { x: -19, z: 5.2, size: 1.4 },
      { x: 17.5, z: -12, size: 1.3 }
    ];

    crateLayout.forEach(({ x, z, size, stacked }, index) => {
      this.addBox({
        x,
        y: size / 2,
        z,
        w: size,
        h: size,
        d: size,
        material: this.materials.crate,
        rotY: (index % 3 - 1) * 0.06
      });
      if (stacked) {
        this.addBox({
          x: x + 0.05,
          y: size + size * 0.36,
          z: z - 0.04,
          w: size * 0.9,
          h: size * 0.72,
          d: size * 0.9,
          material: this.materials.crate,
          rotY: 0.04
        });
      }
      if (index % 4 === 0) {
        this.addBox({
          x: x + 0.1,
          y: size + 0.02,
          z: z + 0.08,
          w: size * 0.74,
          h: 0.05,
          d: size * 0.74,
          material: this.materials.hazard,
          collide: false,
          castShadow: false
        });
      }
    });

    const barrels = [
      [8.8, 9.2],
      [10.1, 9.6],
      [9.4, 10.4],
      [-20.4, -8.6],
      [-19.2, -8.8],
      [20.1, 8.4]
    ];
    barrels.forEach(([x, z], index) => {
      const barrel = this.addCylinder({ x, y: 0.56, z, radius: 0.42, height: 1.12, material: index % 2 ? this.materials.hazard : this.materials.metal, collide: true });
      barrel.rotation.y = Math.random() * Math.PI;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.035, 5, 16), this.materials.darkMetal);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(x, 1.06, z);
      this.scene.add(rim);
    });

    for (let i = 0; i < 16; i += 1) {
      const size = 0.08 + Math.random() * 0.24;
      const debris = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.4, size * 1.4), this.materials.darkMetal);
      debris.position.set((Math.random() - 0.5) * 36, size * 0.2, (Math.random() - 0.5) * 36);
      debris.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
      debris.castShadow = true;
      this.scene.add(debris);
      this.shootables.push(debris);
    }
  }

  buildCore() {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.75, 0.42, 32), this.materials.metal);
    base.position.set(0, 0.21, -9);
    base.castShadow = true;
    base.receiveShadow = true;
    this.scene.add(base);
    this.shootables.push(base);
    this.colliders.push({ minX: -2.6, maxX: 2.6, minZ: -11.6, maxZ: -6.4, top: 0.42 });

    const core = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 2.7, 24), this.materials.glass);
    core.position.set(0, 1.9, -9);
    this.scene.add(core);
    this.shootables.push(core);

    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 2.4, 16), this.materials.orange);
    inner.position.set(0, 1.9, -9);
    this.scene.add(inner);

    for (let i = 0; i < 4; i += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.35 + i * 0.16, 0.045, 8, 48),
        this.materials.orange
      );
      ring.position.set(0, 1.1 + i * 0.62, -9);
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);
      this.coreRings.push(ring);
    }

    for (let i = 0; i < 3; i += 1) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.3), this.materials.darkMetal);
      strut.position.set(Math.cos((i / 3) * Math.PI * 2) * 1.65, 1.7, -9 + Math.sin((i / 3) * Math.PI * 2) * 1.65);
      strut.rotation.y = (i / 3) * Math.PI * 2;
      strut.castShadow = true;
      this.scene.add(strut);
    }

    const coreLight = new THREE.PointLight(0xff6a0a, 24, 22, 2);
    coreLight.position.set(0, 2.2, -9);
    this.scene.add(coreLight);
    this.coreLight = coreLight;

    const haloMaterial = new THREE.SpriteMaterial({
      map: glowTexture(),
      color: 0xff7a18,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const halo = new THREE.Sprite(haloMaterial);
    halo.scale.set(8, 8, 1);
    halo.position.set(0, 2.1, -9);
    this.scene.add(halo);
  }

  buildLights() {
    const hemisphere = new THREE.HemisphereLight(0x43515b, 0x0a0806, 0.72);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xffd7a4, 1.25);
    key.position.set(9, 19, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -30;
    key.shadow.camera.right = 30;
    key.shadow.camera.top = 30;
    key.shadow.camera.bottom = -30;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 60;
    key.shadow.bias = -0.0004;
    this.scene.add(key);
    this.scene.add(key.target);

    const cool = new THREE.DirectionalLight(0x4b7895, 0.55);
    cool.position.set(-12, 9, -15);
    this.scene.add(cool);

    const coneTexture = lightConeTexture();
    const lampPositions = [
      [-10, 8.4, -12],
      [10, 8.6, 2],
      [0, 8.7, 14]
    ];
    lampPositions.forEach(([x, y, z], index) => {
      const housing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 0.86), this.materials.darkMetal);
      housing.position.set(x, y, z);
      housing.castShadow = true;
      this.scene.add(housing);
      this.lampHousings.push(housing);

      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.05, 0.6), this.materials.lamp);
      panel.position.set(x, y - 0.18, z);
      this.scene.add(panel);

      const spot = new THREE.SpotLight(0xffd7aa, index === 0 ? 290 : 220, 30, 0.62, 0.72, 1.7);
      spot.position.set(x, y - 0.2, z);
      spot.target.position.set(x, 0, z);
      spot.castShadow = index === 0;
      if (spot.castShadow) {
        spot.shadow.mapSize.set(1024, 1024);
        spot.shadow.bias = -0.0005;
      }
      this.scene.add(spot);
      this.scene.add(spot.target);
      this.lampLights.push(spot);

      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(4.6, 8.1, 40, 1, true),
        new THREE.MeshBasicMaterial({
          map: coneTexture,
          color: 0xffd6a4,
          transparent: true,
          opacity: 0.07,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      cone.position.set(x, y - 4.25, z);
      cone.renderOrder = 1;
      this.scene.add(cone);
    });

    const gateLight = new THREE.PointLight(0xff3b2a, 11, 14, 2);
    gateLight.position.set(0, 4.2, -23);
    this.scene.add(gateLight);
    this.gateLight = gateLight;

    for (let i = 0; i < 2; i += 1) {
      const coolLight = new THREE.PointLight(0x4fb8d8, 8, 18, 2);
      coolLight.position.set(i === 0 ? -22 : 22, 4.5, i === 0 ? 8 : -9);
      this.scene.add(coolLight);
    }
  }

  buildSigns() {
    const backSign = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 4.5),
      new THREE.MeshBasicMaterial({ map: signTexture("SECTOR 07", "RELAY STATION // DECK C"), transparent: true, depthWrite: false })
    );
    backSign.position.set(0, 5.2, -25.46);
    this.scene.add(backSign);

    const sideSign = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 3.5),
      new THREE.MeshBasicMaterial({ map: signTexture("BLACKSITE", "AUTHORIZED ACCESS // LEVEL 4"), transparent: true, depthWrite: false })
    );
    sideSign.position.set(-25.46, 5.2, 4);
    sideSign.rotation.y = Math.PI / 2;
    this.scene.add(sideSign);

    const caution = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 1.2),
      new THREE.MeshBasicMaterial({ map: signTexture("CAUTION", "AUTONOMOUS DEFENSE ACTIVE"), transparent: true, depthWrite: false })
    );
    caution.position.set(25.46, 3.4, -8);
    caution.rotation.y = -Math.PI / 2;
    this.scene.add(caution);
  }

  resolvePlayer(position, radius) {
    position.x = THREE.MathUtils.clamp(position.x, -HALF + 1.4, HALF - 1.4);
    position.z = THREE.MathUtils.clamp(position.z, -HALF + 1.4, HALF - 1.4);

    for (let pass = 0; pass < 2; pass += 1) {
      for (const box of this.colliders) {
        const closestX = THREE.MathUtils.clamp(position.x, box.minX, box.maxX);
        const closestZ = THREE.MathUtils.clamp(position.z, box.minZ, box.maxZ);
        let dx = position.x - closestX;
        let dz = position.z - closestZ;
        let distanceSq = dx * dx + dz * dz;
        if (distanceSq >= radius * radius) continue;

        if (distanceSq < 0.000001) {
          const left = position.x - box.minX;
          const right = box.maxX - position.x;
          const back = position.z - box.minZ;
          const front = box.maxZ - position.z;
          const minimum = Math.min(left, right, back, front);
          if (minimum === left) position.x = box.minX - radius;
          else if (minimum === right) position.x = box.maxX + radius;
          else if (minimum === back) position.z = box.minZ - radius;
          else position.z = box.maxZ + radius;
          continue;
        }

        const distance = Math.sqrt(distanceSq);
        dx /= distance;
        dz /= distance;
        const push = radius - distance;
        position.x += dx * push;
        position.z += dz * push;
      }
    }
  }

  resolveFlying(position, radius, altitude) {
    position.x = THREE.MathUtils.clamp(position.x, -HALF + 2.2, HALF - 2.2);
    position.z = THREE.MathUtils.clamp(position.z, -HALF + 2.2, HALF - 2.2);
    for (const box of this.colliders) {
      if (box.top < altitude - 0.45) continue;
      const closestX = THREE.MathUtils.clamp(position.x, box.minX, box.maxX);
      const closestZ = THREE.MathUtils.clamp(position.z, box.minZ, box.maxZ);
      let dx = position.x - closestX;
      let dz = position.z - closestZ;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq >= radius * radius) continue;
      if (distanceSq < 0.000001) {
        const left = position.x - box.minX;
        const right = box.maxX - position.x;
        const back = position.z - box.minZ;
        const front = box.maxZ - position.z;
        const minimum = Math.min(left, right, back, front);
        if (minimum === left) position.x = box.minX - radius;
        else if (minimum === right) position.x = box.maxX + radius;
        else if (minimum === back) position.z = box.minZ - radius;
        else position.z = box.maxZ + radius;
        continue;
      }
      const distance = Math.sqrt(distanceSq);
      const push = radius - distance;
      position.x += (dx / distance) * push;
      position.z += (dz / distance) * push;
    }
  }

  lineBlocked(start, end) {
    const direction = end.clone().sub(start);
    const distance = direction.length();
    if (distance < 0.1) return false;
    direction.normalize();
    const raycaster = new THREE.Raycaster(start, direction, 0.2, distance - 0.3);
    const hits = raycaster.intersectObjects(this.shootables, false);
    return hits.length > 0;
  }

  getSpawn(index) {
    const base = this.spawnPoints[index % this.spawnPoints.length];
    return base.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3));
  }

  update(dt, time) {
    this.time = time;
    this.coreRings.forEach((ring, index) => {
      ring.rotation.z += dt * (0.16 + index * 0.045) * (index % 2 ? -1 : 1);
      ring.rotation.x = Math.PI / 2 + Math.sin(time * 0.4 + index) * 0.08;
    });
    if (this.coreLight) {
      this.coreLight.intensity = 21 + Math.sin(time * 2.2) * 3 + Math.sin(time * 7.1) * 0.8;
    }
    if (this.gateLight) {
      this.gateLight.intensity = 8 + Math.sin(time * 3.4) * 2;
    }
    this.lampLights.forEach((light, index) => {
      const flicker = Math.sin(time * 13 + index * 4.7) > 0.985 ? 0.55 : 1;
      light.intensity = (index === 0 ? 290 : 220) * flicker;
    });
  }
}
