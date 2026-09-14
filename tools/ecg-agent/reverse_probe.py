#!/usr/bin/env python3
"""
AIECG protocol reverse-engineering probe.

Maps GATT (from prior dump) and tries start/stream command candidates on
ae01/ae03/ae10/ae3b/2d37. Logs every notify. Does NOT touch ae00 (Jieli OTA).

Usage:
  1. Disconnect browser / WeChat from the device
  2. Power on AIECG
  3. python tools/ecg-agent/reverse_probe.py
  4. Hold thumbs/chest electrodes during the listen window

Hits (notify len >= 16 after a write) are printed as HIT — those payloads
are candidates to wire into agent.py / webBluetoothEcg.ts.
"""

from __future__ import annotations

import argparse
import asyncio
import struct
import time
from collections import defaultdict

from bleak import BleakClient, BleakScanner

MAC_HINT = "90:26:05:06:F3:34"

AE30 = "0000ae30-0000-1000-8000-00805f9b34fb"
AE01 = "0000ae01-0000-1000-8000-00805f9b34fb"
AE02 = "0000ae02-0000-1000-8000-00805f9b34fb"
AE03 = "0000ae03-0000-1000-8000-00805f9b34fb"
AE04 = "0000ae04-0000-1000-8000-00805f9b34fb"
AE05 = "0000ae05-0000-1000-8000-00805f9b34fb"
AE10 = "0000ae10-0000-1000-8000-00805f9b34fb"
AE3A = "0000ae3a-0000-1000-8000-00805f9b34fb"
AE3B = "0000ae3b-0000-1000-8000-00805f9b34fb"
AE3C = "0000ae3c-0000-1000-8000-00805f9b34fb"
C2D37 = "00002d37-0000-1000-8000-00805f9b34fb"
C2DF7 = "00002df7-0000-1000-8000-00805f9b34fb"


def candidates() -> list[tuple[str, bytes, str]]:
    """(uuid, payload, label)."""
    out: list[tuple[str, bytes, str]] = []

    def add(uuid: str, data: bytes, label: str) -> None:
        out.append((uuid, data, label))

    for b in range(0, 0x20):
        add(AE01, bytes([b]), f"ae01_u8_{b:02x}")
    add(AE01, bytes.fromhex("55aa0100"), "ae01_55aa0100")
    add(AE01, bytes.fromhex("55aa0101"), "ae01_55aa0101")
    add(AE01, bytes.fromhex("55aa0001"), "ae01_55aa0001")
    add(AE01, bytes.fromhex("a55a0100"), "ae01_a55a0100")
    add(AE01, bytes.fromhex("a55a0001"), "ae01_a55a0001")
    add(AE01, bytes.fromhex("aa550100"), "ae01_aa550100")
    add(AE01, bytes.fromhex("fe0108117531"), "ae01_ecm_partial")
    for cmd in (0x01, 0x02, 0x03, 0x08, 0x10, 0x20, 0x30, 0x80, 0x81):
        add(AE01, bytes([0x02, cmd]), f"ae01_len2_{cmd:02x}")
        add(AE01, bytes([0x03, cmd, 0x00]), f"ae01_len3_{cmd:02x}")
        add(AE01, bytes([0x04, cmd, 0x00, 0x00]), f"ae01_len4_{cmd:02x}")
        add(AE01, bytes([0xA5, 0x5A, cmd, 0x00]), f"ae01_a55a_{cmd:02x}")
        add(AE01, bytes([0x55, 0xAA, cmd, 0x00]), f"ae01_55aa_{cmd:02x}")
        add(AE01, struct.pack("<BBH", 0x55, 0xAA, cmd), f"ae01_55aa_u16_{cmd:02x}")

    for secs in (1, 5, 10, 30, 60):
        add(AE01, bytes([0x01, secs]), f"ae01_01_dur_{secs}")
        add(AE01, bytes([0x55, 0xAA, 0x01, secs]), f"ae01_55aa01_dur_{secs}")
        add(AE01, bytes([0x55, 0xAA, 0x02, secs]), f"ae01_55aa02_dur_{secs}")
        add(AE01, struct.pack("<BBH", 0x55, 0xAA, secs), f"ae01_55aa_dur16_{secs}")

    for b in (0x00, 0x01, 0x02, 0x03, 0x10):
        add(AE03, bytes([b]), f"ae03_{b:02x}")
        add(AE3B, bytes([b]), f"ae3b_{b:02x}")

    for payload in (
        bytes([0x01, 0x00, 0x00, 0x00]),
        bytes([0x00, 0x00, 0x00, 0x01]),
        bytes([0x01, 0x00, 0x00, 0x1E]),
        bytes([0x1E, 0x00, 0x00, 0x00]),
        bytes([0xFF, 0xFF, 0xFF, 0xFF]),
        bytes.fromhex("55aa0100"),
    ):
        add(AE10, payload, f"ae10_{payload.hex()}")

    for payload in (
        bytes([0x01]),
        bytes([0x01, 0x00]),
        bytes.fromhex("55aa0100"),
        bytes.fromhex("0100001e"),
    ):
        add(C2D37, payload, f"2d37_{payload.hex()}")
        add(C2DF7, payload, f"2df7_{payload.hex()}")

    return out


async def find_device(timeout: float):
    d = await BleakScanner.find_device_by_address(MAC_HINT, timeout=timeout)
    if d:
        return d
    for x in await BleakScanner.discover(timeout=timeout):
        if x.name and "AIECG" in x.name.upper():
            return x
    return None


async def run(listen_s: float, gap_s: float) -> None:
    print("Scanning for AIECG… (disconnect browser/WeChat first)")
    device = await find_device(25.0)
    if not device:
        raise SystemExit("AIECG not found / not advertising")

    print(f"Connecting {device.name} {device.address}")
    stats: dict[str, int] = defaultdict(int)
    last_label = {"v": "-"}
    hits: list[str] = []

    def on_notify(sender, data: bytearray):
        raw = bytes(data)
        stats["n"] += 1
        if len(raw) >= 16:
            stats["long"] += 1
            msg = f"HIT after={last_label['v']} len={len(raw)} hex={raw.hex(' ')}"
            print(msg, flush=True)
            hits.append(msg)
        else:
            print(f"ACK after={last_label['v']} len={len(raw)} hex={raw.hex(' ')}", flush=True)

    async with BleakClient(device, timeout=40.0) as client:
        print("connected", client.is_connected)
        for uuid in (AE02, AE04, AE05, AE3C, C2D37, C2DF7):
            try:
                await client.start_notify(uuid, on_notify)
                print("subscribed", uuid)
            except Exception as e:
                print("sub fail", uuid, e)

        try:
            await client.start_notify(AE05, on_notify)
        except Exception:
            pass

        probes = candidates()
        print(f"Probing {len(probes)} payloads… hold electrodes")
        t0 = time.time()
        for uuid, payload, label in probes:
            last_label["v"] = label
            try:
                await client.write_gatt_char(uuid, payload, response=False)
            except Exception as e:
                print("write fail", label, e)
            await asyncio.sleep(gap_s)

        print(f"Listening extra {listen_s}s…")
        await asyncio.sleep(listen_s)
        elapsed = time.time() - t0
        print(f"DONE elapsed={elapsed:.1f}s notifies={stats['n']} long>={16}:{stats['long']}")
        if hits:
            print("--- HIT SUMMARY ---")
            for h in hits:
                print(h)
        else:
            print("No multi-sample frames. Need WeChat HCI capture for start command.")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--listen", type=float, default=8.0)
    p.add_argument("--gap", type=float, default=0.25, help="seconds between writes")
    args = p.parse_args()
    asyncio.run(run(args.listen, args.gap))


if __name__ == "__main__":
    main()
