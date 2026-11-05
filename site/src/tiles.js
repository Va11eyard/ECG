// Canvas-drawn spotlight tiles as dot-matrix signal motifs: each motif is
// stroked into a luminance field, then halftoned into scanline dots.
const TAU = Math.PI * 2;
const LEVELS = [0, 0.26, 0.52, 0.78, 1];

function gauss(x, mu, sigma, a) {
  const d = (x - mu) / sigma;
  return a * Math.exp(-0.5 * d * d);
}
function beat(p) {
  return gauss(p, 0.16, 0.032, 0.09) - gauss(p, 0.3, 0.01, 0.05) + gauss(p, 0.315, 0.011, 0.75)
    - gauss(p, 0.34, 0.014, 0.24) + gauss(p, 0.56, 0.055, 0.18);
}
function hash(a, b) {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function strokeMotif(fx, kind, w, h) {
  fx.strokeStyle = '#000000';
  fx.lineJoin = 'round';
  fx.lineCap = 'round';
  if (kind === 'beat' || kind === 'fast' || kind === 'slow' || kind === 'grid') {
    const count = kind === 'fast' ? 5 : kind === 'slow' ? 2 : 3;
    fx.lineWidth = w * 0.075;
    for (let k = 0; k < count; k++) {
      const cy = h * (count === 1 ? 0.5 : 0.22 + (0.56 * k) / Math.max(1, count - 1));
      const span = w / count;
      fx.beginPath();
      for (let x = 0; x <= span; x += 2) {
        const p = (x / span) % 1;
        const y = cy - beat(p) * h * 0.16;
        if (x === 0) fx.moveTo(k * span + x, y);
        else fx.lineTo(k * span + x, y);
      }
      fx.stroke();
    }
  } else if (kind === 'report') {
    fx.lineWidth = w * 0.045;
    for (let r = 0; r < 5; r++) {
      const y = h * (0.18 + r * 0.16);
      fx.beginPath();
      fx.moveTo(w * 0.12, y);
      fx.lineTo(w * (0.5 + hash(r, 3) * 0.36), y);
      fx.stroke();
    }
  } else if (kind === 'radio') {
    fx.lineWidth = w * 0.055;
    const cx = w * 0.62;
    const cy = h * 0.38;
    for (let r = 1; r <= 3; r++) {
      fx.beginPath();
      fx.arc(cx, cy, w * 0.09 * r, -0.9, 0.9);
      fx.stroke();
    }
    fx.fillStyle = '#000000';
    fx.beginPath();
    fx.arc(cx, cy, w * 0.035, 0, TAU);
    fx.fill();
  }
}

export const MOTIFS = ['beat', 'fast', 'slow', 'grid', 'report', 'radio'];

export function drawTile(kind, canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const step = Math.max(5, w / 30);
  const rowStep = step * 2.05;
  const cols = Math.ceil(w / step);
  const rows = Math.ceil(h / rowStep);
  const R = step * 0.46;
  const field = document.createElement('canvas');
  field.width = cols;
  field.height = rows;
  const fx = field.getContext('2d', { willReadFrequently: true });
  if (!fx) return;
  fx.fillStyle = '#ffffff';
  fx.fillRect(0, 0, cols, rows);
  fx.save();
  fx.scale(cols / w, rows / h);
  strokeMotif(fx, kind, w, h);
  fx.restore();
  const img = fx.getImageData(0, 0, cols, rows).data;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0d0d0d';
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const lum = (img[(j * cols + i) * 4] ?? 255) / 255;
      let v = Math.max(0, Math.min(1, (1 - lum - 0.16) / 0.42));
      v *= 0.86 + 0.14 * Math.sin(hash(i, j) * 40);
      let level = 0;
      for (let k = LEVELS.length - 1; k >= 1; k--) {
        if (v >= (LEVELS[k] ?? 0) - 0.13) {
          level = k;
          break;
        }
      }
      if (level === 0) continue;
      const r = R * (level === 1 ? 0.38 : (LEVELS[level] ?? 1));
      ctx.beginPath();
      ctx.arc((i + 0.5) * step, (j + 0.5) * rowStep, r, 0, TAU);
      ctx.fill();
    }
  }
}
