// Kindred dot-matrix engine, edited per the design spec: the luminance
// source is a synthesized ECG band (Lead I / Lead II poses), not a photo.
// Grid, seeds, quantisation, dissolve, row glitch and loop follow the
// Kindred prompt's exact constants.
const TAU = Math.PI * 2;
const LOOP = 20;
const LEVELS = [0, 0.26, 0.52, 0.78, 1];
const BAND_H = 0.3;
const BAND_CY = 0.56;

function gauss(x, mu, sigma, a) {
  const d = (x - mu) / sigma;
  return a * Math.exp(-0.5 * d * d);
}
function beat(lead, p) {
  if (lead === 'I') {
    return gauss(p, 0.16, 0.032, 0.09) - gauss(p, 0.3, 0.01, 0.05) + gauss(p, 0.315, 0.011, 0.75)
      - gauss(p, 0.34, 0.014, 0.24) + gauss(p, 0.56, 0.055, 0.18);
  }
  return gauss(p, 0.16, 0.034, 0.14) - gauss(p, 0.3, 0.01, 0.08) + gauss(p, 0.315, 0.012, 1.0)
    - gauss(p, 0.34, 0.014, 0.18) + gauss(p, 0.56, 0.058, 0.24);
}
function hash(a, b) {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
function smooth(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function mixAt(t, on, off, dur) {
  return smooth(on, on + dur, t) * (1 - smooth(off, off + dur, t));
}

function makeField(cols, rows) {
  const c = document.createElement('canvas');
  c.width = cols;
  c.height = rows;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  return { c, ctx };
}

// Strokes one pose of the ECG band into a field canvas. Left and right
// halves get counter-phased drift, breathe and roll, like the two hands.
function strokeBand(field, ctx, lead, cols, rows, W, H, t) {
  const a = (TAU * t) / LOOP;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cols, rows);
  for (const side of [0, 1]) {
    const ph = side * Math.PI;
    const sx = cols / W;
    const sy = rows / H;
    ctx.save();
    ctx.beginPath();
    ctx.rect(side ? cols / 2 : 0, 0, side ? cols / 2 : cols / 2, rows);
    ctx.clip();
    const drift = (0.012 * Math.sin(a + ph) + 0.005 * Math.sin(2 * a + 1.3 + ph)) * H;
    const scale = 1 + 0.04 * Math.sin(a + 0.9 + ph);
    const rot = (side ? -1 : 1) * 0.03 * Math.sin(a + 2.1 + ph);
    ctx.translate(cols / 2, BAND_CY * rows);
    ctx.rotate(rot);
    ctx.scale(sx * scale, sy * scale);
    ctx.translate(-W / 2, drift);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(6, W / 205) * 1.1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    const hr = 72;
    const pxPerSec = W / 5;
    for (let x = 0; x <= W; x += 3) {
      const p = ((x / pxPerSec + t * 0.9) * (hr / 60)) % 1;
      const y = -beat(lead, p) * H * BAND_H * 1.1;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

export function mountDots(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let W = 0;
  let H = 0;
  let dpr = 1;
  let step = 7;
  let rowStep = 14.35;
  let cols = 0;
  let rows = 0;
  let R = 3.2;
  let fA = null;
  let fB = null;
  let sprites = [];

  function resize() {
    const parent = canvas.parentElement;
    W = parent ? parent.clientWidth : window.innerWidth;
    H = parent ? parent.clientHeight : window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    step = Math.max(5, W / 205);
    rowStep = step * 2.05;
    cols = Math.ceil(W / step);
    rows = Math.ceil(H / rowStep);
    R = step * 0.46;
    fA = makeField(cols, rows);
    fB = makeField(cols, rows);
    sprites = LEVELS.map((level) => {
      const size = Math.ceil(R * 2) + 2;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const sc = c.getContext('2d');
      if (sc) {
        sc.fillStyle = '#0d0d0d';
        sc.beginPath();
        sc.arc(size / 2, size / 2, Math.max(0.6, R * level), 0, TAU);
        sc.fill();
      }
      return { c: level === 0 ? null : c, size: c ? Math.ceil(R * (level === 1 ? 0.76 : level * 2)) + 2 : 0 };
    });
  }

  function render(t) {
    t = ((t % LOOP) + LOOP) % LOOP;
    const mR = mixAt(t, 3.4, 13.4, 1.6);
    const mL = mixAt(t, 7.0, 16.0, 1.6);
    strokeBand(fA, fA.ctx, 'I', cols, rows, W, H, t);
    strokeBand(fB, fB.ctx, 'II', cols, rows, W, H, t);
    const imgA = fA.ctx.getImageData(0, 0, cols, rows).data;
    const imgB = fB.ctx.getImageData(0, 0, cols, rows).data;
    const tick = Math.floor(t * 7);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (let j = 0; j < rows; j++) {
      const rowShift = hash(j, tick) > 0.965 ? Math.round((hash(tick, j) - 0.5) * 8) : 0;
      for (let i = 0; i < cols; i++) {
        const si = Math.max(0, Math.min(cols - 1, i - rowShift));
        const seed = 0.55 * hash(si, j) + 0.45 * hash(j * 3.1, 7.7);
        const m = si < cols / 2 ? mL : mR;
        const useB = seed < m;
        const img = useB ? imgB : imgA;
        const lum = (img[(j * cols + si) * 4] ?? 255) / 255;
        let v = Math.max(0, Math.min(1, (1 - lum - 0.16) / 0.42));
        if (m > 0.001 && m < 0.999 && Math.abs(seed - m) < 0.12) {
          v *= (Math.abs(seed - m) / 0.12) * (hash(si + tick, j) <= 0.4 ? 0.3 : 1);
        }
        v *= 0.86 + 0.14 * Math.sin(t * 3.2 + seed * 40);
        const cxr = Math.abs((si + 0.5) / cols - 0.5);
        v *= smooth(0.035, 0.11, cxr);
        const ey = ((j + 0.5) * rowStep / H - 0.3) / 0.085;
        const ex = cxr / 0.44;
        v *= smooth(0.85, 1.25, Math.hypot(ex, ey));
        let level = 0;
        for (let k = LEVELS.length - 1; k >= 1; k--) {
          if (v >= (LEVELS[k] ?? 0) - 0.13) {
            level = k;
            break;
          }
        }
        if (level === 0) continue;
        const sp = sprites[level];
        const dot = level === 1 ? 0.38 : (LEVELS[level] ?? 1);
        const size = Math.ceil(R * dot * 2) + 2;
        ctx.drawImage(sp.c, (i + 0.5) * step - size / 2, (j + 0.5) * rowStep - size / 2, size, size);
      }
    }
  }

  resize();
  let raf = 0;
  let t0 = performance.now();
  if (reduced) {
    render(5);
  } else {
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      render((now - t0) / 1000);
    };
    raf = requestAnimationFrame(loop);
  }
  window.addEventListener('resize', () => {
    resize();
    if (reduced) render(5);
  });
  window.addEventListener('pagehide', () => cancelAnimationFrame(raf), { once: true });
  window.__render = render;
  return render;
}
