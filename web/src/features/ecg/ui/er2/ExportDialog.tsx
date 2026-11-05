import { useState } from "react";
import type { SessionRecorder } from "@/features/ecg/lib/er2/session";

type Props = {
  recorder: SessionRecorder;
  onClose: () => void;
  t: (k: string) => string;
};

function download(name: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportDialog({ recorder, onClose, t }: Props) {
  const [patientId, setPatientId] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"" | "m" | "f">("");
  const [notes, setNotes] = useState("");

  const start = (): void => {
    recorder.start(
      { id: patientId, name, age, sex, notes },
      [
        { device: "A", lead: "I", note: notes },
        { device: "B", lead: "II", note: notes },
      ],
      [],
    );
  };

  const run = (kind: "json" | "csv"): void => {
    if (recorder.sampleCount === 0) start();
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
    if (kind === "json") {
      download(`aiecg-session-${stamp}.json`, recorder.exportJson(), "application/json");
    } else {
      download(`aiecg-session-${stamp}.csv`, recorder.exportCsv(), "text/csv");
    }
  };

  const field = "w-full rounded-[10px] border border-(--line) bg-white px-3 py-2 text-[13px] outline-none focus:border-(--ink)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl border border-(--line) bg-(--card) p-6">
        <h3 className="text-[15px] font-semibold text-(--ink)">{t("er2.export_title")}</h3>
        <p className="mt-1 text-[12px] text-(--sub)">{t("er2.export_hint")}</p>
        <div className="mt-4 grid gap-3">
          <input className={field} placeholder={t("er2.patient_id")} value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          <input className={field} placeholder={t("er2.patient_name")} value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className={field} placeholder={t("er2.patient_age")} value={age} onChange={(e) => setAge(e.target.value)} />
            <select className={field} value={sex} onChange={(e) => setSex(e.target.value as "" | "m" | "f")}>
              <option value="">{t("er2.sex")}</option>
              <option value="m">M</option>
              <option value="f">F</option>
            </select>
          </div>
          <textarea className={field} rows={2} placeholder={t("er2.placements")} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-(--line) px-4 py-2 text-[12px] font-medium text-(--sub) hover:text-(--ink)">
            {t("er2.close")}
          </button>
          <button type="button" onClick={() => run("json")} className="rounded-full bg-(--ink) px-4 py-2 text-[12px] font-medium text-white">
            JSON
          </button>
          <button type="button" onClick={() => run("csv")} className="rounded-full bg-(--ink) px-4 py-2 text-[12px] font-medium text-white">
            CSV
          </button>
        </div>
      </div>
    </div>
  );
}
