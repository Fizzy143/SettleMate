"use client";

const USER_ID_KEY = "settlemateUserId";
const DISPLAY_NAME_KEY = "settlemateDisplayName";

export type ClientIdentity = {
  userId: string;
  displayName: string;
};

function createUserId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function headersForIdentity(
  identity: ClientIdentity,
  init: RequestInit
): Headers {
  const headers = new Headers(init.headers);
  headers.set("x-settlemate-user-id", identity.userId);
  headers.set(
    "x-settlemate-display-name",
    encodeURIComponent(identity.displayName)
  );
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

export function getClientIdentity(): ClientIdentity | null {
  if (typeof window === "undefined") return null;
  const userId = window.localStorage.getItem(USER_ID_KEY);
  const displayName = window.localStorage.getItem(DISPLAY_NAME_KEY);
  if (!userId || !displayName) return null;
  return { userId, displayName };
}

export function createProvisionalIdentity(
  displayName: string
): ClientIdentity {
  return {
    userId: createUserId(),
    displayName: displayName.trim(),
  };
}

export function persistClientIdentity(
  identity: ClientIdentity
): ClientIdentity {
  window.localStorage.setItem(USER_ID_KEY, identity.userId);
  window.localStorage.setItem(DISPLAY_NAME_KEY, identity.displayName);
  return identity;
}

export function saveClientIdentity(displayName: string) {
  const provisional = createProvisionalIdentity(displayName);
  const existingId = window.localStorage.getItem(USER_ID_KEY);
  return persistClientIdentity({
    ...provisional,
    userId: existingId || provisional.userId,
  });
}

export function clearClientIdentity() {
  window.localStorage.removeItem(USER_ID_KEY);
  window.localStorage.removeItem(DISPLAY_NAME_KEY);
}

export async function apiFetchAs(
  identity: ClientIdentity,
  path: string,
  init: RequestInit = {}
) {
  return fetch(path, {
    ...init,
    headers: headersForIdentity(identity, init),
  });
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const identity = getClientIdentity();
  if (identity) return apiFetchAs(identity, path, init);

  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...init, headers });
}
