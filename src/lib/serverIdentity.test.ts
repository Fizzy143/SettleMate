import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
  USER_NAME_HEADER,
  getValidatedDisplayName,
} from "@/lib/serverIdentity";

function requestWithDisplayName(value?: string) {
  const headers = new Headers();
  if (value !== undefined) headers.set(USER_NAME_HEADER, value);
  return new NextRequest("http://localhost/api/groups/join", { headers });
}

describe("getValidatedDisplayName", () => {
  it("decodes before trimming", () => {
    expect(
      getValidatedDisplayName(
        requestWithDisplayName("%20%E6%9A%AB%E5%81%87%20")
      )
    ).toBe("暫假");
  });

  it.each([undefined, "%20%20", "%E0%A4%A", "a".repeat(51)])(
    "rejects invalid header %s",
    (value) => {
      expect(getValidatedDisplayName(requestWithDisplayName(value))).toBeNull();
    }
  );

  it("accepts the 50-code-unit boundary", () => {
    expect(getValidatedDisplayName(requestWithDisplayName("a".repeat(50)))).toBe(
      "a".repeat(50)
    );
  });
});
