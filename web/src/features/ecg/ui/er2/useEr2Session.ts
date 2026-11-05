import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PairSync, type SyncState } from "@/features/ecg/lib/er2/pairSync";
import { einthoven, applyPolarity } from "@/features/ecg/lib/er2/derive";
import { SessionRecorder, type PatientMeta, type Placement } from "@/features/ecg/lib/er2/session";
import { Er2Device, type EcgSource as EcgSourceLike, type RtEvent, type SourceState } from "@/features/ecg/lib/er2/device";
import { SimTransport } from "@/features/ecg/lib/er2/simulator";
import type { LaneKey } from "./lanes";

export type DeviceInfo = {
  label: "A" | "B";
  name: string;
  state: SourceState;
  hr: number;
  battery: number;
  leadOn: boolean;
  fs: number;
};

export type SyncInfo = { state: SyncState; offsetMs: number; driftPpm: number; matchRatio: number };

const RING = 16 * 250;

export type LaneBuffer = {
  data: Float32Array;
  total: number;
  fs: number;
  version: number;
};

function makeLanes(): Record<LaneKey, LaneBuffer> {
  const out = {} as Record<LaneKey, LaneBuffer>;
  for (const key of ["I", "II", "III", "aVR", "aVL", "aVF"] as LaneKey[]) {
    out[key] = { data: new Float32Array(RING), total: 0, fs: 125, version: 0 };
  }
  return out;
}

function appendLane(buf: LaneBuffer, samples: Float32Array, invert: boolean): void {
  for (let i = 0; i < samples.length; i++) {
    buf.data[buf.total % buf.data.length] = invert ? -(samples[i] ?? 0) : (samples[i] ?? 0);
    buf.total++;
  }
  buf.version++;
}

export function useEr2Session(sim: boolean) {
  const sync = useMemo(() => new PairSync(), []);
  const recorder = useMemo(() => new SessionRecorder(), []);
  const deviceA = useRef<EcgSourceLike | null>(null);
  const deviceB = useRef<EcgSourceLike | null>(null);
  const lanes = useRef(makeLanes());
  const polarityRef = useRef<Record<string, boolean>>({});
  const modeRef = useRef<1 | 3 | 6>(1);
  const listeners = useRef(new Set<() => void>());
  const recordingRef = useRef(false);
  const pullRaf = useRef(0);

  const [infoA, setInfoA] = useState<DeviceInfo | null>(null);
  const [infoB, setInfoB] = useState<DeviceInfo | null>(null);
  const [syncInfo, setSyncInfo] = useState<SyncInfo>({ state: "searching", offsetMs: 0, driftPpm: 0, matchRatio: 0 });
  const [mode, setModeState] = useState<1 | 3 | 6>(1);
  const [mmPerSec, setMmPerSecState] = useState<25 | 50>(25);
  const [polarity, setPolarityState] = useState<Partial<Record<LaneKey, boolean>>>({});
  const [recording, setRecording] = useState(false);
  const [tick, setTick] = useState(0);

  const notify = useCallback(() => listeners.current.forEach((cb) => cb()), []);

  const handleRt = useCallback(
    (label: "A" | "B") => (e: RtEvent) => {
      const info: DeviceInfo = {
        label,
        name: label === "A" ? (deviceA.current?.name ?? "ER2") : (deviceB.current?.name ?? "ER2"),
        state: "streaming",
        hr: e.hr,
        battery: e.battery,
        leadOn: e.leadOn,
        fs: e.fs,
      };
      (label === "A" ? setInfoA : setInfoB)(info);
      if (label === "A") sync.pushA(e);
      else sync.pushB(e);
    },
    [sync],
  );

  const watch = useCallback((label: "A" | "B", d: EcgSourceLike) => {
    d.onRt(handleRt(label));
    d.onStatus((s) => {
      const setter = label === "A" ? setInfoA : setInfoB;
      setter((prev) => ({
        label,
        name: d.name,
        state: s.state,
        hr: prev?.hr ?? 0,
        battery: prev?.battery ?? 0,
        leadOn: prev?.leadOn ?? true,
        fs: d.fs,
      }));
    });
  }, [handleRt]);

  const connect = useCallback(
    async (label: "A" | "B") => {
      const d: EcgSourceLike = sim
        ? new Er2Device(label, new SimTransport(label === "B" ? { lead: "II", skewMs: 187, driftPpm: 30 } : {}))
        : new Er2Device(label);
      if (label === "A") {
        deviceA.current = d;
        watch("A", d);
        sync.solo();
      } else {
        deviceB.current = d;
        watch("B", d);
        sync.pair();
      }
      await d.requestConnect();
    },
    [sim, watch, sync],
  );

  useEffect(() => {
    const loop = () => {
      pullRaf.current = requestAnimationFrame(loop);
      for (let w = sync.pull(); w; w = sync.pull()) {
        const derived = einthoven(w.I, w.II);
        const pol = polarityRef.current;
        appendLane(lanes.current.I, applyPolarity(w.I, pol.I ?? false), false);
        if (w.II.length > 0) {
          appendLane(lanes.current.II, applyPolarity(w.II, pol.II ?? false), false);
          appendLane(lanes.current.III, applyPolarity(derived.III, pol.III ?? false), false);
          appendLane(lanes.current.aVR, applyPolarity(derived.aVR, pol.aVR ?? false), false);
          appendLane(lanes.current.aVL, applyPolarity(derived.aVL, pol.aVL ?? false), false);
          appendLane(lanes.current.aVF, applyPolarity(derived.aVF, pol.aVF ?? false), false);
        }
        for (const key of Object.keys(lanes.current) as LaneKey[]) lanes.current[key].fs = w.fs;
        if (recordingRef.current) recorder.addWindow(w);
        setSyncInfo({ ...w.sync });
        notify();
      }
      setTick((t) => (t + 1) % 1000000);
    };
    pullRaf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(pullRaf.current);
  }, [sync, recorder, notify]);

  const setMode = useCallback((m: 1 | 3 | 6) => {
    modeRef.current = m;
    setModeState(m);
  }, []);

  const setMmPerSec = useCallback((v: 25 | 50) => {
    setMmPerSecState(v);
    notify();
  }, [notify]);

  const setPolarity = useCallback((key: LaneKey, invert: boolean) => {
    polarityRef.current[key] = invert;
    setPolarityState((prev) => ({ ...prev, [key]: invert }));
    notify();
  }, [notify]);

  const startRecording = useCallback(
    (meta: PatientMeta, placements: Placement[]) => {
      const devices = [
        infoA ? { name: infoA.name, fs: infoA.fs } : null,
        infoB ? { name: infoB.name, fs: infoB.fs } : null,
      ].filter((d): d is { name: string; fs: number } => d !== null);
      recorder.start(meta, placements, devices);
      recordingRef.current = true;
      setRecording(true);
    },
    [infoA, infoB, recorder],
  );

  const stopRecording = useCallback(() => {
    recordingRef.current = false;
    recorder.stop();
    setRecording(false);
  }, [recorder]);

  const subscribeLanes = useCallback((cb: () => void) => {
    listeners.current.add(cb);
    return () => listeners.current.delete(cb);
  }, []);

  useEffect(() => () => {
    deviceA.current?.stop();
    deviceB.current?.stop();
  }, []);

  return {
    infoA, infoB, syncInfo, mode, mmPerSec, polarity, recording, tick,
    connect, setMode, setMmPerSec, setPolarity,
    startRecording, stopRecording, subscribeLanes,
    lanesRef: lanes,
    recorder,
    hasB: infoB !== null,
  };
}
