// Ритм-style ECG strip on red paper. Pure drawing math; canvas-independent
// helpers exported for tests.
export type StripOpts = {
  width: number;
  height: number;
  dpr?: number;
  mmPerSec: 25 | 50;
  pxPerMm: number;
  gainMmPerMv: number;
  polarity?: boolean;
  label?: string;
  hr?: number;
};

const INK = "#111111";
const PAPER = "#fffdfd";
const GRID_MINOR = "#f5dada";
const GRID_MAJOR = "#e8b9b8";

export function pxPerSecond(o: StripOpts): number {
  return o.pxPerMm * o.mmPerSec;
}

export function sampleToY(mv: number, o: StripOpts): number {
  const sign = o.polarity ? -1 : 1;
  return o.height * 0.5 - sign * mv * o.gainMmPerMv * o.pxPerMm;
}

export function drawStrip(
  ctx: CanvasRenderingContext2D,
  samples: Float32Array,
  fs: number,
  o: StripOpts,
): void {
  const dpr = o.dpr ?? 1;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, o.width, o.height);

  drawGrid(ctx, o, 1, GRID_MINOR);
  drawGrid(ctx, o, 5, GRID_MAJOR);
  drawTrace(ctx, samples, fs, o);
  drawChrome(ctx, o);
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, o: StripOpts, mm: number, color: string): void {
  const pitch = o.pxPerMm * mm;
  if (pitch < 1.5) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = mm === 5 ? 0.8 : 0.4;
  ctx.beginPath();
  for (let x = pitch; x < o.width; x += pitch) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, o.height);
  }
  for (let y = pitch; y < o.height; y += pitch) {
    ctx.moveTo(0, y);
    ctx.lineTo(o.width, y);
  }
  ctx.stroke();
}

function drawTrace(
  ctx: CanvasRenderingContext2D,
  samples: Float32Array,
  fs: number,
  o: StripOpts,
): void {
  const pxPerSample = pxPerSecond(o) / fs;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < samples.length; i++) {
    const x = i * pxPerSample;
    if (x > o.width) break;
    const y = sampleToY(samples[i] ?? 0, o);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawChrome(ctx: CanvasRenderingContext2D, o: StripOpts): void {
  ctx.fillStyle = INK;
  ctx.font = "10px Inter, system-ui, sans-serif";
  if (o.label) ctx.fillText(o.label, 8, 14);
  if (o.hr !== undefined) ctx.fillText(`${o.hr} bpm`, 8, o.height - 8);
  ctx.textAlign = "right";
  ctx.fillText(`${o.mmPerSec} mm/s · ${o.gainMmPerMv} mm/mV`, o.width - 8, o.height - 8);
  ctx.textAlign = "left";
  const x0 = o.width - 34;
  const y0 = 12;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, y0, 1.5, o.gainMmPerMv * o.pxPerMm);
  ctx.fillText("1 mV", x0 - 2, y0 - 3);
}
