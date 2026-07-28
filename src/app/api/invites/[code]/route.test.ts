import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { USER_ID_HEADER } from "@/lib/serverIdentity";

const mocks = vi.hoisted(() => ({
  groupFindUnique: vi.fn(),
  membershipFindUnique: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
  userUpsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    group: {
      findUnique: mocks.groupFindUnique,
    },
    groupMembership: {
      findUnique: mocks.membershipFindUnique,
    },
    user: {
      create: mocks.userCreate,
      update: mocks.userUpdate,
      upsert: mocks.userUpsert,
    },
  },
}));

import { GET } from "./route";

function requestWithUser(userId?: string) {
  const headers = new Headers();
  if (userId) headers.set(USER_ID_HEADER, userId);
  return new NextRequest("http://localhost/api/invites/tyo826", { headers });
}

async function preview(code: string, userId?: string) {
  return GET(requestWithUser(userId), {
    params: Promise.resolve({ code }),
  });
}

describe("GET /api/invites/[code]", () => {
  beforeEach(() => {
    mocks.groupFindUnique.mockResolvedValue({
      id: "group-1",
      name: "東京旅行",
      _count: { members: 6, expenses: 28 },
    });
    mocks.membershipFindUnique.mockResolvedValue(null);
  });

  it("normalizes the code and returns only the safe member preview", async () => {
    mocks.membershipFindUnique.mockResolvedValue({ id: "membership-1" });

    const response = await preview(" tyo826 ", "user-1");

    expect(mocks.groupFindUnique).toHaveBeenCalledWith({
      where: { inviteCode: "TYO826" },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            members: { where: { isActive: true } },
            expenses: { where: { kind: "expense" } },
          },
        },
      },
    });
    expect(await response.json()).toEqual({
      success: true,
      data: {
        group: {
          id: "group-1",
          name: "東京旅行",
          memberCount: 6,
          expenseCount: 28,
        },
        viewerState: "member",
      },
    });
  });

  it.each([undefined, "user-1"])(
    "returns the same 404 shape for a missing group with user %s",
    async (userId) => {
      mocks.groupFindUnique.mockResolvedValue(null);

      const response = await preview("missing", userId);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        success: false,
        error: "Invite not found",
      });
      expect(mocks.membershipFindUnique).not.toHaveBeenCalled();
    }
  );

  it("returns anonymous without a user identity", async () => {
    const response = await preview("TYO826");

    expect((await response.json()).data.viewerState).toBe("anonymous");
    expect(mocks.membershipFindUnique).not.toHaveBeenCalled();
  });

  it("returns eligible for an identity without membership", async () => {
    const response = await preview("TYO826", "user-1");

    expect((await response.json()).data.viewerState).toBe("eligible");
    expect(mocks.membershipFindUnique).toHaveBeenCalledWith({
      where: {
        userId_groupId: {
          userId: "user-1",
          groupId: "group-1",
        },
      },
      select: { id: true },
    });
  });

  it("never creates or updates a user while previewing", async () => {
    await preview("TYO826", "user-1");

    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    expect(mocks.userUpsert).not.toHaveBeenCalled();
  });
});
