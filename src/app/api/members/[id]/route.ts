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

// DELETE /api/members/[id] - 刪除成員（實際上是標記為不啟用）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 標記為不啟用而不是真正刪除
    const member = await prisma.member.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: member,
    });
  } catch (error) {
    console.error("Error deleting member:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to delete member",
      },
      { status: 500 }
    );
  }
}
