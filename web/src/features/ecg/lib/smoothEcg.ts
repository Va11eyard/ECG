const SPIKE_MV = 3.5;
const DEAD_MV = 0.07;
const FULL_MV = 0.28;

export type FilterState = {
  lastRaw: number | null;
  baseline: number | null;
  lastOut: number | null;
};

export function emptyFilterState(): FilterState {
  return { lastRaw: null, baseline: null, lastOut: null };
}

/**
 * Stronger filter on small oscillations (arrhythmologist feedback).
 * Large steps (likely QRS) use a faster follow so true contractions stay visible.
 */
export function filterEcgSamples(raw: number[], state: FilterState): { out: number[]; state: FilterState } {
  const out: number[] = [];
  let { lastRaw, baseline, lastOut } = state;
  for (const x of raw) {
    if (!Number.isFinite(x) || Math.abs(x) > 8) continue;
    if (lastRaw != null && Math.abs(x - lastRaw) > SPIKE_MV) continue;
    lastRaw = x;
    baseline = baseline == null ? x : baseline * 0.995 + x * 0.005;
    const hp = x - baseline;
    if (lastOut == null) {
      lastOut = hp;
      continue;
    }
    const delta = Math.abs(hp - lastOut);
    const t = Math.min(1, Math.max(0, (delta - 0.06) / 0.22));
    const alpha = 0.08 + 0.62 * t;
    lastOut += alpha * (hp - lastOut);
    out.push(squashSmall(lastOut));
  }
  return { out, state: { lastRaw, baseline, lastOut } };
}

function squashSmall(y: number): number {
  const a = Math.abs(y);
  if (a <= DEAD_MV) return y * 0.1;
  if (a >= FULL_MV) return y;
  const t = (a - DEAD_MV) / (FULL_MV - DEAD_MV);
  return y * (0.1 + 0.9 * t);
}

export function removeMean(points: number[]): number[] {
  if (points.length === 0) return points;
  let sum = 0;
  for (const v of points) sum += v;
  const mean = sum / points.length;
  return points.map((v) => v - mean);
}
