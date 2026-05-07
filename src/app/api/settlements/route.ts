import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateMemberTotals, calculateSettlements, round } from "@/lib/calculations";
import { validateAmount } from "@/lib/money";
import { canAccessGroup, getDisplayName, getUserId } from "@/lib/serverIdentity";
import { ApiResponse } from "@/types";

type SettlementPaymentPayload = {
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  date?: string;
  notes?: string;
};

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
    const recentPayments = await prisma.expense.findMany({
      where: { groupId, kind: "settlement" },
      include: { paidBy: true, participants: { include: { member: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 20,
    });

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
        recentPayments: recentPayments.map((payment) => {
          const recipient = payment.participants[0]?.member;
          return {
            id: payment.id,
            from: payment.paidById,
            fromName: payment.paidBy.name,
            to: recipient?.id || "",
            toName: recipient?.name || "",
            amount: payment.amount,
            date: payment.date,
            notes: payment.notes,
            createdAt: payment.createdAt,
          };
        }),
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

export async function POST(request: NextRequest) {
  try {
    const body: SettlementPaymentPayload = await request.json();
    const { groupId, fromMemberId, toMemberId, date, notes } = body;
    const amount = round(Number(body.amount), 2);

    if (!groupId || !fromMemberId || !toMemberId || !Number.isFinite(amount)) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (fromMemberId === toMemberId) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Payer and recipient must be different" },
        { status: 400 }
      );
    }
    const amountError = validateAmount(amount);
    if (amountError) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: amountError },
        { status: 400 }
      );
    }
    if (!(await canAccessGroup(getUserId(request), groupId))) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    const members = await prisma.member.findMany({
      where: { groupId, id: { in: [fromMemberId, toMemberId] }, isActive: true },
    });
    const fromMember = members.find((member) => member.id === fromMemberId);
    const toMember = members.find((member) => member.id === toMemberId);
    if (!fromMember || !toMember) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    const payment = await prisma.expense.create({
      data: {
        groupId,
        date: date ? new Date(date) : new Date(),
        name: `${fromMember.name} 還款給 ${toMember.name}`,
        amount,
        paidById: fromMemberId,
        kind: "settlement",
        notes: notes?.trim() || null,
        participants: {
          create: {
            memberId: toMemberId,
            amount,
          },
        },
      },
      include: { paidBy: true, participants: { include: { member: true } } },
    });

    prisma.activityLog
      .create({
        data: {
          groupId,
          actionType: "add_settlement",
          actionBy: getDisplayName(request),
          content: `${fromMember.name} recorded repayment to ${toMember.name} for NT$${amount.toFixed(2)}`,
        },
      })
      .catch((logError) => console.error("Failed to create activity log:", logError));

    return NextResponse.json<ApiResponse<unknown>>(
      { success: true, data: payment },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating settlement payment:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to create settlement payment" },
      { status: 500 }
    );
  }
}
