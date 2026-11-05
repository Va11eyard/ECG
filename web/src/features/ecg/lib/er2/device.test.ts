import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Er2Device, type RtEvent } from "./device";
import { SimTransport } from "./simulator";
import { CMD, FrameParser, MV_PER_LSB, buildFrame } from "./protocol";

describe("Er2Device over SimTransport", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function collect(d: Er2Device): { events: RtEvent[]; statuses: string[] } {
    const events: RtEvent[] = [];
    const statuses: string[] = [];
    d.onRt((e) => events.push(e));
    d.onStatus((s) => statuses.push(s.state));
    return { events, statuses };
  }

  it("polls, parses fragmented notify frames, and emits rt events", async () => {
    const t = new SimTransport({ fs: 125, hr: 72 });
    const d = new Er2Device("A", t);
    const { events, statuses } = collect(d);
    await d.requestConnect();
    expect(statuses).toContain("streaming");
    vi.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(events.length).toBeGreaterThanOrEqual(1);
    const e = events[0]!;
    expect(e.mv.length).toBe(125);
    expect(e.hr).toBe(72);
    expect(e.leadOn).toBe(true);
    expect(e.mv.some((v) => Math.abs(v) > 0.2 * MV_PER_LSB * 200)).toBe(true);
    d.stop();
  });

  it("keeps tDeviceMs monotone across drift and skew", async () => {
    const t = new SimTransport({ fs: 125, hr: 72, skewMs: 187, driftPpm: 30 });
    const d = new Er2Device("B", t);
    const { events } = collect(d);
    await d.requestConnect();
    vi.advanceTimersByTime(5000);
    await Promise.resolve();
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.tDeviceMs).toBeGreaterThan(events[i - 1]!.tDeviceMs);
    }
    const first = events[0]!;
    expect(first.tDeviceMs).toBeGreaterThan(100);
    d.stop();
  });

  it("flags lead-off after the configured delay", async () => {
    const t = new SimTransport({ fs: 125, hr: 72, leadOffAfterSec: 2 });
    const d = new Er2Device("A", t);
    const { events } = collect(d);
    await d.requestConnect();
    vi.advanceTimersByTime(4500);
    await Promise.resolve();
    expect(events.some((e) => e.leadOn)).toBe(true);
    expect(events.some((e) => !e.leadOn)).toBe(true);
    d.stop();
  });

  it("decodes bytes produced by buildFrame", () => {
    const payload = new Uint8Array(20);
    const dv = new DataView(payload.buffer);
    dv.setUint16(0, 72, true);
    payload[3] = 90;
    const frame = buildFrame(CMD.RT_DATA, payload, 1);
    const out = new FrameParser().push(frame);
    expect(out[0]!.cmd).toBe(CMD.RT_DATA);
  });
});
