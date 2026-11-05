import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";

import { EcgLiveView } from "@/features/ecg/ui/EcgLiveView";
import { Er2LiveDashboard } from "@/features/ecg/ui/er2/Er2LiveDashboard";
import { i18nReady } from "@/shared/lib/i18n/i18n";
import "@/app/styles/globals.css";

type View = "aiecg" | "er2";

function App() {
  const { t } = useTranslation();
  const [view, setView] = useState<View>(() =>
    new URLSearchParams(window.location.search).get("view") === "er2" ? "er2" : "aiecg",
  );
  const sim = new URLSearchParams(window.location.search).has("sim");
  return (
    <>
      {view === "aiecg" ? <EcgLiveView /> : <Er2LiveDashboard sim={sim} />}
      <nav className="fixed bottom-4 right-4 z-50 flex overflow-hidden rounded-full border border-(--line) bg-white/90 shadow-sm backdrop-blur">
        {(
          [
            ["aiecg", "er2.switch_live"],
            ["er2", "er2.switch_er2"],
          ] as const
        ).map(([v, key]) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`px-4 py-2 text-[12px] font-medium transition-colors ${
              view === v ? "bg-(--ink) text-white" : "text-(--sub) hover:text-(--ink)"
            }`}
          >
            {t(key)}
          </button>
        ))}
      </nav>
    </>
  );
}

const el = document.getElementById("root");
if (!el) throw new Error("root element not found");

void i18nReady.then(() => {
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
