import * as THREE from "three";

function canvas(width, height) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  return [element, element.getContext("2d")];
}

// Facade + lit-window textures. Returns { map, emissiveMap } sharing one layout
// so lit windows glow at night.
export function makeWindowTextures(seed = 0, palette = ["#ffd9a0", "#ffe9c4", "#9fe4ff"]) {
  const size = 128;
  const cols = 8;
  const rows = 8;
  const [colorCanvas, color] = canvas(size, size);
  const [glowCanvas, glow] = canvas(size, size);

  let state = seed * 9301 + 49297;
  const random = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };

  color.fillStyle = "#121a26";
  color.fillRect(0, 0, size, size);
  glow.fillStyle = "#000";
  glow.fillRect(0, 0, size, size);

  const cw = size / cols;
  const ch = size / rows;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const lit = random() < 0.3;
      const px = x * cw + 3;
      const py = y * ch + 4;
      const w = cw - 6;
      const h = ch - 7;

      if (lit) {
        const tone = palette[Math.floor(random() * palette.length)];
        color.fillStyle = tone;
        color.fillRect(px, py, w, h);
        glow.fillStyle = tone;
        glow.globalAlpha = 0.55 + random() * 0.45;
        glow.fillRect(px, py, w, h);
        glow.globalAlpha = 1;
      } else {
        color.fillStyle = "#1c2838";
        color.fillRect(px, py, w, h);
      }
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  const emissiveMap = new THREE.CanvasTexture(glowCanvas);

  for (const texture of [map, emissiveMap]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
  }

  return { map, emissiveMap };
}

// Soft round sprite used for glows, packets and particles.
export function makeGlowTexture() {
  const [element, context] = canvas(64, 64);
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.75)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Chevron strip that scrolls along route ribbons.
export function makeChevronTexture() {
  const [element, context] = canvas(64, 32);
  context.clearRect(0, 0, 64, 32);
  context.fillStyle = "rgba(255,255,255,0.28)";
  context.fillRect(0, 0, 64, 32);
  context.strokeStyle = "rgba(255,255,255,1)";
  context.lineWidth = 7;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(18, 6);
  context.lineTo(38, 16);
  context.lineTo(18, 26);
  context.stroke();
  const texture = new THREE.CanvasTexture(element);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Red cross / H emblem for the hospital roof.
export function makeEmblemTexture(kind) {
  const [element, context] = canvas(128, 128);
  context.fillStyle = kind === "helipad" ? "#1f2a37" : "#f8fafc";
  context.fillRect(0, 0, 128, 128);

  if (kind === "cross") {
    context.fillStyle = "#ef4444";
    context.fillRect(48, 18, 32, 92);
    context.fillRect(18, 48, 92, 32);
  } else if (kind === "helipad") {
    context.strokeStyle = "#facc15";
    context.lineWidth = 6;
    context.beginPath();
    context.arc(64, 64, 50, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "#f8fafc";
    context.font = "bold 70px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("H", 64, 68);
  }

  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Zebra stripes for barricades.
export function makeStripeTexture() {
  const [element, context] = canvas(64, 16);
  for (let i = 0; i < 8; i += 1) {
    context.fillStyle = i % 2 ? "#f8fafc" : "#ef4444";
    context.fillRect(i * 8, 0, 8, 16);
  }
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
