import { describe, expect, it } from "vitest";
import {
  CMD,
  FrameParser,
  MV_PER_LSB,
  buildFrame,
  crc8,
  decodeRtData,
  getInfoCmd,
  rtRriCmd,
} from "./protocol";

describe("crc8 (CRC-8/ATM, poly 0x07)", () => {
  it("matches the standard check value", () => {
    expect(crc8(new TextEncoder().encode("123456789"))).toBe(0xf4);
  });
});

describe("command builders", () => {
  it("builds rtRri exactly like the vendor demo", () => {
    const c = rtRriCmd();
    expect(Array.from(c.slice(0, 8))).toEqual([0xa5, 0x07, 0xf8, 0x00, 0x00, 0x01, 0x00, 0xfa]);
    expect(c[8]).toBe(crc8(c.slice(0, 8)));
  });

  it("builds getInfo with empty payload", () => {
    const c = getInfoCmd();
    expect(Array.from(c.slice(0, 7))).toEqual([0xa5, 0xe1, 0x1e, 0x00, 0x00, 0x00, 0x00]);
    expect(c.length).toBe(8);
    expect(c[7]).toBe(crc8(c.slice(0, 7)));
  });

  it("buildFrame increments seq", () => {
    expect(buildFrame(CMD.RT_DATA, new Uint8Array([1]), 5)[4]).toBe(5);
  });
});

describe("FrameParser", () => {
  const frame = buildFrame(CMD.RT_DATA, new Uint8Array([1, 2, 3]), 7);

  it("parses a full frame", () => {
    const out = new FrameParser().push(frame);
    expect(out.length).toBe(1);
    expect(out[0]!).toMatchObject({ cmd: CMD.RT_DATA, seq: 7 });
    expect(Array.from(out[0]!.payload)).toEqual([1, 2, 3]);
  });

  it("reassembles a frame split across three chunks", () => {
    const p = new FrameParser();
    expect(p.push(frame.slice(0, 3))).toEqual([]);
    expect(p.push(frame.slice(3, 5))).toEqual([]);
    const out = p.push(frame.slice(5));
    expect(out.length).toBe(1);
    expect(Array.from(out[0]!.payload)).toEqual([1, 2, 3]);
  });

  it("drops garbage before the header and coalesced frames", () => {
    const p = new FrameParser();
    const noise = new Uint8Array([0x00, 0x99, 0xa5 ^ 1, 0x11]);
    const out = p.push(new Uint8Array([...noise, ...frame, ...frame]));
    expect(out.length).toBe(2);
  });

  it("rejects bad crc and inverted-cmd mismatches", () => {
    const p = new FrameParser();
    const bad = Uint8Array.from(frame);
    bad[bad.length - 1] = (bad[bad.length - 1] ?? 0) ^ 0xff;
    const badInv = Uint8Array.from(frame);
    badInv[2] = 0x00;
    expect(p.push(bad)).toEqual([]);
    expect(p.push(badInv)).toEqual([]);
  });
});

describe("decodeRtData", () => {
  function rtPayload(runStatus = 0x00): Uint8Array {
    const p = new Uint8Array(20 + 6);
    const dv = new DataView(p.buffer);
    dv.setUint16(0, 72, true);
    p[2] = 0x01;
    p[3] = 80;
    dv.setUint32(4, 5, true);
    p[8] = runStatus;
    const wave = new Int16Array(3);
    wave[0] = 1000;
    wave[1] = -1000;
    wave[2] = -129; // 0xFF7F sentinel as int16
    p.set(new Uint8Array(wave.buffer), 20);
    return p;
  }

  it("decodes the param block", () => {
    const { param } = decodeRtData(rtPayload());
    expect(param).toMatchObject({ hr: 72, battery: 80, leadOn: true, recordTimeSec: 5 });
  });

  it("flags lead-off from runStatus bits", () => {
    const { param } = decodeRtData(rtPayload(0x07));
    expect(param.leadOn).toBe(false);
  });

  it("converts wave samples to mV and honors the sentinel", () => {
    const { waveMv } = decodeRtData(rtPayload());
    expect(waveMv[0]).toBeCloseTo(1000 * MV_PER_LSB, 5);
    expect(waveMv[1]).toBeCloseTo(-1000 * MV_PER_LSB, 5);
    expect(waveMv[2]).toBe(0);
  });
});
