import * as THREE from "three";
import { LANDMARKS, edgeKey, key, nodePos, spot, spotPos } from "./city";
import { PulseRing, fireSystem, makeBeam, Rain, smokeSystem, sparkSystem, waterJet } from "./effects";
import { makeCar, makeCone, makePerson } from "./vehicles";
import { makeStripeTexture } from "./textures";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const COLORS = { alert: 0xff3355, data: 0x38bdf8, ok: 0x22c55e, police: 0x60a5fa, warn: 0xf59e0b };

// Shorten a path so a vehicle stops `distance` before its final point.
function trimEnd(points, distance) {
  const out = points.map((p) => p.clone());
  let remaining = distance;
  while (out.length > 1 && remaining > 0) {
    const last = out[out.length - 1];
    const prev = out[out.length - 2];
    const length = last.distanceTo(prev);
    if (length > remaining + 0.5) {
      last.lerp(prev, remaining / length);
      remaining = 0;
    } else {
      out.pop();
      remaining -= length;
    }
  }
  return out;
}

const pathLength = (points) => points.reduce((sum, p, i) => (i ? sum + p.distanceTo(points[i - 1]) : 0), 0);

function etaText(ctx, points, kind) {
  const seconds = (pathLength(points) / ctx.speedOf(kind)) * 6 * 1.15;
  const m = Math.floor(seconds / 60);
  return m ? `${m} min ${Math.round(seconds % 60)} s` : `${Math.round(seconds)} s`;
}

function mid(a, b, y = 0) {
  return a.clone().add(b).multiplyScalar(0.5).setY(y);
}

function pulse(ctx, position, color, radius = 12) {
  const ring = ctx.add(new PulseRing(color, radius));
  ring.mesh.position.copy(position).setY(0.5);
  return ring;
}

function icccThinking(ctx, seconds) {
  const { iccc } = ctx.city.landmarks;
  return ctx.every((dt, elapsed) => {
    const t = elapsed / seconds;
    iccc.ringMaterial.color.setHSL(0.55 + Math.sin(elapsed * 9) * 0.05, 1, 0.55 + Math.sin(elapsed * 14) * 0.2);
    iccc.ring.rotation.z += dt * 6;
    if (t >= 1) iccc.ringMaterial.color.set(0x38bdf8);
    return t >= 1;
  });
}

function barricade(texture) {
  const group = new THREE.Group();
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 1.1, 11),
    new THREE.MeshStandardMaterial({ map: texture, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.5 })
  );
  bar.position.y = 1.6;
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x334155 });
  for (const z of [-4.5, 4.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.3), legMaterial);
    leg.position.set(0, 0.8, z);
    group.add(leg);
  }
  group.add(bar);
  return group;
}

function makeDrone() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 2.2), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
  group.add(body);
  const rotorMaterial = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.6 });
  for (const [x, z] of [[1.6, 1.6], [-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6]]) {
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.08, 16), rotorMaterial);
    rotor.position.set(x, 0.35, z);
    group.add(rotor);
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3355 }));
  eye.position.set(0, -0.4, 0);
  group.add(eye);
  return group;
}

// Walk people between points, staggered.
function walk(ctx, people, to, duration = 2.5, spread = 1.5) {
  return Promise.all(
    people.map((person, index) =>
      ctx.wait(index * 0.25).then(() =>
        ctx.tween(person, to.clone().add(V((Math.random() - 0.5) * spread, 0, (Math.random() - 0.5) * spread)), duration)
      )
    )
  );
}

/* =================================================================
   1. ROAD ACCIDENT — ambulance + police + green corridor
   ================================================================= */

async function runAccident(ctx) {
  const { city } = ctx;
  const hospitalSpot = LANDMARKS.hospital.spot;
  const accidentSpot = spot([1, 4], [2, 4]);
  const scene = spotPos(accidentSpot);
  const { iccc, hospital } = city.landmarks;

  ctx.stage(0);
  ctx.focus(V(0, 0, 0), 380);
  ctx.log("49 junctions, 312 cameras and 1,240 IoT sensors reporting normally");
  await ctx.wait(4);

  // 1 — collision
  ctx.stage(1);
  const carA = ctx.object(makeCar(0x0ea5e9));
  carA.position.copy(scene).add(V(-1.5, 0, -2.6));
  carA.rotation.y = 0.55;
  const carB = ctx.object(makeCar(0xf43f5e));
  carB.position.copy(scene).add(V(2.6, 0, -1.2));
  carB.rotation.y = 2.5;
  city.blockedEdges.add(edgeKey(accidentSpot.a, accidentSpot.b));
  const sparks = ctx.add(sparkSystem(scene));
  sparks.accumulator = 90;
  const smoke = ctx.add(smokeSystem(scene.clone().setY(0), 3, false));
  smoke.intensity = 0.5;
  pulse(ctx, scene, COLORS.alert, 16);
  const beam = ctx.object(makeBeam(COLORS.alert, 70));
  beam.position.copy(scene);
  const victims = [makePerson(0x94a3b8), makePerson(0x78716c)].map((person, index) => {
    ctx.object(person);
    person.position.copy(scene).add(V(-4 + index * 7, 0.2, 3.5));
    person.rotation.z = Math.PI / 2;
    return person;
  });
  city.cctv.coneMaterial.color.set(COLORS.alert);
  city.cctv.coneMaterial.opacity = 0.16;
  const tag = ctx.label("ACCIDENT", "Anna Salai · CAM-14", scene.clone().setY(16), "alert");
  ctx.focus(scene, 120);
  ctx.metric("detected", ctx.time);
  ctx.log("CAM-14 video analytics: two-vehicle collision (confidence 96%)", "alert");
  await ctx.wait(3.5);

  // 2 — relay to ICCC
  ctx.stage(2);
  ctx.focus(mid(scene, iccc.top, 30), 230);
  await ctx.packet(city.cctv.top, iccc.top, COLORS.alert, 2.2);
  ctx.log("Incident INC-2041 created at ICCC with snapshot + GPS", "info");

  // 3 — AI triage
  ctx.stage(3);
  ctx.focus(iccc.top.clone().setY(30), 150);
  await icccThinking(ctx, 1.6);
  ctx.log("AI triage: severity HIGH · 2 injured · 1 lane blocked", "ai");
  const outbound = city.route(hospitalSpot, accidentSpot);
  const ambulancePath = trimEnd(outbound.points, 9);
  const plannedRoute = ctx.ribbon(ambulancePath, COLORS.ok);
  ctx.log(`AI: AMB-07 (GGH) is the nearest free unit — ETA ${etaText(ctx, ambulancePath, "ambulance")}`, "ai");
  ctx.log(`AI: green corridor through ${outbound.nodes.length} junctions; P-12 for traffic control`, "ai");
  ctx.focus(mid(spotPos(hospitalSpot), scene, 0), 330);
  await ctx.wait(3);

  // 4 — approval
  ctx.stage(4);
  ctx.log("Response plan sent to Duty Officer for approval", "info");
  await ctx.wait(1.8);
  ctx.log("Plan APPROVED by Duty Officer · Shift B", "success");
  await ctx.wait(0.6);

  // 5 — dispatch
  ctx.stage(5);
  const ambulance = ctx.vehicle("ambulance", "AMB-07", ambulancePath[0]);
  ambulance.setPath(ambulancePath);
  ambulance.arrived = true;
  const policeRoute = city.route(LANDMARKS.police.spot, accidentSpot);
  const policePath = trimEnd(policeRoute.points, 20);
  const police = ctx.vehicle("police", "P-12", policePath[0]);
  police.setPath(policePath);
  police.arrived = true;
  await Promise.all([
    ctx.packet(iccc.top, hospital.label.position, COLORS.ok, 1.4),
    ctx.packet(iccc.top, city.landmarks.police.label.position, COLORS.police, 1.4),
  ]);
  hospital.canopyMaterial.emissiveIntensity = 2.5;
  ambulance.sirenOn = true;
  police.sirenOn = true;
  ctx.metric("dispatched", ctx.time);
  ctx.log("AMB-07 dispatched with siren", "action");
  ctx.log("P-12 dispatched to secure the scene", "action");
  ctx.log("Adaptive signals: green corridor ACTIVE", "action");
  city.addCorridor(ambulance, outbound.nodes);
  city.addCorridor(police, policeRoute.nodes);
  const ambulanceArrives = ctx.drive(ambulance, ambulancePath);
  const policeArrives = ctx.drive(police, policePath);
  ctx.focus(ambulance, 140);
  await ambulanceArrives;
  plannedRoute.fadeOut();
  ctx.metric("arrived", ctx.time);
  ctx.log(`AMB-07 on scene — response time ${duration(ctx.metrics.arrived - ctx.metrics.dispatched)}`, "success");

  // 6 — on scene
  ctx.stage(6);
  ctx.focus(scene, 70);
  const medics = [makePerson(0x22c55e), makePerson(0x22c55e)].map((person, index) => {
    ctx.object(person);
    person.position.copy(ambulance.position).add(V(index * 1.5, 0, 2.2));
    return person;
  });
  await walk(ctx, [medics[0]], victims[0].position.clone().add(V(0, 0, -1.5)), 2);
  await walk(ctx, [medics[1]], victims[1].position.clone().add(V(0, 0, -1.5)), 2);
  ctx.log("Paramedics triaging two patients · vitals streaming to GGH", "info");
  ctx.spawn(async () => {
    await policeArrives;
    ctx.log("P-12 on scene: lane cordoned, traffic diverted", "action");
    const base = police.position.clone();
    for (let i = 0; i < 4; i += 1) {
      const cone = ctx.object(makeCone());
      cone.position.copy(base).add(V((i - 1.5) * 3, 0, 4));
    }
  });
  await ctx.wait(3);
  smoke.intensity = 0.15;
  victims.forEach((victim) => {
    victim.rotation.z = 0;
  });
  await Promise.all([
    walk(ctx, [victims[0], medics[0]], ambulance.position, 2.2, 0.5),
    walk(ctx, [victims[1], medics[1]], ambulance.position, 2.6, 0.5),
  ]);
  [...victims, ...medics].forEach((person) => (person.visible = false));
  ctx.log("Patients loaded. ER pre-alert sent with ETA and vitals", "action");

  // 7 — transport
  ctx.stage(7);
  const back = city.route(accidentSpot, hospitalSpot);
  const backPath = back.points;
  backPath[0] = ambulance.position.clone();
  const returnRoute = ctx.ribbon(backPath, COLORS.ok);
  city.addCorridor(ambulance, back.nodes);
  ctx.focus(ambulance, 120);
  await ctx.drive(ambulance, backPath);
  returnRoute.fadeOut();
  ambulance.sirenOn = false;
  ctx.metric("hospital", ctx.time);

  // 8 — handover & closure
  ctx.stage(8);
  ctx.focus(hospital.door, 90);
  const stretcher = [makePerson(0x94a3b8), makePerson(0x22c55e)].map((person) => {
    ctx.object(person);
    person.position.copy(ambulance.position);
    return person;
  });
  await walk(ctx, stretcher, hospital.door, 2.4, 1);
  stretcher.forEach((person) => (person.visible = false));
  hospital.canopyMaterial.emissiveIntensity = 0.6;
  ctx.log("Patients handed over to GGH trauma team", "success");
  ctx.focus(scene, 110);
  await ctx.wait(1.5);
  [carA, carB, beam, tag].forEach((object) => ctx.remove(object));
  smoke.emitting = false;
  city.blockedEdges.clear();
  city.cctv.coneMaterial.color.set(COLORS.data);
  city.cctv.coneMaterial.opacity = 0.12;
  police.sirenOn = false;
  ctx.log("Wreckage cleared · road reopened · INC-2041 closed", "success");
  ctx.focus(V(0, 0, 0), 380);
  await ctx.wait(1);

  const m = ctx.metrics;
  ctx.finish([
    ["Detection → dispatch", duration(m.dispatched - m.detected)],
    ["Ambulance response time", duration(m.arrived - m.dispatched)],
    ["Patient at hospital", duration(m.hospital - m.detected)],
    ["Signals pre-empted", String(city.overrideCount)],
    ["Vehicles that gave way", String(city.yielded.size)],
  ]);
}

/* =================================================================
   2. BUILDING FIRE — fire tenders, drone, evacuation, ambulance
   ================================================================= */

async function runFire(ctx) {
  const { city } = ctx;
  const { iccc, hospital, tower } = city.landmarks;
  const fireSpot = LANDMARKS.fire.spot;
  const truckSpots = [spot([4, 3], [4, 4]), spot([4, 3], [5, 3])];
  const ambulanceSpot = spot([5, 3], [5, 4]);
  const centre = tower.centre;
  const flameA = V(centre.x - 7, 27, centre.z);
  const flameB = V(centre.x, 42, centre.z);

  ctx.stage(0);
  ctx.focus(V(0, 0, 0), 380);
  ctx.log("All districts normal · 214 smoke/heat sensors online");
  await ctx.wait(3.5);

  // 1 — fire starts
  ctx.stage(1);
  const fireA = ctx.add(fireSystem(flameA, 6));
  const fireB = ctx.add(fireSystem(flameB, 9));
  const smoke = ctx.add(smokeSystem(flameB, 10, true));
  fireA.intensity = 0.3;
  fireB.intensity = 0.2;
  smoke.intensity = 0.4;
  const fireLight = new THREE.PointLight(0xff6a00, 0, 90, 1.6);
  fireLight.position.copy(flameA).add(V(-6, 0, 0));
  ctx.object(fireLight);
  const windowOriginal = city.windowGlow.emissive.clone();
  ctx.spawn(() =>
    ctx.every((dt, elapsed) => {
      const grow = Math.min(1, elapsed / 6);
      fireA.intensity = Math.max(fireA.intensity, 0.3 + grow * 0.7);
      fireB.intensity = Math.max(fireB.intensity, 0.2 + grow * 0.8);
      smoke.intensity = Math.max(smoke.intensity, 0.4 + grow * 0.6);
      return grow >= 1;
    })
  );
  ctx.spawn(() =>
    ctx.every((dt, elapsed) => {
      const strength = Math.max(fireA.intensity, fireB.intensity);
      fireLight.intensity = strength * (2600 + Math.sin(elapsed * 23) * 600);
      city.windowGlow.emissive.setRGB(1, 0.55 + 0.45 * (1 - strength), 0.35 + 0.65 * (1 - strength));
      city.windowGlow.emissiveIntensity = 0.85 + strength * (1.2 + Math.sin(elapsed * 17) * 0.3);
      return ctx.metrics?.extinguished;
    })
  );
  pulse(ctx, centre, COLORS.alert, 22);
  const tag = ctx.label("FIRE", "Residential Tower · floors 9–11", centre.clone().setY(56), "alert");
  ctx.focus(centre.clone().setY(18), 130);
  ctx.metric("detected", ctx.time);
  ctx.log("Smoke sensor SMK-4471: obscuration 18%/m · heat sensor 74 °C", "alert");
  await ctx.wait(3);

  // 2 — relay + drone confirmation
  ctx.stage(2);
  ctx.focus(mid(centre, iccc.top, 30), 220);
  await ctx.packet(flameB, iccc.top, COLORS.alert, 2);
  ctx.log("Alarm received at ICCC · auto-call from building fire panel", "info");
  const drone = ctx.object(makeDrone());
  drone.position.copy(iccc.top).add(V(0, 6, 0));
  ctx.log("Drone DR-3 launched for thermal confirmation", "action");
  ctx.focus(drone, 120);
  await ctx.tween(drone, V(centre.x + 28, 52, centre.z - 20), 3.2, { arc: 10 });
  ctx.log("Thermal: 3 hotspots · peak 612 °C · spread upward", "alert");
  ctx.spawn(() =>
    ctx.every((dt, elapsed) => {
      drone.position.x = centre.x + Math.cos(elapsed * 0.6) * 30;
      drone.position.z = centre.z + Math.sin(elapsed * 0.6) * 30;
      drone.rotation.y = -elapsed * 0.6;
      return !drone.parent;
    })
  );

  // 3 — AI plan
  ctx.stage(3);
  ctx.focus(iccc.top.clone().setY(30), 160);
  await icccThinking(ctx, 1.6);
  ctx.log("AI: Class A structural fire · est. 38 occupants on floors 9–14", "ai");
  const truckRoutes = truckSpots.map((target) => city.route(fireSpot, target));
  const truckPaths = truckRoutes.map((route, index) => trimEnd(route.points, 6 + index * 2));
  const ambulanceRoute = city.route(LANDMARKS.hospital.spot, ambulanceSpot);
  const ribbons = [
    ...truckPaths.map((path) => ctx.ribbon(path, COLORS.warn)),
    ctx.ribbon(ambulanceRoute.points, COLORS.ok),
  ];
  ctx.log(`AI: dispatch FT-1 & FT-2 (ETA ${etaText(ctx, truckPaths[0], "fire")}) + AMB-03 on standby`, "ai");
  ctx.log("AI: evacuate tower, 60 m safety cordon, assembly point at NW corner", "ai");
  const cordon = pulse(ctx, centre, COLORS.warn, 1);
  cordon.update = () => {};
  cordon.mesh.scale.setScalar(40);
  cordon.material.opacity = 0.6;
  ctx.focus(mid(spotPos(fireSpot), centre, 0), 340);
  await ctx.wait(3);

  // 4 — approval
  ctx.stage(4);
  ctx.log("Plan sent to Duty Officer for approval", "info");
  await ctx.wait(1.6);
  ctx.log("Plan APPROVED · Fire control room notified", "success");

  // 5 — dispatch + evacuation
  ctx.stage(5);
  const trucks = truckPaths.map((path, index) => {
    const truck = ctx.vehicle("fire", `FT-${index + 1}`, path[0]);
    truck.setPath(path);
    truck.arrived = true;
    return truck;
  });
  const ambulance = ctx.vehicle("ambulance", "AMB-03", ambulanceRoute.points[0]);
  await Promise.all([
    ctx.packet(iccc.top, V(-120, 30, -72), COLORS.warn, 1.4),
    ctx.packet(iccc.top, hospital.label.position, COLORS.ok, 1.4),
  ]);
  city.landmarks.fire.doorMaterial.emissiveIntensity = 3;
  ctx.metric("dispatched", ctx.time);
  const arrivals = trucks.map((truck, index) => {
    truck.sirenOn = true;
    city.addCorridor(truck, truckRoutes[index].nodes);
    return ctx.drive(truck, truckPaths[index]);
  });
  ambulance.sirenOn = true;
  city.addCorridor(ambulance, ambulanceRoute.nodes);
  const ambulanceArrives = ctx.drive(ambulance, ambulanceRoute.points);
  ctx.log("FT-1, FT-2 and AMB-03 dispatched · corridor active", "action");
  ctx.log("Building PA + SMS: evacuate via stairwells B and C", "action");

  const assembly = centre.clone().add(V(-13, 0.6, -13));
  const assemblyRing = pulse(ctx, assembly, COLORS.ok, 6);
  assemblyRing.period = 2.4;
  const evacuees = Array.from({ length: 12 }, (_, index) => {
    const person = ctx.object(makePerson([0xf1f5f9, 0xfacc15, 0x60a5fa, 0xf472b6][index % 4]));
    person.position.copy(centre).add(V(-8.5, 0.6, (index % 6) - 3));
    person.visible = false;
    return person;
  });
  ctx.spawn(async () => {
    for (const person of evacuees) {
      person.visible = true;
      ctx.spawn(() => ctx.tween(person, assembly.clone().add(V(Math.random() * 6 - 3, 0, Math.random() * 6 - 3)), 3.5));
      await ctx.wait(0.45);
    }
    ctx.log("Evacuation: 38 of 38 occupants at assembly point", "success");
  });
  ctx.focus(trucks[0], 150);
  await Promise.all(arrivals);
  ribbons.slice(0, 2).forEach((ribbon) => ribbon.fadeOut());
  ctx.metric("arrived", ctx.time);
  ctx.log(`Fire tenders on scene — response time ${duration(ctx.metrics.arrived - ctx.metrics.dispatched)}`, "success");

  // 6 — firefighting
  ctx.stage(6);
  ctx.focus(centre.clone().setY(20), 120);
  const jets = trucks.map((truck, index) => {
    truck.sirenOn = false;
    const nozzle = truck.position.clone().add(V(0, 8, 0));
    return ctx.add(waterJet(nozzle, index === 0 ? flameA : flameB.clone().add(V(0, -6, -6))));
  });
  await Promise.all(
    trucks.map((truck) =>
      ctx.every((dt, elapsed) => {
        truck.model.ladder.rotation.z = Math.min(0.6, elapsed * 0.4);
        return elapsed > 1.5;
      })
    )
  );
  ctx.log("Aerial ladder deployed · 2 water jets on floors 9–11", "action");
  let announced = 0;
  await ctx.every((dt, elapsed) => {
    const remaining = Math.max(0, 1 - elapsed / 12);
    fireA.intensity = remaining;
    fireB.intensity = remaining * 0.9;
    smoke.intensity = 0.3 + remaining * 0.7;
    const contained = Math.round((1 - remaining) * 100);
    if (contained >= 50 && announced < 50) {
      announced = 50;
      ctx.log("Fire 50% contained", "info");
    }
    return remaining <= 0;
  });
  jets.forEach((jet) => (jet.emitting = false));
  ctx.metric("extinguished", ctx.time);
  city.windowGlow.emissive.copy(windowOriginal);
  city.windowGlow.emissiveIntensity = 0.3;
  fireLight.intensity = 0;
  ctx.log("Fire extinguished · damping down", "success");

  // 7 — casualties to hospital
  ctx.stage(7);
  await ambulanceArrives;
  ambulance.sirenOn = false;
  const patients = evacuees.slice(0, 2);
  ctx.focus(ambulance, 80);
  await walk(ctx, patients, ambulance.position, 2.5, 0.5);
  patients.forEach((person) => (person.visible = false));
  ctx.log("2 occupants with smoke inhalation loaded into AMB-03", "action");
  const back = city.route(ambulanceSpot, LANDMARKS.hospital.spot);
  ambulance.sirenOn = true;
  city.addCorridor(ambulance, back.nodes);
  await ctx.drive(ambulance, back.points);
  ambulance.sirenOn = false;
  ribbons[2].fadeOut();
  ctx.metric("hospital", ctx.time);
  ctx.log("Patients admitted at GGH", "success");

  // 8 — all clear
  ctx.stage(8);
  ctx.focus(centre.clone().setY(10), 150);
  smoke.emitting = false;
  fireA.emitting = false;
  fireB.emitting = false;
  ctx.removeEffect(cordon);
  ctx.remove(drone);
  ctx.remove(tag);
  ctx.log("Structural check passed · residents allowed back", "success");
  await walk(ctx, evacuees.slice(2), centre.clone().add(V(-8.5, 0.6, 0)), 3.5, 4);
  evacuees.forEach((person) => (person.visible = false));
  ctx.focus(V(0, 0, 0), 380);
  await ctx.wait(1);

  const m = ctx.metrics;
  ctx.finish([
    ["Detection → dispatch", duration(m.dispatched - m.detected)],
    ["Fire tender response", duration(m.arrived - m.dispatched)],
    ["Fire under control", duration(m.extinguished - m.detected)],
    ["Occupants evacuated", "38 / 38"],
    ["Signals pre-empted", String(city.overrideCount)],
  ]);
}

/* =================================================================
   3. URBAN FLOOD — rain, sensors, road closures, re-routing, rescue
   ================================================================= */

async function runFlood(ctx) {
  const { city } = ctx;
  const { iccc } = city.landmarks;
  const floodNodes = [key(1, 4), key(2, 4), key(1, 5), key(2, 5)];
  const basin = V(-72, 0, 72);
  const campSpot = spot([0, 5], [0, 6]);
  const hospitalSpot = LANDMARKS.hospital.spot;

  // Water body (rises / recedes)
  const water = ctx.object(
    new THREE.Mesh(
      new THREE.PlaneGeometry(132, 132),
      new THREE.MeshStandardMaterial({
        color: 0x1f6fb5, emissive: 0x0b3b66, emissiveIntensity: 0.7, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0,
      })
    )
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(basin.x, -0.5, basin.z);
  const rain = ctx.add(new Rain());

  // Water-level sensor with a filling gauge
  const sensorBase = nodePos(2, 3).add(V(-8, 0, 9));
  const gauge = ctx.object(new THREE.Group());
  gauge.position.copy(sensorBase);
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 12, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
  );
  tube.position.y = 6;
  const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false });
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 12), fillMaterial);
  fill.position.y = 0.5;
  fill.scale.y = 0.6;
  gauge.add(tube, fill);
  const setLevel = (level) => {
    fill.scale.y = Math.max(0.2, level * 12);
    fill.position.y = fill.scale.y / 2;
    fillMaterial.color.set(level > 0.7 ? 0xff3355 : level > 0.45 ? 0xf59e0b : 0x38bdf8);
  };
  setLevel(0.08);

  ctx.stage(0);
  ctx.focus(V(-30, 0, 30), 380);
  ctx.log("Velachery basin: water level 0.08 m · 18 rain gauges online");
  await ctx.wait(3);

  // 1 — heavy rain
  ctx.stage(1);
  ctx.log("IMD feed: extremely heavy rainfall — 64 mm/hr over South Chennai", "alert");
  await ctx.every((dt, elapsed) => {
    const t = Math.min(1, elapsed / 3);
    rain.intensity = t;
    ctx.scene.fog.density = 0.0016 + t * 0.0016;
    return t >= 1;
  });

  // 2 — water rising
  ctx.stage(2);
  ctx.focus(basin, 200);
  const sensorTag = ctx.label("WLS-VEL-02", "Water level sensor", sensorBase.clone().setY(16), "data");
  let level = 0.08;
  await ctx.every((dt, elapsed) => {
    const t = Math.min(1, elapsed / 7);
    level = 0.08 + t * 0.82;
    water.position.y = -0.5 + t * 2.2;
    water.material.opacity = Math.min(0.78, t * 1.6);
    setLevel(level);
    return t >= 1;
  });
  ctx.log("WLS-VEL-02: 0.9 m and rising 4 cm/min — CRITICAL", "alert");
  await ctx.packet(sensorBase.clone().setY(12), iccc.top, COLORS.data, 1.8);
  ctx.metric("detected", ctx.time);

  // 3 — AI prediction
  ctx.stage(3);
  ctx.focus(iccc.top.clone().setY(30), 160);
  await icccThinking(ctx, 1.6);
  ctx.log("ML flood model: 1.2 m within 40 min (confidence 87%)", "ai");
  ctx.log("AI: 4 junctions impassable · 3 residents stranded on a rooftop", "ai");
  ctx.log("AI: close roads, re-route traffic, dispatch pumps + rescue boat", "ai");
  const warnings = floodNodes.map((k) => pulse(ctx, nodePos(...unkeyLocal(k)), COLORS.alert, 9));
  ctx.focus(basin, 230);
  await ctx.wait(2.5);

  // 4 — approval
  ctx.stage(4);
  ctx.log("Flood response plan sent for approval", "info");
  await ctx.wait(1.6);
  ctx.log("Plan APPROVED · Disaster Management Cell notified", "success");

  // 5 — close roads, alert citizens
  ctx.stage(5);
  warnings.forEach((ring) => ctx.removeEffect(ring));
  const stripes = makeStripeTexture();
  floodNodes.forEach((k) => city.blockedNodes.add(k));
  const flooded = new Set(floodNodes);
  const barrierObjects = [];
  for (const k of floodNodes) {
    const [i, j] = unkeyLocal(k);
    for (const [ni, nj] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
      if (ni < 0 || nj < 0 || ni > 6 || nj > 6 || flooded.has(key(ni, nj))) continue;
      const from = nodePos(ni, nj);
      const to = nodePos(i, j);
      const barrier = ctx.object(barricade(stripes));
      barrier.position.copy(from.clone().lerp(to, 0.25));
      barrier.rotation.y = ni !== i ? 0 : Math.PI / 2;
      barrierObjects.push(barrier);
    }
  }
  const barriers = barrierObjects.length;
  ctx.log(`${barriers} barricades placed · traffic re-routed around the basin`, "action");
  const broadcast = ctx.add(new PulseRing(COLORS.warn, 120, 2.5));
  broadcast.mesh.position.copy(iccc.top).setY(2);
  ctx.log("Cell broadcast sent to 18,400 phones in Velachery & Adyar", "action");
  ctx.focus(V(-30, 0, 20), 330);
  await ctx.wait(3);
  ctx.removeEffect(broadcast);

  // 6 — ambulance re-routing
  ctx.stage(6);
  const naiveNodes = [key(5, 2), key(5, 3), key(5, 4), key(5, 5), key(4, 5), key(3, 5), key(2, 5), key(1, 5), key(0, 5)];
  const naive = city.pathFromNodes(hospitalSpot, naiveNodes, campSpot);
  const naiveRibbon = ctx.ribbon(naive.points, COLORS.alert);
  const blockedTag = ctx.label("ROUTE FLOODED", "Shortest path blocked", nodePos(1, 5).setY(10), "alert");
  ctx.log("Medical call: dialysis patient at Velachery relief camp", "alert");
  ctx.log("Shortest route crosses flooded junctions — rejected", "ai");
  ctx.focus(V(-10, 0, 70), 320);
  await ctx.wait(2.5);
  naiveRibbon.fadeOut();
  ctx.remove(blockedTag);
  const safe = city.route(hospitalSpot, campSpot);
  const safeRibbon = ctx.ribbon(safe.points, COLORS.ok);
  ctx.log(`Safe route computed around ${floodNodes.length} flooded junctions — ETA ${etaText(ctx, safe.points, "ambulance")}`, "ai");
  const ambulance = ctx.vehicle("ambulance", "AMB-11", safe.points[0]);
  ambulance.sirenOn = true;
  city.addCorridor(ambulance, safe.nodes);
  ctx.metric("dispatched", ctx.time);
  const ambulanceArrives = ctx.drive(ambulance, safe.points);

  // Pumps and rescue boat roll out at the same time.
  const pumpTargets = [spot([1, 3], [2, 3]), spot([3, 4], [3, 5])];
  const pumpRoutes = pumpTargets.map((target) => city.route(LANDMARKS.fire.spot, target));
  const pumps = pumpRoutes.map((route, index) => {
    const pump = ctx.vehicle("pump", `PUMP-${index + 1}`, route.points[0]);
    pump.sirenOn = true;
    return pump;
  });
  const pumpArrivals = pumps.map((pump, index) => ctx.drive(pump, trimEnd(pumpRoutes[index].points, 4)));
  ctx.log("AMB-11, PUMP-1 and PUMP-2 dispatched", "action");
  ctx.focus(ambulance, 150);
  await ambulanceArrives;
  safeRibbon.fadeOut();
  ctx.metric("arrived", ctx.time);
  ctx.log(`AMB-11 reached the camp via safe route — ${duration(ctx.metrics.arrived - ctx.metrics.dispatched)}`, "success");
  const patient = ctx.object(makePerson(0x94a3b8));
  patient.position.copy(ambulance.position).add(V(-6, 0.6, 0));
  await ctx.tween(patient, ambulance.position.clone(), 1.8);
  patient.visible = false;

  ctx.spawn(async () => {
    const back = city.route(campSpot, hospitalSpot);
    city.addCorridor(ambulance, back.nodes);
    await ctx.drive(ambulance, back.points);
    ambulance.sirenOn = false;
    ctx.metric("hospital", ctx.time);
    ctx.log("Dialysis patient admitted at GGH", "success");
  });

  // 7 — rooftop rescue + pumping
  ctx.stage(7);
  const roof = city.landmarks.homes[0];
  const roofTop = roof.position.clone().setY(roof.position.y + roof.geometry.parameters.height / 2);
  const stranded = [0, 1, 2].map((index) => {
    const person = ctx.object(makePerson([0xfacc15, 0xf472b6, 0xf1f5f9][index]));
    person.position.copy(roofTop).add(V(index * 1.6 - 1.6, 0, 0));
    return person;
  });
  const rescueTag = ctx.label("3 STRANDED", "Rooftop · Velachery", roofTop.clone().setY(roofTop.y + 9), "alert");
  const landing = V(-48, water.position.y, 8);
  const boat = ctx.vehicle("boat", "NDRF-B2", landing);
  boat.group.position.y = water.position.y;
  boat.sirenOn = true;
  const y = water.position.y;
  ctx.focus(boat, 110);
  ctx.log("NDRF rescue boat B2 launched from Velachery Main Rd", "action");
  await ctx.drive(boat, [landing, V(-48, y, 48), V(-62, y, 50)]);
  ctx.focus(roofTop, 70);
  for (const person of stranded) {
    await ctx.tween(person, boat.position.clone().add(V(0, 1, 0)), 1.1, { arc: 2 });
    person.visible = false;
  }
  ctx.remove(rescueTag);
  ctx.log("3 residents rescued from rooftop", "success");
  ctx.focus(boat, 110);
  await ctx.drive(boat, [boat.position.clone(), V(-48, y, 48), V(-48, y, 9)]);
  boat.sirenOn = false;
  const ashore = stranded.map((person) => {
    person.visible = true;
    person.position.copy(boat.position).setY(0.6);
    return person;
  });
  await walk(ctx, ashore, V(-40, 0.6, -6), 2.4, 3);
  ctx.metric("rescued", ctx.time);

  await Promise.all(pumpArrivals);
  pumps.forEach((pump) => (pump.sirenOn = false));
  ctx.focus(basin, 230);
  const outflows = pumps.map((pump) =>
    ctx.add(waterJet(pump.position.clone().add(V(0, 4, 0)), pump.position.clone().add(V(pump === pumps[0] ? 0 : 22, 0, pump === pumps[0] ? -22 : 0))))
  );
  ctx.log("High-capacity pumps running · 2 × 50 HP", "action");
  await ctx.every((dt, elapsed) => {
    const t = Math.min(1, elapsed / 10);
    rain.intensity = 1 - t;
    ctx.scene.fog.density = 0.0032 - t * 0.0016;
    water.position.y = 1.7 - t * 2.2;
    water.material.opacity = Math.max(0, 0.78 * (1 - t * 1.1));
    setLevel(0.9 - t * 0.8);
    return t >= 1;
  });
  outflows.forEach((jet) => (jet.emitting = false));
  ctx.metric("drained", ctx.time);

  // 8 — roads reopened
  ctx.stage(8);
  water.visible = false;
  city.blockedNodes.clear();
  ctx.remove(sensorTag);
  barrierObjects.forEach((barrier) => ctx.remove(barrier));
  ctx.log("Water level 0.1 m · all 4 junctions reopened", "success");
  ctx.focus(V(-30, 0, 30), 380);
  await ctx.wait(2);

  const m = ctx.metrics;
  ctx.finish([
    ["Sensor alert → road closure", duration((m.dispatched ?? m.detected) - m.detected)],
    ["Ambulance via safe route", duration(m.arrived - m.dispatched)],
    ["Rooftop rescue complete", duration(m.rescued - m.detected)],
    ["Basin drained", duration(m.drained - m.detected)],
    ["Barricades deployed", String(barriers)],
  ]);
}

function unkeyLocal(k) {
  return [Math.floor(k / 7), k % 7];
}

function duration(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}


/* =================================================================
   CATALOGUE
   ================================================================= */

export const SCENARIOS = {
  accident: {
    id: "accident",
    title: "Road Accident",
    subtitle: "Ambulance dispatch · green corridor · police cordon",
    color: "#ef4444",
    run: runAccident,
    stages: [
      { title: "City operating normally", system: "ICCC Monitoring", desc: "Traffic, signals and IoT sensors stream into the ICCC digital twin in real time." },
      { title: "Collision detected", system: "CCTV + AI Vision", desc: "Camera CAM-14 flags a two-vehicle collision using on-edge video analytics." },
      { title: "Alert relayed to ICCC", system: "IoT / 5G Network", desc: "The event, a snapshot and the GPS location reach the command centre in under 2 seconds." },
      { title: "AI triage & route planning", system: "ICCC AI Agent", desc: "Severity is classified, the nearest free ambulance selected and the fastest route computed." },
      { title: "Operator approval", system: "Human-in-the-loop", desc: "The duty officer reviews the AI plan. Nothing is executed without approval." },
      { title: "Dispatch & green corridor", system: "Dispatch + Adaptive Signals", desc: "Signals ahead of the ambulance turn green and traffic pulls over to the kerb." },
      { title: "On-scene response", system: "Paramedics + Traffic Police", desc: "Paramedics stabilise patients while police cordon the lane and divert traffic." },
      { title: "Transport to hospital", system: "Green Corridor + Hospital Link", desc: "The ER is pre-alerted with vitals while the ambulance returns on a fresh corridor." },
      { title: "Handover & incident closed", system: "ICCC Incident Log", desc: "Patients handed to the trauma team, road reopened, report closed." },
    ],
  },
  fire: {
    id: "fire",
    title: "Building Fire",
    subtitle: "Smoke sensors · drone recon · fire tenders · evacuation",
    color: "#f97316",
    run: runFire,
    stages: [
      { title: "City operating normally", system: "ICCC Monitoring", desc: "Smoke and heat sensors in high-rise buildings report to the ICCC." },
      { title: "Smoke & heat detected", system: "IoT Smoke / Heat Sensors", desc: "A building sensor crosses its alarm threshold on floor 10." },
      { title: "Alarm relayed + drone recon", system: "Fire Panel + Thermal Drone", desc: "ICCC receives the alarm and launches a drone to confirm with thermal imaging." },
      { title: "AI response plan", system: "ICCC AI Agent", desc: "Fire class, occupancy and spread are estimated; units, routes and a cordon are planned." },
      { title: "Operator approval", system: "Human-in-the-loop", desc: "The duty officer approves the plan and the fire control room is notified." },
      { title: "Dispatch & evacuation", system: "Dispatch + Public Address", desc: "Fire tenders and an ambulance roll out on green corridors while residents evacuate." },
      { title: "Firefighting", system: "Fire & Rescue Services", desc: "Aerial ladders deploy and water jets bring the fire under control." },
      { title: "Casualty transport", system: "Ambulance + Hospital Link", desc: "Occupants with smoke inhalation are taken to hospital." },
      { title: "All clear", system: "ICCC Incident Log", desc: "Structure checked, residents return, incident closed." },
    ],
  },
  flood: {
    id: "flood",
    title: "Urban Flood",
    subtitle: "Rain gauges · ML forecast · road closures · boat rescue",
    color: "#38bdf8",
    run: runFlood,
    stages: [
      { title: "City operating normally", system: "ICCC Monitoring", desc: "Rain gauges and water-level sensors watch flood-prone basins like Velachery." },
      { title: "Extremely heavy rainfall", system: "IMD Feed + Rain Gauges", desc: "Rainfall intensity jumps past 60 mm/hr over South Chennai." },
      { title: "Water level rising", system: "Water-level Sensors", desc: "Basin sensors report a fast rise and push critical alerts to the ICCC." },
      { title: "AI flood forecast", system: "ML Flood Model + AI Agent", desc: "The model forecasts peak depth and flags junctions that will become impassable." },
      { title: "Operator approval", system: "Human-in-the-loop", desc: "The duty officer approves road closures and the rescue plan." },
      { title: "Close roads & alert citizens", system: "Traffic Control + Cell Broadcast", desc: "Barricades go up, navigation re-routes traffic, and residents get SMS alerts." },
      { title: "Ambulance re-routed", system: "Dynamic Routing", desc: "The shortest route is flooded, so the ambulance is sent on a safe alternate route." },
      { title: "Rooftop rescue & pumping", system: "NDRF + Pump Units", desc: "A boat rescues stranded residents while high-capacity pumps drain the basin." },
      { title: "Roads reopened", system: "ICCC Incident Log", desc: "Water recedes below the safe level and junctions reopen." },
    ],
  },
};
