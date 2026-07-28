import { prisma } from "@/lib/db";
import type { JoinGroupResult } from "@/types/invite";

export type JoinGroupInput = {
  inviteCode: string;
  userId: string;
  displayName: string;
  createMember: boolean;
  memberName?: unknown;
};

export class JoinGroupError extends Error {
  constructor(
    public readonly code: "INVITE_NOT_FOUND" | "INVALID_MEMBER_NAME"
  ) {
    super(code);
  }
}

export async function joinGroup(input: JoinGroupInput): Promise<JoinGroupResult> {
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.findUnique({
      where: { inviteCode: input.inviteCode },
      select: { id: true, name: true },
    });
    if (!group) throw new JoinGroupError("INVITE_NOT_FOUND");

    const existingMembership = await tx.groupMembership.findUnique({
      where: {
        userId_groupId: {
          userId: input.userId,
          groupId: group.id,
        },
      },
      select: { role: true },
    });

    // Reopening an invite must never claim, create, or reactivate a Member for
    // someone who already has access, including an owner-disabled Member.
    if (existingMembership) {
      return {
        groupId: group.id,
        groupName: group.name,
        currentUserRole: existingMembership.role,
        memberId: null,
      };
    }

    const memberName =
      typeof input.memberName === "string" ? input.memberName.trim() : "";
    if (
      input.createMember &&
      (memberName.length < 1 || memberName.length > 50)
    ) {
      throw new JoinGroupError("INVALID_MEMBER_NAME");
    }

    await tx.user.upsert({
      where: { id: input.userId },
      update: { displayName: input.displayName },
      create: { id: input.userId, displayName: input.displayName },
    });

    // Empty updates preserve an existing owner role if two join requests race.
    const membership = await tx.groupMembership.upsert({
      where: {
        userId_groupId: {
          userId: input.userId,
          groupId: group.id,
        },
      },
      update: {},
      create: {
        userId: input.userId,
        groupId: group.id,
        role: "member",
      },
      select: { role: true },
    });

    const member = input.createMember
      ? await tx.member.upsert({
          where: {
            groupId_userId: {
              groupId: group.id,
              userId: input.userId,
            },
          },
          // Never rename or reactivate a linked Member in a race branch.
          update: {},
          create: {
            groupId: group.id,
            userId: input.userId,
            name: memberName,
            role: null,
            color: "bg-blue-200",
            isActive: true,
          },
          select: { id: true },
        })
      : null;

    return {
      groupId: group.id,
      groupName: group.name,
      currentUserRole: membership.role,
      memberId: member?.id ?? null,
    };
  });
}
