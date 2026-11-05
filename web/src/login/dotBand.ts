// Static dot-matrix ECG band: the Kindred halftone at rest, driven by the
// synthesized Lead I waveform instead of a photo.
const TAU = Math.PI * 2;
const LEVELS = [0, 0.26, 0.52, 0.78, 1];

function gauss(x: number, mu: number, sigma: number, a: number): number {
  const d = (x - mu) / sigma;
  return a * Math.exp(-0.5 * d * d);
}

function beat(p: number): number {
  return (
    gauss(p, 0.16, 0.032, 0.09) - gauss(p, 0.3, 0.01, 0.05) + gauss(p, 0.315, 0.011, 0.75)
    - gauss(p, 0.34, 0.014, 0.24) + gauss(p, 0.56, 0.055, 0.18)
  );
}

function hash(a: number, b: number): number {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const SPRITES: HTMLCanvasElement[] = [];

function sprite(level: number, r: number): HTMLCanvasElement {
  const size = Math.ceil(r * 2 * level) + 2;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#0d0d0d";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, Math.max(0.6, r * level), 0, TAU);
    ctx.fill();
  }
  return c;
}

export function renderDotBand(canvas: HTMLCanvasElement): void {
  const parent = canvas.parentElement;
  if (!parent) return;
  const W = parent.clientWidth;
  const H = parent.clientHeight;
  if (W < 2 || H < 2) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const step = Math.max(5, W / 205);
  const rowStep = step * 2.05;
  const cols = Math.ceil(W / step);
  const rows = Math.ceil(H / rowStep);
  const R = step * 0.46;
  if (SPRITES.length !== LEVELS.length) {
    SPRITES.length = 0;
    for (let i = 0; i < LEVELS.length; i++) SPRITES.push(sprite(1, R));
  }

  const field = document.createElement("canvas");
  field.width = cols;
  field.height = rows;
  const fx = field.getContext("2d", { willReadFrequently: true });
  if (!fx) return;
  fx.fillStyle = "#ffffff";
  fx.fillRect(0, 0, cols, rows);
  fx.strokeStyle = "#000000";
  fx.lineWidth = step * 1.1;
  fx.lineJoin = "round";
  fx.lineCap = "round";
  const seconds = 6;
  const hr = 72;
  const pxPerSec = W / seconds;
  const mid = rows * 0.55;
  fx.beginPath();
  for (let x = 0; x <= W; x += step / 2) {
    const t = x / pxPerSec;
    const p = ((t * (hr / 60)) % 1 + 1) % 1;
    const y = mid - beat(p) * rows * 0.34;
    if (x === 0) fx.moveTo(x / step, y);
    else fx.lineTo(x / step, y);
  }
  fx.stroke();
  const img = fx.getImageData(0, 0, cols, rows).data;

  ctx.clearRect(0, 0, W, H);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const lum = (img[(j * cols + i) * 4] ?? 255) / 255;
      const seed = 0.55 * hash(i, j) + 0.45 * hash(j * 3.1, 7.7);
      let v = Math.max(0, Math.min(1, (1 - lum - 0.16) / 0.42));
      v *= 0.86 + 0.14 * Math.sin(seed * 40);
      let level = 0;
      for (let k = LEVELS.length - 1; k >= 1; k--) {
        if (v >= (LEVELS[k] ?? 0) - 0.13) {
          level = k;
          break;
        }
      }
      if (level === 0) continue;
      const dot = level === 1 ? 0.38 : (LEVELS[level] ?? 1);
      const size = Math.ceil(R * dot * 2) + 2;
      ctx.drawImage(
        SPRITES[level]!,
        (i + 0.5) * step - size / 2,
        (j + 0.5) * rowStep - size / 2,
        size,
        size,
      );
    }
  }
}
