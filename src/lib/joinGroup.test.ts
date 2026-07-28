import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    group: { findUnique: vi.fn() },
    groupMembership: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    user: { upsert: vi.fn() },
    member: { upsert: vi.fn() },
  };

  return {
    tx,
    transaction: vi.fn(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    ),
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

import { JoinGroupError, joinGroup } from "@/lib/joinGroup";

const baseInput = {
  inviteCode: "TYO826",
  userId: "user-1",
  displayName: "Fizzy",
  createMember: true,
  memberName: "Fizzy",
};

function expectNoWrites() {
  expect(mocks.tx.user.upsert).not.toHaveBeenCalled();
  expect(mocks.tx.groupMembership.upsert).not.toHaveBeenCalled();
  expect(mocks.tx.member.upsert).not.toHaveBeenCalled();
}

describe("joinGroup", () => {
  beforeEach(() => {
    mocks.tx.group.findUnique.mockResolvedValue({
      id: "group-1",
      name: "東京旅行",
    });
    mocks.tx.groupMembership.findUnique.mockResolvedValue(null);
    mocks.tx.user.upsert.mockResolvedValue({ id: "user-1" });
    mocks.tx.groupMembership.upsert.mockResolvedValue({ role: "member" });
    mocks.tx.member.upsert.mockResolvedValue({ id: "member-1" });
  });

  it("rejects an invalid invite before any write", async () => {
    mocks.tx.group.findUnique.mockResolvedValue(null);

    await expect(joinGroup(baseInput)).rejects.toMatchObject({
      code: "INVITE_NOT_FOUND",
    });
    expectNoWrites();
  });

  it.each(["member", "owner"])(
    "returns an existing %s membership without writes",
    async (role) => {
      mocks.tx.groupMembership.findUnique.mockResolvedValue({ role });

      await expect(joinGroup(baseInput)).resolves.toEqual({
        groupId: "group-1",
        groupName: "東京旅行",
        currentUserRole: role,
        memberId: null,
      });
      expectNoWrites();
    }
  );

  it("joins without creating a member when opted out", async () => {
    const result = await joinGroup({
      ...baseInput,
      createMember: false,
      memberName: "ignored",
    });

    expect(mocks.tx.user.upsert).toHaveBeenCalledWith({
      where: { id: "user-1" },
      update: { displayName: "Fizzy" },
      create: { id: "user-1", displayName: "Fizzy" },
    });
    expect(mocks.tx.groupMembership.upsert).toHaveBeenCalled();
    expect(mocks.tx.member.upsert).not.toHaveBeenCalled();
    expect(result.memberId).toBeNull();
  });

  it("creates a linked member with a trimmed name", async () => {
    await joinGroup({ ...baseInput, memberName: "  Fizzy  " });

    expect(mocks.tx.member.upsert).toHaveBeenCalledWith({
      where: {
        groupId_userId: {
          groupId: "group-1",
          userId: "user-1",
        },
      },
      update: {},
      create: {
        groupId: "group-1",
        userId: "user-1",
        name: "Fizzy",
        role: null,
        color: "bg-blue-200",
        isActive: true,
      },
      select: { id: true },
    });
  });

  it.each([undefined, "   ", "a".repeat(51)])(
    "rejects invalid member name %s before the first write",
    async (memberName) => {
      await expect(
        joinGroup({ ...baseInput, memberName })
      ).rejects.toBeInstanceOf(JoinGroupError);
      expectNoWrites();
    }
  );

  it("does not rename or reactivate an existing linked member", async () => {
    mocks.tx.member.upsert.mockResolvedValue({ id: "inactive-member" });

    await joinGroup(baseInput);

    expect(mocks.tx.member.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} })
    );
  });

  it("rejects when any transaction write rejects", async () => {
    mocks.tx.groupMembership.upsert.mockRejectedValue(
      new Error("database unavailable")
    );

    await expect(joinGroup(baseInput)).rejects.toThrow("database unavailable");
    expect(mocks.tx.member.upsert).not.toHaveBeenCalled();
  });
});
