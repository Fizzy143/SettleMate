import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/types";

// GET /api/members?groupId=xxx - 獲取特定群組的成員
export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "groupId is required",
        },
        { status: 400 }
      );
    }

    const members = await prisma.member.findMany({
      where: { groupId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to fetch members",
      },
      { status: 500 }
    );
  }
}

// POST /api/members - 建立新成員
export async function POST(request: NextRequest) {
  try {
    const { groupId, name, role, color } = await request.json();

    if (!groupId || !name || name.trim() === "") {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "groupId and name are required",
        },
        { status: 400 }
      );
    }

    // 檢查群組是否存在
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "Group not found",
        },
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

    // 記錄活動日誌
    try {
      await prisma.activityLog.create({
        data: {
          groupId,
          actionType: "add_member",
          actionBy: "系統",
          content: `新增了成員「${member.name}」`,
        },
      });
    } catch (logError) {
      console.error("Failed to create activity log:", logError);
    }

    return NextResponse.json<ApiResponse<any>>(
      {
        success: true,
        data: member,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating member:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to create member",
      },
      { status: 500 }
    );
  }
}
