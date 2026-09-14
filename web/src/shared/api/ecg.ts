import { postMultipart } from "@/shared/api/client";

export type EcgPhotoResult = {
  is_ecg: boolean;
  heart_rate_bpm: number | null;
  rhythm_hint: string;
  quality: string;
  leads: string[];
  findings: string[];
  summary: string;
  disclaimer: string;
};

export async function analyzeEcgPhoto(file: File, locale?: string): Promise<EcgPhotoResult> {
  const form = new FormData();
  form.append("file", file);
  if (locale) form.append("locale", locale);
  return postMultipart<EcgPhotoResult>("/api/ecg/photo", form);
}
