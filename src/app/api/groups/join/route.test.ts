import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  USER_ID_HEADER,
  USER_NAME_HEADER,
} from "@/lib/serverIdentity";

const mocks = vi.hoisted(() => ({
  joinGroup: vi.fn(),
}));

vi.mock("@/lib/joinGroup", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/joinGroup")>();
  return { ...actual, joinGroup: mocks.joinGroup };
});

import { JoinGroupError } from "@/lib/joinGroup";
import { POST } from "./route";

function joinRequest({
  body = { inviteCode: "tyo826", createMember: true, memberName: "Fizzy" },
  userId = "user-1",
  displayName = "Fizzy%20%E6%9A%AB%E5%81%87",
}: {
  body?: unknown;
  userId?: string | null;
  displayName?: string | null;
} = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (userId !== null) headers.set(USER_ID_HEADER, userId);
  if (displayName !== null) headers.set(USER_NAME_HEADER, displayName);

  return new NextRequest("http://localhost/api/groups/join", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/groups/join", () => {
  beforeEach(() => {
    mocks.joinGroup.mockResolvedValue({
      groupId: "group-1",
      groupName: "東京旅行",
      currentUserRole: "member",
      memberId: "member-1",
    });
  });

  it("requires a user identity", async () => {
    const response = await POST(joinRequest({ userId: null }));

    expect(response.status).toBe(401);
    expect(mocks.joinGroup).not.toHaveBeenCalled();
  });

  it.each([null, "%E0%A4%A", "%20%20", "a".repeat(51)])(
    "rejects invalid display name %s",
    async (displayName) => {
      const response = await POST(joinRequest({ displayName }));

      expect(response.status).toBe(400);
      expect(mocks.joinGroup).not.toHaveBeenCalled();
    }
  );

  it("rejects invalid JSON", async () => {
    const response = await POST(joinRequest({ body: "{" }));

    expect(response.status).toBe(400);
    expect(mocks.joinGroup).not.toHaveBeenCalled();
  });

  it("rejects an empty invite code", async () => {
    const response = await POST(
      joinRequest({ body: { inviteCode: " ", createMember: true } })
    );

    expect(response.status).toBe(400);
    expect(mocks.joinGroup).not.toHaveBeenCalled();
  });

  it.each([undefined, null, "true", 1])(
    "rejects non-boolean createMember %s",
    async (createMember) => {
      const response = await POST(
        joinRequest({ body: { inviteCode: "TYO826", createMember } })
      );

      expect(response.status).toBe(400);
      expect(mocks.joinGroup).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["INVITE_NOT_FOUND", 404],
    ["INVALID_MEMBER_NAME", 400],
  ] as const)("maps %s to %i", async (code, status) => {
    mocks.joinGroup.mockRejectedValue(new JoinGroupError(code));

    const response = await POST(joinRequest());

    expect(response.status).toBe(status);
  });

  it("passes normalized input and returns only the join result", async () => {
    const response = await POST(joinRequest());

    expect(mocks.joinGroup).toHaveBeenCalledWith({
      inviteCode: "TYO826",
      userId: "user-1",
      displayName: "Fizzy 暫假",
      createMember: true,
      memberName: "Fizzy",
    });
    expect(await response.json()).toEqual({
      success: true,
      data: {
        groupId: "group-1",
        groupName: "東京旅行",
        currentUserRole: "member",
        memberId: "member-1",
      },
    });
  });

  it("returns 500 for an unexpected error", async () => {
    mocks.joinGroup.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(joinRequest());

    expect(response.status).toBe(500);
  });
});
