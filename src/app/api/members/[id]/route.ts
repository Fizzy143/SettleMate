import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canAccessGroup, getDisplayName, getUserId } from "@/lib/serverIdentity";
import { ApiResponse } from "@/types";

async function getMemberWithAccess(request: NextRequest, id: string) {
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) return null;
  const allowed = await canAccessGroup(getUserId(request), member.groupId);
  return allowed ? member : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const member = await getMemberWithAccess(request, id);
    if (!member) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }
    return NextResponse.json<ApiResponse<unknown>>({ success: true, data: member });
  } catch (error) {
    console.error("Error fetching member:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to fetch member" },
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
    const existing = await getMemberWithAccess(request, id);
    if (!existing) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }
    const { name, role, color, isActive } = await request.json();

    const member = await prisma.member.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(role !== undefined && { role }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    prisma.activityLog
      .create({
        data: {
          groupId: member.groupId,
          actionType: "edit_member",
          actionBy: getDisplayName(request),
          content: `Updated member "${member.name}"`,
        },
      })
      .catch((logError) => console.error("Failed to create activity log:", logError));

    return NextResponse.json<ApiResponse<unknown>>({ success: true, data: member });
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to update member" },
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
    const existing = await getMemberWithAccess(request, id);
    if (!existing) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    const member = await prisma.member.update({
      where: { id },
      data: { isActive: false },
    });

    prisma.activityLog
      .create({
        data: {
          groupId: member.groupId,
          actionType: "deactivate_member",
          actionBy: getDisplayName(request),
          content: `Deactivated member "${member.name}"`,
        },
      })
      .catch((logError) => console.error("Failed to create activity log:", logError));

    return NextResponse.json<ApiResponse<unknown>>({ success: true, data: member });
  } catch (error) {
    console.error("Error deactivating member:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to deactivate member" },
      { status: 500 }
    );
  }
}
