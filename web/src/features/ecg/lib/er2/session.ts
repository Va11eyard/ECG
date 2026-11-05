import { einthoven } from "./derive";
import type { AlignedWindow, SyncState } from "./pairSync";

export type PatientMeta = { id: string; name: string; age: string; sex: "" | "m" | "f"; notes: string };
export type Placement = { device: "A" | "B"; lead: "I" | "II"; note: string };
export type DeviceMeta = { name: string; fs: number };

export class SessionRecorder {
  private meta: PatientMeta | null = null;
  private placements: Placement[] = [];
  private devices: DeviceMeta[] = [];
  private startedAt = 0;
  private tFirst = Number.NaN;
  private I: number[] = [];
  private II: number[] = [];
  private fs = 125;
  private lastSync: { state: SyncState; offsetMs: number; driftPpm: number; matchRatio: number } | null = null;

  start(meta: PatientMeta, placements: Placement[], devices: DeviceMeta[]): void {
    this.meta = meta;
    this.placements = placements;
    this.devices = devices;
    this.startedAt = Date.now();
    this.tFirst = Number.NaN;
    this.I = [];
    this.II = [];
    this.fs = devices[0]?.fs ?? 125;
    this.lastSync = null;
  }

  addWindow(w: AlignedWindow): void {
    if (w.sync.state !== "locked" && w.sync.state !== "solo") return;
    if (Number.isNaN(this.tFirst)) this.tFirst = w.tStartMs;
    this.fs = w.fs;
    for (let i = 0; i < w.I.length; i++) this.I.push(w.I[i] ?? 0);
    for (let i = 0; i < w.II.length; i++) this.II.push(w.II[i] ?? 0);
    this.lastSync = w.sync;
  }

  stop(): void {}

  get sampleCount(): number {
    return this.I.length;
  }

  exportJson(): string {
    const derived = einthoven(Float32Array.from(this.I), Float32Array.from(this.II));
    const leads = {
      I: this.I,
      II: this.II,
      III: Array.from(derived.III),
      aVR: Array.from(derived.aVR),
      aVL: Array.from(derived.aVL),
      aVF: Array.from(derived.aVF),
    };
    return JSON.stringify({
      patient: this.meta,
      placements: this.placements,
      devices: this.devices,
      sync: this.lastSync,
      fs: this.fs,
      recordedAt: new Date(this.startedAt).toISOString(),
      durationSec: this.I.length / this.fs,
      leads,
    });
  }

  exportCsv(): string {
    const derived = einthoven(Float32Array.from(this.I), Float32Array.from(this.II));
    const step = 1000 / this.fs;
    const lines = ["t_ms,I,II,III,aVR,aVL,aVF"];
    for (let i = 0; i < this.I.length; i++) {
      const row = [
        (i * step).toFixed(2),
        num(this.I[i]),
        num(this.II[i]),
        num(derived.III[i]),
        num(derived.aVR[i]),
        num(derived.aVL[i]),
        num(derived.aVF[i]),
      ];
      lines.push(row.join(","));
    }
    return lines.join("\n");
  }
}

function num(v: number | undefined): string {
  return (v ?? 0).toFixed(6);
}
