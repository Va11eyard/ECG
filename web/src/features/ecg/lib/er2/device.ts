import { CMD, FrameParser, getRtDataCmd, getInfoCmd } from "./protocol";

export type RtParam = {
  hr: number;
  battery: number;
  leadOn: boolean;
  recordTimeSec: number;
  runStatus: number;
};

export type RtEvent = {
  hr: number;
  battery: number;
  leadOn: boolean;
  mv: Float32Array;
  tDeviceMs: number;
};

export type SourceState = "disconnected" | "connecting" | "streaming" | "error";

export type StatusEvent = { state: SourceState; error?: string };

export type Er2Transport = {
  send(bytes: Uint8Array): void;
  onNotify(cb: (chunk: Uint8Array) => void): void;
};

const SERVICE_UUID = "14839ac4-7d7e-415c-9a42-167340cf2339";
const WRITE_UUID = "8b00ace7-eb0b-49b0-bbe9-9aee0a26e1a3";
const NOTIFY_UUID = "0734594a-a8e7-4b1a-a6b1-cd5243059a57";

export function detectFs(samplesInWindow: number, windowSec: number): 125 | 250 {
  const rate = samplesInWindow / windowSec;
  return Math.abs(rate - 125) <= Math.abs(rate - 250) ? 125 : 250;
}

type RtHandler = (e: RtEvent) => void;
type StatusHandler = (s: StatusEvent) => void;

export class Er2Device {
  kind = "er2" as const;
  label: "A" | "B";
  name = "ER2";
  fs = 125;
  param: RtParam | null = null;
  state: SourceState = "disconnected";

  private transport: Er2Transport | null;
  private parser = new FrameParser();
  private rtHandlers = new Set<RtHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private seq = 0;
  private deviceMs = 0;
  private samplesSeen = 0;
  private fsWindowStart = 0;
  private error: string | undefined;

  constructor(label: "A" | "B", transport?: Er2Transport) {
    this.label = label;
    this.transport = transport ?? null;
  }

  onRt(cb: RtHandler): () => void {
    this.rtHandlers.add(cb);
    return () => this.rtHandlers.delete(cb);
  }

  onStatus(cb: StatusHandler): () => void {
    this.statusHandlers.add(cb);
    cb({ state: this.state, error: this.error });
    return () => this.statusHandlers.delete(cb);
  }

  private setStatus(state: SourceState, error?: string): void {
    this.state = state;
    this.error = error;
    this.statusHandlers.forEach((cb) => cb({ state, error }));
  }

  async requestConnect(): Promise<void> {
    if (this.transport) {
      this.transport.onNotify((chunk) => this.handleNotify(chunk));
      this.startPolling();
      return;
    }
    this.setStatus("connecting");
    try {
      const bt = navigator.bluetooth;
      if (!bt) throw new Error("Web Bluetooth unavailable in this browser");
      const device = await bt.requestDevice({
        filters: [{ namePrefix: "ER2" }, { namePrefix: "DuoEK" }],
        optionalServices: [SERVICE_UUID],
      });
      this.name = device.name ?? "ER2";
      device.addEventListener("gattserverdisconnected", () => {
        this.stopPolling();
        this.setStatus("disconnected");
      });
      const gatt = device.gatt;
      if (!gatt) throw new Error("GATT unavailable on this device");
      await gatt.connect();
      const service = await gatt.getPrimaryService(SERVICE_UUID);
      const write = await service.getCharacteristic(WRITE_UUID);
      const notify = await service.getCharacteristic(NOTIFY_UUID);
      await notify.startNotifications();
      notify.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as BluetoothRemoteGATTCharacteristic).value;
        if (view) this.handleNotify(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
      });
      this.transport = {
        send: (bytes) => void write.writeValueWithoutResponse(bytes.slice()),
        onNotify: () => {},
      };
      this.startPolling();
    } catch (err) {
      this.setStatus("error", err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  stop(): void {
    this.stopPolling();
    this.setStatus("disconnected");
  }

  private startPolling(): void {
    this.send(getInfoCmd());
    this.send(getRtDataCmd());
    this.pollTimer = setInterval(() => {
      this.send(getRtDataCmd());
      if (this.state !== "streaming") this.setStatus("streaming");
    }, 1000);
    this.setStatus("streaming");
  }

  private stopPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private send(bytes: Uint8Array): void {
    this.seq = (this.seq + 1) & 0xff;
    this.transport?.send(bytes);
  }

  private handleNotify(chunk: Uint8Array): void {
    for (const frame of this.parser.push(chunk)) {
      if (frame.cmd !== CMD.RT_DATA) continue;
      const payload = frame.payload;
      if (payload.length < 20) continue;
      const dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      const hr = dv.getUint16(0, true);
      const battery = payload[3] ?? 0;
      const recordTimeSec = dv.getUint32(4, true);
      const runStatus = payload[8] ?? 0;
      const leadOn = (runStatus & 0x07) !== 0x07;
      this.param = { hr, battery, leadOn, recordTimeSec, runStatus };
      const sampleCount = Math.max(0, Math.floor((payload.length - 20) / 2));
      if (sampleCount === 0) continue;
      const mv = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        const raw = dv.getInt16(20 + i * 2, true);
        mv[i] = raw === -129 ? 0 : raw * ((1.0035 * 1800) / (4096 * 178.74));
      }
      this.samplesSeen += sampleCount;
      this.deviceMs += (sampleCount / this.fs) * 1000;
      this.trackFs();
      const event: RtEvent = { hr, battery, leadOn, mv, tDeviceMs: this.deviceMs };
      this.rtHandlers.forEach((cb) => cb(event));
    }
  }

  private trackFs(): void {
    const elapsed = this.deviceMs - this.fsWindowStart;
    if (elapsed >= 2000) {
      this.fs = detectFs(this.samplesSeen, elapsed / 1000);
      this.samplesSeen = 0;
      this.fsWindowStart = this.deviceMs;
    }
  }
}
