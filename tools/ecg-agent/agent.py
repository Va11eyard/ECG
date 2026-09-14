#
#
#

from __future__ import annotations

import argparse
import asyncio
import json
import struct
import sys
import time
from pathlib import Path

import requests

try:
    from bleak import BleakClient, BleakScanner
except ImportError:
    print("Install bleak: pip install bleak", file=sys.stderr)
    sys.exit(1)

AE30 = "0000ae30-0000-1000-8000-00805f9b34fb"
AE00 = "0000ae00-0000-1000-8000-00805f9b34fb"
AE01 = "0000ae01-0000-1000-8000-00805f9b34fb"
AE02 = "0000ae02-0000-1000-8000-00805f9b34fb"
AE03 = "0000ae03-0000-1000-8000-00805f9b34fb"
AE04 = "0000ae04-0000-1000-8000-00805f9b34fb"
AE05 = "0000ae05-0000-1000-8000-00805f9b34fb"
AE3C = "0000ae3c-0000-1000-8000-00805f9b34fb"

TOKEN_PATH = Path.home() / ".inlab-ecg-agent.json"


def normalize_mac(mac: str) -> str:
    mac = mac.strip().upper().replace("-", ":")
    if ":" not in mac and len(mac) == 12:
        mac = ":".join(mac[i : i + 2] for i in range(0, 12, 2))
    return mac


def save_creds(api: str, device_id: str, token: str, mac: str, name: str) -> None:
    TOKEN_PATH.write_text(
        json.dumps({"api": api, "device_id": device_id, "token": token, "mac": mac, "name": name}, indent=2),
        encoding="utf-8",
    )
    print(f"Saved credentials → {TOKEN_PATH}")


def load_creds() -> dict | None:
    if not TOKEN_PATH.exists():
        return None
    return json.loads(TOKEN_PATH.read_text(encoding="utf-8"))


def claim(api: str, code: str, mac: str, name: str) -> dict:
    r = requests.post(
        f"{api.rstrip('/')}/api/ecg/claim",
        json={"code": code, "mac": mac, "name": name},
        timeout=30,
    )
    r.raise_for_status()
    body = r.json()
    if not body.get("ok"):
        raise RuntimeError(body)
    return body["data"]


def post_samples(api: str, token: str, fs_hz: float, samples: list[float], raw_hex: str, seq: int) -> None:
    r = requests.post(
        f"{api.rstrip('/')}/api/ecg/agent/samples",
        headers={"Authorization": f"Bearer {token}"},
        json={"type": "samples", "fs_hz": fs_hz, "samples_mv": samples, "raw_hex": raw_hex, "seq": seq},
        timeout=10,
    )
    r.raise_for_status()


def post_status(api: str, token: str, status: str) -> None:
    try:
        requests.post(
            f"{api.rstrip('/')}/api/ecg/agent/status",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": status},
            timeout=10,
        )
    except Exception as e:
        print("status post failed:", e)


def char_in_service(client: BleakClient, service_uuid: str, char_uuid: str):
    svc = next((s for s in client.services if s.uuid.lower() == service_uuid.lower()), None)
    if not svc:
        return None
    return next((c for c in svc.characteristics if c.uuid.lower() == char_uuid.lower()), None)


def decode_samples(data: bytes) -> list[float]:
    """Decode AIECG notify frames to approximate mV.

    Observed live format (20 bytes):
      uint16_be seq
      9 × uint16_be ADC samples (baseline ~0x05F0 / 1520)
    Short 1–8 byte ACKs are ignored.
    """
    if len(data) < 16:
        return []
    if len(data) >= 20 and len(data) % 20 == 0:
        out: list[float] = []
        for base in range(0, len(data), 20):
            for i in range(base + 2, base + 20, 2):
                v = struct.unpack_from(">H", data, i)[0]
                out.append((v - 1520) / 200.0)
        return out if len(out) >= 8 else []
    offset = 0
    if len(data) % 2 == 1:
        offset = 1
    elif data[0] in (0xA5, 0x55, 0xAA):
        offset = 2 if (len(data) - 2) % 2 == 0 else 4
    out = []
    for i in range(offset, len(data) - 1, 2):
        v = struct.unpack_from("<h", data, i)[0]
        out.append(v / 1000.0)
    return out if len(out) >= 8 else []


async def find_device(mac: str | None, timeout: float = 25.0):
    if mac:
        d = await BleakScanner.find_device_by_address(mac, timeout=timeout)
        if d:
            return d
    print("Scanning for AIECG…")
    devices = await BleakScanner.discover(timeout=timeout)
    for d in devices:
        if d.name and "AIECG" in d.name.upper():
            return d
    return None


async def run_stream(api: str, token: str, mac: str | None) -> None:
    device = await find_device(mac)
    if not device:
        raise SystemExit("AIECG not found. Power on the device and retry.")
    addr = normalize_mac(device.address)
    print(f"Connecting {device.name} {addr}")

    seq = 0
    batch: list[float] = []
    raw_parts: list[str] = []
    last_flush = time.time()

    def flush():
        nonlocal batch, raw_parts, seq, last_flush
        if len(batch) < 8:
            if raw_parts:
                print(f"skip flush (n={len(batch)} ack/handshake)")
            batch = []
            raw_parts = []
            last_flush = time.time()
            return
        seq += 1
        try:
            post_samples(api, token, 125.0, batch, " ".join(raw_parts), seq)
            print(f"sent seq={seq} n={len(batch)}")
        except Exception as e:
            print("ingest failed:", e)
        batch = []
        raw_parts = []
        last_flush = time.time()

    def on_notify(_sender, data: bytearray):
        nonlocal batch, raw_parts
        raw = bytes(data)
        print(f"NOTIFY len={len(raw)} hex={raw.hex(' ')}")
        samples = decode_samples(raw)
        if not samples:
            return
        raw_parts.append(raw.hex(" "))
        batch.extend(samples)

    async with BleakClient(device, timeout=40.0) as client:
        print("connected", client.is_connected)
        post_status(api, token, "online")

        ae02 = char_in_service(client, AE30, AE02) or char_in_service(client, AE00, AE02)
        ae04 = char_in_service(client, AE30, AE04)
        ae05 = char_in_service(client, AE30, AE05)
        ae01 = char_in_service(client, AE30, AE01)
        ae03 = char_in_service(client, AE30, AE03)
        ae3c = char_in_service(client, "0000ae3a-0000-1000-8000-00805f9b34fb", AE3C)
        c2d37 = char_in_service(client, "00002dee-0000-1000-8000-00805f9b34fb", "00002d37-0000-1000-8000-00805f9b34fb")

        for ch in (ae02, ae04, ae05, ae3c, c2d37):
            if ch is None:
                continue
            try:
                await client.start_notify(ch, on_notify)
                print("subscribed", ch.uuid, "handle", ch.handle)
            except Exception as e:
                print("subscribe fail", ch.uuid, e)

        if ae03 is not None:
            try:
                await client.write_gatt_char(ae03, bytes([0x01]), response=False)
                print("wrote ae03 01")
            except Exception as e:
                print("ae03 write fail", e)
        if ae01 is not None:
            try:
                await client.write_gatt_char(ae01, bytes([0x01]), response=False)
                print("wrote ae01 01")
            except Exception as e:
                print("ae01 write fail", e)

        print("Streaming… Ctrl+C to stop")
        try:
            while True:
                await asyncio.sleep(0.2)
                if time.time() - last_flush >= 0.4:
                    flush()
        finally:
            flush()
            post_status(api, token, "offline")


async def main_async(args: argparse.Namespace) -> None:
    api = args.api.rstrip("/")
    creds = load_creds()

    if args.code:
        device = await find_device(args.mac)
        if not device:
            raise SystemExit("AIECG not found for claim")
        mac = normalize_mac(device.address)
        name = device.name or f"AIECG {mac.replace(':', '')}"
        print(f"Claiming {name} {mac} with code {args.code}")
        data = claim(api, args.code, mac, name)
        save_creds(api, data["device_id"], data["agent_token"], data["mac"], data["name"])
        token = data["agent_token"]
        mac = data["mac"]
    else:
        if not creds:
            raise SystemExit("No saved credentials. Run with --code <pair_code> first.")
        api = creds.get("api", api)
        token = creds["token"]
        mac = creds.get("mac")
        print(f"Using saved device {creds.get('device_id')} {mac}")

    await run_stream(api, token, mac)


def main() -> None:
    p = argparse.ArgumentParser(description="InLab AIECG BLE agent")
    p.add_argument("--api", default=os_environ_api(), help="InLab API base URL")
    p.add_argument("--code", default="", help="6-digit pair code from /app/ecg")
    p.add_argument("--mac", default="", help="Optional MAC filter")
    args = p.parse_args()
    try:
        asyncio.run(main_async(args))
    except KeyboardInterrupt:
        print("bye")


def os_environ_api() -> str:
    import os

    return os.environ.get("INLAB_API", "http://127.0.0.1:8080")


if __name__ == "__main__":
    main()
