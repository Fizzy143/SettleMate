import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/types";

// GET /api/groups - 獲取所有群組
export async function GET() {
  try {
    const groups = await prisma.group.findMany({
      include: {
        members: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: {
            expenses: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (groups.length === 0) {
      // 如果沒有群組，返回空列表
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        data: [],
      });
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: groups,
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to fetch groups",
      },
      { status: 500 }
    );
  }
}

// POST /api/groups - 建立新群組
export async function POST(request: NextRequest) {
  try {
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

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
      },
      include: {
        members: true,
        expenses: true,
      },
    });

    return NextResponse.json<ApiResponse<any >>(
      {
        success: true,
        data: group,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to create group",
      },
      { status: 500 }
    );
  }
}
