import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: { isActive: true }, // 只取啟用的成員
        },
        expenses: {
          include: {
            paidBy: true,
            participants: {
              include: {
                member: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        },
      },
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

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to fetch group",
      },
      { status: 500 }
    );
  }
}

// PUT /api/groups/[id] - 更新群組
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name } = await request.json();

    if (!name || name.trim() === "") {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "Group name is required",
        },
        { status: 400 }
      );
    }

    const group = await prisma.group.update({
      where: { id },
      data: {
        name: name.trim(),
      },
      include: {
        members: true,
        expenses: true,
      },
    });

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to update group",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id] - 刪除群組
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.group.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to delete group",
      },
      { status: 500 }
    );
  }
}
