
const AE30 = "0000ae30-0000-1000-8000-00805f9b34fb";
const AE01 = "0000ae01-0000-1000-8000-00805f9b34fb";
const AE02 = "0000ae02-0000-1000-8000-00805f9b34fb";
const AE03 = "0000ae03-0000-1000-8000-00805f9b34fb";
const AE04 = "0000ae04-0000-1000-8000-00805f9b34fb";
const AE05 = "0000ae05-0000-1000-8000-00805f9b34fb";
const AE3A = "0000ae3a-0000-1000-8000-00805f9b34fb";
const AE3C = "0000ae3c-0000-1000-8000-00805f9b34fb";
const C2DEE = "00002dee-0000-1000-8000-00805f9b34fb";
const C2D37 = "00002d37-0000-1000-8000-00805f9b34fb";

const OPTIONAL_SERVICES: BluetoothServiceUUID[] = [AE30, 0xae30, AE3A, 0xae3a, C2DEE, 0x2dee];

export type BleNotifyMeta = {
  len: number;
  hex: string;
  sampleCount: number;
};

export type BleConnectionState =
  | "unsupported"
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type BleErrorCode =
  | "not_found"
  | "security"
  | "gatt"
  | "busy"
  | "unsupported"
  | "cancelled"
  | "generic";

export type EcgBleSession = {
  device: BluetoothDevice;
  name: string;
  mac: string;
  disconnect: () => void;
};

function bluetooth(): Bluetooth | null {
  if (typeof navigator === "undefined") return null;
  return navigator.bluetooth ?? null;
}

export function isWebBluetoothSupported(): boolean {
  return Boolean(bluetooth()?.requestDevice) && (typeof window === "undefined" || window.isSecureContext);
}

export function isSecureBluetoothContext(): boolean {
  return typeof window === "undefined" || window.isSecureContext;
}

export function isLikelyWindows(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Windows/i.test(navigator.userAgent);
}

export function macFromAiecgName(name: string): string {
  const m = name.toUpperCase().match(/AIECG\s*([0-9A-F]{12})/);
  if (!m?.[1]) return name.replace(/\s+/g, "_").toUpperCase();
  const hex = m[1];
  return [0, 2, 4, 6, 8, 10].map((i) => hex.slice(i, i + 2)).join(":");
}

export function bleErrorCode(err: unknown): BleErrorCode {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotFoundError":
        return "not_found";
      case "SecurityError":
        return "security";
      case "NetworkError":
        return "gatt";
      case "InvalidStateError":
        return "busy";
      case "NotSupportedError":
        return "unsupported";
      case "AbortError":
        return "cancelled";
      default:
        return "generic";
    }
  }
  if (err instanceof Error && /GATT|gatt|ae30/i.test(err.message)) return "gatt";
  return "generic";
}

export function formatBleError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err);
}

export function decodeEcgNotify(data: DataView): number[] {
  const len = data.byteLength;
  if (len < 16) return [];

  if (len >= 20 && len % 20 === 0) {
    const out: number[] = [];
    for (let base = 0; base < len; base += 20) {
      for (let i = base + 2; i + 1 < base + 20; i += 2) {
        const v = data.getUint16(i, false);
        if (v < 400 || v > 2800) continue;
        out.push((v - 1520) / 200);
      }
    }
    return out.length >= 8 ? out : [];
  }

  let offset = 0;
  if (len % 2 === 1) offset = 1;
  else {
    const b0 = data.getUint8(0);
    if (b0 === 0xa5 || b0 === 0x55 || b0 === 0xaa) {
      offset = (len - 2) % 2 === 0 ? 2 : 4;
    }
  }
  const out: number[] = [];
  for (let i = offset; i + 1 < len; i += 2) {
    out.push(data.getInt16(i, true) / 1000);
  }
  return out.length >= 8 ? out : [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForAdvertisement(device: BluetoothDevice, timeoutMs = 10000): Promise<void> {
  if (typeof device.watchAdvertisements !== "function") return;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      device.removeEventListener("advertisementreceived", onAdv);
      try {
        device.unwatchAdvertisements?.();
      } catch {
      }
      resolve();
    };
    const onAdv = () => finish();
    const timer = window.setTimeout(finish, timeoutMs);
    const watch = device.watchAdvertisements?.bind(device);
    if (!watch) {
      finish();
      return;
    }
    device.addEventListener("advertisementreceived", onAdv);
    void watch().catch(() => finish());
  });
}

async function openGatt(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
  if (!device.gatt) throw new DOMException("GATT unavailable on this device", "NetworkError");

  await waitForAdvertisement(device);

  let last: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      if (device.gatt.connected) {
        try {
          device.gatt.disconnect();
        } catch {
        }
        await sleep(250);
      }
      await device.gatt.connect();
      if (device.gatt.connected) return device.gatt;
      throw new DOMException("GATT connect returned without connection", "NetworkError");
    } catch (e) {
      last = e;
      try {
        device.gatt.disconnect();
      } catch {
      }
      await sleep(500 * attempt);
    }
  }
  throw last instanceof DOMException
    ? last
    : new DOMException(last instanceof Error ? last.message : String(last), "NetworkError");
}

async function subscribeStream(
  server: BluetoothRemoteGATTServer,
  onSamples: (samples: number[]) => void,
  onNotify?: (meta: BleNotifyMeta) => void,
): Promise<() => void> {
  let svc: BluetoothRemoteGATTService | null = null;
  let last: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      svc = await server.getPrimaryService(AE30);
      break;
    } catch (e) {
      last = e;
      await sleep(300 * attempt);
    }
  }
  if (!svc) {
    throw last instanceof DOMException
      ? last
      : new DOMException("AIECG data service (ae30) not found", "NetworkError");
  }

  const handlers: Array<{ char: BluetoothRemoteGATTCharacteristic; fn: (ev: Event) => void }> = [];

  const listen = async (uuid: string, service: BluetoothRemoteGATTService = svc!) => {
    try {
      const char = await service.getCharacteristic(uuid);
      const fn = (ev: Event) => {
        const t = ev.target as BluetoothRemoteGATTCharacteristic;
        const value = t.value;
        if (!value) return;
        const samples = decodeEcgNotify(value);
        const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        const hex = Array.from(bytes.slice(0, 24))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        onNotify?.({ len: value.byteLength, hex, sampleCount: samples.length });
        if (samples.length >= 8) onSamples(samples);
      };
      await char.startNotifications();
      char.addEventListener("characteristicvaluechanged", fn);
      handlers.push({ char, fn });
    } catch {
    }
  };

  await listen(AE02);
  await listen(AE04);
  await listen(AE05);
  try {
    const svc3a = await server.getPrimaryService(AE3A);
    await listen(AE3C, svc3a);
  } catch {
  }
  try {
    const svc2dee = await server.getPrimaryService(C2DEE);
    await listen(C2D37, svc2dee);
  } catch {
  }

  try {
    const ae03 = await svc.getCharacteristic(AE03);
    await ae03.writeValueWithoutResponse(Uint8Array.of(0x01));
  } catch {
  }
  try {
    const ae01 = await svc.getCharacteristic(AE01);
    await ae01.writeValueWithoutResponse(Uint8Array.of(0x01));
  } catch {
  }

  return () => {
    for (const { char, fn } of handlers) {
      try {
        char.removeEventListener("characteristicvaluechanged", fn);
        void char.stopNotifications();
      } catch {
      }
    }
  };
}

async function pickAiecgDevice(acceptAll: boolean): Promise<BluetoothDevice> {
  const bt = bluetooth();
  if (!bt) throw new DOMException("Web Bluetooth unsupported", "NotSupportedError");
  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new DOMException("Insecure context", "SecurityError");
  }

  if (acceptAll) {
    return bt.requestDevice({
      acceptAllDevices: true,
      optionalServices: OPTIONAL_SERVICES,
    });
  }

  return bt.requestDevice({
    filters: [{ namePrefix: "AIECG" }, { namePrefix: "ECG" }],
    optionalServices: OPTIONAL_SERVICES,
  });
}

export async function requestAndConnectAiecg(
  onSamples: (samples: number[]) => void,
  onDisconnected: () => void,
  opts?: { acceptAll?: boolean; onNotify?: (meta: BleNotifyMeta) => void },
): Promise<EcgBleSession> {
  const device = await pickAiecgDevice(Boolean(opts?.acceptAll));
  return attachDevice(device, onSamples, onDisconnected, opts?.onNotify);
}

export async function tryAutoConnectAiecg(
  onSamples: (samples: number[]) => void,
  onDisconnected: () => void,
  onNotify?: (meta: BleNotifyMeta) => void,
): Promise<EcgBleSession | null> {
  const bt = bluetooth();
  if (!bt?.getDevices) return null;
  if (typeof window !== "undefined" && !window.isSecureContext) return null;
  if (isLikelyWindows()) return null;
  const devices = await bt.getDevices();
  const aiecg = devices.find((d) => (d.name ?? "").toUpperCase().includes("AIECG"));
  if (!aiecg) return null;
  return attachDevice(aiecg, onSamples, onDisconnected, onNotify);
}

async function attachDevice(
  device: BluetoothDevice,
  onSamples: (samples: number[]) => void,
  onDisconnected: () => void,
  onNotify?: (meta: BleNotifyMeta) => void,
): Promise<EcgBleSession> {
  const name = device.name?.trim() || "AIECG";
  const mac = macFromAiecgName(name);

  const onDisc = () => onDisconnected();
  device.addEventListener("gattserverdisconnected", onDisc);

  try {
    const server = await openGatt(device);
    const stopNotify = await subscribeStream(server, onSamples, onNotify);

    return {
      device,
      name,
      mac,
      disconnect: () => {
        stopNotify();
        device.removeEventListener("gattserverdisconnected", onDisc);
        try {
          device.gatt?.disconnect();
        } catch {
        }
      },
    };
  } catch (e) {
    device.removeEventListener("gattserverdisconnected", onDisc);
    try {
      device.gatt?.disconnect();
    } catch {
    }
    throw e;
  }
}
