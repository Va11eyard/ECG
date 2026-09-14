const rawBase = import.meta.env.VITE_API_BASE_URL ?? "";
const normalizedBase = rawBase.replace(/\/$/, "").replace(/\/api$/i, "");

export const env = {
  apiBaseUrl: normalizedBase === "" ? "" : normalizedBase,
} as const;
