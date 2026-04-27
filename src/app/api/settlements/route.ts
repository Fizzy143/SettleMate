import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/types";
import {
  calculateMemberTotals,
  calculateSettlements,
  MemberTotal,
  Settlement,
} from "@/lib/calculations";

// GET /api/settlements?groupId=xxx - 計算群組結算
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

    // 獲取群組的所有支出和成員
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { isActive: true }, // 只計算啟用的成員
        },
        expenses: {
          include: {
            participants: true,
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

    // 計算每個成員的應收應付
    const memberTotals = calculateMemberTotals(
      group.expenses,
      group.members.map((m: any) => m.id)
    );

    // 計算最少轉賬次數的結算方案
    const settlements = calculateSettlements(memberTotals);

    // 獲取成員信息用於返回
    const memberMap = new Map(group.members.map((m: any) => [m.id, m]));
    const memberTotalsArray = Array.from(memberTotals.values());

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: {
        memberTotals: memberTotalsArray,
        settlements: settlements.map((s) => ({
          from: s.from,
          fromName: (memberMap.get(s.from) as any)?.name || "",
          to: s.to,
          toName: (memberMap.get(s.to) as any)?.name || "",
          amount: s.amount,
        })),
      },
    });
  } catch (error) {
    console.error("Error calculating settlements:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to calculate settlements",
      },
      { status: 500 }
    );
  }
}
