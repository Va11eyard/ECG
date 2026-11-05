import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Er2Device, type RtEvent } from "./device";
import { SimTransport } from "./simulator";
import { PairSync } from "./pairSync";

async function drive(seconds: number, driftPpm = 0): Promise<{ eventsA: RtEvent[]; eventsB: RtEvent[] }> {
  const eventsA: RtEvent[] = [];
  const eventsB: RtEvent[] = [];
  const a = new Er2Device("A", new SimTransport({ fs: 125, hr: 72 }));
  const b = new Er2Device("B", new SimTransport({ fs: 125, hr: 72, skewMs: 187, driftPpm }));
  a.onRt((e) => eventsA.push(e));
  b.onRt((e) => eventsB.push(e));
  await a.requestConnect();
  await b.requestConnect();
  vi.advanceTimersByTime(seconds * 1000);
  await Promise.resolve();
  a.stop();
  b.stop();
  return { eventsA, eventsB };
}

describe("PairSync on simulated dual streams", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("locks onto a 187 ms skew and tracks strong drift", async () => {
    vi.useFakeTimers();
    const a = new Er2Device("A", new SimTransport({ fs: 125, hr: 72 }));
    const b = new Er2Device("B", new SimTransport({ fs: 125, hr: 72, skewMs: 187, driftPpm: 5000 }));
    const sync = new PairSync();
    const pendingA: RtEvent[] = [];
    const pendingB: RtEvent[] = [];
    a.onRt((e) => pendingA.push(e));
    b.onRt((e) => pendingB.push(e));
    await a.requestConnect();
    await b.requestConnect();
    let last: ReturnType<PairSync["pull"]> = null;
    let windows = 0;
    for (let s = 0; s < 14; s++) {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      while (pendingA.length) sync.pushA(pendingA.shift()!);
      while (pendingB.length) sync.pushB(pendingB.shift()!);
      for (let w = sync.pull(); w; w = sync.pull()) {
        last = w;
        windows++;
      }
    }
    a.stop();
    b.stop();
    expect(windows).toBeGreaterThan(3);
    expect(last!.sync.state).toBe("locked");
    expect(last!.sync.offsetMs).toBeGreaterThan(180);
    expect(last!.sync.offsetMs).toBeLessThan(290);
    expect(Math.abs(last!.sync.driftPpm - 5000)).toBeLessThan(800);
    expect(last!.I.length).toBeGreaterThan(0);
  });

  it("aligned chunks correlate at zero lag", async () => {
    const { eventsA, eventsB } = await drive(10);
    const sync = new PairSync();
    for (const e of eventsA) sync.pushA(e);
    for (const e of eventsB) sync.pushB(e);
    const Is: number[] = [];
    const IIs: number[] = [];
    let fs = 125;
    for (let w = sync.pull(); w; w = sync.pull()) {
      Is.push(...Array.from(w.I));
      IIs.push(...Array.from(w.II));
      fs = w.fs;
    }
    const I = Float32Array.from(Is);
    const II = Float32Array.from(IIs);
    expect(I.length).toBeGreaterThan(1000);
    let best = Number.POSITIVE_INFINITY;
    let bestLag = Number.NaN;
    for (let lagMs = -40; lagMs <= 40; lagMs += 2) {
      const lag = Math.round((lagMs / 1000) * fs);
      let s = 0;
      let n = 0;
      for (let i = 100; i + lag >= 0 && i + lag < II.length; i += 4) {
        s += Math.abs((I[i] ?? 0) - (II[i + lag] ?? 0));
        n++;
      }
      const mean = s / Math.max(1, n);
      if (mean < best) {
        best = mean;
        bestLag = lagMs;
      }
    }
    expect(Math.abs(bestLag)).toBeLessThanOrEqual(12);
  });

  it("declares independent when the hearts differ", async () => {
    const eventsA: RtEvent[] = [];
    const eventsB: RtEvent[] = [];
    const a = new Er2Device("A", new SimTransport({ fs: 125, hr: 72 }));
    const b = new Er2Device("B", new SimTransport({ fs: 125, hr: 95 }));
    a.onRt((e) => eventsA.push(e));
    b.onRt((e) => eventsB.push(e));
    await a.requestConnect();
    await b.requestConnect();
    vi.advanceTimersByTime(8000);
    await Promise.resolve();
    a.stop();
    b.stop();
    const sync = new PairSync();
    for (const e of eventsA) sync.pushA(e);
    for (const e of eventsB) sync.pushB(e);
    expect(sync.pull()!.sync.state).toBe("independent");
  });

  it("runs solo without device B", () => {
    const sync = new PairSync();
    sync.solo();
    sync.pushA({ hr: 72, battery: 80, leadOn: true, mv: new Float32Array(125), tDeviceMs: 1000, fs: 125 });
    expect(sync.pull()!.sync.state).toBe("solo");
  });
});
