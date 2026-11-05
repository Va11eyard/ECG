import { drawStrip, pxPerSecond, sampleToY, type StripOpts } from "@/shared/ecg/redPaperStrip";

const RING_SECONDS = 16;

// Incrementally scrolling red-paper lane: paper and trace advance together,
// only the new segment is drawn per push. Full redraws happen on resize,
// scale change or polarity flip.
export class LaneRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fs = 125;
  private data: Float32Array;
  private total = 0;
  private drawn = 0;
  private opts: StripOpts;
  private polarity = false;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement, opts: StripOpts) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d canvas unavailable");
    this.ctx = ctx;
    this.opts = opts;
    this.data = new Float32Array(RING_SECONDS * 250);
  }

  setFs(fs: number): void {
    if (fs !== this.fs) {
      this.fs = fs;
      this.redraw();
    }
  }

  setMmPerSec(mmPerSec: 25 | 50): void {
    if (mmPerSec !== this.opts.mmPerSec) {
      this.opts = { ...this.opts, mmPerSec };
      this.redraw();
    }
  }

  setPolarity(polarity: boolean): void {
    if (polarity !== this.polarity) {
      this.polarity = polarity;
      this.redraw();
    }
  }

  resize(width: number, height: number): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.opts = { ...this.opts, width, height, dpr };
    this.drawn = Math.max(0, this.total - Math.floor((width / pxPerSecond(this.opts)) * this.fs));
    this.redraw();
  }

  push(samples: Float32Array): void {
    for (let i = 0; i < samples.length; i++) {
      this.data[this.total % this.data.length] = samples[i] ?? 0;
      this.total++;
    }
    this.drawNew();
  }

  private sampleAt(absIdx: number): number {
    if (absIdx < 0 || absIdx >= this.total) return 0;
    return this.data[absIdx % this.data.length] ?? 0;
  }

  private drawNew(): void {
    const pxPerSample = pxPerSecond(this.opts) / this.fs;
    const newCount = this.total - this.drawn;
    if (newCount <= 0) return;
    const shiftPx = newCount * pxPerSample;
    const { width, height } = this.opts;
    const visible = Math.ceil(width / pxPerSample) + 2;
    if (this.total < visible || newCount > this.data.length * 0.8) {
      this.drawn = Math.max(0, this.total - visible);
      this.redraw();
      return;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(this.canvas, -shiftPx, 0, width, height);
    ctx.restore();
    const stripX = width - shiftPx;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#fffdfd";
    ctx.fillRect(stripX, 0, shiftPx + 1, height);
    this.drawGridBand(stripX - pxPerSample, shiftPx + pxPerSample + 1);
    ctx.beginPath();
    const startIdx = this.total - newCount - 1;
    for (let k = 0; k <= newCount; k++) {
      const absIdx = startIdx + k;
      const x = width - (newCount - k) * pxPerSample;
      const mv = this.sampleAt(absIdx);
      const y = sampleToY(this.polarity ? -mv : mv, this.opts);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 1.4;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
    this.drawn = this.total;
  }

  private drawGridBand(fromX: number, bandWidth: number): void {
    const { height, mmPerSec } = this.opts;
    const pxPerMm = this.opts.pxPerMm;
    const pxPerSample = pxPerSecond(this.opts) / this.fs;
    const samplesPerMm = this.fs / mmPerSec;
    const startSample = this.total - Math.ceil(bandWidth / (pxPerSecond(this.opts) / this.fs));
    const ctx = this.ctx;
    const minorPx = samplesPerMm * pxPerMm;
    for (const [everyMm, color, lw] of [
      [1, "#f5dada", 0.4],
      [5, "#e8b9b8", 0.8],
    ] as const) {
      const pitch = minorPx * everyMm;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      const phase = ((startSample * pxPerSample) % pitch + pitch) % pitch;
      for (let x = fromX + (pitch - phase) % pitch; x < fromX + bandWidth; x += pitch) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();
    }
  }

  redraw(): void {
    drawStrip(this.ctx, this.visibleSamples(), this.fs, this.opts);
    this.drawn = this.total;
  }

  private visibleSamples(): Float32Array {
    const count = Math.min(this.total, Math.ceil((this.opts.width / pxPerSecond(this.opts)) * this.fs) + 1);
    const out = new Float32Array(count);
    for (let i = 0; i < count; i++) out[i] = this.sampleAt(this.total - count + i);
    return out;
  }
}
