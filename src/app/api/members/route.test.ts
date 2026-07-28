import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  memberCreate: vi.fn(),
  activityLogCreate: vi.fn(),
  canAccessGroup: vi.fn(),
  getDisplayName: vi.fn(),
  getUserId: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    member: {
      create: mocks.memberCreate,
    },
    activityLog: {
      create: mocks.activityLogCreate,
    },
  },
}));

vi.mock("@/lib/serverIdentity", () => ({
  canAccessGroup: mocks.canAccessGroup,
  getDisplayName: mocks.getDisplayName,
  getUserId: mocks.getUserId,
}));

import { POST } from "./route";

describe("POST /api/members", () => {
  beforeEach(() => {
    mocks.getUserId.mockReturnValue("user-1");
    mocks.getDisplayName.mockReturnValue("Fizzy");
    mocks.canAccessGroup.mockResolvedValue(true);
    mocks.memberCreate.mockResolvedValue({
      id: "member-1",
      groupId: "group-1",
      name: "Guest A",
      role: null,
      color: "bg-blue-200",
      isActive: true,
    });
    mocks.activityLogCreate.mockResolvedValue({ id: "log-1" });
  });

  it("keeps manually created members unlinked", async () => {
    const request = new NextRequest("http://localhost/api/members", {
      method: "POST",
      body: JSON.stringify({
        groupId: "group-1",
        name: "Guest A",
        role: null,
        color: "bg-blue-200",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mocks.memberCreate).toHaveBeenCalledWith({
      data: {
        groupId: "group-1",
        name: "Guest A",
        role: null,
        color: "bg-blue-200",
        isActive: true,
      },
    });
    expect(mocks.memberCreate.mock.calls[0][0].data).not.toHaveProperty("userId");
  });
});
