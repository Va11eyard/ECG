import type { DeviceInfo } from "./useEr2Session";

type Props = {
  label: "A" | "B";
  info: DeviceInfo | null;
  connect: () => void;
  t: (k: string) => string;
  role: string;
};

const STATE_COLOR: Record<string, string> = {
  streaming: "var(--ok-c)",
  connecting: "var(--warn-c)",
  disconnected: "var(--mute)",
  error: "var(--bad-c)",
};

export function DevicePanel({ label, info, connect, t, role }: Props) {
  return (
    <div className="rounded-xl border border-(--line) bg-(--card) p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-(--ink)">
            {t("er2.device")} {label}
          </span>
          <span className="rounded-full bg-(--bg) px-2 py-0.5 text-[11px] text-(--sub)">{role}</span>
        </div>
        {info && info.state === "streaming" ? (
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: STATE_COLOR[info.state] }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: STATE_COLOR[info.state] }} />
            {info.name} · {info.fs} Hz
          </span>
        ) : (
          <button
            type="button"
            onClick={connect}
            className="rounded-full bg-(--ink) px-3.5 py-1.5 text-[12px] font-medium text-white transition-transform hover:-translate-y-px"
          >
            {t("er2.connect")}
          </button>
        )}
      </div>
      {info ? (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-(--sub)">
          <span style={{ color: STATE_COLOR[info.state] }}>{t(`er2.state_${info.state}`)}</span>
          <span>{t("er2.hr")}: {info.hr} bpm</span>
          <span>{t("er2.battery")}: {info.battery}%</span>
          <span>{info.leadOn ? t("er2.lead_on") : t("er2.lead_off")}</span>
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-(--mute)">{t("er2.device_hint")}</p>
      )}
    </div>
  );
}
