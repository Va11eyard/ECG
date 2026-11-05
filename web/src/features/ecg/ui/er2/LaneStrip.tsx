import { useEffect, useRef } from "react";
import { LaneRenderer } from "./laneRenderer";
import { LANE_LABELS, type LaneKey } from "./lanes";
import type { DeviceInfo, LaneBuffer } from "./useEr2Session";

type Props = {
  laneKey: LaneKey;
  buffer: LaneBuffer;
  mmPerSec: 25 | 50;
  polarity: boolean;
  hr?: number;
  device?: DeviceInfo | null;
  subscribe: (cb: () => void) => () => void;
  onPolarity: (key: LaneKey, invert: boolean) => void;
  t: (k: string) => string;
};

export function LaneStrip({ laneKey, buffer, mmPerSec, polarity, hr, device, subscribe, onPolarity, t }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<LaneRenderer | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const renderer = new LaneRenderer(canvas, {
      width: wrap.clientWidth,
      height: wrap.clientHeight,
      mmPerSec,
      pxPerMm: 3.78,
      gainMmPerMv: 10,
      label: LANE_LABELS[laneKey],
    });
    rendererRef.current = renderer;
    const ro = new ResizeObserver(() => renderer.resize(wrap.clientWidth, wrap.clientHeight));
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [mmPerSec, laneKey]);

  useEffect(() => {
    rendererRef.current?.setMmPerSec(mmPerSec);
  }, [mmPerSec]);

  useEffect(() => {
    rendererRef.current?.setPolarity(polarity);
  }, [polarity]);

  useEffect(() => {
    let lastVersion = -1;
    let lastTotal = 0;
    return subscribe(() => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      renderer.setFs(buffer.fs);
      if (buffer.version === lastVersion) return;
      const behind = buffer.total - lastTotal;
      if (lastVersion === -1 || behind > buffer.data.length * 0.8) {
        renderer.redraw();
      } else {
        const fresh = new Float32Array(behind);
        for (let i = 0; i < behind; i++) {
          fresh[i] = buffer.data[(buffer.total - behind + i) % buffer.data.length] ?? 0;
        }
        renderer.push(fresh);
      }
      lastVersion = buffer.version;
      lastTotal = buffer.total;
    });
  }, [buffer, subscribe]);

  const leadOff = device != null && device.state === "streaming" && !device.leadOn;

  return (
    <div className="relative rounded-lg border border-(--line) overflow-hidden" style={{ height: 148 }}>
      <div ref={wrapRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="h-full w-full block" />
      </div>
      <button
        type="button"
        onClick={() => onPolarity(laneKey, !polarity)}
        title={t("er2.polarity")}
        className={`absolute top-1.5 right-2 z-10 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
          polarity
            ? "border-(--signal) bg-(--signal) text-white"
            : "border-(--line) bg-white/80 text-(--sub) hover:text-(--ink)"
        }`}
      >
        {polarity ? "−" : "+"}
      </button>
      {leadOff && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-(--warn-l) px-3 py-1 text-[12px] text-(--warn-c)">
          {t("er2.lead_off")}
        </div>
      )}
      {hr !== undefined && (
        <span className="absolute bottom-1.5 left-2 z-10 rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-(--sub)">
          {hr} bpm
        </span>
      )}
    </div>
  );
}
