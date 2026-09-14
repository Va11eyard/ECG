
interface Bluetooth {
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
  getDevices?(): Promise<BluetoothDevice[]>;
}

type BluetoothServiceUUID = string | number;

interface BluetoothRequestDeviceFilter {
  namePrefix?: string;
  name?: string;
  services?: BluetoothServiceUUID[];
}

interface RequestDeviceOptions {
  filters?: BluetoothRequestDeviceFilter[];
  optionalServices?: BluetoothServiceUUID[];
  acceptAllDevices?: boolean;
}

interface BluetoothDevice extends EventTarget {
  readonly id: string;
  readonly name?: string | null;
  readonly gatt?: BluetoothRemoteGATTServer;
  watchAdvertisements?(options?: { signal?: AbortSignal }): Promise<void>;
  unwatchAdvertisements?(): void;
  addEventListener(
    type: "gattserverdisconnected" | "advertisementreceived",
    listener: (ev: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: "gattserverdisconnected" | "advertisementreceived",
    listener: (ev: Event) => void,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean;
  readonly device: BluetoothDevice;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: BluetoothServiceUUID): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  readonly value?: DataView | null;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
  addEventListener(
    type: "characteristicvaluechanged",
    listener: (ev: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: "characteristicvaluechanged",
    listener: (ev: Event) => void,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface Navigator {
  bluetooth?: Bluetooth;
}
