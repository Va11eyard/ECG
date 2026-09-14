import axios, { isAxiosError } from "axios";

import { env } from "@/shared/config/env";

import type { ApiEnvelope } from "./types";

export class ApiRequestError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
  }
}

const api = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function unwrapEnvelope<T>(data: unknown): T {
  if (!isRecord(data)) throw new ApiRequestError("INVALID_RESPONSE", "invalid response");
  if (data.ok === true) return data.data as T;
  if (data.ok === false && isRecord(data.error)) {
    const code = typeof data.error.code === "string" ? data.error.code : "UNKNOWN";
    const message = typeof data.error.message === "string" ? data.error.message : "error";
    throw new ApiRequestError(code, message);
  }
  throw new ApiRequestError("INVALID_RESPONSE", "invalid response");
}

function rethrow(error: unknown): never {
  if (isAxiosError(error) && isRecord(error.response?.data)) {
    try {
      unwrapEnvelope(error.response.data);
    } catch (e) {
      throw e;
    }
  }
  throw error;
}

export async function postMultipart<T>(url: string, form: FormData): Promise<T> {
  try {
    const res = await api.post<ApiEnvelope<T>>(url, form);
    return unwrapEnvelope<T>(res.data);
  } catch (e) {
    rethrow(e);
  }
}
