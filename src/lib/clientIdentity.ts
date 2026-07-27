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

export function getClientIdentity(): ClientIdentity | null {
  if (typeof window === "undefined") return null;
  const userId = window.localStorage.getItem(USER_ID_KEY);
  const displayName = window.localStorage.getItem(DISPLAY_NAME_KEY);
  if (!userId || !displayName) return null;
  return { userId, displayName };
}

export function saveClientIdentity(displayName: string) {
  const trimmedName = displayName.trim();
  const existingId = window.localStorage.getItem(USER_ID_KEY);
  const userId = existingId || createUserId();
  window.localStorage.setItem(USER_ID_KEY, userId);
  window.localStorage.setItem(DISPLAY_NAME_KEY, trimmedName);
  return { userId, displayName: trimmedName };
}

export function clearClientIdentity() {
  window.localStorage.removeItem(USER_ID_KEY);
  window.localStorage.removeItem(DISPLAY_NAME_KEY);
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const identity = getClientIdentity();
  const headers = new Headers(init.headers);
  if (identity) {
    headers.set("x-settlemate-user-id", identity.userId);
    headers.set("x-settlemate-display-name", encodeURIComponent(identity.displayName));
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...init, headers });
}
