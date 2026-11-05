import type { RtEvent } from "./device";

export type SyncState = "solo" | "searching" | "locked" | "independent";

export type AlignedWindow = {
  tStartMs: number;
  fs: number;
  I: Float32Array;
  II: Float32Array;
  sync: { state: SyncState; offsetMs: number; driftPpm: number; matchRatio: number };
};

type Stream = { times: number[]; mv: number[]; fs: number };

const BUFFER_SEC = 30;
const WINDOW_SEC = 8;
const REESTIMATE_MS = 2000;
const CHUNK_MS = 500;
const EDGE_GUARD_MS = 250;
const MAX_LAG_MS = 500;
const MATCH_TOLERANCE_MS = 40;
const SLEW_MS_PER_S = 2;

function append(stream: Stream, e: RtEvent): void {
  const count = e.mv.length;
  const step = 1000 / e.fs;
  let t = stream.times.length > 0 ? (stream.times[stream.times.length - 1] ?? 0) : e.tDeviceMs;
  for (let i = 0; i < count; i++) {
    t += step;
    stream.times.push(t);
    stream.mv.push(e.mv[i] ?? 0);
  }
  const cutoff = t - BUFFER_SEC * 1000;
  while (stream.times.length > 0 && (stream.times[0] ?? 0) < cutoff) {
    stream.times.shift();
    stream.mv.shift();
  }
}

function valueAt(stream: Stream, t: number): number {
  const times = stream.times;
  if (times.length === 0 || t < (times[0] ?? 0) || t > (times[times.length - 1] ?? 0)) return 0;
  let lo = 0;
  let hi = times.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((times[mid] ?? 0) <= t) lo = mid;
    else hi = mid;
  }
  const t0 = times[lo] ?? 0;
  const t1 = times[hi] ?? 0;
  if (t1 <= t0) return stream.mv[lo] ?? 0;
  const k = (t - t0) / (t1 - t0);
  return (stream.mv[lo] ?? 0) + k * ((stream.mv[hi] ?? 0) - (stream.mv[lo] ?? 0));
}

function findPeaks(stream: Stream, fromMs: number, toMs: number): number[] {
  const times = stream.times;
  const mv = stream.mv;
  let i0 = 0;
  while (i0 < times.length && (times[i0] ?? 0) < fromMs) i0++;
  let i1 = i0;
  while (i1 < times.length && (times[i1] ?? 0) <= toMs) i1++;
  let max = 0;
  for (let i = i0; i < i1; i++) max = Math.max(max, Math.abs(mv[i] ?? 0));
  const thresh = Math.max(0.15, max * 0.35);
  const peaks: number[] = [];
  let lastPeak = Number.NEGATIVE_INFINITY;
  for (let i = i0 + 1; i < i1 - 1; i++) {
    const v = mv[i] ?? 0;
    if (v > (mv[i - 1] ?? 0) && v >= (mv[i + 1] ?? 0) && v > thresh && (times[i] ?? 0) - lastPeak > 250) {
      peaks.push(times[i] ?? 0);
      lastPeak = times[i] ?? 0;
    }
  }
  return peaks;
}

function meanInterval(peaks: number[]): number {
  if (peaks.length < 2) return Number.NaN;
  let sum = 0;
  for (let i = 1; i < peaks.length; i++) sum += (peaks[i] ?? 0) - (peaks[i - 1] ?? 0);
  return sum / (peaks.length - 1);
}

export class PairSync {
  private a: Stream = { times: [], mv: [], fs: 125 };
  private b: Stream = { times: [], mv: [], fs: 125 };
  private soloMode = false;
  private state: SyncState = "searching";
  private offsetMs = 0;
  private driftPpm = 0;
  private matchRatio = 0;
  private estimates: { t: number; o: number }[] = [];
  private lastEstimateAt = Number.NEGATIVE_INFINITY;
  private pulledUntil: number | null = null;
  private renderOffset = 0;

  solo(): void {
    this.soloMode = true;
    this.state = "solo";
  }

  pushA(e: RtEvent): void {
    append(this.a, e);
  }

  pushB(e: RtEvent): void {
    append(this.b, e);
  }

  private estimate(): void {
    const nowA = this.a.times[this.a.times.length - 1] ?? 0;
    if (nowA - this.lastEstimateAt < REESTIMATE_MS) return;
    if (this.a.times.length < WINDOW_SEC * this.a.fs) return;
    const fromA = nowA - WINDOW_SEC * 1000;
    const peaksA = findPeaks(this.a, fromA, nowA);
    const peaksB = findPeaks(this.b, fromA, nowA + MAX_LAG_MS);
    this.lastEstimateAt = nowA;
    if (peaksA.length < 4 || peaksB.length < 4) return;
    const rrA = meanInterval(peaksA);
    const rrB = meanInterval(peaksB);
    if (!Number.isNaN(rrA) && !Number.isNaN(rrB) && Math.abs(rrB / rrA - 1) > 0.1) {
      this.state = "independent";
      return;
    }
    let bestLag = 0;
    let bestScore = -1;
    const grade = (lag: number): number => {
      let s = 0;
      for (const pa of peaksA) {
        let best = 0;
        for (const pb of peaksB) {
          const d = Math.abs(pb - (pa + lag));
          if (d <= MATCH_TOLERANCE_MS) best = Math.max(best, 1 - d / MATCH_TOLERANCE_MS);
        }
        s += best;
      }
      return s;
    };
    const consider = (lag: number, score: number): void => {
      if (score > bestScore || (score === bestScore && Math.abs(lag) < Math.abs(bestLag))) {
        bestScore = score;
        bestLag = lag;
      }
    };
    for (let lag = -MAX_LAG_MS; lag <= MAX_LAG_MS; lag += 5) consider(lag, grade(lag));
    for (let lag = bestLag - 4; lag <= bestLag + 4; lag++) consider(lag, grade(lag));
    const ratio = peaksA.length > 0 ? bestScore / peaksA.length : 0;
    this.matchRatio = ratio;
    if (this.estimates.length > 0 && Math.abs(bestLag - (this.estimates[this.estimates.length - 1]?.o ?? 0)) > 200) {
      return;
    }
    this.estimates.push({ t: nowA, o: bestLag });
    if (this.estimates.length > 30) this.estimates.shift();
    if (this.estimates.length >= 2) {
      const first = this.estimates[0]!;
      const last = this.estimates[this.estimates.length - 1]!;
      const dt = (last.t - first.t) / 1000;
      if (dt > 0) this.driftPpm = ((last.o - first.o) / dt) * 1000;
    }
    this.offsetMs = bestLag;
    if (this.estimates.length === 1) this.renderOffset = bestLag;
    this.state = ratio >= 0.6 ? "locked" : "searching";
  }

  private renderOffsetAt(tMs: number): number {
    let base = this.renderOffset;
    for (const est of this.estimates) {
      if (est.t > tMs) break;
      base = est.o;
    }
    const dtSec = (tMs - (this.a.times[0] ?? 0)) / 1000;
    const maxDelta = SLEW_MS_PER_S * dtSec;
    return this.renderOffset + Math.max(-maxDelta, Math.min(maxDelta, base - this.renderOffset));
  }

  pull(): AlignedWindow | null {
    if (this.soloMode) return this.pullSolo();
    this.estimate();
    if (this.pulledUntil === null) this.pulledUntil = this.a.times[0] ?? 0;
    const lastA = this.a.times[this.a.times.length - 1] ?? 0;
    const t0 = this.pulledUntil;
    const t1 = t0 + CHUNK_MS;
    if (lastA < t1 + EDGE_GUARD_MS || this.a.times.length === 0) return null;
    const off = this.renderOffsetAt(t1);
    const bFirst = this.b.times[0] ?? Number.POSITIVE_INFINITY;
    const bLast = this.b.times[this.b.times.length - 1] ?? Number.NEGATIVE_INFINITY;
    const bCovers = bFirst <= t0 + off - 50 && bLast >= t1 + off + 50;
    const iList: number[] = [];
    const iiList: number[] = [];
    const times = this.a.times;
    const mv = this.a.mv;
    const step = 1000 / this.a.fs;
    for (let t = t0; t < t1 - 1e-9; t += step) {
      const idx = Math.round((t - (times[0] ?? 0)) / step);
      if (idx < 0 || idx >= times.length) continue;
      iList.push(mv[idx] ?? 0);
      iiList.push(bCovers ? valueAt(this.b, t + off) : valueAt(this.b, t));
    }
    if (iList.length === 0) return null;
    this.renderOffset = off;
    this.pulledUntil = t1;
    return {
      tStartMs: t0,
      fs: this.a.fs,
      I: Float32Array.from(iList),
      II: Float32Array.from(iiList),
      sync: { state: this.state, offsetMs: this.offsetMs, driftPpm: this.driftPpm, matchRatio: this.matchRatio },
    };
  }

  private pullSolo(): AlignedWindow | null {
    if (this.pulledUntil === null) this.pulledUntil = this.a.times[0] ?? 0;
    const lastA = this.a.times[this.a.times.length - 1] ?? 0;
    const t0 = this.pulledUntil;
    const t1 = t0 + CHUNK_MS;
    if (lastA < t1 + EDGE_GUARD_MS || this.a.times.length === 0) return null;
    const times = this.a.times;
    const step = 1000 / this.a.fs;
    const iList: number[] = [];
    for (let t = t0; t < t1 - 1e-9; t += step) {
      const idx = Math.round((t - (times[0] ?? 0)) / step);
      if (idx >= 0 && idx < times.length) iList.push(this.a.mv[idx] ?? 0);
    }
    this.pulledUntil = t1;
    return {
      tStartMs: t0,
      fs: this.a.fs,
      I: Float32Array.from(iList),
      II: new Float32Array(0),
      sync: { state: "solo", offsetMs: 0, driftPpm: 0, matchRatio: 0 },
    };
  }
}
