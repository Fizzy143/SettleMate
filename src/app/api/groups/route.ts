import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createInviteCode,
  ensureUser,
  getUserId,
} from "@/lib/serverIdentity";
import { ApiResponse } from "@/types";

async function uniqueInviteCode() {
  for (let i = 0; i < 8; i += 1) {
    const inviteCode = createInviteCode();
    const existing = await prisma.group.findUnique({ where: { inviteCode } });
    if (!existing) return inviteCode;
  }
  return `${Date.now().toString(36).slice(-6)}`.toUpperCase();
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json<ApiResponse<unknown>>({ success: true, data: [] });
    }

    const groups = await prisma.group.findMany({
      where: {
        memberships: {
          some: { userId },
        },
      },
      include: {
        members: {
          where: { isActive: true },
          select: { id: true, name: true, color: true },
        },
        memberships: {
          where: { userId },
          select: { role: true },
        },
        _count: {
          select: { expenses: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json<ApiResponse<unknown>>({
      success: true,
      data: groups.map((group) => ({
        ...group,
        currentUserRole: group.memberships[0]?.role || "member",
        memberships: undefined,
      })),
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await ensureUser(request);
    if (!user) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "User identity is required" },
        { status: 401 }
      );
    }

    const { name } = await request.json();
    if (!name || name.trim() === "") {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Group name is required" },
        { status: 400 }
      );
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        inviteCode: await uniqueInviteCode(),
        members: {
          create: {
            name: user.displayName,
            role: "建立者",
            color: "bg-blue-200",
            userId: user.id,
          },
        },
        memberships: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
      include: {
        members: true,
        expenses: true,
        _count: { select: { expenses: true } },
      },
    });

    return NextResponse.json<ApiResponse<unknown>>(
      { success: true, data: { ...group, currentUserRole: "owner" } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to create group" },
      { status: 500 }
    );
  }
}
