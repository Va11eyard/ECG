import { CMD, buildFrame } from "./protocol";
import type { Er2Transport } from "./device";

const TAU = Math.PI * 2;

function gauss(x: number, mu: number, sigma: number, a: number): number {
  const d = (x - mu) / sigma;
  return a * Math.exp(-0.5 * d * d);
}

// Lead I morphology: dominant R with clear S; Lead II: taller R, broader P.
function beat(lead: "I" | "II", p: number): number {
  if (lead === "I") {
    return (
      gauss(p, 0.16, 0.032, 0.09) - gauss(p, 0.3, 0.01, 0.05) + gauss(p, 0.315, 0.011, 0.75)
      - gauss(p, 0.34, 0.014, 0.24) + gauss(p, 0.56, 0.055, 0.18)
    );
  }
  return (
    gauss(p, 0.16, 0.034, 0.14) - gauss(p, 0.3, 0.01, 0.08) + gauss(p, 0.315, 0.012, 1.0)
    - gauss(p, 0.34, 0.014, 0.18) + gauss(p, 0.56, 0.058, 0.24)
  );
}

const RAW_SENTINEL = -129;
const MV_PER_LSB = (1.0035 * 1800) / (4096 * 178.74);
const SAMPLES_PER_POLL = 125;

export type SimOptions = {
  fs?: 125 | 250;
  hr?: number;
  skewMs?: number;
  driftPpm?: number;
  leadOffAfterSec?: number;
};

// Emits raw notify chunks (real ER2 frames, deliberately fragmented) so the
// device under test exercises the full parse path.
export class SimTransport implements Er2Transport {
  private notify: ((chunk: Uint8Array) => void) | null = null;
  private opts: Required<SimOptions>;
  private phase = 0;
  private deviceMs: number;
  private lead: "I" | "II";

  constructor(opts: SimOptions = {}) {
    this.opts = {
      fs: 125, hr: 72, skewMs: 0, driftPpm: 0,
      leadOffAfterSec: opts.leadOffAfterSec ?? Number.POSITIVE_INFINITY,
      ...opts,
    } as Required<SimOptions>;
    this.deviceMs = this.opts.skewMs;
    this.lead = "I";
  }

  setLead(lead: "I" | "II"): void {
    this.lead = lead;
  }

  onNotify(cb: (chunk: Uint8Array) => void): void {
    this.notify = cb;
  }

  send(bytes: Uint8Array): void {
    const cmd = bytes[1];
    if (cmd === CMD.GET_INFO) return;
    if (cmd === CMD.RT_DATA) this.emitRtData();
  }

  private emitRtData(): void {
    const { fs, hr, driftPpm } = this.opts;
    const count = (SAMPLES_PER_POLL * fs) / 125;
    const mv = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const perBeat = fs * (60 / hr);
      this.phase = (this.phase + (1 / perBeat) * (1 + 0.03 * Math.sin(this.phase * TAU))) % 1;
      mv[i] = beat(this.lead, this.phase) + (Math.random() - 0.5) * 0.008;
    }
    this.deviceMs += (count / fs) * 1000 * (1 + driftPpm * 1e-6);
    const leadOff = this.deviceMs >= this.opts.leadOffAfterSec * 1000;
    const payload = new Uint8Array(20 + count * 2);
    const dv = new DataView(payload.buffer);
    dv.setUint16(0, leadOff ? 0 : hr, true);
    payload[2] = 0x00;
    payload[3] = 80;
    dv.setUint32(4, Math.floor(this.deviceMs / 1000), true);
    payload[8] = leadOff ? 0x07 : 0x00;
    for (let i = 0; i < count; i++) {
      const raw = mv[i]! === 0 ? RAW_SENTINEL : Math.max(-32768, Math.min(32767, Math.round(mv[i]! / MV_PER_LSB)));
      dv.setInt16(20 + i * 2, raw, true);
    }
    const frame = buildFrame(CMD.RT_DATA, payload, Math.floor(this.deviceMs / 1000) & 0xff);
    // Fragment like a 20-byte MTU link would.
    for (let offset = 0; offset < frame.length; offset += 20) {
      this.notify?.(frame.slice(offset, Math.min(offset + 20, frame.length)));
    }
  }
}
