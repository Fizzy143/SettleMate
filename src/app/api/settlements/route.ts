import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateMemberTotals, calculateSettlements } from "@/lib/calculations";
import { canAccessGroup, getUserId } from "@/lib/serverIdentity";
import { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId");
    if (!groupId) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "groupId is required" },
        { status: 400 }
      );
    }
    if (!(await canAccessGroup(getUserId(request), groupId))) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { where: { isActive: true } },
        expenses: { include: { participants: true } },
      },
    });

    if (!group) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    const memberTotals = calculateMemberTotals(
      group.expenses,
      group.members.map((member) => member.id)
    );
    const settlements = calculateSettlements(memberTotals);
    const memberMap = new Map(group.members.map((member) => [member.id, member]));

    return NextResponse.json<ApiResponse<unknown>>({
      success: true,
      data: {
        memberTotals: Array.from(memberTotals.values()),
        settlements: settlements.map((settlement) => ({
          from: settlement.from,
          fromName: memberMap.get(settlement.from)?.name || "",
          to: settlement.to,
          toName: memberMap.get(settlement.to)?.name || "",
          amount: settlement.amount,
        })),
      },
    });
  } catch (error) {
    console.error("Error calculating settlements:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to calculate settlements" },
      { status: 500 }
    );
  }
}
