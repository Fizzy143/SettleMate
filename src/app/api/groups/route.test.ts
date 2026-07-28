import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  groupFindUnique: vi.fn(),
  groupCreate: vi.fn(),
  ensureUser: vi.fn(),
  createInviteCode: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    group: {
      findUnique: mocks.groupFindUnique,
      create: mocks.groupCreate,
    },
  },
}));

vi.mock("@/lib/serverIdentity", () => ({
  ensureUser: mocks.ensureUser,
  createInviteCode: mocks.createInviteCode,
  getUserId: vi.fn(),
}));

import { POST } from "./route";

describe("POST /api/groups", () => {
  beforeEach(() => {
    mocks.ensureUser.mockResolvedValue({
      id: "user-1",
      displayName: "Fizzy",
    });
    mocks.createInviteCode.mockReturnValue("ABC123");
    mocks.groupFindUnique.mockResolvedValue(null);
    mocks.groupCreate.mockResolvedValue({
      id: "group-1",
      name: "東京旅行",
      members: [],
      expenses: [],
      _count: { expenses: 0 },
    });
  });

  it("links the owner member to the owner user", async () => {
    const request = new NextRequest("http://localhost/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: "東京旅行" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mocks.groupCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          members: {
            create: expect.objectContaining({
              name: "Fizzy",
              role: "建立者",
              color: "bg-blue-200",
              userId: "user-1",
            }),
          },
        }),
      })
    );
  });
});
