import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canAccessGroup, getGroupRole, getUserId, isGroupOwner } from "@/lib/serverIdentity";
import { ApiResponse } from "@/types";

async function requireGroupAccess(request: NextRequest, groupId: string) {
  const userId = getUserId(request);
  return canAccessGroup(userId, groupId);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!(await requireGroupAccess(request, id))) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        },
        expenses: {
          include: {
            paidBy: true,
            participants: { include: { member: true } },
          },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        },
        _count: { select: { expenses: true } },
      },
    });

    if (!group) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    const currentUserRole = await getGroupRole(getUserId(request), id);

    return NextResponse.json<ApiResponse<unknown>>({
      success: true,
      data: { ...group, currentUserRole },
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to fetch group" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!(await requireGroupAccess(request, id))) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }
    if (!(await isGroupOwner(getUserId(request), id))) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Only the group owner can edit this group" },
        { status: 403 }
      );
    }

    const { name } = await request.json();
    if (!name || name.trim() === "") {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Group name is required" },
        { status: 400 }
      );
    }

    const group = await prisma.group.update({
      where: { id },
      data: { name: name.trim() },
      include: { members: true, expenses: true },
    });

    return NextResponse.json<ApiResponse<unknown>>({ success: true, data: group });
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to update group" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!(await requireGroupAccess(request, id))) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }
    if (!(await isGroupOwner(getUserId(request), id))) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Only the group owner can delete this group" },
        { status: 403 }
      );
    }

    await prisma.group.delete({ where: { id } });

    return NextResponse.json<ApiResponse<unknown>>({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to delete group" },
      { status: 500 }
    );
  }
}
