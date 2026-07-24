export function apiUrl(path: string) {
  return `/api${path}`;
}

// A stalled request on a flaky network must not hang the UI forever. Abort after
// this long; callers fall back to the offline queue on the resulting error.
const FETCH_TIMEOUT_MS = 20_000;

/**
 * localStorage key for the estate this manager device is currently recording for.
 * Deliberately distinct from the owner farm-app's `activeEstateId` key: both apps
 * are served from the same origin (preview/canvas), so a shared key would let one
 * app silently change the other's active estate.
 */
export const ACTIVE_ESTATE_KEY = "manager_activeEstateId";

/** An estate is a farm_profile row; the owner may have several. */
export interface Estate {
  id: number;
  farmName: string;
}

/** Read the estate id this device is recording for (null until one is picked). */
export function getActiveEstateId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ESTATE_KEY);
  } catch {
    return null;
  }
}

/** Persist the estate this device should record for. */
export function setActiveEstateId(id: string | number) {
  try {
    localStorage.setItem(ACTIVE_ESTATE_KEY, String(id));
  } catch {
    // private mode / storage disabled — header injection just falls back to null
  }
}

/**
 * Every estate-scoped request must carry the active estate so the API filters and
 * stamps data to it. We add X-Estate-Id here (not per call site) so it can never be
 * forgotten — without it the server falls back to the owner's first estate and the
 * manager's writes land on (or 404 against) the wrong estate.
 */
function withEstateHeader(headers: HeadersInit): HeadersInit {
  const eid = getActiveEstateId();
  if (!eid) return headers;
  return { ...headers, "X-Estate-Id": eid };
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...options,
      signal: options?.signal ?? controller.signal,
      headers: withEstateHeader({
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      }),
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export type VerifyVerdict = "valid" | "invalid" | "plan" | "offline";

/**
 * Checks the stored pair code against the farm. Distinguishes:
 *  - a deliberately revoked/rotated code (server replies 404 → "invalid"),
 *  - the farm's plan no longer including manager devices (403 → "plan"),
 *  - a connectivity problem (fetch rejects or 5xx → "offline"), so we never
 *    lock out a manager just because they briefly lost signal.
 */
export async function verifyCode(code: string): Promise<VerifyVerdict> {
  try {
    const res = await fetch(apiUrl("/manager/verify"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) return "valid";
    if (res.status === 403) return "plan";
    if (res.status >= 400 && res.status < 500) return "invalid";
    return "offline";
  } catch {
    return "offline";
  }
}
