// LEPU ER2 / DuoEK (Viatom ER1 protocol family) framed BLE codec.
// Inbound and outbound frames share one layout, ported byte-for-byte from
// github.com/viatom-develop/LepuBle (Er1BleResponse.Er1Response, Er1BleCmd,
// UniversalBleCmd, BleCRC):
//   [0]=0xA5 [1]=cmd [2]=~cmd [3]=pkgType [4]=pkgNo/seq
//   [5..6]=len (u16 LE) [7..7+len)=payload [7+len]=crc8(bytes[0..7+len))
// The wave stream is polled: host sends RT_DATA (payload 0x7D) every 1000 ms.

export const CMD = { RT_DATA: 0x03, RT_RRI: 0x07, GET_INFO: 0xe1 } as const;

export const MV_PER_LSB = (1.0035 * 1800) / (4096 * 178.74);

export type Frame = { cmd: number; seq: number; payload: Uint8Array };

export type RtParam = {
  hr: number;
  battery: number;
  leadOn: boolean;
  recordTimeSec: number;
  runStatus: number;
};

export function crc8(bytes: Uint8Array): number {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

export function buildFrame(cmd: number, payload: Uint8Array = new Uint8Array(0), seq = 0): Uint8Array {
  const out = new Uint8Array(8 + payload.length);
  out[0] = 0xa5;
  out[1] = cmd;
  out[2] = ~cmd & 0xff;
  out[3] = 0x00;
  out[4] = seq & 0xff;
  out[5] = payload.length & 0xff;
  out[6] = (payload.length >> 8) & 0xff;
  out.set(payload, 7);
  out[out.length - 1] = crc8(out.subarray(0, out.length - 1));
  return out;
}

export function getInfoCmd(): Uint8Array {
  return buildFrame(CMD.GET_INFO);
}

export function rtRriCmd(): Uint8Array {
  return buildFrame(CMD.RT_RRI, Uint8Array.of(0xfa));
}

export function getRtDataCmd(samples = 125): Uint8Array {
  return buildFrame(CMD.RT_DATA, Uint8Array.of(samples));
}

export class FrameParser {
  private buf: number[] = [];

  push(chunk: Uint8Array): Frame[] {
    for (const byte of chunk) this.buf.push(byte);
    const out: Frame[] = [];
    for (;;) {
      while (this.buf.length > 0 && this.buf[0] !== 0xa5) this.buf.shift();
      if (this.buf.length < 8) break;
      const len = (this.buf[5] ?? 0) | ((this.buf[6] ?? 0) << 8);
      const total = 8 + len;
      if (this.buf.length < total) break;
      const frame = this.buf.splice(0, total);
      const cmd = frame[1] ?? 0;
      if ((frame[2] ?? 0) !== (~cmd & 0xff)) continue;
      const body = Uint8Array.from(frame.slice(0, 7 + len));
      if (crc8(body) !== (frame[7 + len] ?? -1)) continue;
      out.push({ cmd, seq: frame[4] ?? 0, payload: Uint8Array.from(frame.slice(7, 7 + len)) });
    }
    return out;
  }
}

export function decodeRtData(payload: Uint8Array): { param: RtParam; waveMv: Float32Array } {
  const dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const hr = dv.getUint16(0, true);
  const battery = payload[3] ?? 0;
  const recordTimeSec = dv.getUint32(4, true);
  const runStatus = payload[8] ?? 0;
  const param: RtParam = {
    hr,
    battery,
    leadOn: (runStatus & 0x07) !== 0x07,
    recordTimeSec,
    runStatus,
  };
  const sampleCount = Math.max(0, Math.floor((payload.length - 20) / 2));
  const waveMv = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const raw = dv.getInt16(20 + i * 2, true);
    waveMv[i] = raw === -129 ? 0 : raw * MV_PER_LSB;
  }
  return { param, waveMv };
}
