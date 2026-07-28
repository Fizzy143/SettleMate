import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeInviteCode } from "@/lib/invite";
import { getUserId } from "@/lib/serverIdentity";
import type { ApiResponse } from "@/types";
import type { InvitePreview, InviteViewerState } from "@/types/invite";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/invites/[code]">
) {
  try {
    const { code } = await ctx.params;
    const normalizedCode = normalizeInviteCode(code);
    const group = await prisma.group.findUnique({
      where: { inviteCode: normalizedCode },
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

    if (!group) {
      return NextResponse.json<ApiResponse<InvitePreview>>(
        { success: false, error: "Invite not found" },
        { status: 404 }
      );
    }

    const userId = getUserId(request);
    let viewerState: InviteViewerState = "anonymous";

    if (userId) {
      const membership = await prisma.groupMembership.findUnique({
        where: {
          userId_groupId: {
            userId,
            groupId: group.id,
          },
        },
        select: { id: true },
      });
      viewerState = membership ? "member" : "eligible";
    }

    return NextResponse.json<ApiResponse<InvitePreview>>({
      success: true,
      data: {
        group: {
          id: group.id,
          name: group.name,
          memberCount: group._count.members,
          expenseCount: group._count.expenses,
        },
        viewerState,
      },
    });
  } catch (error) {
    console.error("Error previewing invite:", error);
    return NextResponse.json<ApiResponse<InvitePreview>>(
      { success: false, error: "Failed to preview invite" },
      { status: 500 }
    );
  }
}
