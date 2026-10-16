import * as THREE from "three";
import { makeChevronTexture, makeGlowTexture } from "./textures";

const glowTexture = makeGlowTexture();

/* ---------------------------------------------------------------
   PARTICLES — fire, smoke, sparks, water spray
   --------------------------------------------------------------- */

const particleVertex = `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uScale;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const particleFragment = `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

export class ParticleSystem {
  // spawn(p) must set p.x,y,z,vx,vy,vz,life,size,r,g,b
  constructor({ count, additive = false, spawn, gravity = 0, drag = 0, grow = 0, rate = 60 }) {
    this.count = count;
    this.spawn = spawn;
    this.gravity = gravity;
    this.drag = drag;
    this.grow = grow;
    this.rate = rate;
    this.intensity = 1;
    this.emitting = true;
    this.accumulator = 0;
    this.particles = Array.from({ length: count }, () => ({ age: 1, life: 0 }));

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(count), 1));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(count), 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 420 } },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
  }

  update(dt) {
    const geometry = this.points.geometry;
    const position = geometry.attributes.position.array;
    const color = geometry.attributes.aColor.array;
    const size = geometry.attributes.aSize.array;
    const alpha = geometry.attributes.aAlpha.array;

    if (this.emitting && this.intensity > 0) {
      this.accumulator += dt * this.rate * this.intensity;
    }

    for (let i = 0; i < this.count; i += 1) {
      const p = this.particles[i];

      if (p.age >= p.life && this.accumulator >= 1) {
        this.accumulator -= 1;
        this.spawn(p);
        p.age = 0;
        p.baseSize = p.size;
      }

      if (p.age < p.life) {
        p.age += dt;
        p.vy -= this.gravity * dt;
        const damping = Math.max(0, 1 - this.drag * dt);
        p.vx *= damping;
        p.vz *= damping;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;

        const t = p.age / p.life;
        position[i * 3] = p.x;
        position[i * 3 + 1] = p.y;
        position[i * 3 + 2] = p.z;
        color[i * 3] = p.r;
        color[i * 3 + 1] = p.g;
        color[i * 3 + 2] = p.b;
        size[i] = p.baseSize * (1 + this.grow * t);
        alpha[i] = (p.alpha ?? 1) * Math.sin(Math.min(1, t) * Math.PI);
      } else {
        alpha[i] = 0;
      }
    }

    this.accumulator = Math.min(this.accumulator, this.count);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aColor.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}

export function fireSystem(origin, spread = 6) {
  return new ParticleSystem({
    count: 260,
    additive: true,
    rate: 140,
    grow: -0.6,
    spawn: (p) => {
      p.x = origin.x + (Math.random() - 0.5) * spread;
      p.y = origin.y + Math.random() * 2;
      p.z = origin.z + (Math.random() - 0.5) * spread;
      p.vx = (Math.random() - 0.5) * 2;
      p.vy = 6 + Math.random() * 7;
      p.vz = (Math.random() - 0.5) * 2;
      p.life = 0.7 + Math.random() * 0.7;
      p.size = 7 + Math.random() * 7;
      const hot = Math.random();
      p.r = 1;
      p.g = 0.35 + hot * 0.4;
      p.b = 0.05 + hot * 0.1;
      p.alpha = 0.9;
    },
  });
}

export function smokeSystem(origin, spread = 6, dark = true) {
  return new ParticleSystem({
    count: 200,
    rate: 45,
    grow: 2.4,
    spawn: (p) => {
      p.x = origin.x + (Math.random() - 0.5) * spread;
      p.y = origin.y + 3;
      p.z = origin.z + (Math.random() - 0.5) * spread;
      p.vx = 1.5 + Math.random() * 1.5;
      p.vy = 5 + Math.random() * 3;
      p.vz = (Math.random() - 0.5) * 1.5;
      p.life = 3.5 + Math.random() * 2.5;
      p.size = 9 + Math.random() * 6;
      const shade = dark ? 0.16 + Math.random() * 0.12 : 0.55 + Math.random() * 0.2;
      p.r = shade;
      p.g = shade;
      p.b = shade * 1.05;
      p.alpha = dark ? 0.55 : 0.35;
    },
  });
}

export function sparkSystem(origin) {
  return new ParticleSystem({
    count: 120,
    additive: true,
    rate: 0,
    gravity: 18,
    spawn: (p) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 10;
      p.x = origin.x;
      p.y = origin.y + 1.2;
      p.z = origin.z;
      p.vx = Math.cos(angle) * speed;
      p.vy = 4 + Math.random() * 8;
      p.vz = Math.sin(angle) * speed;
      p.life = 0.5 + Math.random() * 0.6;
      p.size = 2.5 + Math.random() * 2;
      p.r = 1;
      p.g = 0.8;
      p.b = 0.4;
    },
  });
}

// Water jet from (from) toward (to); retarget by mutating the vectors.
export function waterJet(from, to) {
  const system = new ParticleSystem({
    count: 260,
    additive: true,
    rate: 160,
    gravity: 14,
    spawn: (p) => {
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const flat = Math.hypot(dx, dz) || 1;
      const time = flat / 24;
      p.x = from.x;
      p.y = from.y;
      p.z = from.z;
      p.vx = dx / time + (Math.random() - 0.5) * 2;
      p.vz = dz / time + (Math.random() - 0.5) * 2;
      p.vy = (to.y - from.y) / time + 0.5 * 14 * time + (Math.random() - 0.5) * 2;
      p.life = time * 1.05;
      p.size = 2.6 + Math.random() * 2;
      p.r = 0.55;
      p.g = 0.85;
      p.b = 1;
      p.alpha = 0.8;
    },
  });
  return system;
}

/* ---------------------------------------------------------------
   RAIN
   --------------------------------------------------------------- */

export class Rain {
  constructor(count = 2600, extent = 380) {
    this.count = count;
    this.extent = extent;
    this.intensity = 0;
    const positions = new Float32Array(count * 6);
    this.speeds = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const x = (Math.random() - 0.5) * extent;
      const y = Math.random() * 160;
      const z = (Math.random() - 0.5) * extent;
      positions.set([x, y, z, x - 0.6, y - 4, z], i * 6);
      this.speeds[i] = 90 + Math.random() * 50;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.material = new THREE.LineBasicMaterial({ color: 0x9cc9ff, transparent: true, opacity: 0 });
    this.mesh = new THREE.LineSegments(geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  update(dt) {
    this.material.opacity = 0.35 * this.intensity;
    this.mesh.visible = this.intensity > 0.01;
    if (!this.mesh.visible) return;

    const array = this.mesh.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i += 1) {
      const fall = this.speeds[i] * dt;
      let y = array[i * 6 + 1] - fall;
      if (y < 0) y += 160;
      array[i * 6 + 1] = y;
      array[i * 6 + 4] = y - 4;
      array[i * 6 + 0] -= fall * 0.15;
      array[i * 6 + 3] = array[i * 6 + 0] - 0.6;
      if (array[i * 6] < -this.extent / 2) {
        array[i * 6] += this.extent;
        array[i * 6 + 3] += this.extent;
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

/* ---------------------------------------------------------------
   MARKERS — pulse rings, light beams, glow sprites
   --------------------------------------------------------------- */

export class PulseRing {
  constructor(color = 0xff3355, radius = 10, period = 1.6) {
    this.period = period;
    this.radius = radius;
    this.time = Math.random() * period;
    this.material = new THREE.MeshBasicMaterial({
      color, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48), this.material);
    this.mesh.rotation.x = -Math.PI / 2;
  }

  update(dt) {
    this.time = (this.time + dt) % this.period;
    const t = this.time / this.period;
    const scale = 0.5 + t * this.radius;
    this.mesh.scale.set(scale, scale, scale);
    this.material.opacity = 1 - t;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

export function makeBeam(color = 0xff3355, height = 90, radius = 2.2) {
  const geometry = new THREE.CylinderGeometry(radius * 0.4, radius, height, 24, 1, true);
  geometry.translate(0, height / 2, 0);
  const material = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return new THREE.Mesh(geometry, material);
}

export function makeGlowSprite(color, scale = 6) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  sprite.scale.set(scale, scale, scale);
  return sprite;
}

/* ---------------------------------------------------------------
   DATA PACKET — glowing pulse along an arc (sensor → ICCC → unit)
   --------------------------------------------------------------- */

export class Packet {
  constructor(from, to, color = 0x38bdf8, duration = 1.8, height = 45) {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.y += height + from.distanceTo(to) * 0.12;
    this.curve = new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
    this.duration = duration;
    this.time = 0;
    this.done = false;

    this.group = new THREE.Group();
    this.lineMaterial = new THREE.LineBasicMaterial({
      color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(this.curve.getPoints(48)), this.lineMaterial);
    this.head = makeGlowSprite(color, 9);
    this.trail = [0.04, 0.08, 0.12].map((lag, i) => {
      const sprite = makeGlowSprite(color, 7 - i * 1.6);
      sprite.userData.lag = lag;
      return sprite;
    });
    this.group.add(this.line, this.head, ...this.trail);
  }

  update(dt) {
    this.time += dt;
    const t = Math.min(1, this.time / this.duration);
    this.head.position.copy(this.curve.getPoint(t));
    for (const sprite of this.trail) {
      sprite.position.copy(this.curve.getPoint(Math.max(0, t - sprite.userData.lag)));
    }
    if (t >= 1) {
      this.lineMaterial.opacity = Math.max(0, this.lineMaterial.opacity - dt * 1.2);
      this.head.material.opacity = this.lineMaterial.opacity;
      this.trail.forEach((sprite) => (sprite.material.opacity = this.lineMaterial.opacity));
      if (this.lineMaterial.opacity <= 0) this.done = true;
    }
    return t >= 1;
  }

  dispose() {
    this.line.geometry.dispose();
    this.lineMaterial.dispose();
    [this.head, ...this.trail].forEach((sprite) => sprite.material.dispose());
  }
}

/* ---------------------------------------------------------------
   ROUTE RIBBON — animated chevrons along a planned route
   --------------------------------------------------------------- */

export class RouteRibbon {
  constructor(points, color = 0x22c55e, width = 2.2, y = 0.35) {
    this.texture = makeChevronTexture();
    const positions = [];
    const uvs = [];
    const indices = [];
    let distance = 0;

    for (let i = 0; i < points.length; i += 1) {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const dir = new THREE.Vector3().subVectors(next, prev).setY(0).normalize();
      const normal = new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(width / 2);
      if (i > 0) distance += points[i].distanceTo(points[i - 1]);
      const p = points[i];
      positions.push(p.x + normal.x, y, p.z + normal.z, p.x - normal.x, y, p.z - normal.z);
      uvs.push(distance / 5, 0, distance / 5, 1);
      if (i > 0) {
        const a = (i - 1) * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    this.material = new THREE.MeshBasicMaterial({
      color, map: this.texture, transparent: true, opacity: 0, depthWrite: false,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 2;
    this.targetOpacity = 0.95;
  }

  update(dt) {
    this.texture.offset.x -= dt * 1.6;
    this.material.opacity += (this.targetOpacity - this.material.opacity) * Math.min(1, dt * 3);
  }

  fadeOut() {
    this.targetOpacity = 0;
  }

  get faded() {
    return this.targetOpacity === 0 && this.material.opacity < 0.02;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
