import { describe, expect, it } from "vitest";
import { pxPerSecond, sampleToY, type StripOpts } from "./redPaperStrip";

const o: StripOpts = {
  width: 1440,
  height: 200,
  mmPerSec: 25,
  pxPerMm: 3.78,
  gainMmPerMv: 10,
};

describe("redPaperStrip calibration", () => {
  it("maps seconds to pixels at 25 mm/s", () => {
    expect(pxPerSecond(o)).toBeCloseTo(25 * 3.78, 6);
  });

  it("places 1 mV exactly 10 mm above the baseline", () => {
    const base = sampleToY(0, o);
    expect(base).toBeCloseTo(100, 6);
    expect(sampleToY(1, o)).toBeCloseTo(100 - 10 * 3.78, 6);
    expect(sampleToY(-1, o)).toBeCloseTo(100 + 10 * 3.78, 6);
  });

  it("polarity inverts the sign of the offset only", () => {
    const inv: StripOpts = { ...o, polarity: true };
    expect(sampleToY(1, inv)).toBeCloseTo(100 + 10 * 3.78, 6);
    expect(sampleToY(0, inv)).toBeCloseTo(100, 6);
  });
});
