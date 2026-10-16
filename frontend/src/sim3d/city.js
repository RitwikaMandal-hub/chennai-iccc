import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { makeEmblemTexture, makeGlowTexture, makeWindowTextures } from "./textures";
import { makeBus, makeCar } from "./vehicles";

/* ---------------------------------------------------------------
   GRID — 7×7 intersections, 6×6 city blocks. Traffic drives on the
   LEFT (India). i grows east (+x), j grows south (+z).
   --------------------------------------------------------------- */

export const N = 7;
export const SPACING = 48;
export const ROAD = 12;
export const LANE = 3;
const HALF = ((N - 1) * SPACING) / 2;

export const key = (i, j) => i * N + j;
export const unkey = (k) => [Math.floor(k / N), k % N];
export const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export function nodePos(i, j, y = 0) {
  return new THREE.Vector3(-HALF + i * SPACING, y, -HALF + j * SPACING);
}

export function blockCenter(bx, bz, y = 0) {
  return new THREE.Vector3(-HALF + SPACING / 2 + bx * SPACING, y, -HALF + SPACING / 2 + bz * SPACING);
}

export function neighbours(k) {
  const [i, j] = unkey(k);
  const result = [];
  if (i > 0) result.push(key(i - 1, j));
  if (i < N - 1) result.push(key(i + 1, j));
  if (j > 0) result.push(key(i, j - 1));
  if (j < N - 1) result.push(key(i, j + 1));
  return result;
}

const axisOf = (a, b) => (unkey(a)[0] !== unkey(b)[0] ? "EW" : "NS");
const posOf = (k, y = 0) => nodePos(...unkey(k), y);

// A "spot" is the midpoint of a road segment between two adjacent nodes.
export const spot = (a, b) => ({ a: key(...a), b: key(...b) });
export const spotPos = (s, y = 0) => posOf(s.a, y).add(posOf(s.b, y)).multiplyScalar(0.5);

/* ---------------------------------------------------------------
   LANE-OFFSET PATHS
   --------------------------------------------------------------- */

const leftNormal = (d) => new THREE.Vector3(d.z, 0, -d.x);

// Convert a road-centreline polyline into a left-lane driving path.
export function lanePath(centre, lane = LANE) {
  const out = [];
  for (let i = 0; i < centre.length; i += 1) {
    const point = centre[i];
    const din = i > 0 ? point.clone().sub(centre[i - 1]).setY(0).normalize() : null;
    const dout = i < centre.length - 1 ? centre[i + 1].clone().sub(point).setY(0).normalize() : null;

    if (!din || !dout) {
      out.push(point.clone().addScaledVector(leftNormal(din || dout), lane));
      continue;
    }

    const dot = din.dot(dout);
    if (dot > 0.9) {
      out.push(point.clone().addScaledVector(leftNormal(din), lane));
    } else if (dot < -0.9) {
      // U-turn: swing through the intersection.
      out.push(point.clone().addScaledVector(leftNormal(din), lane).addScaledVector(din, lane));
      out.push(point.clone().addScaledVector(leftNormal(dout), lane).addScaledVector(din, lane));
    } else {
      out.push(point.clone().addScaledVector(leftNormal(din), lane).addScaledVector(leftNormal(dout), lane));
    }
  }
  return out;
}

/* ---------------------------------------------------------------
   CITY
   --------------------------------------------------------------- */

export const LANDMARKS = {
  iccc: { block: [2, 2], name: "Chennai ICCC", sub: "Command & Control" },
  hospital: { block: [5, 1], name: "Govt. General Hospital", sub: "Trauma & ER", spot: spot([5, 1], [5, 2]) },
  fire: { block: [0, 1], name: "Fire & Rescue Station", sub: "TNFRS Unit 4", spot: spot([1, 1], [1, 2]) },
  police: { block: [3, 5], name: "Police Station", sub: "Traffic Police", spot: spot([3, 5], [4, 5]) },
  tower: { block: [4, 3], name: "Residential Tower", sub: "14 floors" },
};

const RESERVED = new Set(["2,2", "5,1", "0,1", "3,5", "4,3", "1,4"]);

export class City {
  constructor(scene, { quality = "high" } = {}) {
    this.scene = scene;
    this.quality = quality;
    this.root = new THREE.Group();
    scene.add(this.root);

    this.blockedNodes = new Set();
    this.blockedEdges = new Set();
    this.overrides = new Map();
    this.corridors = [];
    this.overrideCount = 0;
    this.yielded = new Set();
    this.disposables = [];
    this.time = 0;
    this.emergency = [];

    this.buildGround();
    this.buildRoads();
    this.buildBlocks();
    this.buildLandmarks();
    this.buildSignals();
    this.buildStreetLights();
    this.spawnTraffic(quality === "high" ? 52 : 34);
  }

  track(...items) {
    this.disposables.push(...items);
    return items[0];
  }

  label(text, sub, position, tone = "default") {
    const element = document.createElement("div");
    element.className = `sim-label sim-label-${tone}`;
    element.innerHTML = `<strong>${text}</strong>${sub ? `<span>${sub}</span>` : ""}`;
    const object = new CSS2DObject(element);
    object.position.copy(position);
    this.root.add(object);
    return object;
  }

  /* ----------------------------- ground / coast */

  buildGround() {
    const ground = new THREE.Mesh(
      this.track(new THREE.PlaneGeometry(1600, 1600)),
      this.track(new THREE.MeshStandardMaterial({ color: 0x0a1018, roughness: 1 }))
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    this.root.add(ground);

    // Marina-style beach and Bay of Bengal on the east edge.
    const beach = new THREE.Mesh(
      this.track(new THREE.PlaneGeometry(30, 700)),
      this.track(new THREE.MeshStandardMaterial({ color: 0x5b4a33, roughness: 1 }))
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(HALF + 22, 0.02, 0);
    this.root.add(beach);

    this.seaMaterial = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x0b2f4f, emissive: 0x06223d, emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.6,
      })
    );
    const sea = new THREE.Mesh(this.track(new THREE.PlaneGeometry(500, 900, 1, 1)), this.seaMaterial);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(HALF + 37 + 250, 0.0, 0);
    this.root.add(sea);

    this.label("Bay of Bengal", "Marina coast", new THREE.Vector3(HALF + 90, 2, -40), "muted");
  }

  /* ----------------------------- roads */

  buildRoads() {
    const asphalt = this.track(new THREE.MeshStandardMaterial({ color: 0x1a222d, roughness: 0.85 }));
    const crossing = this.track(new THREE.MeshStandardMaterial({ color: 0x232d3a, roughness: 0.8 }));
    const length = HALF * 2 + ROAD;

    for (let i = 0; i < N; i += 1) {
      const ns = new THREE.Mesh(this.track(new THREE.PlaneGeometry(ROAD, length)), asphalt);
      ns.rotation.x = -Math.PI / 2;
      ns.position.set(-HALF + i * SPACING, 0.05, 0);
      const ew = new THREE.Mesh(this.track(new THREE.PlaneGeometry(length, ROAD)), asphalt);
      ew.rotation.x = -Math.PI / 2;
      ew.position.set(0, 0.06, -HALF + i * SPACING);
      this.root.add(ns, ew);
    }

    const crossGeometry = this.track(new THREE.PlaneGeometry(ROAD, ROAD));
    for (let i = 0; i < N; i += 1) {
      for (let j = 0; j < N; j += 1) {
        const tile = new THREE.Mesh(crossGeometry, crossing);
        tile.rotation.x = -Math.PI / 2;
        tile.position.copy(nodePos(i, j, 0.08));
        this.root.add(tile);
      }
    }

    // Dashed centre lines (instanced).
    const dashGeometry = this.track(new THREE.PlaneGeometry(3, 0.35));
    const dashMaterial = this.track(new THREE.MeshBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.45 }));
    const dashes = [];
    for (let line = 0; line < N; line += 1) {
      for (let seg = 0; seg < N - 1; seg += 1) {
        for (let d = 10; d <= SPACING - 10; d += 6) {
          dashes.push([-HALF + seg * SPACING + d, -HALF + line * SPACING, 0]);
          dashes.push([-HALF + line * SPACING, -HALF + seg * SPACING + d, 1]);
        }
      }
    }
    const instanced = new THREE.InstancedMesh(dashGeometry, dashMaterial, dashes.length);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    dashes.forEach(([x, z, vertical], index) => {
      rotation.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, vertical ? Math.PI / 2 : 0));
      matrix.compose(new THREE.Vector3(x, 0.1, z), rotation, new THREE.Vector3(1, 1, 1));
      instanced.setMatrixAt(index, matrix);
    });
    this.root.add(instanced);
  }

  /* ----------------------------- blocks & buildings */

  buildBlocks() {
    const sidewalk = this.track(new THREE.MeshStandardMaterial({ color: 0x2a3441, roughness: 0.9 }));
    const park = this.track(new THREE.MeshStandardMaterial({ color: 0x14361f, roughness: 1 }));
    const roof = this.track(new THREE.MeshStandardMaterial({ color: 0x151c26, roughness: 0.9 }));
    const tree = this.track(new THREE.MeshStandardMaterial({ color: 0x1f6b3a, roughness: 1 }));
    const slabGeometry = this.track(new THREE.BoxGeometry(SPACING - ROAD, 0.6, SPACING - ROAD));
    const treeGeometry = this.track(new THREE.ConeGeometry(1.8, 5, 7));

    this.facades = [0, 1, 2, 3].map((seed) => {
      const { map, emissiveMap } = makeWindowTextures(seed + 3, seed === 2 ? ["#9fe4ff", "#c7f0ff"] : undefined);
      this.track(map, emissiveMap);
      return this.track(
        new THREE.MeshStandardMaterial({
          map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.6, metalness: 0.3,
        })
      );
    });
    this.roofMaterial = roof;
    this.buildings = [];

    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    for (let bx = 0; bx < N - 1; bx += 1) {
      for (let bz = 0; bz < N - 1; bz += 1) {
        const centre = blockCenter(bx, bz);
        const slab = new THREE.Mesh(slabGeometry, sidewalk);
        slab.position.set(centre.x, 0.3, centre.z);
        this.root.add(slab);

        if (RESERVED.has(`${bx},${bz}`)) continue;

        const distance = centre.length() / (HALF * 1.4);
        for (const ox of [-8.5, 8.5]) {
          for (const oz of [-8.5, 8.5]) {
            const x = centre.x + ox;
            const z = centre.z + oz;

            if (random() < 0.1) {
              const lawn = new THREE.Mesh(this.track(new THREE.BoxGeometry(15, 0.2, 15)), park);
              lawn.position.set(x, 0.7, z);
              this.root.add(lawn);
              for (let t = 0; t < 3; t += 1) {
                const cone = new THREE.Mesh(treeGeometry, tree);
                cone.position.set(x + (random() - 0.5) * 10, 3.2, z + (random() - 0.5) * 10);
                this.root.add(cone);
              }
              continue;
            }

            const width = 10 + random() * 4.5;
            const depth = 10 + random() * 4.5;
            const height = 7 + random() * 15 + Math.max(0, 1 - distance) * 28 * random();
            this.addBuilding(x, z, width, height, depth, Math.floor(random() * 4));
          }
        }
      }
    }
  }

  addBuilding(x, z, width, height, depth, variant = 0, material) {
    const geometry = this.track(new THREE.BoxGeometry(width, height, depth));
    const uv = geometry.attributes.uv;
    // Faces: +x, -x, +y, -y, +z, -z (4 vertices each). Scale window UVs to size.
    for (let face = 0; face < 6; face += 1) {
      const horizontal = face < 2 ? depth : width;
      for (let v = 0; v < 4; v += 1) {
        const index = face * 4 + v;
        if (face === 2 || face === 3) {
          uv.setXY(index, 0, 0);
        } else {
          uv.setXY(index, uv.getX(index) * (horizontal / 24), uv.getY(index) * (height / 22));
        }
      }
    }
    const facade = material || this.facades[variant];
    const mesh = new THREE.Mesh(geometry, [facade, facade, this.roofMaterial, this.roofMaterial, facade, facade]);
    mesh.position.set(x, 0.6 + height / 2, z);
    this.root.add(mesh);
    this.buildings.push(mesh);
    return mesh;
  }

  /* ----------------------------- landmarks */

  buildLandmarks() {
    const L = LANDMARKS;
    this.landmarks = {};

    // ICCC command tower
    {
      const centre = blockCenter(...L.iccc.block);
      const group = new THREE.Group();
      group.position.copy(centre);
      const glass = this.track(
        new THREE.MeshStandardMaterial({ color: 0x0c2a44, emissive: 0x0b4d7a, emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.2 })
      );
      const body = new THREE.Mesh(this.track(new THREE.CylinderGeometry(7, 9, 62, 6)), glass);
      body.position.y = 31.6;
      const podium = new THREE.Mesh(this.track(new THREE.CylinderGeometry(15, 16, 6, 6)), glass);
      podium.position.y = 3.6;
      const ringMaterial = this.track(new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      const ring = new THREE.Mesh(this.track(new THREE.TorusGeometry(11, 0.6, 8, 48)), ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 58;
      const ring2 = ring.clone();
      ring2.position.y = 46;
      ring2.scale.setScalar(0.92);
      const antenna = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.3, 0.5, 18, 6)), this.track(new THREE.MeshStandardMaterial({ color: 0x94a3b8 })));
      antenna.position.y = 72;
      const dish = new THREE.Mesh(
        this.track(new THREE.SphereGeometry(4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3)),
        this.track(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide, metalness: 0.5 }))
      );
      dish.position.set(0, 64, 0);
      dish.rotation.z = Math.PI / 2.8;
      const dishPivot = new THREE.Group();
      dishPivot.add(dish);
      group.add(body, podium, ring, ring2, antenna, dishPivot);
      this.root.add(group);
      this.landmarks.iccc = {
        group, ring, ring2, ringMaterial, dishPivot,
        top: centre.clone().setY(66),
        label: this.label(L.iccc.name, L.iccc.sub, centre.clone().setY(84), "accent"),
      };
    }

    // Hospital
    {
      const centre = blockCenter(...L.hospital.block);
      const white = this.track(
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, emissive: 0x334155, emissiveIntensity: 0.35, roughness: 0.6 })
      );
      const main = this.addBuilding(centre.x + 3, centre.z, 24, 20, 28, 2);
      const wing = new THREE.Mesh(this.track(new THREE.BoxGeometry(12, 9, 20)), white);
      wing.position.set(centre.x - 11, 5.1, centre.z);
      const roofCross = new THREE.Mesh(
        this.track(new THREE.PlaneGeometry(14, 14)),
        this.track(new THREE.MeshBasicMaterial({ map: this.track(makeEmblemTexture("cross")) }))
      );
      roofCross.rotation.x = -Math.PI / 2;
      roofCross.position.set(centre.x + 3, 20.75, centre.z);
      const canopyMaterial = this.track(new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.6 }));
      const canopy = new THREE.Mesh(this.track(new THREE.BoxGeometry(5, 0.6, 10)), canopyMaterial);
      canopy.position.set(centre.x - 15, 9.9, centre.z);
      this.root.add(wing, roofCross, canopy);
      this.landmarks.hospital = {
        main, canopyMaterial,
        door: new THREE.Vector3(centre.x - 17, 0.6, centre.z),
        label: this.label(L.hospital.name, L.hospital.sub, centre.clone().setY(30), "medical"),
      };
    }

    // Fire station
    {
      const centre = blockCenter(...L.fire.block);
      const red = this.track(new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.7 }));
      const hall = new THREE.Mesh(this.track(new THREE.BoxGeometry(18, 10, 26)), red);
      hall.position.set(centre.x - 2, 5.6, centre.z);
      const door = this.track(new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.9 }));
      for (const dz of [-7, 0, 7]) {
        const panel = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.3, 6, 5)), door);
        panel.position.set(centre.x + 7.1, 3.6, centre.z + dz);
        this.root.add(panel);
      }
      const drillTower = new THREE.Mesh(this.track(new THREE.BoxGeometry(6, 26, 6)), red);
      drillTower.position.set(centre.x - 10, 13.6, centre.z - 10);
      this.root.add(hall, drillTower);
      this.landmarks.fire = {
        doorMaterial: door,
        label: this.label(L.fire.name, L.fire.sub, centre.clone().setY(32), "fire"),
      };
    }

    // Police station
    {
      const centre = blockCenter(...L.police.block);
      this.addBuilding(centre.x, centre.z + 2, 26, 12, 22, 2);
      const stripe = new THREE.Mesh(
        this.track(new THREE.BoxGeometry(26.2, 1.4, 22.2)),
        this.track(new THREE.MeshStandardMaterial({ color: 0x1d4ed8, emissive: 0x1d4ed8, emissiveIntensity: 0.8 }))
      );
      stripe.position.set(centre.x, 12.2, centre.z + 2);
      this.root.add(stripe);
      this.landmarks.police = {
        label: this.label(L.police.name, L.police.sub, centre.clone().setY(22), "police"),
      };
    }

    // Residential tower (fire scenario target) and neighbours
    {
      const centre = blockCenter(...L.tower.block);
      this.windowGlow = this.track(
        new THREE.MeshStandardMaterial({
          map: this.facades[0].map, emissiveMap: this.facades[0].emissiveMap, emissive: 0xffffff,
          emissiveIntensity: 0.85, roughness: 0.6, metalness: 0.3,
        })
      );
      const tower = this.addBuilding(centre.x, centre.z, 16, 42, 16, 0, this.windowGlow);
      this.addBuilding(centre.x - 9, centre.z + 12, 11, 10, 9, 1);
      this.addBuilding(centre.x + 11, centre.z - 11, 10, 14, 10, 3);
      this.landmarks.tower = { tower, top: centre.clone().setY(36), centre };
    }

    // Low-rise homes in the Velachery flood basin (flood scenario rooftop rescue)
    {
      const centre = blockCenter(1, 4);
      this.landmarks.homes = [
        this.addBuilding(centre.x + 9, centre.z - 9, 10, 7, 10, 1),
        this.addBuilding(centre.x - 9, centre.z - 9, 10, 9, 10, 3),
        this.addBuilding(centre.x, centre.z + 10, 14, 6, 9, 1),
      ];
    }

    // CCTV pole near the accident spot and smoke sensor on the tower.
    this.cctv = this.makeCctv(nodePos(2, 4).add(new THREE.Vector3(-10, 0, -8)));
  }

  makeCctv(position) {
    const group = new THREE.Group();
    group.position.copy(position);
    const pole = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.25, 0.3, 10, 6)), this.track(new THREE.MeshStandardMaterial({ color: 0x64748b })));
    pole.position.y = 5;
    const head = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.6, 0.8, 0.8)), this.track(new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })));
    head.position.set(0.6, 10, 0);
    const coneMaterial = this.track(
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    const coneGeometry = this.track(new THREE.ConeGeometry(4, 13, 20, 1, true));
    coneGeometry.translate(0, -6.5, 0);
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    const pivot = new THREE.Group();
    pivot.position.set(1.2, 10, 0);
    cone.rotation.z = Math.PI / 2.6;
    pivot.add(cone);
    group.add(pole, head, pivot);
    this.root.add(group);
    return { group, pivot, coneMaterial, top: position.clone().setY(10.5) };
  }

  /* ----------------------------- signals */

  buildSignals() {
    this.signalState = [];
    const approaches = [];

    for (let i = 0; i < N; i += 1) {
      for (let j = 0; j < N; j += 1) {
        const k = key(i, j);
        this.signalState[k] = { offset: Math.random() * 14 };
        const p = nodePos(i, j);
        if (i > 0) approaches.push({ k, axis: "EW", x: p.x - 7.5, z: p.z - LANE, rot: 0 });
        if (i < N - 1) approaches.push({ k, axis: "EW", x: p.x + 7.5, z: p.z + LANE, rot: 0 });
        if (j > 0) approaches.push({ k, axis: "NS", x: p.x + LANE, z: p.z - 7.5, rot: 1 });
        if (j < N - 1) approaches.push({ k, axis: "NS", x: p.x - LANE, z: p.z + 7.5, rot: 1 });
      }
    }

    const geometry = this.track(new THREE.BoxGeometry(0.7, 0.3, 5.4));
    const material = this.track(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    this.signalMesh = new THREE.InstancedMesh(geometry, material, approaches.length);
    const matrix = new THREE.Matrix4();
    approaches.forEach((a, index) => {
      matrix.makeRotationY(a.rot ? Math.PI / 2 : 0);
      matrix.setPosition(a.x, 0.25, a.z);
      this.signalMesh.setMatrixAt(index, matrix);
      this.signalMesh.setColorAt(index, new THREE.Color(0xef4444));
    });
    this.approaches = approaches;
    this.root.add(this.signalMesh);

    // Corridor rings (one per node, hidden until a green corridor is active).
    const ringGeometry = this.track(new THREE.RingGeometry(7.2, 8.4, 40));
    this.corridorRingMaterial = this.track(
      new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })
    );
    this.corridorRings = [];
    for (let k = 0; k < N * N; k += 1) {
      const ring = new THREE.Mesh(ringGeometry, this.corridorRingMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(posOf(k, 0.3));
      ring.visible = false;
      this.root.add(ring);
      this.corridorRings.push(ring);
    }
  }

  phase(k) {
    const override = this.overrides.get(k);
    if (override) return override;
    const t = (this.time + this.signalState[k].offset) % 14;
    if (t < 6) return "EW";
    if (t < 7) return "Y";
    if (t < 13) return "NS";
    return "Y";
  }

  allowed(k, axis) {
    return this.phase(k) === axis;
  }

  updateSignals() {
    const green = new THREE.Color(0x22c55e);
    const red = new THREE.Color(0xef4444);
    const amber = new THREE.Color(0xf59e0b);
    this.approaches.forEach((a, index) => {
      const phase = this.phase(a.k);
      this.signalMesh.setColorAt(index, phase === "Y" ? amber : phase === a.axis ? green : red);
    });
    this.signalMesh.instanceColor.needsUpdate = true;

    this.corridorRings.forEach((ring, k) => {
      ring.visible = this.overrides.has(k);
    });
    this.corridorRingMaterial.opacity = 0.55 + Math.sin(this.time * 6) * 0.35;
  }

  /* ----------------------------- green corridors */

  // Hold signals green for an emergency vehicle along its node path,
  // a few junctions ahead, releasing each one once it has passed.
  addCorridor(vehicle, nodes) {
    const items = nodes.map((k, index) => ({
      k,
      axis: index > 0 ? axisOf(nodes[index - 1], k) : axisOf(k, nodes[index + 1] ?? k),
      passed: false,
    }));
    const corridor = { vehicle, items, index: 0 };
    this.corridors.push(corridor);
    return corridor;
  }

  clearCorridors() {
    this.corridors = [];
    this.overrides.clear();
  }

  updateCorridors() {
    this.overrides.clear();
    for (const corridor of this.corridors) {
      const { vehicle, items } = corridor;
      while (corridor.index < items.length && vehicle.position.distanceTo(posOf(items[corridor.index].k)) < 9) {
        items[corridor.index].passed = true;
        corridor.index += 1;
      }
      for (let n = corridor.index; n < Math.min(items.length, corridor.index + 3); n += 1) {
        const item = items[n];
        if (!item.counted) {
          item.counted = true;
          this.overrideCount += 1;
        }
        this.overrides.set(item.k, item.axis);
      }
    }
    this.corridors = this.corridors.filter((c) => c.index < c.items.length && !c.vehicle.arrived);
  }

  /* ----------------------------- routing */

  route(fromSpot, toSpot, { avoid = true } = {}) {
    const blocked = avoid ? this.blockedNodes : new Set();
    const blockedEdges = avoid ? this.blockedEdges : new Set();
    let best = null;

    for (const start of [fromSpot.a, fromSpot.b]) {
      for (const goal of [toSpot.a, toSpot.b]) {
        const nodes = this.bfs(start, goal, blocked, blockedEdges);
        // Starting/ending at the nearer end of each spot's segment means the
        // shortest of the four combinations never doubles back past a spot.
        if (nodes && (!best || nodes.length < best.length)) best = { nodes, length: nodes.length };
      }
    }
    if (!best) return null;
    return this.pathFromNodes(fromSpot, best.nodes, toSpot);
  }

  // Explicit node list (used to show the "naive" route before re-routing).
  pathFromNodes(fromSpot, nodes, toSpot) {
    const centre = [spotPos(fromSpot), ...nodes.map((k) => posOf(k)), spotPos(toSpot)];
    return { nodes, centre, points: lanePath(dedupe(centre)) };
  }

  bfs(start, goal, blocked, blockedEdges) {
    if (blocked.has(start) || blocked.has(goal)) return null;
    const previous = new Map([[start, null]]);
    const queue = [start];
    while (queue.length) {
      const current = queue.shift();
      if (current === goal) break;
      for (const next of neighbours(current)) {
        if (previous.has(next) || blocked.has(next) || blockedEdges.has(edgeKey(current, next))) continue;
        previous.set(next, current);
        queue.push(next);
      }
    }
    if (!previous.has(goal)) return null;
    const path = [];
    for (let k = goal; k !== null; k = previous.get(k)) path.unshift(k);
    return path;
  }

  /* ----------------------------- street lights */

  buildStreetLights() {
    const positions = [];
    for (let line = 0; line < N; line += 1) {
      for (let d = -HALF; d <= HALF; d += 16) {
        const along = -HALF + line * SPACING;
        if (Math.abs(((d + HALF) % SPACING)) < 1) continue;
        positions.push(d, 7, along - 6.5, along - 6.5, 7, d);
      }
    }
    const geometry = this.track(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const glowTexture = this.track(makeGlowTexture());
    const material = this.track(
      new THREE.PointsMaterial({ size: 5, map: glowTexture, color: 0xffc98a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    this.root.add(new THREE.Points(geometry, material));
  }

  /* ----------------------------- civilian traffic */

  spawnTraffic(count) {
    this.cars = [];
    const palette = [0x3b82f6, 0x94a3b8, 0xe2e8f0, 0x0ea5e9, 0x64748b, 0xa855f7, 0x14b8a6, 0xf43f5e, 0x111827];
    for (let n = 0; n < count; n += 1) {
      const bus = n % 12 === 0;
      const mesh = bus ? makeBus(n % 24 === 0 ? 0xf59e0b : 0x16a34a) : makeCar(palette[n % palette.length]);
      const car = { mesh, bus, v: 0, lateral: LANE, cruise: bus ? 9 : 11 + Math.random() * 5, snapped: false };
      this.placeRandomly(car);
      this.root.add(mesh);
      this.cars.push(car);
    }
  }

  placeRandomly(car) {
    for (let tries = 0; tries < 50; tries += 1) {
      const a = Math.floor(Math.random() * N * N);
      const options = neighbours(a).filter((b) => !this.blockedNodes.has(b) && !this.blockedEdges.has(edgeKey(a, b)));
      if (this.blockedNodes.has(a) || !options.length) continue;
      car.a = a;
      car.b = options[Math.floor(Math.random() * options.length)];
      car.s = 8 + Math.random() * (SPACING - 20);
      car.snapped = false;
      return;
    }
  }

  nextNode(car) {
    const options = neighbours(car.b).filter(
      (k) => k !== car.a && !this.blockedNodes.has(k) && !this.blockedEdges.has(edgeKey(car.b, k))
    );
    if (options.length) return options[Math.floor(Math.random() * options.length)];
    return car.a;
  }

  updateTraffic(dt) {
    const bySegment = new Map();
    for (const car of this.cars) {
      const id = `${car.a}>${car.b}`;
      if (!bySegment.has(id)) bySegment.set(id, []);
      bySegment.get(id).push(car);
    }

    const sirens = this.emergency.filter((vehicle) => vehicle.sirenOn && !vehicle.arrived);

    for (const car of this.cars) {
      if (this.blockedNodes.has(car.a) && this.blockedNodes.has(car.b)) {
        this.placeRandomly(car);
      }
      if (this.blockedNodes.has(car.b) || this.blockedEdges.has(edgeKey(car.a, car.b))) {
        [car.a, car.b] = [car.b, car.a];
        car.s = SPACING - car.s;
      }

      const A = posOf(car.a);
      const B = posOf(car.b);
      const direction = B.clone().sub(A).divideScalar(SPACING);
      const normal = leftNormal(direction);
      const here = A.clone().addScaledVector(direction, car.s).addScaledVector(normal, car.lateral);

      let target = car.cruise;
      let yielding = false;

      for (const vehicle of sirens) {
        if (vehicle.position.distanceTo(here) < 28) {
          yielding = true;
          this.yielded.add(car);
        }
      }

      if (yielding) target = 0;

      const stopLine = SPACING - 10 - (car.bus ? 3 : 0);
      const axis = axisOf(car.a, car.b);
      if (car.s < stopLine + 0.5 && car.s > stopLine - 10 && !this.allowed(car.b, axis)) {
        target = Math.min(target, Math.max(0, (stopLine - car.s) * 1.6));
      }

      // A U-turn above can move the car onto a segment not in the index yet.
      const peers = bySegment.get(`${car.a}>${car.b}`) || [];
      for (const other of peers) {
        if (other === car || other.s <= car.s) continue;
        const gap = other.s - car.s - (other.bus || car.bus ? 4 : 0);
        if (gap < 9) target = Math.min(target, Math.max(0, (gap - 5.5) * 2));
      }

      car.lateral += ((yielding ? 5.2 : LANE) - car.lateral) * Math.min(1, dt * 3);
      car.v += (target - car.v) * Math.min(1, dt * (target < car.v ? 5 : 2));
      car.s += car.v * dt;

      if (car.s >= SPACING) {
        car.s -= SPACING;
        const next = this.nextNode(car);
        car.a = car.b;
        car.b = next;
      }

      const A2 = posOf(car.a);
      const B2 = posOf(car.b);
      const d2 = B2.clone().sub(A2).divideScalar(SPACING);
      const position = A2.addScaledVector(d2, car.s).addScaledVector(leftNormal(d2), car.lateral);

      if (!car.snapped) {
        car.mesh.position.copy(position);
        car.mesh.rotation.y = Math.atan2(-d2.z, d2.x);
        car.snapped = true;
      } else {
        car.mesh.position.lerp(position, 1 - Math.exp(-dt * 10));
        let delta = Math.atan2(-d2.z, d2.x) - car.mesh.rotation.y;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        car.mesh.rotation.y += delta * Math.min(1, dt * 7);
      }
    }
  }

  /* ----------------------------- per-frame */

  update(dt) {
    this.time += dt;
    this.updateCorridors();
    this.updateSignals();
    this.updateTraffic(dt);

    const { iccc } = this.landmarks;
    iccc.dishPivot.rotation.y += dt * 0.6;
    iccc.ring.rotation.z += dt * 0.8;
    iccc.ring2.rotation.z -= dt * 0.5;
    this.seaMaterial.emissiveIntensity = 0.55 + Math.sin(this.time * 0.8) * 0.08;
    this.cctv.pivot.rotation.y = Math.sin(this.time * 0.5) * 0.7 + 0.4;
  }

  reset() {
    this.blockedNodes.clear();
    this.blockedEdges.clear();
    this.clearCorridors();
    this.overrideCount = 0;
    this.yielded.clear();
    this.emergency = [];
  }

  dispose() {
    this.root.traverse((object) => {
      if (object.isCSS2DObject) object.element.remove();
      if (object.isMesh || object.isPoints || object.isLine || object.isSprite) {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material?.dispose());
      }
    });
    this.disposables.forEach((item) => item.dispose?.());
    this.scene.remove(this.root);
  }
}

function dedupe(points) {
  return points.filter((point, index) => index === 0 || point.distanceTo(points[index - 1]) > 0.5);
}
