import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET - 獲取活動紀錄
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "缺少群組 ID" },
        { status: 400 }
      );
    }

    const activityLogs = await prisma.activityLog.findMany({
      where: { groupId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: activityLogs,
    });
  } catch (error) {
    console.error("GET /api/activity 錯誤:", error);
    return NextResponse.json(
      { success: false, error: "伺服器錯誤" },
      { status: 500 }
    );
  }
}

// POST - 新增活動紀錄
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { groupId, actionType, actionBy, content } = body;

    if (!groupId || !actionType || !actionBy || !content) {
      return NextResponse.json(
        { success: false, error: "缺少必要欄位" },
        { status: 400 }
      );
    }

    const activityLog = await prisma.activityLog.create({
      data: {
        groupId,
        actionType,
        actionBy,
        content,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: activityLog,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/activity 錯誤:", error);
    return NextResponse.json(
      { success: false, error: "伺服器錯誤" },
      { status: 500 }
    );
  }
}
