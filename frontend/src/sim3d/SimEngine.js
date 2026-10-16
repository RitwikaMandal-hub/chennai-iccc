import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { City } from "./city";
import { Packet, RouteRibbon } from "./effects";
import {
  EmergencyVehicle, makeAmbulance, makeBoat, makeFireTruck, makePolice, makePumpTruck,
} from "./vehicles";
import { SCENARIOS } from "./scenarios";

const CANCELLED = Symbol("cancelled");

// One simulated second = 6 seconds of "city time" on the mission clock.
export const TIME_SCALE = 6;

export function formatClock(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

const VEHICLES = {
  ambulance: { make: makeAmbulance, speed: 26, light: true },
  fire: { make: makeFireTruck, speed: 22, light: true },
  police: { make: makePolice, speed: 27, light: true },
  pump: { make: makePumpTruck, speed: 18, light: false },
  boat: { make: makeBoat, speed: 9, light: false },
};

export class SimEngine {
  constructor(container, { onChange } = {}) {
    this.container = container;
    this.onChange = onChange;
    this.speed = 1;
    this.playing = true;
    this.cameraMode = "auto";
    this.simTime = 0;
    this.lastEmit = 0;
    this.objects = [];
    this.effects = [];
    this.tasks = [];
    this.waiters = [];

    const narrow = window.matchMedia("(max-width: 900px)").matches;
    this.quality = narrow || (navigator.hardwareConcurrency || 8) <= 4 ? "low" : "high";

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: this.quality === "high", powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === "high" ? 2 : 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = "sim-label-layer";
    container.appendChild(this.labels.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050a12);
    this.baseFog = 0.0016;
    this.scene.fog = new THREE.FogExp2(0x060b14, this.baseFog);

    this.scene.add(new THREE.HemisphereLight(0x9fbfff, 0x1a2230, 1.6));
    const moon = new THREE.DirectionalLight(0xa9c1ff, 1.3);
    moon.position.set(-160, 260, 120);
    this.scene.add(moon);
    this.scene.add(new THREE.AmbientLight(0x2a3a55, 1.0));
    this.addStars();

    // Fixed pool of siren lights: adding lights mid-run would force every
    // material to recompile, so vehicles borrow from this pool instead.
    this.lightPool = Array.from({ length: 4 }, () => {
      const light = new THREE.PointLight(0xff0000, 0, 40, 2);
      this.scene.add(light);
      return light;
    });

    // Camera + controls
    this.camera = new THREE.PerspectiveCamera(48, 1, 1, 3000);
    this.camera.position.set(250, 230, 300);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = 1.35;
    this.controls.minDistance = 30;
    this.controls.maxDistance = 750;
    this.controls.autoRotateSpeed = 0.35;
    this.controls.addEventListener("start", () => {
      if (this.cameraMode === "auto") this.setCameraMode("free");
    });
    this.focusTarget = new THREE.Vector3();
    this.focusDistance = 380;

    // Post-processing (desktop only)
    if (this.quality === "high") {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.55, 0.78);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }

    this.resize = this.resize.bind(this);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.resize();

    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this);
    this.frame = requestAnimationFrame(this.loop);
  }

  addStars() {
    const positions = [];
    for (let i = 0; i < 900; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.42;
      const r = 1400;
      positions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    this.stars = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0x9fb7ff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false })
    );
    this.scene.add(this.stars);
  }

  resize() {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labels.setSize(width, height);
    this.composer?.setSize(width, height);
    if (this.bloom) this.bloom.resolution.set(width / 2, height / 2);
    // Pull the camera back on portrait phones so the whole city fits.
    this.portrait = height > width;
  }

  /* ---------------------------------------------------------------
     SCENARIO LIFECYCLE
     --------------------------------------------------------------- */

  start(scenarioId) {
    this.cancelScenario();
    this.scenario = SCENARIOS[scenarioId] || SCENARIOS.accident;
    this.city = new City(this.scene, { quality: this.quality });
    this.simTime = 0;
    this.stageIndex = 0;
    this.logs = [];
    this.metrics = {};
    this.summary = null;
    this.finished = false;
    this.playing = true;
    this.runId = (this.runId || 0) + 1;
    this.setCameraMode("auto");
    this.camera.position.set(this.portrait ? 330 : 250, this.portrait ? 380 : 230, this.portrait ? 420 : 300);

    const runId = this.runId;
    this.scenario
      .run(this.context())
      .catch((error) => {
        if (error !== CANCELLED) console.error("Scenario error:", error);
      })
      .finally(() => {
        if (runId === this.runId) this.emit(true);
      });
    this.emit(true);
  }

  cancelScenario() {
    this.waiters.forEach((waiter) => waiter.reject(CANCELLED));
    this.waiters = [];
    this.tasks = [];
    this.effects.forEach((effect) => this.disposeEffect(effect));
    this.effects = [];
    this.objects.forEach((object) => this.disposeObject(object));
    this.objects = [];
    this.lightPool?.forEach((light) => {
      light.intensity = 0;
      light.userData.busy = false;
    });
    this.city?.dispose();
    this.city = null;
    this.scene.fog.density = this.baseFog;
  }

  restart() {
    this.start(this.scenario.id);
  }

  setSpeed(speed) {
    this.speed = speed;
    this.emit(true);
  }

  togglePlay() {
    this.playing = !this.playing;
    this.emit(true);
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    this.controls.autoRotate = mode === "auto";
    this.emit(true);
  }

  /* ---------------------------------------------------------------
     SCENARIO CONTEXT — the API scenario scripts are written against
     --------------------------------------------------------------- */

  context() {
    const engine = this;
    const ctx = {
      THREE,
      get city() {
        return engine.city;
      },
      get time() {
        return engine.simTime * TIME_SCALE;
      },
      get scene() {
        return engine.scene;
      },
      get metrics() {
        return engine.metrics;
      },

      stage(index) {
        engine.stageIndex = index;
        const stage = engine.scenario.stages[index];
        engine.pushLog(stage.title, "stage");
        engine.emit(true);
      },

      log(text, kind = "info") {
        engine.pushLog(text, kind);
      },

      metric(name, value) {
        engine.metrics[name] = value;
        engine.emit(true);
      },

      wait(seconds) {
        const until = engine.simTime + seconds;
        return new Promise((resolve, reject) => engine.waiters.push({ test: () => engine.simTime >= until, resolve, reject }));
      },

      until(test) {
        return new Promise((resolve, reject) => engine.waiters.push({ test, resolve, reject }));
      },

      focus(target, distance = 160) {
        engine.focus = target;
        const clamped = Math.max(100, distance);
        engine.focusDistance = engine.portrait ? clamped * 1.45 : clamped;
      },

      object(object) {
        engine.scene.add(object);
        engine.objects.push(object);
        return object;
      },

      remove(object) {
        engine.objects = engine.objects.filter((item) => item !== object);
        engine.disposeObject(object);
      },

      add(effect) {
        engine.scene.add(effect.mesh || effect.points || effect.group);
        engine.effects.push(effect);
        return effect;
      },

      removeEffect(effect) {
        engine.effects = engine.effects.filter((item) => item !== effect);
        engine.disposeEffect(effect);
      },

      // Run fn(dt, elapsed) every frame until it returns true.
      every(fn) {
        return new Promise((resolve, reject) => {
          const task = { fn, elapsed: 0, done: false };
          engine.tasks.push(task);
          engine.waiters.push({ test: () => task.done, resolve, reject });
        });
      },

      // Fire-and-forget sub-sequence that is silently dropped on restart.
      spawn(fn) {
        fn().catch((error) => {
          if (error !== CANCELLED) console.error("Scenario task error:", error);
        });
      },

      tween(object, to, duration, { arc = 0 } = {}) {
        const from = object.position.clone();
        return ctx.every((dt, elapsed) => {
          const t = Math.min(1, elapsed / duration);
          const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
          object.position.lerpVectors(from, to, eased);
          object.position.y += Math.sin(Math.PI * t) * arc;
          return t >= 1;
        });
      },

      packet(from, to, color, duration = 1.8) {
        const packet = ctx.add(new Packet(from, to, color, duration));
        return ctx.until(() => packet.time >= packet.duration);
      },

      ribbon(points, color) {
        return ctx.add(new RouteRibbon(points, color));
      },

      vehicle(kind, label, position) {
        const spec = VEHICLES[kind];
        const model = spec.make();
        const light = spec.light ? engine.lightPool.find((item) => !item.userData.busy) : null;
        if (light) light.userData.busy = true;
        const vehicle = new EmergencyVehicle({ kind, label, model, speed: spec.speed, light });
        if (position) vehicle.group.position.copy(position);
        ctx.add(vehicle);
        if (kind !== "boat") engine.city.emergency.push(vehicle);
        const tag = document.createElement("div");
        tag.className = `sim-tag sim-tag-${kind}`;
        tag.textContent = label;
        const tagObject = new CSS2DObject(tag);
        tagObject.position.set(0, kind === "boat" ? 5 : 7, 0);
        vehicle.group.add(tagObject);
        return vehicle;
      },

      drive(vehicle, points) {
        vehicle.setPath(points);
        return ctx.until(() => vehicle.arrived);
      },

      label(text, sub, position, tone) {
        return ctx.object(engine.makeLabel(text, sub, position, tone));
      },

      finish(summary) {
        engine.summary = summary;
        engine.finished = true;
        engine.pushLog("Scenario complete", "success");
        engine.emit(true);
      },

      speedOf: (kind) => VEHICLES[kind].speed,
    };
    return ctx;
  }

  makeLabel(text, sub, position, tone = "default") {
    const element = document.createElement("div");
    element.className = `sim-label sim-label-${tone}`;
    element.innerHTML = `<strong>${text}</strong>${sub ? `<span>${sub}</span>` : ""}`;
    const object = new CSS2DObject(element);
    object.position.copy(position);
    return object;
  }

  pushLog(text, kind) {
    this.logs = [...this.logs, { id: this.logs.length, time: this.simTime * TIME_SCALE, text, kind }].slice(-60);
    this.emit(true);
  }

  disposeObject(object) {
    this.scene.remove(object);
    object.traverse?.((child) => {
      if (child.isCSS2DObject) child.element.remove();
      if (child.geometry) child.geometry.dispose();
      if (child.material) [].concat(child.material).forEach((material) => material.dispose());
    });
  }

  disposeEffect(effect) {
    const object = effect.mesh || effect.points || effect.group;
    this.scene.remove(object);
    object.traverse?.((child) => {
      if (child.isCSS2DObject) child.element.remove();
      if (!effect.dispose) {
        child.geometry?.dispose();
        if (child.material) [].concat(child.material).forEach((material) => material.dispose());
      }
    });
    effect.dispose?.();
  }

  /* ---------------------------------------------------------------
     FRAME LOOP
     --------------------------------------------------------------- */

  loop() {
    this.frame = requestAnimationFrame(this.loop);
    const realDt = Math.min(0.05, this.clock.getDelta());
    const dt = this.playing && this.city ? realDt * this.speed : 0;

    if (dt > 0) {
      this.simTime += dt;
      // Sub-step at high speed so vehicles and traffic stay stable.
      const steps = Math.ceil(dt / 0.034);
      const step = dt / steps;
      for (let s = 0; s < steps; s += 1) {
        this.city.update(step);
        for (const effect of this.effects) effect.update?.(step);
        for (const task of this.tasks) {
          task.elapsed += step;
          if (!task.done && task.fn(step, task.elapsed)) task.done = true;
        }
      }
      this.tasks = this.tasks.filter((task) => !task.done);
      this.effects = this.effects.filter((effect) => {
        if (effect.done || effect.faded) {
          this.disposeEffect(effect);
          return false;
        }
        return true;
      });

      const ready = this.waiters.filter((waiter) => waiter.test());
      if (ready.length) {
        this.waiters = this.waiters.filter((waiter) => !ready.includes(waiter));
        ready.forEach((waiter) => waiter.resolve());
      }
    }

    this.updateCamera(realDt);
    this.controls.update();

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);

    if (performance.now() - this.lastEmit > 250) this.emit();
  }

  updateCamera(dt) {
    if (this.cameraMode !== "auto" || !this.focus) return;
    const target = this.focus.isVector3 ? this.focus : this.focus.position;
    const k = 1 - Math.exp(-dt * 1.6);
    this.controls.target.lerp(target, k);
    const offset = this.camera.position.clone().sub(this.controls.target);
    const length = offset.length();
    const desired = length + (this.focusDistance - length) * k;
    offset.setLength(desired);
    // Keep a pleasant oblique angle.
    const flat = Math.hypot(offset.x, offset.z);
    const pitch = Math.atan2(offset.y, flat);
    const desiredPitch = this.focusDistance < 180 ? 0.95 : 0.75;
    const newPitch = pitch + (desiredPitch - pitch) * k;
    const dist = offset.length();
    const yaw = Math.atan2(offset.z, offset.x);
    offset.set(Math.cos(yaw) * Math.cos(newPitch) * dist, Math.sin(newPitch) * dist, Math.sin(yaw) * Math.cos(newPitch) * dist);
    this.camera.position.copy(this.controls.target).add(offset);
  }

  emit(force = false) {
    if (!this.onChange || !this.scenario) return;
    if (!force && !this.playing) return;
    this.lastEmit = performance.now();
    this.onChange({
      scenarioId: this.scenario.id,
      stageIndex: this.stageIndex,
      logs: this.logs,
      metrics: { ...this.metrics },
      clock: this.simTime * TIME_SCALE,
      playing: this.playing,
      speed: this.speed,
      cameraMode: this.cameraMode,
      finished: this.finished,
      summary: this.summary,
      overrides: this.city?.overrideCount ?? 0,
      yielded: this.city?.yielded.size ?? 0,
      quality: this.quality,
    });
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.cancelScenario();
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.stars.geometry.dispose();
    this.stars.material.dispose();
    this.composer?.dispose?.();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.domElement.remove();
    this.onChange = null;
  }
}
