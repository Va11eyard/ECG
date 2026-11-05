# ER2-C Dual-Device ECG — Design Spec

Date: 2026-11-05
Status: draft for review
Owner-requested baseline: the requirements block supplied in chat (BLE specifics, sync engine, Einthoven derivation, UI, export). This document validates it against the official Viatom source and adds the engineering decisions needed to build it.

## 1. Goal

Update the AIECG product so a clinic or home operator can attach **one or two LEPU Medical ER2-C (DuoEK family) single-channel recorders** and get a correctly analyzed ECG dashboard:

- 1 equipment → 1 channel (Device A raw lead).
- 2 equipments → 3 channels (I, II, III) or 6 channels (I, II, III, aVR, aVL, aVF) via Einthoven derivation, with the two independent hardware streams software-synchronized.

Surfaces: the `web/` dashboard (capture + analysis) and the `site/` landing (capability copy). The existing AIECG (问心无恙) Web Bluetooth path stays working unchanged.

## 2. Device protocol (validated against official Viatom source)

Source of truth: `github.com/viatom-develop/LepuBle` (Android demo, model `MODEL_ER2` runs `Er1Fragment`/`Er1BleManager`). Reference clone used for this spec: `/tmp/LepuBle` at HEAD 2026-11-05. All facts below were read from that code.

**BLE**
- Advertised name prefixes: `ER2`, `DuoEK`.
- Service UUID: `14839ac4-7d7e-415c-9a42-167340cf2339`
- Write characteristic: `8B00ACE7-EB0B-49B0-BBE9-9AEE0A26E1A3`
- Notify characteristic: `0734594A-A8E7-4B1A-A6B1-CD5243059A57`

**Command frame (host → device)**
```
[0]=0xA5  [1]=cmd  [2]=~cmd  [3]=0x00  [4]=seqNo  [5..6]=len (uint16 LE)  [7..]=payload  [last]=CRC8
```
- CRC8: standard CRC-8/ATM, polynomial 0x07 (table in `BleCRC.java`; JS port uses the same table or bitwise poly 0x07, MSB-first, init 0x00).
- Relevant commands: `GET_INFO = 0xE1` (device info), `RT_RRI = 0x07` with payload `0xFA` (start R-peak-to-R-peak interval stream), `READ_FILE_LIST = 0xF1` (stored recordings).

**Notification frames (device → host)**
Same framing. `cmd` distinguishes payloads:
- `RT_DATA = 0x03`: 20-byte param block + wave samples. Param: `hr` (u16 @0), `sysFlag` @2, `battery` % @3, `recordTime` u32 @4, `runStatus` @8 with `leadOn = (b8 & 0x07) != 0x07`. Wave: int16 LE samples.
- `RT_RRI = 0x07` response: RRI intervals with unix time (optional secondary stream).

**Correction to the baseline notes**: `0x07` is the RRI-stream command, not the wave-stream starter. The wave stream is **polled**: the host re-sends `RT_DATA (0x03)` with payload `0x7D` (samples per poll) every 1000 ms — ported from `UniversalBleCmd.getRtData()` and the demo's 1 s `RtTask`. We subscribe, send `GET_INFO` once, then poll `RT_DATA`; `RT_RRI` is optional and off by default.

**Sample conversion** (exactly as specified and as in `Er1DataController.byteTomV`):
```
mV = n * (1.0035 * 1800) / (4096 * 178.74)   // ≈ n * 0.002467 mV/LSB
0xFF7F sentinel decodes to 0 mV
```

**Sample rate**: the wave frames do not declare fs. Auto-detect per device: accumulate samples over a ~2 s window, divide by elapsed device-side recordTime delta (param block), snap to the nearer of 125 or 250 Hz. Re-check if the estimate drifts > 5%.

## 3. Architecture

New feature folder `web/src/features/ecg/lib/er2/` (additive; existing `webBluetoothEcg.ts` untouched):

```
web/src/features/ecg/lib/er2/
  protocol.ts    — CRC8, frame builder/parser with 0xA5 resync, command builders
                   (getInfo, rtRri), typed decoders (RtData: param+wave)
  device.ts      — Er2Device: Web Bluetooth wrapper. requestDevice(filters),
                   GATT connect, notify subscribe, frame reassembly, mV output,
                   per-device state: {hr, battery, leadOn, fs, samples ring}
  pairSync.ts    — dual-stream sync engine (section 4)
  derive.ts      — Einthoven matrix + per-lead polarity application
  session.ts     — recording session store + export (JSON + CSV)
web/src/features/ecg/ui/
  Er2LiveDashboard.tsx   — the 1/3/6-channel dashboard (section 5)
  (existing EcgLiveView.tsx keeps its route; a device-kind chooser is added)
```

Data flow: `Er2Device` (per device) → frame parser → `{tDevice, mV}[]` ring buffer → `pairSync` emits aligned `{t, I, II}` windows → `derive` produces the 6-lead matrix → renderer + analyzer + session recorder consume aligned windows. One-way flow, no shared mutable state.

## 4. Sync engine (two independent clocks)

Per the baseline: local arrival timestamps are ignored for alignment; R-peaks are the clock.

1. **R-peak detection (online, per stream)**: derivative + adaptive threshold on the incoming mV stream (reuse the R-peak logic already in `analyzeStrip.ts` where possible). Each peak recorded as `{tDevice, amplitude}`.
2. **Anchor**: Device A (Lead I) is the timeline anchor.
3. **Offset estimation**: every ~2 s, cross-correlate the two peak trains over the last ~10 s (interval-ratio check first: if mean RR differs > 10%, the streams are not the same heart — warn and keep channels independent). Offset = the lag maximizing correlation of the peak indicator trains.
4. **Drift**: track offset over time; fit slope (ppm). Device B is resampled onto A's timeline with linear interpolation at `tB_render = tA + offset(tA)` before derivation. Offset changes are slew-limited so the visible trace never jumps.
5. **Quality metric**: `sync: {offsetMs, driftPpm, peakMatchRatio}` shown in the dashboard; below threshold → "syncing" badge, derivation still computed but marked unsynchronized.

Single-device mode skips this entirely.

## 5. Dashboard UI (`Er2LiveDashboard.tsx`)

- **Device manager**: "Connect device A" / "Connect device B" buttons (Web Bluetooth chooser, filtered to `ER2`/`DuoEK` + the service UUID). Per-device badges: name, HR, battery %, lead-on, detected fs, sync state. Connecting B unlocks 3/6-channel modes.
- **Channel layout toggle**: `1` (Device A raw), `3` (I, II, III), `6` (I, II, III, aVR, aVL, aVF stacked, shared time axis). Mode 3/6 disabled until both devices stream and sync confidence is positive; switching re-renders lanes without losing buffers.
- **Medical grid**: each lane renders a red/pink ECG grid (5 mm minor / bold 25 mm major lines like the site hero) behind the trace. Timebase toggle `25 mm/s | 50 mm/s`, gain fixed at `10 mm/mV`. PX_PER_MM is a display calibration constant (documented; screen rendering, not print calibration).
- **Polarity control**: per-lane `±` toggle multiplying that lead's array by −1 (for upside-down placement). Raw leads I/II keep their own toggles; derived leads follow their sources (III follows II−I as computed from possibly-inverted sources, so polarity is applied at the lane-render level for raw and derived alike).
- **Analysis panel**: per-lane metrics from the existing analyzer (`analyzeStrip.ts`): HR, R-peak count, interval variability for the session window; screening-only framing preserved.
- **Session export**: patient metadata form (id, name/alias, age, sex, notes) + placement notes per device. `Export JSON` (documented schema: `patient`, `placements`, `devices[{name, id, fs, batteryStart}]`, `sync{offsetMs,driftPpm}`, `fs`, `leads{I,II,III,aVR,aVL,aVF}` as aligned mV arrays) and `Export CSV` (long table `t_ms, I, II, III, aVR, aVL, aVF`). Export covers exactly the synchronized window; unsynced tails are excluded and stated in the header.
- **Errors**: lead-off (from `leadOn`) → amber lane banner; device disconnect → red banner + auto-reconnect attempt; sync lost → dashboard-wide badge.

## 6. Landing site update (`site/`)

Superseded by the design program in `2026-11-05-kindred-ecg-design-system.md`: the landing is rebuilt on the Kindred dot-matrix design (signal-red underglow, all-light sections), and the dashboard adopts the same token system with the Ритм red-paper ECG strips replacing the generic grid described in section 5. Functionality in sections 3-5 and 7-9 of this document is unchanged.

## 7. Testing strategy

- **Unit (vitest, added as devDependency to `web/`)**: CRC8 vectors (computed from the demo's table), frame builder round-trip, parser resync on fragmented/garbled streams, mV conversion values, derivation math on synthetic beats, sync engine offset recovery on synthetic streams with known skew (e.g. 187 ms offset + 30 ppm drift) and interval-mismatch warning, fs auto-detection.
- **Browser verification**: Playwright pass over the dashboard using a **dev-only simulator** that feeds synthetic ER2 packets (two virtual devices, known skew) through the real protocol → device → sync → derive pipeline, so 1/3/6 modes, grid, polarity, export are verified without hardware. Screenshots inspected at 1440×900 and 390×844.
- **Real hardware**: final verification with the physical ER2-C units is the owner's click-through (Web Bluetooth needs a user gesture per device); hand-over includes a short connect checklist.

## 8. Non-goals

No InLab/backend changes, no file-download (F1–F4) transfer in v1 (live streams only), no 12-lead, no print/PDF export, no mobile-app packaging.

## 9. Provenance

- Viatom LepuBle demo (official): service/char UUIDs, framing, CRC8, param layout, mV formula, ER2→Er1 stack mapping.
- Baseline requirements block supplied by the owner (sync approach, Einthoven formulas, UI toggles, export intent) — preserved; corrections: RT stream start behavior, drift handling added, sync quality metric added, export schema made explicit.
