import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseActivityContent } from "@/lib/activity";
import { canAccessGroup, getUserId } from "@/lib/serverIdentity";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId");
    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "groupId is required" },
        { status: 400 }
      );
    }
    if (!(await canAccessGroup(getUserId(request), groupId))) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    const activityLogs = await prisma.activityLog.findMany({
      where: { groupId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: activityLogs.map((log) => ({
        ...log,
        ...parseActivityContent(log.content),
      })),
    });
  } catch (error) {
    console.error("GET /api/activity error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
