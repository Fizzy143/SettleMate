import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/types";

// GET /api/members/[id] - 獲取單個成員詳情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id },
    });

    if (!member) {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "Member not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: member,
    });
  } catch (error) {
    console.error("Error fetching member:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to fetch member",
      },
      { status: 500 }
    );
  }
}

// PUT /api/members/[id] - 更新成員
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // 異步記錄活動日誌
    prisma.activityLog.create({
      data: {
        groupId: member.groupId,
        actionType: "edit_member",
        actionBy: "系統",
        content: `編輯了成員「${member.name}」的資訊`,
      },
    }).catch((logError) => {
      console.error("Failed to create activity log:", logError);
    });

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: member,
    });
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to update member",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/members/[id] - 停用成員（標記為不啟用，保留數據完整性）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 標記為不啟用（停用成員）
    const member = await prisma.member.update({
      where: { id },
      data: { isActive: false },
    });

    // 異步記錄活動日誌（不等待完成，不阻擋用戶）
    prisma.activityLog.create({
      data: {
        groupId: member.groupId,
        actionType: "deactivate_member",
        actionBy: "系統",
        content: `停用了成員「${member.name}」`,
      },
    }).catch((logError) => {
      console.error("Failed to create activity log:", logError);
    });

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: member,
    });
  } catch (error) {
    console.error("Error deactivating member:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to deactivate member",
      },
      { status: 500 }
    );
  }
}
