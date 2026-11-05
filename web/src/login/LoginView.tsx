import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { renderDotBand } from "./dotBand";

const AUTH_URL = import.meta.env.VITE_AUTH_URL as string | undefined;

function PulseMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M1 10h4l2-6 4 12 2-6h6" stroke="#111111" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function LoginView() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const bandRef = useRef<HTMLCanvasElement | null>(null);
  const bandWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = bandRef.current;
    const wrap = bandWrapRef.current;
    if (!canvas || !wrap) return;
    const draw = () => renderDotBand(canvas);
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!AUTH_URL) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.href = "/?view=er2";
        return;
      }
      setError(t("login.bad_credentials"));
    } catch {
      setError(t("login.network_error"));
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-[10px] border border-(--line) bg-white px-3.5 py-2.5 text-[13px] outline-none transition-colors focus:border-(--ink)";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-(--bg) px-4">
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-(--line) bg-(--card) p-8">
        <div className="flex flex-col items-center text-center">
          <PulseMark />
          <h1 className="mt-3 text-[20px] font-semibold tracking-[-0.03em] text-(--ink)">{t("login.title")}</h1>
          <p className="mt-1 text-[12px] text-(--sub)">{t("login.subtitle")}</p>
        </div>
        <form className="mt-6 grid gap-3" onSubmit={(e) => void submit(e)}>
          <input
            className={field}
            type="email"
            required
            autoComplete="email"
            placeholder={t("login.email")}
            value={email}
            onChange={(e2) => setEmail(e2.target.value)}
          />
          <input
            className={field}
            type="password"
            required
            autoComplete="current-password"
            placeholder={t("login.password")}
            value={password}
            onChange={(e2) => setPassword(e2.target.value)}
          />
          {error && <p className="text-[12px] text-(--bad-c)">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="relative mt-1 rounded-full bg-(--ink) px-5 py-2.5 text-[13px] font-medium text-white transition-transform hover:-translate-y-px disabled:opacity-60"
          >
            {t("login.submit")}
            <span className="pointer-events-none absolute left-[10%] right-[10%] bottom-[-6px] h-4 rounded-[50%] bg-(--signal) opacity-85 blur-[9px]" />
          </button>
        </form>
        <p className="mt-5 text-center text-[12px] text-(--sub)">
          <a className="underline decoration-(--line) underline-offset-4 hover:text-(--ink)" href={`${import.meta.env.VITE_SITE_URL ?? ''}/`}>
            {t("login.to_site")}
          </a>
        </p>
      </div>

      {!AUTH_URL && (
        <div className="relative z-10 mt-5 rounded-full border border-(--line) bg-(--card) px-4 py-2 text-[12px] text-(--warn-c)">
          {t("login.demo_notice")}{" "}
          <a className="underline underline-offset-4" href="/?view=er2">
            {t("login.continue")}
          </a>
        </div>
      )}

      <div ref={bandWrapRef} className="pointer-events-none absolute inset-x-0 bottom-0 h-32 opacity-70">
        <canvas ref={bandRef} className="block h-full w-full" />
      </div>
    </div>
  );
}
