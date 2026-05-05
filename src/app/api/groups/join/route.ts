import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUser } from "@/lib/serverIdentity";
import { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const user = await ensureUser(request);
    if (!user) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "User identity is required" },
        { status: 401 }
      );
    }

    const { inviteCode } = await request.json();
    const normalizedCode = String(inviteCode || "").trim().toUpperCase();
    if (!normalizedCode) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Invite code is required" },
        { status: 400 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { inviteCode: normalizedCode },
      include: { _count: { select: { expenses: true } } },
    });

    if (!group) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Invite code not found" },
        { status: 404 }
      );
    }

    await prisma.groupMembership.upsert({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: group.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        groupId: group.id,
        role: "member",
      },
    });

    return NextResponse.json<ApiResponse<unknown>>({
      success: true,
      data: { ...group, currentUserRole: "member" },
    });
  } catch (error) {
    console.error("Error joining group:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to join group" },
      { status: 500 }
    );
  }
}
