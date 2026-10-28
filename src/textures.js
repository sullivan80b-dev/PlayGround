import * as THREE from "three";

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size, height = size) {
  const element = document.createElement("canvas");
  element.width = size;
  element.height = height;
  return { element, ctx: element.getContext("2d") };
}

function grain(ctx, width, height, count, random, light = 255, alpha = 0.05) {
  for (let i = 0; i < count; i += 1) {
    const value = Math.floor(random() * light);
    ctx.fillStyle = `rgba(${value},${value},${value},${alpha * random()})`;
    const size = random() > 0.85 ? 2 : 1;
    ctx.fillRect(random() * width, random() * height, size, size);
  }
}

function stains(ctx, width, height, random, count, color) {
  for (let i = 0; i < count; i += 1) {
    const x = random() * width;
    const y = random() * height;
    const radius = 20 + random() * 110;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

function crack(ctx, x, y, length, random, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  let angle = random() * Math.PI * 2;
  for (let i = 0; i < length; i += 1) {
    angle += (random() - 0.5) * 0.9;
    x += Math.cos(angle) * (3 + random() * 6);
    y += Math.sin(angle) * (3 + random() * 6);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function finish(texture, repeatX = 1, repeatY = 1) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function floorTexture() {
  const size = 1024;
  const { element, ctx } = canvas(size);
  const random = seeded(7731);
  ctx.fillStyle = "#292c2b";
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 128) {
    for (let x = 0; x < size; x += 128) {
      const shade = 36 + Math.floor(random() * 10);
      ctx.fillStyle = `rgb(${shade},${shade + 1},${shade})`;
      ctx.fillRect(x + 1, y + 1, 126, 126);
    }
  }
  ctx.strokeStyle = "rgba(7,9,9,.85)";
  ctx.lineWidth = 3;
  for (let i = 0; i <= size; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(130,139,134,.08)";
  ctx.lineWidth = 1;
  for (let i = 2; i <= size; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  stains(ctx, size, size, random, 36, "rgba(4,6,6,.18)");
  stains(ctx, size, size, random, 14, "rgba(105,74,37,.05)");
  grain(ctx, size, size, 12000, random, 150, 0.06);
  for (let i = 0; i < 26; i += 1) {
    crack(ctx, random() * size, random() * size, 8 + random() * 22, random, "rgba(5,6,6,.22)");
  }
  for (let i = 0; i < 16; i += 1) {
    ctx.save();
    ctx.translate(random() * size, random() * size);
    ctx.rotate(random() * Math.PI);
    ctx.fillStyle = "rgba(10,12,11,.18)";
    ctx.fillRect(0, 0, 30 + random() * 90, 1 + random() * 2);
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(element);
  return finish(texture, 5, 5);
}

export function concreteTexture() {
  const size = 512;
  const { element, ctx } = canvas(size);
  const random = seeded(1447);
  ctx.fillStyle = "#3a3d3b";
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 128) {
    for (let x = 0; x < size; x += 128) {
      const shade = 54 + Math.floor(random() * 9);
      ctx.fillStyle = `rgb(${shade},${shade + 1},${shade - 1})`;
      ctx.fillRect(x + 1, y + 1, 126, 126);
    }
  }
  ctx.strokeStyle = "rgba(12,14,13,.5)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  stains(ctx, size, size, random, 20, "rgba(8,10,9,.15)");
  stains(ctx, size, size, random, 8, "rgba(130,110,78,.04)");
  grain(ctx, size, size, 6000, random, 150, 0.07);
  for (let i = 0; i < 14; i += 1) {
    crack(ctx, random() * size, random() * size, 5 + random() * 15, random, "rgba(10,12,11,.28)");
  }
  const texture = new THREE.CanvasTexture(element);
  return finish(texture, 2, 2);
}

export function metalTexture() {
  const size = 512;
  const { element, ctx } = canvas(size);
  const random = seeded(9173);
  ctx.fillStyle = "#24282a";
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 128) {
    for (let x = 0; x < size; x += 128) {
      const shade = 31 + Math.floor(random() * 8);
      ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 3})`;
      ctx.fillRect(x + 2, y + 2, 124, 124);
      ctx.strokeStyle = "rgba(5,7,8,.75)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, 124, 124);
      ctx.strokeStyle = "rgba(150,160,160,.07)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 5, y + 5, 118, 118);
    }
  }
  for (let y = 64; y < size; y += 128) {
    for (let x = 64; x < size; x += 128) {
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(8,10,11,.8)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - 0.7, y - 0.7, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(174,184,183,.16)";
      ctx.fill();
    }
  }
  for (let i = 0; i < 120; i += 1) {
    ctx.strokeStyle = `rgba(150,160,158,${0.02 + random() * 0.05})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    const x = random() * size;
    const y = random() * size;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 60, y + (random() - 0.5) * 8);
    ctx.stroke();
  }
  stains(ctx, size, size, random, 10, "rgba(0,0,0,.2)");
  grain(ctx, size, size, 5000, random, 120, 0.05);
  const texture = new THREE.CanvasTexture(element);
  return finish(texture, 1, 1);
}

export function hazardTexture() {
  const size = 256;
  const { element, ctx } = canvas(size);
  ctx.fillStyle = "#131412";
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 4);
  for (let i = -size; i < size * 2; i += 64) {
    ctx.fillStyle = "#d97a17";
    ctx.fillRect(i, -size, 32, size * 2);
  }
  ctx.restore();
  const random = seeded(391);
  grain(ctx, size, size, 1400, random, 90, 0.08);
  stains(ctx, size, size, random, 6, "rgba(0,0,0,.2)");
  const texture = new THREE.CanvasTexture(element);
  return finish(texture, 3, 1);
}

export function crateTexture() {
  const size = 512;
  const { element, ctx } = canvas(size);
  const random = seeded(887);
  ctx.fillStyle = "#2d3334";
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 64) {
    ctx.fillStyle = y % 128 === 0 ? "rgba(255,255,255,.015)" : "rgba(0,0,0,.05)";
    ctx.fillRect(0, y, size, 62);
  }
  ctx.strokeStyle = "rgba(5,7,7,.7)";
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, size - 14, size - 14);
  ctx.strokeStyle = "rgba(160,170,168,.09)";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, size - 36, size - 36);
  ctx.fillStyle = "#d37a1d";
  ctx.fillRect(0, size - 78, size, 34);
  ctx.fillStyle = "rgba(8,8,7,.8)";
  for (let x = -20; x < size + 30; x += 50) {
    ctx.save();
    ctx.translate(x, size - 61);
    ctx.rotate(-0.45);
    ctx.fillRect(0, -18, 20, 44);
    ctx.restore();
  }
  ctx.fillStyle = "rgba(216,224,218,.68)";
  ctx.font = "700 118px Arial Narrow, Arial";
  ctx.fillText("07", 42, 176);
  ctx.font = "600 22px Arial";
  ctx.fillStyle = "rgba(216,224,218,.32)";
  ctx.fillText("RELAY / CLASS C", 44, 210);
  ctx.strokeStyle = "rgba(216,224,218,.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 250, 180, 62);
  ctx.font = "500 14px monospace";
  ctx.fillStyle = "rgba(216,224,218,.3)";
  ctx.fillText("LOT 88-341-K", 44, 286);
  grain(ctx, size, size, 7000, random, 120, 0.06);
  stains(ctx, size, size, random, 8, "rgba(0,0,0,.22)");
  const texture = new THREE.CanvasTexture(element);
  return finish(texture, 1, 1);
}

export function glowTexture() {
  const size = 128;
  const { element, ctx } = canvas(size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.15, "rgba(255,255,255,.95)");
  gradient.addColorStop(0.42, "rgba(255,255,255,.28)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function bulletHoleTexture() {
  const size = 64;
  const { element, ctx } = canvas(size);
  const random = seeded(508);
  const gradient = ctx.createRadialGradient(32, 32, 1, 32, 32, 22);
  gradient.addColorStop(0, "rgba(0,0,0,.95)");
  gradient.addColorStop(0.4, "rgba(6,7,6,.8)");
  gradient.addColorStop(0.7, "rgba(22,23,21,.3)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(180,184,177,.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(32, 32, 10, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 6; i += 1) {
    const angle = random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(32 + Math.cos(angle) * 9, 32 + Math.sin(angle) * 9);
    ctx.lineTo(32 + Math.cos(angle) * (15 + random() * 8), 32 + Math.sin(angle) * (15 + random() * 8));
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function signTexture(title, subtitle) {
  const width = 512;
  const height = 256;
  const { element, ctx } = canvas(width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,122,24,.55)";
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, width - 28, height - 28);
  ctx.fillStyle = "rgba(255,122,24,.85)";
  ctx.fillRect(28, 30, 5, 34);
  ctx.font = "700 58px Arial Narrow, Arial";
  ctx.fillStyle = "rgba(235,239,231,.78)";
  ctx.fillText(title, 48, 95);
  ctx.font = "500 17px monospace";
  ctx.fillStyle = "rgba(255,138,54,.7)";
  ctx.fillText(subtitle, 48, 135);
  ctx.strokeStyle = "rgba(235,239,231,.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, 156);
  ctx.lineTo(width - 48, 156);
  ctx.stroke();
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = `rgba(235,239,231,${0.1 + i * 0.04})`;
    ctx.fillRect(48 + i * 16, 182 + i * 5, 10, 3);
  }
  ctx.font = "500 12px monospace";
  ctx.fillStyle = "rgba(235,239,231,.25)";
  ctx.fillText("AUTHORIZED PERSONNEL ONLY // 07", 48, 222);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function holoTexture() {
  const size = 256;
  const { element, ctx } = canvas(size);
  ctx.clearRect(0, 0, size, size);
  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 108);
  gradient.addColorStop(0, "rgba(255,150,64,.9)");
  gradient.addColorStop(0.35, "rgba(255,122,24,.22)");
  gradient.addColorStop(1, "rgba(255,122,24,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,160,70,.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(128, 128, 74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,160,70,.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(128, 128, 58, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(128, 40);
  ctx.lineTo(128, 76);
  ctx.moveTo(128, 180);
  ctx.lineTo(128, 216);
  ctx.moveTo(40, 128);
  ctx.lineTo(76, 128);
  ctx.moveTo(180, 128);
  ctx.lineTo(216, 128);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,200,130,.95)";
  ctx.beginPath();
  ctx.arc(128, 128, 3, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function lightConeTexture() {
  const size = 256;
  const { element, ctx } = canvas(size);
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "rgba(255,214,160,.5)");
  gradient.addColorStop(0.55, "rgba(255,190,120,.12)");
  gradient.addColorStop(1, "rgba(255,190,120,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
