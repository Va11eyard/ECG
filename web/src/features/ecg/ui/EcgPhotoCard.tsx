import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeEcgPhoto, type EcgPhotoResult } from "@/shared/api/ecg";
import { ApiRequestError } from "@/shared/api/client";

export function EcgPhotoCard() {
  const { t, i18n } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<EcgPhotoResult | null>(null);

  const onPick = useCallback((f: File | undefined) => {
    setError(null);
    setNote(null);
    if (preview) URL.revokeObjectURL(preview);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, [preview]);

  const run = useCallback(async () => {
    if (!file) {
      setError(t("ecg.photoNeedFile"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const out = await analyzeEcgPhoto(file, i18n.language);
      setNote(out);
    } catch (e) {
      const code = e instanceof ApiRequestError ? e.code : "generic";
      setError(t(`ecg.photoErr.${code}`, { defaultValue: t("ecg.photoErr.generic") }));
    } finally {
      setBusy(false);
    }
  }, [file, i18n.language, t]);

  const rhythmKey = note?.rhythm_hint === "irregular" || note?.rhythm_hint === "regular" || note?.rhythm_hint === "unknown"
    ? note.rhythm_hint
    : "unknown";

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center gap-2 py-3">
        <CardTitle className="mr-auto text-sm">{t("ecg.photoTitle")}</CardTitle>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          {t("ecg.photoPick")}
        </Button>
        <Button type="button" disabled={busy || !file} onClick={() => void run()}>
          {busy ? t("ecg.photoBusy") : t("ecg.photoAnalyze")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 pb-3">
        <p className="text-xs text-muted-foreground">{t("ecg.photoHelp")}</p>
        {preview ? (
          <img src={preview} alt="" className="max-h-64 w-full rounded-lg border border-border object-contain bg-muted" />
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {note ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant={note.is_ecg && note.quality === "adequate" ? "default" : "secondary"}>
                {note.is_ecg ? t(`ecg.quality.${note.quality}`) : t("ecg.photoNotEcg")}
              </Badge>
              {note.heart_rate_bpm != null ? (
                <Badge variant="outline">{t("ecg.screenHr", { bpm: Math.round(note.heart_rate_bpm) })}</Badge>
              ) : null}
              {note.is_ecg ? (
                <Badge variant="outline">{t(`ecg.rhythm.${rhythmKey}`)}</Badge>
              ) : null}
              {note.leads?.length ? <Badge variant="outline">{note.leads.join(", ")}</Badge> : null}
            </div>
            {note.findings?.length ? (
              <ul className="list-disc space-y-1 pl-4 text-sm text-foreground">
                {note.findings.map((f, i) => (
                  <li key={`${i}-${f.slice(0, 24)}`}>{f}</li>
                ))}
              </ul>
            ) : null}
            <p className="text-sm text-foreground">{note.summary}</p>
            <p className="text-xs text-muted-foreground">{t("ecg.screenDisclaimer")}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
