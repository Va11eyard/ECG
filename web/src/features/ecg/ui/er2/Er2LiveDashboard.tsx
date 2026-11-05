import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DevicePanel } from "./DevicePanel";
import { ExportDialog } from "./ExportDialog";
import { LaneStrip } from "./LaneStrip";
import { LANE_LABELS, type LaneKey } from "./lanes";
import { useEr2Session } from "./useEr2Session";

const LANES_BY_MODE: Record<1 | 3 | 6, LaneKey[]> = {
  1: ["I"],
  3: ["I", "II", "III"],
  6: ["I", "II", "III", "aVR", "aVL", "aVF"],
};

const SYNC_LABEL: Record<string, string> = {
  locked: "er2.sync_locked",
  searching: "er2.sync_searching",
  independent: "er2.sync_independent",
  solo: "er2.sync_solo",
};

export function Er2LiveDashboard({ sim }: { sim: boolean }) {
  const { t } = useTranslation();
  const session = useEr2Session(sim);
  const [exportOpen, setExportOpen] = useState(false);

  const dualReady = session.hasB && session.syncInfo.state !== "independent";
  const mode = dualReady ? session.mode : 1;
  const lanes = LANES_BY_MODE[mode];
  const hrFor = (key: LaneKey): number | undefined =>
    key === "I" ? session.infoA?.hr : key === "II" ? session.infoB?.hr : undefined;

  return (
    <div className="min-h-screen bg-(--bg) text-(--ink)">
      <header className="flex items-center justify-between border-b border-(--line) bg-(--card) px-6 py-3">
        <div className="flex items-center gap-2.5">
          <PulseMark />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">AIECG</span>
          <span className="ml-2 rounded-full bg-(--bg) px-2 py-0.5 text-[11px] text-(--sub)">LEPU ER2-C</span>
          {sim && <span className="rounded-full bg-(--warn-l) px-2 py-0.5 text-[11px] text-(--warn-c)">{t("er2.sim")}</span>}
        </div>
        <div className="flex items-center gap-4 text-[13px]">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: session.syncInfo.state === "locked" ? "var(--ok-l)" : "var(--warn-l)",
              color: session.syncInfo.state === "locked" ? "var(--ok-c)" : "var(--warn-c)",
            }}
          >
            {t(SYNC_LABEL[session.syncInfo.state] ?? "er2.sync_searching")}
            {session.syncInfo.state === "locked" && ` · ${Math.round(session.syncInfo.offsetMs)} ms`}
          </span>
          <a className="text-(--sub) hover:text-(--ink)" href="/">
            {t("er2.back_to_site")}
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <DevicePanel label="A" info={session.infoA} role={LANE_LABELS.I} connect={() => void session.connect("A")} t={t} />
          <DevicePanel label="B" info={session.infoB} role={LANE_LABELS.II} connect={() => void session.connect("B")} t={t} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-full border border-(--line)">
            {([1, 3, 6] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={m > 1 && !dualReady}
                onClick={() => session.setMode(m)}
                className={`px-4 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40 ${
                  mode === m ? "bg-(--ink) text-white" : "bg-white text-(--sub) hover:text-(--ink)"
                }`}
              >
                {m} ch
              </button>
            ))}
          </div>
          <div className="flex overflow-hidden rounded-full border border-(--line)">
            {([25, 50] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => session.setMmPerSec(v)}
                className={`px-4 py-1.5 text-[12px] font-medium transition-colors ${
                  session.mmPerSec === v ? "bg-(--ink) text-white" : "bg-white text-(--sub) hover:text-(--ink)"
                }`}
              >
                {v} mm/s
              </button>
            ))}
          </div>
          <div className="grow" />
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="relative rounded-full bg-(--ink) px-5 py-2 text-[12px] font-medium text-white transition-transform hover:-translate-y-px"
          >
            {session.recording ? t("er2.recording") : t("er2.export")}
            <span className="pointer-events-none absolute left-[10%] right-[10%] bottom-[-6px] h-4 rounded-[50%] bg-(--signal) opacity-85 blur-[9px]" />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {lanes.map((key) => (
            <LaneStrip
              key={key}
              laneKey={key}
              buffer={session.lanesRef.current[key]}
              mmPerSec={session.mmPerSec}
              polarity={session.polarity[key] ?? false}
              hr={hrFor(key)}
              device={key === "I" ? session.infoA : key === "II" ? session.infoB : null}
              subscribe={session.subscribeLanes}
              onPolarity={session.setPolarity}
              t={t}
            />
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-(--mute)">{t("er2.disclaimer")}</p>
      </main>

      {exportOpen && (
        <ExportDialog recorder={session.recorder} onClose={() => setExportOpen(false)} t={t} />
      )}
    </div>
  );
}

function PulseMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M1 10h4l2-6 4 12 2-6h6" stroke="#111111" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
