import { useEffect, useRef } from "react";

// Procedurally drawn "CCTV" view of a rainy arterial road at night.
// Clearly labelled as simulated — no real camera is involved.
function CameraFeed({ title = "Anna Salai — CAM-14" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    let frame;
    let width = 0;
    let height = 0;
    let visible = true;

    const skyline = Array.from({ length: 26 }, (_, index) => ({
      x: index / 26,
      w: 0.03 + Math.random() * 0.04,
      h: 0.12 + Math.random() * 0.28,
      windows: Array.from({ length: 14 }, () => Math.random() < 0.4),
    }));

    const cars = Array.from({ length: 9 }, (_, index) => ({
      lane: index % 4,
      z: Math.random(),
      speed: 0.08 + Math.random() * 0.08,
      bus: index % 5 === 0,
    }));

    const drops = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() }));

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibility.observe(canvas);
    resize();

    let last = performance.now();

    const draw = (now) => {
      frame = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible || !width) return;

      const horizon = height * 0.42;
      const vanishX = width * 0.55;

      // Sky
      const sky = context.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#0b1220");
      sky.addColorStop(1, "#1e293b");
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);

      // Skyline
      for (const b of skyline) {
        const bx = b.x * width;
        const bw = b.w * width;
        const bh = b.h * height;
        context.fillStyle = "#0f172a";
        context.fillRect(bx, horizon - bh, bw, bh);
        b.windows.forEach((lit, index) => {
          if (!lit) return;
          context.fillStyle = "rgba(253, 224, 171, 0.7)";
          context.fillRect(bx + 2 + (index % 2) * (bw / 2), horizon - bh + 4 + Math.floor(index / 2) * 7, 2.5, 3);
        });
      }

      // Road
      const road = context.createLinearGradient(0, horizon, 0, height);
      road.addColorStop(0, "#1f2937");
      road.addColorStop(1, "#0b0f17");
      context.fillStyle = road;
      context.beginPath();
      context.moveTo(vanishX - 6, horizon);
      context.lineTo(vanishX + 6, horizon);
      context.lineTo(width * 1.15, height);
      context.lineTo(-width * 0.15, height);
      context.closePath();
      context.fill();

      // Wet-road reflections of street lights
      for (let i = 0; i < 6; i += 1) {
        const t = ((now / 4000 + i / 6) % 1) ** 2;
        const y = horizon + t * (height - horizon);
        context.fillStyle = `rgba(253, 186, 116, ${0.08 + t * 0.12})`;
        context.fillRect(vanishX + (width * 0.62) * t, y, 3 + t * 6, 2 + t * 10);
        context.fillRect(vanishX - (width * 0.66) * t, y, 3 + t * 6, 2 + t * 10);
      }

      // Lane dashes
      context.strokeStyle = "rgba(226, 232, 240, 0.5)";
      for (const laneX of [-0.33, 0, 0.33]) {
        for (let i = 0; i < 8; i += 1) {
          const t1 = ((i / 8 + now / 2500) % 1) ** 2;
          const t2 = Math.min(1, t1 + 0.03);
          context.lineWidth = 1 + t1 * 3;
          context.beginPath();
          context.moveTo(vanishX + laneX * width * 1.3 * t1, horizon + t1 * (height - horizon));
          context.lineTo(vanishX + laneX * width * 1.3 * t2, horizon + t2 * (height - horizon));
          context.stroke();
        }
      }

      // Traffic: lanes 0-1 oncoming (headlights), 2-3 outgoing (tail lights)
      cars.sort((a, b) => a.z - b.z);
      for (const car of cars) {
        const oncoming = car.lane < 2;
        car.z += (oncoming ? 1 : -1) * car.speed * dt;
        if (car.z > 1) car.z = 0.02;
        if (car.z < 0.02) car.z = 1;
        const t = car.z ** 1.6;
        const laneOffset = [-0.5, -0.17, 0.17, 0.5][car.lane];
        const cx = vanishX + laneOffset * width * 1.3 * t;
        const cy = horizon + t * (height - horizon);
        const w = (car.bus ? 0.2 : 0.14) * width * t;
        const h = (car.bus ? 0.2 : 0.08) * width * t;
        context.fillStyle = car.bus ? "#b45309" : "#334155";
        context.fillRect(cx - w / 2, cy - h, w, h);
        context.fillStyle = "#0f172a";
        context.fillRect(cx - w * 0.4, cy - h * 0.92, w * 0.8, h * 0.4);
        const glow = oncoming ? "rgba(255, 244, 214, 0.95)" : "rgba(255, 40, 40, 0.9)";
        context.shadowColor = glow;
        context.shadowBlur = 12 * t + 2;
        context.fillStyle = glow;
        context.fillRect(cx - w * 0.42, cy - h * 0.3, w * 0.16, h * 0.14);
        context.fillRect(cx + w * 0.26, cy - h * 0.3, w * 0.16, h * 0.14);
        context.shadowBlur = 0;
      }

      // Rain
      context.strokeStyle = "rgba(186, 230, 253, 0.35)";
      context.lineWidth = 1;
      context.beginPath();
      for (const drop of drops) {
        drop.y += dt * 1.6 * drop.s;
        drop.x -= dt * 0.15;
        if (drop.y > 1) {
          drop.y = 0;
          drop.x = Math.random() * 1.1;
        }
        context.moveTo(drop.x * width, drop.y * height);
        context.lineTo(drop.x * width - 2, drop.y * height + 9 * drop.s);
      }
      context.stroke();

      // Scanlines + vignette
      context.fillStyle = "rgba(0, 0, 0, 0.12)";
      for (let y = 0; y < height; y += 3) context.fillRect(0, y, width, 1);
      const vignette = context.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, width * 0.75);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.55)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);

      // Overlay text
      context.font = "600 10px ui-monospace, monospace";
      context.fillStyle = "rgba(226, 232, 240, 0.85)";
      const stamp = new Date().toLocaleTimeString("en-IN", { hour12: false });
      context.fillText(stamp, width - 62, height - 9);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-black">
      <canvas ref={canvasRef} className="block aspect-[16/10] w-full" />
      <div className="pointer-events-none absolute left-2.5 top-2 text-[11px] font-semibold text-white drop-shadow">{title}</div>
      <div className="pointer-events-none absolute right-2.5 top-2 flex items-center gap-1 rounded border border-rose-500/70 bg-rose-600/80 px-1.5 py-0.5 text-[9px] font-bold">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2.5 text-[9px] font-semibold tracking-wider text-slate-300/80">
        SIMULATED FEED
      </div>
    </div>
  );
}

export default CameraFeed;
