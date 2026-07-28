import { describe, expect, it, vi } from "vitest";
import { buildInviteUrl, copyInviteUrl, normalizeInviteCode } from "@/lib/invite";

describe("normalizeInviteCode", () => {
  it("trims and uppercases", () => {
    expect(normalizeInviteCode(" tyo826 ")).toBe("TYO826");
  });

  it.each([null, undefined, 42, {}])("rejects non-string value %s", (value) => {
    expect(normalizeInviteCode(value)).toBe("");
  });
});


describe("invite URL sharing", () => {
  it("builds a normalized absolute invite URL", () => {
    expect(buildInviteUrl("TYO826", "https://settlemate.example/"))
      .toBe("https://settlemate.example/invite/TYO826");
  });

  it("copies the full invite URL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const fallbackPrompt = vi.fn();

    await expect(copyInviteUrl({
      inviteCode: "tyo826",
      origin: "https://settlemate.example",
      writeText,
      fallbackPrompt,
    })).resolves.toBe("clipboard");
    expect(writeText).toHaveBeenCalledWith(
      "https://settlemate.example/invite/TYO826"
    );
    expect(fallbackPrompt).not.toHaveBeenCalled();
  });

  it("falls back to a prompt with the full URL", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    const fallbackPrompt = vi.fn();

    await expect(copyInviteUrl({
      inviteCode: "TYO826",
      origin: "https://settlemate.example",
      writeText,
      fallbackPrompt,
    })).resolves.toBe("fallback");
    expect(fallbackPrompt).toHaveBeenCalledWith(
      "複製邀請連結",
      "https://settlemate.example/invite/TYO826"
    );
  });
});
