import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canAccessGroup, getDisplayName, getUserId } from "@/lib/serverIdentity";
import { ApiResponse } from "@/types";

async function assertAccess(request: NextRequest, groupId: string) {
  return canAccessGroup(getUserId(request), groupId);
}

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId");
    if (!groupId) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "groupId is required" },
        { status: 400 }
      );
    }
    if (!(await assertAccess(request, groupId))) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    const members = await prisma.member.findMany({
      where: { groupId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json<ApiResponse<unknown>>({ success: true, data: members });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { groupId, name, role, color } = await request.json();
    if (!groupId || !name || name.trim() === "") {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "groupId and name are required" },
        { status: 400 }
      );
    }
    if (!(await assertAccess(request, groupId))) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    const member = await prisma.member.create({
      data: {
        groupId,
        name: name.trim(),
        role: role || null,
        color: color || null,
        isActive: true,
      },
    });

    prisma.activityLog
      .create({
        data: {
          groupId,
          actionType: "add_member",
          actionBy: getDisplayName(request),
          content: `Added member "${member.name}"`,
        },
      })
      .catch((logError) => console.error("Failed to create activity log:", logError));

    return NextResponse.json<ApiResponse<unknown>>(
      { success: true, data: member },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating member:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to create member" },
      { status: 500 }
    );
  }
}
