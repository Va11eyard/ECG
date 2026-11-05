# ER2-C Dual-ECG + Kindred Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Kindred-ECG design system across landing/login/dashboard and the dual ER2-C capture, sync, derivation, and export pipeline.

**Architecture:** `web/` gains a typed ER2 protocol stack (`lib/er2/`), an `EcgSource` interface with a Web Bluetooth device and a packet-level simulator, a two-clock R-peak sync engine feeding Einthoven derivation, a session recorder with JSON/CSV export, and a React dashboard rendering 1/3/6 lanes as red-paper ECG strips. `site/` is rebuilt on the Kindred dot-matrix engine with synthesized ECG as the luminance source. Login is a new `web/` MPA entry.

**Tech Stack:** React 19, Vite 7, TS 5.9, Tailwind v4, i18next, Web Bluetooth, Canvas 2D; vanilla JS + GSAP for `site/`; vitest for unit tests.

**Specs (read both):**
- `docs/superpowers/specs/2026-11-05-er2c-dual-ecg-design.md` — device protocol, sync, dashboard behavior
- `docs/superpowers/specs/2026-11-05-kindred-ecg-design-system.md` — tokens, landing, login, dashboard theming

## Global Constraints

- BLE: service `14839ac4-7d7e-415c-9a42-167340cf2339`, write `8B00ACE7-EB0B-49B0-BBE9-9AEE0A26E1A3`, notify `0734594A-A8E7-4B1A-A6B1-CD5243059A57`; frames `A5 | cmd | ~cmd | len u16 LE | seq | payload | crc8`; `RT_DATA=0x03` streams automatically on subscribe; mV = `n * (1.0035*1800)/(4096*178.74)`; `0xFF7F` → 0.
- Sync: Device A anchors; R-peak cross-correlation over ~10 s re-estimated every ~2 s; RR mean-ratio mismatch > 10 % → state `independent`; drift in ppm; slew-limited rendering offsets.
- Derivation: `III = II − I`, `aVR = −(I+II)/2`, `aVL = I − II/2`, `aVF = II − I/2`.
- Tokens: `--bg:#f7f7f5`, `--ink:#111111`, `--signal:#b2362d`, ECG paper `#fffdfd` with `#f5dada`/`#e8b9b8` grid; Inter 400/500/600; Caveat 600 only as red handwriting accent; pills 999 px, cards 12 px.
- Copy: English strings module + i18n keys (en/ru/kz), no em dashes, no text-arrow glyphs, no periods in titles, no invented stats/partners; screening disclaimer everywhere ECG analysis appears.
- Zero bitmaps; no external font CDN at runtime; no fake authentication.
- Do not stage the owner's pre-existing uncommitted work outside `web/src`, `web/index.html`, `web/vite.config.ts`, `site/`, `docs/`, `web/package.json`, `web/package-lock.json`, `web/login.html`. Note: `web/` carries uncommitted owner edits — before editing `web/src` files that are dirty (per git status at session start: `analyzeStrip.ts`, `smoothEcg.ts`, `webBluetoothEcg.ts`, `EcgLiveView.tsx`, locales, `vite.config.ts`), make only additive edits and never `git add` beyond files this plan creates/modifies with a recorded diff.

---

### Task 1: Test harness + design tokens + red-paper strip renderer (web/)

**Files:**
- Create: `web/src/shared/design/tokens.css`
- Create: `web/src/shared/ecg/redPaperStrip.ts`, `web/src/shared/ecg/redPaperStrip.test.ts`
- Modify: `web/src/app/styles/globals.css` (append `@import "./../../shared/design/tokens.css";` at top after tailwind imports), `web/package.json` (devDeps: `vitest`; deps: `@fontsource/inter`; script `test: vitest run`), `web/src/main.tsx` and `web/src/fitrus/main.tsx` (Inter imports replace Geist)

**Interfaces (produced):**
- `tokens.css` defines every var from design-system spec section 1.
- `drawStrip(ctx, samples: Float32Array, fs: number, o: StripOpts): void` where `StripOpts = {width,height,dpr?,mmPerSec:25|50,pxPerMm,gainMmPerMv,polarity?,label?,hr?}`; pure, no internal state — dashboard lanes use it per frame; tests use it headlessly via a stub context.

- [ ] **Step 1:** Read `Er1BleResponse.kt` lines 14-110 and `Er1BleInterface.kt` frame accumulation (`/tmp/LepuBle/app/src/main/java/com/lepu/lepuble/ble/`) to confirm the inbound frame layout byte-for-byte; record it in `protocol.ts` header comment in Task 2 (informational read, no code).
- [ ] **Step 2:** `npm i -D vitest && npm i @fontsource/inter` in `web/`; add `"test": "vitest run"` script; vitest defaults (environment node) need no config — add `test: { environment: "node" }` via `vitest.config.ts` only if defaults fail.
- [ ] **Step 3 (failing test):** `redPaperStrip.test.ts` — grid math and calibration: `pxPerMm=3.78, mmPerSec=25, fs=250, gain=10` → a 1 mV DC input for 1 s draws pixels whose count equals `round(fs*pxPerMm*(1/mmPerSec)/1)` within tolerance; polarity=true flips sign of the rendered offset (probe via the exported helper `sampleToY(mv, o)` — export it for tests). Run `npm test` → fails (module missing).
- [ ] **Step 4:** Implement `redPaperStrip.ts` (paper bg, 1 mm/5 mm grid via `--grid-minor/--grid-major` literals `#f5dada/#e8b9b8` on `#fffdfd`, ink trace, label/HR chips drawn as text, `sampleToY` helper). `npm test` → pass.
- [ ] **Step 5:** Tokens CSS + Inter imports. `npx tsc -b` clean. Commit `feat(web): design tokens and red-paper ECG strip renderer`.

### Task 2: ER2 protocol module (web/) — TDD

**Files:**
- Create: `web/src/features/ecg/lib/er2/protocol.ts`, `web/src/features/ecg/lib/er2/protocol.test.ts`

**Interfaces (produced):**
```ts
export const CMD = { RT_DATA: 0x03, RT_RRI: 0x07, GET_INFO: 0xe1 } as const;
export function crc8(b: Uint8Array): number;                    // CRC-8/ATM poly 0x07, init 0
export function buildFrame(cmd: number, payload?: Uint8Array, seq?: number): Uint8Array;
export function getInfoCmd(): Uint8Array; export function rtRriCmd(): Uint8Array;
export class FrameParser { push(chunk: Uint8Array): Frame[] }   // resyncs on 0xA5, validates ~cmd + crc8
export type Frame = { cmd: number; seq: number; payload: Uint8Array };
export type RtParam = { hr: number; battery: number; leadOn: boolean; recordTimeSec: number; runStatus: number };
export const MV_PER_LSB = (1.0035 * 1800) / (4096 * 178.74);
export function decodeRtData(payload: Uint8Array): { param: RtParam; waveMv: Float32Array };
```

- [ ] **Step 1 (failing tests):** `crc8` check value: `crc8(utf8("123456789")) === 0xf4`; `buildFrame(0x07, [0xfa])` layout: `[0]=0xA5,[1]=0x07,[2]=0xF8,[5]=1,[6]=0,[7]=0xFA,last=crc8(head)` and parser round-trips it; `FrameParser` reassembles a frame split across 3 arbitrary cut points and drops garbage before `0xA5`; `decodeRtData`: 20-byte param block (hr=72 u16 LE @0, battery=80 @3, runStatus @8 → leadOn false iff `(b8&7)===7`, recordTime u32 LE @4) + int16-LE wave; sentinel `0xFF7F` → 0 mV; known sample → exact mV via `MV_PER_LSB`. `npm test` → fail.
- [ ] **Step 2:** Implement per interfaces (byte layout exactly as read in Task 1 Step 1). `npm test` → pass. Commit `feat(web): ER2 framed BLE protocol with CRC8 and RT decoding`.

### Task 3: EcgSource — Er2Device + packet simulator (web/)

**Files:**
- Create: `web/src/features/ecg/lib/er2/device.ts`, `web/src/features/ecg/lib/er2/simulator.ts`, `web/src/features/ecg/lib/er2/device.test.ts`

**Interfaces (produced):**
```ts
export type RtEvent = { hr: number; battery: number; leadOn: boolean; mv: Float32Array; tDeviceMs: number };
export type SourceState = "disconnected" | "connecting" | "streaming" | "error";
export interface EcgSource {
  kind: "er2" | "sim"; label: "A" | "B"; name: string; fs: number;
  param: RtParam | null;
  onRt(cb: (e: RtEvent) => void): () => void;
  onStatus(cb: (s: { state: SourceState; error?: string }) => void): () => void;
  requestConnect(): Promise<void>; stop(): void;
}
export class Er2Device implements EcgSource {   // transport injectable for tests/sim
  constructor(label: "A" | "B", transport?: { send(b: Uint8Array): void; onNotify(cb: (c: Uint8Array) => void): void });
}
export class SimDevice implements EcgSource {   // frames go through protocol.ts, not around it
  constructor(label: "A" | "B", opts?: { fs?: 125 | 250; hr?: number; skewMs?: number; driftPpm?: number; leadOffAfterSec?: number });
}
export function detectFs(samplesInWindow: number, windowSec: number): 125 | 250;
```

- [ ] **Step 1 (failing test):** `SimDevice(skewMs:187)` streams for 3 s simulated time (fake timers) → `detectFs` returns configured fs; events arrive with monotone `tDeviceMs`; `Er2Device` fed a transport that replays captured notify chunks emits identical events (protocol→device integration). `npm test` → fail.
- [ ] **Step 2:** Implement `device.ts` (requestDevice filters: `[{namePrefix:"ER2"},{namePrefix:"DuoEK"}]`, `optionalServices:[service uuid]`; subscribe notify; send `getInfoCmd()` after start; fs auto-detect window 2 s; auto-reconnect once on `gattserverdisconnected`) and `simulator.ts` (HR-driven beat synthesizer identical math to `site/src/trace.js` `beat()` ported to TS; param block per decode layout; device clock = `t0 + Σ samples/fs * (1 + driftPpm·1e-6) + skewMs`). `npm test` → pass. Commit `feat(web): ER2 Web Bluetooth device with packet-level simulator`.

### Task 4: PairSync + derive + session (web/) — TDD

**Files:**
- Create: `web/src/features/ecg/lib/er2/pairSync.ts`, `derive.ts`, `session.ts` + `pairSync.test.ts`, `derive.test.ts`, `session.test.ts`

**Interfaces (produced):**
```ts
export type SyncState = "solo" | "searching" | "locked" | "independent";
export type AlignedWindow = { tStartMs: number; fs: number; I: Float32Array; II: Float32Array;
  sync: { state: SyncState; offsetMs: number; driftPpm: number; matchRatio: number } };
export class PairSync {
  constructor(opts?: { windowSec?: number; reestimateSec?: number; bufferSec?: number });
  pushA(e: RtEvent): void; pushB(e: RtEvent): void; solo(): void;
  pull(): AlignedWindow | null;   // next ~0.5 s aligned chunk, resampled onto A timeline, slew-limited
}
export function einthoven(I: Float32Array, II: Float32Array): { III: Float32Array; aVR: Float32Array; aVL: Float32Array; aVF: Float32Array };
export type PatientMeta = { id: string; name: string; age: string; sex: "" | "m" | "f"; notes: string };
export type Placement = { device: "A" | "B"; lead: "I" | "II"; note: string };
export class SessionRecorder {
  start(meta, placements: Placement[], devices: { name: string; fs: number }[]): void;
  addWindow(w: AlignedWindow): void;   // dual: only sync.state==="locked" windows kept
  stop(): void; get sampleCount(): number;
  exportJson(): string; exportCsv(): string;
}
```

- [ ] **Step 1 (failing tests):** `einthoven` on constant arrays `I=1.0, II=2.0` → `III=1.0, aVR=−1.5, aVL=0, aVF=1.5` (Float32 exactness within 1e-6). `PairSync` fed `SimDevice`-generated streams (A at 0 ms, B at +187 ms skew, drift 30 ppm, same hr 72) locks within 5 s simulated and reports `|offsetMs−187| < 25`, then tracks drift within ±15 ppm. A second case with hr 72 vs hr 95 → `independent`. `SessionRecorder.exportJson()` parses and contains `patient, placements, devices, sync, fs, leads{I,II,III,aVR,aVL,aVF}` with equal-length arrays; `exportCsv()` header `t_ms,I,II,III,aVR,aVL,aVF` and row count matches. `npm test` → fail.
- [ ] **Step 2:** Implement. R-peak detection: reuse the peak logic from `web/src/features/ecg/lib/analyzeStrip.ts` where its API allows; else online derivative+threshold detector local to `pairSync.ts` (document choice in code by structure, no comments). Resample B by linear interpolation at `tA + offset(tA)`; offset slew limit `2 ms/s`. `npm test` → pass. Commit `feat(web): dual-clock R-peak sync, Einthoven derivation, session export`.

### Task 5: ER2 dashboard UI (web/)

**Files:**
- Create: `web/src/features/ecg/ui/er2/Er2LiveDashboard.tsx`, `DevicePanel.tsx`, `LaneStrip.tsx`, `ExportDialog.tsx`, `useEr2Session.ts`
- Modify: `web/src/main.tsx` (shell with view switch: `AIECG live` → `EcgLiveView`, `ER2 dashboard` → `Er2LiveDashboard`, `Sign in` → `/login.html`), `web/src/shared/lib/i18n/locales/{en,ru,kz}.json` (namespace `er2.*`, `login.*`), `web/vite.config.ts` (input += login — Task 6)

**Behavior (spec sections 4-5, design section 4):**
- `useEr2Session`: holds `EcgSource` A/B, `PairSync`, recorder; `?sim=1` query param constructs `SimDevice`s (skew 187 ms, drift 30 ppm) instead of `Er2Device`; exposes state machine + aligned windows via rAF pull loop into lane canvases.
- Lanes render incrementally (port of the site's shift-and-paint approach: `drawImage` self-shift + new-segment strip paint incl. grid) at the pull cadence; `mmPerSec` toggle 25/50; mode toggle 1/3/6 gated on B connected + `sync.state!=="independent"`; per-lane `±` polarity pill re-renders that lane from a small static buffer; HR/battery/lead-on/sync chips from device params; lead-off amber banner, disconnect red banner + one reconnect attempt; sync chip states per design tokens.
- Analysis chips per lane: HR + peak count from existing `analyzeStrip` over the retained window; screening disclaimer line under the grid.
- Export dialog card on scrim: patient meta + placement notes inputs, JSON/CSV buttons wired to `SessionRecorder` downloads.

- [ ] **Step 1:** `npx tsc -b` clean; `npm run build` passes. Commit `feat(web): ER2 live dashboard with 1/3/6-channel lanes, sync chips, export`.
- [ ] **Step 2 (manual code check):** confirm no lane redraws full strips per frame (grep for `clearRect` in `LaneStrip.tsx` — only in resize path).

### Task 6: Login page (web/)

**Files:**
- Create: `web/login.html`, `web/src/login/main.tsx`, `web/src/login/LoginView.tsx`, `web/src/login/dotBand.ts` (static single-pose dot-matrix ECG band, engine ported from Task 7 Step 1 constants)
- Modify: `web/vite.config.ts` (input += `login`), i18n locales (`login.*`)

**Behavior (design spec section 3):** centered card (mark, "Sign in", email+password, black pill with signal-red underglow, muted link to `/`), `VITE_AUTH_URL` set → POST `{email,password}` (JSON, credentials omit) and surface ok/error; unset → amber demo notice + "Continue to dashboard" link. Dot band along bottom edge, static render, honors `prefers-reduced-motion` trivially (no animation).

- [ ] **Step 1:** `npm run build` passes; manual probe of both auth modes in browser in Task 8. Commit `feat(web): login page with Kindred design and auth slot`.

### Task 7: Landing v2 (site/)

**Files:**
- Create: `site/src/dots.js` (Kindred-ECG engine)
- Rewrite: `site/index.html`, `site/src/hero.js`, `site/src/hero.css`, `site/src/spotlight.css`, `site/src/tiles.js`, `site/src/strings/en.js`
- Modify: `site/src/spotlight.js` (label classes unchanged; tiles dot-motif draw call), `site/package.json` (+`@fontsource/inter`), `site/assets.json` (keep Caveat entry only), `site/download-assets.mjs` (unchanged — verifies remaining entry)
- Delete: `site/src/trace.js`, `site/public/fonts/league-gothic.woff`, `Anton-Regular.ttf`, `DMSans-Medium.ttf`

**dots.js constants (from Kindred prompt + design spec section 2.1):** `step=max(5,W/205)`, `rowStep=step*2.05`, `R=step*.46`, `LEVELS=[0,.26,.52,.78,1]`, `LOOP=20`, dissolve `mR=mixAt(t,3.4,13.4,1.6)`, `mL=mixAt(t,7.0,16.0,1.6)`, band `H*.30` at `H*.56`, quiet zones unchanged, row glitch unchanged; dots stamped via 5 pre-rendered circle sprites (one per level) instead of per-dot `arc()`; waveform fields fA/fB stroked from the sinus synthesizer (Lead I / Lead II morphologies, phase scroll 25 mm/s feel); `window.__render` exposed.

- [ ] **Step 1:** Implement `dots.js` + rewired `hero.js` (no night intro, `is-ready` on first rendered frame + fonts), re-skinned spotlight/outro/nav/copy/capability strip, strings; remove retired fonts + trace.js; `npm run assets` verifies remaining font; `npm run build` passes.
- [ ] **Step 2:** Commit `feat(site): rebuild landing on Kindred dot-matrix ECG design`.

### Task 8: Verification pass (both apps) + handoff

- [ ] **Step 1:** `web/`: `npm test` (all green), `tsc -b && vite build` clean. `site/`: `npm run build` clean.
- [ ] **Step 2:** Playwright + Chrome passes: site hero (dot probes, dissolve A→B→A inside 20 s loop, headline rect dot-free, capability strip, spotlight morph, reduced motion static band, overflow at 1440/768/390); `web/?sim=1` dashboard (sim connects, sync reaches `locked` with offset ≈ 187 ms shown, 1→3→6 modes render lanes, polarity flips a lane, JSON+CSV exports download with expected schema, banners on `leadOffAfterSec`); login page in demo mode and with a mock `VITE_AUTH_URL` (fetch asserted via page route interception). Screenshots inspected.
- [ ] **Step 3:** Perf probe on site hero (frame avg/p95 at dpr 2 — target avg < 8 ms; sprite stamping should hold it) and dashboard lane loop.
- [ ] **Step 4:** Fix defects found (root cause first), re-verify failing check + neighbors. Record tested-vs-not in final report. Real-hardware connect checklist handed to owner (Web Bluetooth gesture requirement).
- [ ] **Step 5:** Final commits per remaining fixes; `docs/` plan updates only if behavior deviated from specs.
