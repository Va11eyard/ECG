import { describe, expect, it } from "vitest";
import { einthoven } from "./derive";

describe("einthoven", () => {
  it("derives the four computed limb leads from I and II", () => {
    const n = 8;
    const I = new Float32Array(n).fill(1.0);
    const II = new Float32Array(n).fill(2.0);
    const d = einthoven(I, II);
    for (let i = 0; i < n; i++) {
      expect(d.III[i]).toBeCloseTo(1.0, 6);
      expect(d.aVR[i]).toBeCloseTo(-1.5, 6);
      expect(d.aVL[i]).toBeCloseTo(0.0, 6);
      expect(d.aVF[i]).toBeCloseTo(1.5, 6);
    }
  });

  it("preserves length", () => {
    const I = new Float32Array(11).fill(0.5);
    const II = new Float32Array(11).fill(-0.25);
    const d = einthoven(I, II);
    expect(d.III.length).toBe(11);
    expect(d.aVL.length).toBe(11);
  });
});
