import { ApiErrorResponse } from "@/lib/types/api";

export async function apiRequest<T>(
  input: string,
  init?: RequestInit,
  fallbackError = "Request failed.",
): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(await readApiError(response, fallbackError));
  }
  return (await response.json()) as T;
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorResponse;
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // Keep fallback message.
  }
  return fallback;
}
