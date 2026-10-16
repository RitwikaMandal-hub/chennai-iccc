import * as THREE from "three";
import { makeGlowSprite } from "./effects";

// All vehicle models face +X. Units ≈ metres / 2.

const box = (w, h, d, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
};

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25, ...extra });
const glow = (color, intensity = 2.5) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });

const shared = {
  glass: mat(0x0b1220, { roughness: 0.15, metalness: 0.7 }),
  tyre: mat(0x0a0a0a, { roughness: 0.9 }),
  head: glow(0xfff4d6, 2.2),
  tail: glow(0xff2a2a, 1.8),
};

function wheels(group, length, width) {
  const geometry = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12);
  geometry.rotateX(Math.PI / 2);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = new THREE.Mesh(geometry, shared.tyre);
      wheel.position.set(sx * length * 0.32, 0.55, sz * width * 0.5);
      group.add(wheel);
    }
  }
}

function lights(group, length, width, y) {
  for (const sz of [-1, 1]) {
    group.add(box(0.15, 0.3, 0.45, shared.head, length / 2, y, sz * width * 0.32));
    group.add(box(0.15, 0.3, 0.45, shared.tail, -length / 2, y, sz * width * 0.32));
  }
}

export function makeCar(color = 0x3b82f6) {
  const group = new THREE.Group();
  const body = mat(color, { metalness: 0.5, roughness: 0.35 });
  group.add(box(4.4, 1.1, 2.1, body, 0, 1.05, 0));
  group.add(box(2.3, 0.85, 1.85, shared.glass, -0.25, 2.0, 0));
  wheels(group, 4.4, 2.1);
  lights(group, 4.4, 2.1, 1.1);
  return group;
}

export function makeBus(color = 0xf59e0b) {
  const group = new THREE.Group();
  group.add(box(10, 2.8, 2.6, mat(color), 0, 1.9, 0));
  group.add(box(9.4, 0.8, 2.65, shared.glass, 0, 2.4, 0));
  wheels(group, 10, 2.6);
  lights(group, 10, 2.6, 1.2);
  return group;
}

// Light bar whose two halves flash red/blue (or amber).
function lightBar(group, x, y, colors = [0xff1f3d, 0x2563ff], width = 1.8) {
  const left = glow(colors[0], 4);
  const right = glow(colors[1], 4);
  group.add(box(0.5, 0.35, width / 2, left, x, y, -width / 4));
  group.add(box(0.5, 0.35, width / 2, right, x, y, width / 4));
  const spriteLeft = makeGlowSprite(colors[0], 7);
  const spriteRight = makeGlowSprite(colors[1], 7);
  spriteLeft.position.set(x, y + 0.4, -width / 4);
  spriteRight.position.set(x, y + 0.4, width / 4);
  group.add(spriteLeft, spriteRight);
  return { left, right, spriteLeft, spriteRight };
}

export function makeAmbulance() {
  const group = new THREE.Group();
  const white = mat(0xf8fafc, { roughness: 0.4 });
  group.add(box(6.4, 2.8, 2.5, white, -0.4, 1.95, 0));
  group.add(box(1.8, 1.8, 2.4, white, 2.9, 1.45, 0));
  group.add(box(0.9, 1.0, 2.2, shared.glass, 3.4, 1.9, 0));
  group.add(box(6.42, 0.45, 2.52, glow(0xef4444, 0.6), -0.4, 1.6, 0));
  // Red cross on roof
  const cross = glow(0xef4444, 0.8);
  group.add(box(2.4, 0.06, 0.6, cross, -0.8, 3.38, 0));
  group.add(box(0.6, 0.06, 2.0, cross, -0.8, 3.38, 0));
  wheels(group, 6.4, 2.5);
  lights(group, 7.2, 2.5, 1.2);
  const bar = lightBar(group, 2.4, 3.55);
  return { group, bar };
}

export function makeFireTruck() {
  const group = new THREE.Group();
  const red = mat(0xdc2626, { roughness: 0.35, metalness: 0.4 });
  group.add(box(7.4, 2.9, 2.7, red, -0.9, 2.0, 0));
  group.add(box(2.2, 2.4, 2.6, red, 3.8, 1.75, 0));
  group.add(box(1.0, 1.1, 2.3, shared.glass, 4.4, 2.3, 0));
  group.add(box(7.0, 0.3, 2.72, glow(0xfacc15, 0.7), -0.9, 1.3, 0));
  const ladder = mat(0xcbd5e1, { metalness: 0.8 });
  const ladderGroup = new THREE.Group();
  ladderGroup.add(box(8.2, 0.25, 0.25, ladder, 0, 0, -0.55), box(8.2, 0.25, 0.25, ladder, 0, 0, 0.55));
  for (let i = -3.6; i <= 3.6; i += 0.9) ladderGroup.add(box(0.15, 0.2, 1.1, ladder, i, 0, 0));
  ladderGroup.position.set(-0.8, 3.65, 0);
  group.add(ladderGroup);
  wheels(group, 9, 2.7);
  lights(group, 9.8, 2.7, 1.2);
  const bar = lightBar(group, 4.1, 3.15);
  return { group, bar, ladder: ladderGroup };
}

export function makePolice() {
  const group = new THREE.Group();
  group.add(box(4.6, 1.1, 2.15, mat(0xf8fafc), 0, 1.05, 0));
  group.add(box(4.62, 0.4, 2.17, mat(0x1d4ed8), 0, 1.0, 0));
  group.add(box(2.3, 0.85, 1.9, shared.glass, -0.25, 2.0, 0));
  wheels(group, 4.6, 2.15);
  lights(group, 4.6, 2.15, 1.1);
  const bar = lightBar(group, -0.2, 2.6, [0xff1f3d, 0x2563ff], 1.6);
  return { group, bar };
}

export function makePumpTruck() {
  const group = new THREE.Group();
  const yellow = mat(0xeab308);
  group.add(box(5.6, 2.4, 2.6, mat(0x334155), -1.2, 1.8, 0));
  group.add(box(2.2, 2.2, 2.5, yellow, 2.7, 1.65, 0));
  group.add(box(1.0, 1.0, 2.2, shared.glass, 3.3, 2.2, 0));
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.3, 8, 16), mat(0x111827));
  hose.position.set(-1.2, 3.3, 0);
  hose.rotation.x = Math.PI / 2;
  group.add(hose);
  wheels(group, 8, 2.6);
  lights(group, 8.2, 2.6, 1.2);
  const bar = lightBar(group, 2.6, 2.95, [0xf59e0b, 0xf59e0b], 1.6);
  return { group, bar };
}

export function makeBoat() {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.0, 5.2, 10, 1), mat(0xf97316));
  hull.rotation.z = Math.PI / 2;
  hull.scale.set(1, 1, 0.55);
  hull.position.y = 0.6;
  group.add(hull);
  group.add(box(1.4, 1.0, 1.4, mat(0xe2e8f0), -0.6, 1.6, 0));
  const bar = lightBar(group, -0.6, 2.25, [0xf59e0b, 0x2563ff], 1.2);
  return { group, bar };
}

export function makePerson(color = 0xf1f5f9) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.0, 4, 8), mat(color));
  body.position.y = 1.0;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), mat(0xd6a77a));
  head.position.y = 2.05;
  group.add(body, head);
  return group;
}

export function makeCone() {
  const group = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 10), glow(0xf97316, 0.5));
  cone.position.y = 0.65;
  group.add(cone);
  return group;
}

/* ---------------------------------------------------------------
   EMERGENCY VEHICLE — follows waypoint paths, flashes lights
   --------------------------------------------------------------- */

export class EmergencyVehicle {
  constructor({ kind, label, model, speed = 22, light }) {
    this.kind = kind;
    this.label = label;
    this.group = model.group;
    this.bar = model.bar;
    this.model = model;
    this.speed = speed;
    this.path = [];
    this.segment = 0;
    this.segmentProgress = 0;
    this.arrived = true;
    this.sirenOn = false;
    this.flashTime = 0;
    this.travelled = 0;
    this.velocity = 0;
    this.light = light;
  }

  setPath(points) {
    this.path = points.map((point) => point.clone());
    this.segment = 0;
    this.segmentProgress = 0;
    this.arrived = this.path.length < 2;
    if (this.path.length) this.group.position.copy(this.path[0]);
    if (this.path.length > 1) this.faceTowards(this.path[1], 1);
  }

  faceTowards(target, blend) {
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    if (Math.abs(dx) + Math.abs(dz) < 0.01) return;
    const desired = Math.atan2(-dz, dx);
    let delta = desired - this.group.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    this.group.rotation.y += delta * blend;
  }

  get position() {
    return this.group.position;
  }

  get heading() {
    return new THREE.Vector3(Math.cos(this.group.rotation.y), 0, -Math.sin(this.group.rotation.y));
  }

  remainingDistance() {
    if (this.arrived) return 0;
    let total = this.path[this.segment + 1].distanceTo(this.group.position);
    for (let i = this.segment + 1; i < this.path.length - 1; i += 1) total += this.path[i].distanceTo(this.path[i + 1]);
    return total;
  }

  update(dt) {
    this.flashTime += dt;

    if (this.bar) {
      const phase = Math.floor(this.flashTime * 7) % 2 === 0;
      const on = this.sirenOn;
      this.bar.left.emissiveIntensity = on && phase ? 6 : 0.4;
      this.bar.right.emissiveIntensity = on && !phase ? 6 : 0.4;
      this.bar.spriteLeft.visible = on && phase;
      this.bar.spriteRight.visible = on && !phase;
      if (this.light) {
        this.light.position.set(this.group.position.x, 6, this.group.position.z);
        this.light.intensity = on ? 220 : 0;
        this.light.color.setHex(phase ? this.bar.left.color.getHex() : this.bar.right.color.getHex());
      }
    }

    if (this.arrived) {
      this.velocity = 0;
      return;
    }

    // Ease in at departure and ease out on final approach.
    const remaining = this.remainingDistance();
    const target = Math.min(this.speed, 4 + remaining * 0.9);
    this.velocity += (target - this.velocity) * Math.min(1, dt * 2.2);
    let step = this.velocity * dt;

    while (step > 0 && !this.arrived) {
      const end = this.path[this.segment + 1];
      const distance = this.group.position.distanceTo(end);
      if (distance <= step) {
        this.group.position.copy(end);
        this.travelled += distance;
        step -= distance;
        this.segment += 1;
        if (this.segment >= this.path.length - 1) this.arrived = true;
      } else {
        const direction = end.clone().sub(this.group.position).normalize();
        this.group.position.addScaledVector(direction, step);
        this.travelled += step;
        step = 0;
      }
    }

    if (!this.arrived) {
      const lookAhead = this.path[Math.min(this.segment + 1, this.path.length - 1)];
      this.faceTowards(lookAhead, Math.min(1, dt * 8));
    }
  }
}
