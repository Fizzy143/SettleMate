import { describe, expect, it } from "vitest";
import { readApiResponse } from "@/lib/apiResponse";

describe("readApiResponse", () => {
  it("returns valid API JSON", async () => {
    const response = Response.json({ success: true, data: { id: "group-1" } });

    await expect(readApiResponse(response)).resolves.toEqual({
      success: true,
      data: { id: "group-1" },
    });
  });

  it("normalizes a non-JSON Firewall 429", async () => {
    const response = new Response("Too Many Requests", { status: 429 });

    await expect(readApiResponse(response)).resolves.toEqual({
      success: false,
      error: "請求過於頻繁，請稍後再試",
    });
  });

  it("normalizes a non-JSON server error", async () => {
    const response = new Response("Service Unavailable", { status: 500 });

    await expect(readApiResponse(response)).resolves.toEqual({
      success: false,
      error: "伺服器暫時無法回應，請稍後再試",
    });
  });
});
