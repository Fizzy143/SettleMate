import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiFetchAs,
  createProvisionalIdentity,
  persistClientIdentity,
  saveClientIdentity,
} from "@/lib/clientIdentity";

describe("client identity lifecycle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("crypto", { randomUUID: () => "new-user" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a trimmed provisional identity without persistence", () => {
    expect(createProvisionalIdentity("  Fizzy  ")).toEqual({
      userId: "new-user",
      displayName: "Fizzy",
    });
    expect(window.localStorage.length).toBe(0);
  });

  it("persists the exact provisional identity", () => {
    const identity = { userId: "new-user", displayName: "Fizzy" };

    expect(persistClientIdentity(identity)).toEqual(identity);
    expect(window.localStorage.getItem("settlemateUserId")).toBe("new-user");
    expect(window.localStorage.getItem("settlemateDisplayName")).toBe("Fizzy");
  });

  it("fetches with explicit encoded identity headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal("fetch", fetchMock);

    await apiFetchAs(
      { userId: "new-user", displayName: "Fizzy 暫假" },
      "/api/groups/join",
      { method: "POST", body: "{}" }
    );

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("x-settlemate-user-id")).toBe("new-user");
    expect(headers.get("x-settlemate-display-name")).toBe(
      "Fizzy%20%E6%9A%AB%E5%81%87"
    );
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("keeps saveClientIdentity immediately persistent", () => {
    expect(saveClientIdentity("  Fizzy  ")).toEqual({
      userId: "new-user",
      displayName: "Fizzy",
    });
    expect(window.localStorage.getItem("settlemateUserId")).toBe("new-user");
    expect(window.localStorage.getItem("settlemateDisplayName")).toBe("Fizzy");
  });

  it("preserves an existing user ID when saving a new name", () => {
    window.localStorage.setItem("settlemateUserId", "existing-user");

    expect(saveClientIdentity("New name").userId).toBe("existing-user");
  });
});
