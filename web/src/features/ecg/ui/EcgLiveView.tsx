import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { analyzeStrip, type StripVitals } from "@/features/ecg/lib/analyzeStrip";
import { estimateFsHz } from "@/features/ecg/lib/estimateFsHz";
import { emptyFilterState, filterEcgSamples, removeMean, type FilterState } from "@/features/ecg/lib/smoothEcg";
import {
  bleErrorCode,
  formatBleError,
  isSecureBluetoothContext,
  isWebBluetoothSupported,
  requestAndConnectAiecg,
  tryAutoConnectAiecg,
  type BleConnectionState,
  type BleNotifyMeta,
  type EcgBleSession,
} from "@/features/ecg/lib/webBluetoothEcg";
import { EcgPhotoCard } from "@/features/ecg/ui/EcgPhotoCard";

const DISPLAY_POINTS = 375;
const ANALYZE_SEC = 10;
const WINDOW_SEC = 5;
const INTERPRET_MS = 10_000;
const FS_HZ = 125;
const Y_MIN = -1.2;
const Y_MAX = 1.2;
const PAD_L = 46;
const PAD_R = 16;
const PAD_T = 12;
const PAD_B = 32;
const PLOT_W = 640;
const PLOT_H = 168;
const VB_W = PAD_L + PLOT_W + PAD_R;
const VB_H = PAD_T + PLOT_H + PAD_B;

function statusBadgeVariant(
  bleState: BleConnectionState,
  streaming: boolean,
): "default" | "secondary" | "destructive" {
  if (bleState === "error" || bleState === "unsupported") return "destructive";
  if (bleState === "connected" || streaming) return "default";
  return "secondary";
}

function lastWindow(buf: number[], fs: number, sec: number): number[] {
  const cap = Math.max(1, Math.round(fs * sec));
  return buf.length > cap ? buf.slice(buf.length - cap) : buf;
}

export function EcgLiveView() {
  const { t, i18n } = useTranslation();
  const [bleState, setBleState] = useState<BleConnectionState>(() =>
    isWebBluetoothSupported() ? "idle" : "unsupported",
  );
  const [bleName, setBleName] = useState<string | null>(null);
  const [livePoints, setLivePoints] = useState<number[]>([]);
  const [strip, setStrip] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [streamStatus, setStreamStatus] = useState("idle");
  const [note, setNote] = useState<StripVitals | null>(null);
  const [fsHz, setFsHz] = useState(FS_HZ);
  const [finished, setFinished] = useState(false);
  const [viewStart, setViewStart] = useState(0);
  const [recordLen, setRecordLen] = useState(0);

  const sessionRef = useRef<EcgBleSession | null>(null);
  const autoTriedRef = useRef(false);
  const manualBusyRef = useRef(false);
  const filterRef = useRef<FilterState>(emptyFilterState());
  const recordRef = useRef<number[]>([]);
  const sampleTotalRef = useRef(0);
  const streamT0Ref = useRef<number | null>(null);
  const fsRef = useRef(FS_HZ);
  const finishedRef = useRef(false);
  const enterReviewRef = useRef<() => void>(() => {});
  const dragRef = useRef<{ x: number; start: number } | null>(null);

  const resetStream = useCallback(() => {
    filterRef.current = emptyFilterState();
    recordRef.current = [];
    sampleTotalRef.current = 0;
    streamT0Ref.current = null;
    setLivePoints([]);
    setStrip([]);
    setNote(null);
    finishedRef.current = false;
    setFinished(false);
    setViewStart(0);
    setRecordLen(0);
    fsRef.current = FS_HZ;
    setFsHz(FS_HZ);
  }, []);

  const enterReview = useCallback(() => {
    finishedRef.current = true;
    const buf = recordRef.current;
    const fs = fsRef.current > 0 ? fsRef.current : FS_HZ;
    setStrip(buf);
    setFinished(true);
    setViewStart(0);
    setNote(analyzeStrip(fs, lastWindow(buf, fs, ANALYZE_SEC), i18n.language));
  }, [i18n.language]);
  enterReviewRef.current = enterReview;

  const onBleNotify = useCallback((meta: BleNotifyMeta) => {
    if (meta.sampleCount < 8) setStreamStatus("handshake");
  }, []);

  const onSamples = useCallback((samples: number[]) => {
    if (finishedRef.current) return;
    const { out, state } = filterEcgSamples(samples, filterRef.current);
    filterRef.current = state;
    if (out.length === 0) return;
    if (streamT0Ref.current == null) streamT0Ref.current = Date.now();
    sampleTotalRef.current += out.length;
    const elapsed = Date.now() - streamT0Ref.current;
    const fs = estimateFsHz(sampleTotalRef.current, elapsed);
    fsRef.current = fs;
    setFsHz(fs);
    recordRef.current = recordRef.current.concat(out);
    setRecordLen(recordRef.current.length);
    setLivePoints((prev) => {
      const next = prev.concat(out);
      return next.length > DISPLAY_POINTS ? next.slice(next.length - DISPLAY_POINTS) : next;
    });
    setStreamStatus("streaming");
  }, []);

  const onLinkLost = useCallback(() => {
    setBleState("disconnected");
    setStreamStatus("idle");
    if (!finishedRef.current && recordRef.current.length >= 2) enterReviewRef.current();
  }, []);

  const attachSession = useCallback(async (session: EcgBleSession) => {
    sessionRef.current?.disconnect();
    sessionRef.current = session;
    resetStream();
    setBleName(session.name);
    setBleState("connected");
    setError(null);
  }, [resetStream]);

  const connectPicker = useCallback(
    async (acceptAll = false) => {
      if (!isSecureBluetoothContext()) {
        setBleState("unsupported");
        setError(t("ecg.insecureContext"));
        return;
      }
      if (!isWebBluetoothSupported()) {
        setBleState("unsupported");
        return;
      }
      manualBusyRef.current = true;
      setBusy(true);
      setBleState("connecting");
      setError(null);
      try {
        const session = await requestAndConnectAiecg(onSamples, onLinkLost, { acceptAll, onNotify: onBleNotify });
        await attachSession(session);
      } catch (e) {
        setBleState("error");
        const code = bleErrorCode(e);
        setError(t(`ecg.err.${code}`, { defaultValue: formatBleError(e) }));
      } finally {
        manualBusyRef.current = false;
        setBusy(false);
      }
    },
    [attachSession, onBleNotify, onLinkLost, onSamples, t],
  );

  useEffect(() => {
    if (autoTriedRef.current) return;
    if (!isWebBluetoothSupported()) return;
    autoTriedRef.current = true;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled || manualBusyRef.current || sessionRef.current) return;
        try {
          const session = await tryAutoConnectAiecg(
            onSamples,
            () => {
              if (cancelled) return;
              onLinkLost();
            },
            onBleNotify,
          );
          if (cancelled || manualBusyRef.current) {
            session?.disconnect();
            return;
          }
          if (session) await attachSession(session);
        } catch {
        }
      })();
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [attachSession, onBleNotify, onLinkLost, onSamples]);

  useEffect(() => {
    return () => {
      sessionRef.current?.disconnect();
      sessionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (bleState !== "connected" || finished) return;
    const tick = () => {
      const fs = fsRef.current;
      setNote(analyzeStrip(fs, lastWindow(recordRef.current, fs, ANALYZE_SEC), i18n.language));
    };
    const id = window.setInterval(tick, INTERPRET_MS);
    return () => window.clearInterval(id);
  }, [bleState, finished, i18n.language]);

  const fs = fsHz > 0 ? fsHz : FS_HZ;
  const totalDur = finished ? strip.length / fs : recordLen / fs;
  const windowSec = Math.min(WINDOW_SEC, Math.max(totalDur, 0.2));
  const maxStart = Math.max(0, totalDur - windowSec);

  const chartSlice = useMemo(() => {
    if (finished && strip.length >= 2) {
      const i0 = Math.max(0, Math.floor(viewStart * fs));
      const i1 = Math.min(strip.length, i0 + Math.max(2, Math.ceil(windowSec * fs)));
      return { points: strip.slice(i0, i1), x0: i0 / fs };
    }
    const x0 = Math.max(0, (recordLen - livePoints.length) / fs);
    return { points: livePoints, x0 };
  }, [finished, strip, viewStart, fs, windowSec, recordLen, livePoints]);

  const chart = useMemo(
    () => buildCoordinateChart(removeMean(chartSlice.points), fs, chartSlice.x0),
    [chartSlice, fs],
  );

  const panTo = useCallback(
    (sec: number) => {
      const cap = Math.max(0, totalDur - windowSec);
      setViewStart(Math.min(cap, Math.max(0, sec)));
    },
    [totalDur, windowSec],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (!finished || strip.length < 2) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { x: e.clientX, start: viewStart };
    },
    [finished, strip.length, viewStart],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pxPerSec = (rect.width * PLOT_W) / VB_W / windowSec;
      if (pxPerSec <= 0) return;
      panTo(drag.start - (e.clientX - drag.x) / pxPerSec);
    },
    [panTo, windowSec],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const stopAndReview = useCallback(() => {
    if (recordRef.current.length >= 2) enterReview();
    sessionRef.current?.disconnect();
    sessionRef.current = null;
    setBleState("disconnected");
    setStreamStatus("idle");
  }, [enterReview]);

  const bleOk = isWebBluetoothSupported() && isSecureBluetoothContext();
  const streaming = streamStatus === "streaming";
  const last = chartSlice.points.at(-1);
  const canScroll = finished && maxStart > 0.05;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center gap-2 py-3">
            <CardTitle className="mr-auto text-sm">{t("ecg.title")}</CardTitle>
            <Badge variant={statusBadgeVariant(bleState, streaming && !finished)}>
              {finished ? t("ecg.segmentDone") : streaming ? t("ecg.liveRecording") : t(`ecg.ble.${bleState}`)}
            </Badge>
            {bleName ? <Badge variant="outline">{bleName}</Badge> : null}
            {bleOk ? (
              <>
                <Button
                  type="button"
                  disabled={busy || bleState === "connecting" || bleState === "connected"}
                  onClick={() => void connectPicker(false)}
                >
                  {bleState === "connected" ? t("ecg.connected") : t("ecg.connect")}
                </Button>
                {bleState === "connected" && !finished ? (
                  <>
                    <Button type="button" variant="outline" disabled={busy || livePoints.length < 2} onClick={stopAndReview}>
                      {t("ecg.finishSegment")}
                    </Button>
                    <Button type="button" variant="outline" disabled={busy} onClick={stopAndReview}>
                      {t("ecg.disconnectBle")}
                    </Button>
                  </>
                ) : null}
              </>
            ) : null}
          </CardHeader>
        </Card>

        {!bleOk ? (
          <Alert variant="destructive">
            <AlertDescription>
              {!isSecureBluetoothContext() ? t("ecg.insecureContext") : t("ecg.needChrome")}
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardContent className="p-3">
            <svg
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              className={`h-64 w-full touch-none ${finished ? "cursor-grab active:cursor-grabbing" : ""}`}
              role="img"
              aria-label={t("ecg.liveTitle")}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {chart.grid}
              {chart.axes}
              {chart.path ? <path d={chart.path} fill="none" stroke="#0f766e" strokeWidth="1.25" /> : null}
            </svg>
            {canScroll ? (
              <input
                type="range"
                min={0}
                max={maxStart}
                step={0.05}
                value={Math.min(viewStart, maxStart)}
                onChange={(e) => panTo(Number(e.target.value))}
                className="mt-2 w-full accent-foreground"
                aria-label={t("ecg.scrollStrip")}
              />
            ) : null}
            <Separator className="my-2" />
            <p className="font-mono text-xs text-muted-foreground">
              {chartSlice.points.length < 2
                ? t("ecg.waitingSignal")
                : finished
                  ? `${chartSlice.x0.toFixed(2)}–${(chartSlice.x0 + chartSlice.points.length / fs).toFixed(2)} s  /  ${totalDur.toFixed(1)} s  y=${(last ?? 0).toFixed(3)} mV`
                  : `x=${(chartSlice.x0 + (chartSlice.points.length - 1) / fs).toFixed(2)} s  y=${(last ?? 0).toFixed(3)} mV  n=${recordLen}`}
            </p>
            {finished ? <p className="mt-1 text-xs text-muted-foreground">{t("ecg.scrollHint")}</p> : null}
          </CardContent>
        </Card>

        <EcgPhotoCard />

        {note ? (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center gap-2 py-3">
              <CardTitle className="mr-auto text-sm">{t("ecg.screenAction")}</CardTitle>
              <Badge variant={note.quality === "adequate" ? "default" : "secondary"}>
                {t(`ecg.quality.${note.quality}`)}
              </Badge>
              {note.heartRateBpm != null ? (
                <Badge variant="outline">{t("ecg.screenHr", { bpm: Math.round(note.heartRateBpm) })}</Badge>
              ) : null}
              <Badge variant="outline">{t(`ecg.rhythm.${note.rhythmHint}`)}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 pb-3">
              <p className="text-sm text-foreground">{note.summary}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

type ChartBits = { grid: ReactNode; axes: ReactNode; path: string };

function xOf(i: number, n: number): number {
  if (n <= 1) return PAD_L;
  return PAD_L + (i / (n - 1)) * PLOT_W;
}

function yOf(v: number): number {
  const t = (Y_MAX - v) / (Y_MAX - Y_MIN);
  return PAD_T + t * PLOT_H;
}

function buildCoordinateChart(points: number[], fsHz: number, x0Sec = 0): ChartBits {
  const n = points.length;
  const yTicks = [-1, 0, 1];
  const fs = fsHz > 0 ? fsHz : FS_HZ;
  const dur = n <= 1 ? 1 : (n - 1) / fs;
  const xEnd = x0Sec + dur;
  const step = dur > 6 ? 2 : dur > 3 ? 1 : 0.5;
  const xTicks: number[] = [];
  const startTick = Math.ceil(x0Sec / step) * step;
  for (let s = startTick; s <= xEnd + 1e-6; s += step) xTicks.push(Number(s.toFixed(2)));

  const grid = (
    <g stroke="#e4e4e7" strokeWidth="1">
      {yTicks.map((v) => (
        <line key={`hy-${v}`} x1={PAD_L} x2={PAD_L + PLOT_W} y1={yOf(v)} y2={yOf(v)} />
      ))}
      {xTicks.map((s) => {
        const x = PAD_L + ((s - x0Sec) / dur) * PLOT_W;
        return <line key={`vx-${s}`} x1={x} x2={x} y1={PAD_T} y2={PAD_T + PLOT_H} />;
      })}
    </g>
  );

  const axes = (
    <g fill="#71717a" stroke="#a1a1aa">
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + PLOT_H} />
      <line x1={PAD_L} y1={yOf(0)} x2={PAD_L + PLOT_W} y2={yOf(0)} />
      {yTicks.map((v) => (
        <text key={`yl-${v}`} x={PAD_L - 6} y={yOf(v) + 3} textAnchor="end" stroke="none" fontSize="9">
          {v} mV
        </text>
      ))}
      {xTicks.map((s) => {
        const x = PAD_L + ((s - x0Sec) / dur) * PLOT_W;
        return (
          <text key={`xl-${s}`} x={x} y={PAD_T + PLOT_H + 16} textAnchor="middle" stroke="none" fontSize="9">
            {s}s
          </text>
        );
      })}
    </g>
  );

  let path = "";
  if (n >= 2) {
    for (let i = 0; i < n; i++) {
      const x = xOf(i, n);
      const y = yOf(Math.min(Y_MAX, Math.max(Y_MIN, points[i] ?? 0)));
      path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
  }

  return { grid, axes, path };
}
