import { describe, expect, it } from "vitest";
import { SessionRecorder } from "./session";
import type { AlignedWindow } from "./pairSync";

function window(fs = 125, offsetMs = 187): AlignedWindow {
  const n = fs;
  const I = new Float32Array(n).fill(0.5);
  const II = new Float32Array(n).fill(0.25);
  return {
    tStartMs: 0,
    fs,
    I,
    II,
    sync: { state: "locked", offsetMs, driftPpm: 30, matchRatio: 0.9 },
  };
}

describe("SessionRecorder", () => {
  it("exports the documented JSON schema", () => {
    const rec = new SessionRecorder();
    rec.start(
      { id: "p1", name: "Test", age: "40", sex: "m", notes: "n" },
      [{ device: "A", lead: "I", note: "horizontal" }],
      [{ name: "ER2-A", fs: 125 }],
    );
    rec.addWindow(window());
    rec.stop();
    const parsed = JSON.parse(rec.exportJson()) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(
      expect.arrayContaining(["patient", "placements", "devices", "sync", "fs", "leads"]),
    );
    const leads = parsed.leads as Record<string, number[]>;
    for (const lead of ["I", "II", "III", "aVR", "aVL", "aVF"]) {
      expect(leads[lead]!.length).toBe(125);
    }
    expect(parsed.durationSec).toBeCloseTo(1, 5);
  });

  it("exports a long-format CSV", () => {
    const rec = new SessionRecorder();
    rec.start(
      { id: "p1", name: "Test", age: "", sex: "", notes: "" },
      [],
      [{ name: "ER2-A", fs: 125 }],
    );
    rec.addWindow(window());
    rec.stop();
    const lines = rec.exportCsv().trim().split("\n");
    expect(lines[0]).toBe("t_ms,I,II,III,aVR,aVL,aVF");
    expect(lines.length).toBe(126);
  });

  it("counts samples across windows", () => {
    const rec = new SessionRecorder();
    rec.start({ id: "", name: "", age: "", sex: "", notes: "" }, [], [{ name: "x", fs: 125 }]);
    rec.addWindow(window());
    rec.addWindow(window());
    expect(rec.sampleCount).toBe(250);
  });
});
