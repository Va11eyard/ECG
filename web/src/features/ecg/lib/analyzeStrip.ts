export type RhythmHint = "regular" | "irregular";
export type StripQuality = "adequate" | "poor";

export type StripVitals = {
  heartRateBpm: number | null;
  rhythmHint: RhythmHint;
  quality: StripQuality;
  durationSec: number;
  peakCount: number;
  summary: string;
};

const MIN_FS = 50;
const MAX_FS = 500;
const MIN_STRIP_SEC = 8;
const MAX_SAMPLES = 30000;
const MIN_PEAKS = 4;
const MIN_HR = 35;
const MAX_HR = 200;
const IRREGULAR_CV = 0.15;

export function analyzeStrip(fsHz: number, samples: number[], locale: string): StripVitals {
  const durationSec = fsHz > 0 ? samples.length / fsHz : 0;
  const poor = (extra: string): StripVitals => ({
    heartRateBpm: null,
    rhythmHint: "regular",
    quality: "poor",
    durationSec,
    peakCount: 0,
    summary: poorSummary(locale, extra),
  });

  if (fsHz < MIN_FS || fsHz > MAX_FS || samples.length < 2 || samples.length > MAX_SAMPLES) {
    return poor(tooShortCopy(locale));
  }
  if (durationSec < MIN_STRIP_SEC) {
    return poor(tooShortCopy(locale));
  }

  const peaks = rPeakIndexes(samples, fsHz);
  if (peaks.length < MIN_PEAKS) {
    return { ...poor(tooFewBeatsCopy(locale)), peakCount: peaks.length };
  }
  const { hr, cv } = rrStats(peaks, fsHz);
  if (hr < MIN_HR || hr > MAX_HR) {
    return { ...poor(tooFewBeatsCopy(locale)), peakCount: peaks.length };
  }

  const rhythmHint: RhythmHint = cv > IRREGULAR_CV ? "irregular" : "regular";
  const vitals: StripVitals = {
    heartRateBpm: Math.round(hr * 10) / 10,
    rhythmHint,
    quality: "adequate",
    durationSec,
    peakCount: peaks.length,
    summary: "",
  };
  vitals.summary = defaultScreenSummary(vitals, locale);
  return vitals;
}

function rPeakIndexes(samples: number[], fs: number): number[] {
  const env = energyEnvelope(samples, Math.trunc(fs * 0.08));
  const thr = 0.35 * maxAbs(env);
  if (thr <= 0) return [];
  let refr = Math.trunc(fs * 0.28);
  if (refr < 8) refr = 8;
  const peaks: number[] = [];
  let last = -refr;
  for (let i = 0; i < env.length; i++) {
    const v = env[i] ?? 0;
    if (v < thr || i - last < refr) continue;
    peaks.push(i);
    last = i;
  }
  return peaks;
}

function energyEnvelope(samples: number[], win: number): number[] {
  if (win < 3) win = 3;
  const n = samples.length;
  const sq = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    const d = (samples[i] ?? 0) - (samples[i - 1] ?? 0);
    sq[i] = d * d;
  }
  const out = new Array<number>(n).fill(0);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += sq[i] ?? 0;
    if (i >= win) acc -= sq[i - win] ?? 0;
    out[i] = acc;
  }
  return out;
}

function maxAbs(v: number[]): number {
  let m = 0;
  for (const x of v) {
    const a = Math.abs(x);
    if (a > m) m = a;
  }
  return m;
}

function rrStats(peaks: number[], fs: number): { hr: number; cv: number } {
  if (peaks.length < 2 || fs <= 0) return { hr: 0, cv: 0 };
  const first = peaks[0] ?? 0;
  const last = peaks[peaks.length - 1] ?? 0;
  const span = (last - first) / fs;
  if (span <= 0) return { hr: 0, cv: 0 };
  const hr = (60 * (peaks.length - 1)) / span;
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let i = 1; i < peaks.length; i++) {
    const rr = ((peaks[i] ?? 0) - (peaks[i - 1] ?? 0)) / fs;
    if (rr <= 0) continue;
    sum += rr;
    sumSq += rr * rr;
    count++;
  }
  if (count < 2) return { hr, cv: 0 };
  const mean = sum / count;
  if (mean <= 0) return { hr, cv: 0 };
  let variance = sumSq / count - mean * mean;
  if (variance < 0) variance = 0;
  return { hr, cv: Math.sqrt(variance) / mean };
}

export function defaultScreenSummary(v: StripVitals, locale: string): string {
  const loc = locale.trim().toLowerCase();
  const bpm = Math.round(v.heartRateBpm ?? 0);
  if (loc.startsWith("ru")) {
    const rhythm = v.rhythmHint === "irregular" ? "нерегулярным" : "регулярным";
    return `ЧСС по одноканальной записи около ${bpm} уд/мин. Ритм выглядит ${rhythm}. Это не медицинский диагноз и не заменяет консультацию врача.`;
  }
  if (loc.startsWith("kk") || loc.startsWith("kz")) {
    const rhythm = v.rhythmHint === "irregular" ? "үзік" : "үнемі";
    return `Бір арналы жазба бойынша жүрек соғысы шамамен ${bpm} рет/мин. Ритм ${rhythm} көрінеді. Бұл медициналық диагноз емес және дәрігер кеңесін алмастырмайды.`;
  }
  const rhythm = v.rhythmHint === "irregular" ? "irregular" : "regular";
  return `Heart rate looks about ${bpm} bpm on this single-lead strip. Beat timing appears ${rhythm}. This is not a medical diagnosis and is not a substitute for a clinician.`;
}

function tooShortCopy(locale: string): string {
  const loc = locale.trim().toLowerCase();
  if (loc.startsWith("ru")) return "Нужно около 8–10 секунд чистой записи.";
  if (loc.startsWith("kk") || loc.startsWith("kz")) return "Шамамен 8–10 секунд таза жазба керек.";
  return "Need about 8–10 seconds of a cleaner strip.";
}

function tooFewBeatsCopy(locale: string): string {
  const loc = locale.trim().toLowerCase();
  if (loc.startsWith("ru")) return "Мало уверенности: пики QRS не выделены стабильно.";
  if (loc.startsWith("kk") || loc.startsWith("kz")) return "Сенім аз: QRS шыңдары тұрақсыз.";
  return "Low confidence: QRS peaks are not stable.";
}

function poorSummary(locale: string, extra: string): string {
  const loc = locale.trim().toLowerCase();
  const disc = loc.startsWith("ru")
    ? "Это не медицинский диагноз и не заменяет консультацию врача."
    : loc.startsWith("kk") || loc.startsWith("kz")
      ? "Бұл медициналық диагноз емес және дәрігер кеңесін алмастырмайды."
      : "This is not a medical diagnosis and is not a substitute for a clinician.";
  return `${extra} ${disc}`;
}
