import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/types";
import { canAccessGroup, getUserId } from "@/lib/serverIdentity";

// GET /api/members/[id]/detail - ?脣??閰單??漱????
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ?脣??靽⊥
    const member = await prisma.member.findUnique({
      where: { id },
    });

    if (!member) {
      return NextResponse.json<ApiResponse<unknown>>(
        {
          success: false,
          error: "Member not found",
        },
        { status: 404 }
      );
    }

    if (!(await canAccessGroup(getUserId(request), member.groupId))) {
      return NextResponse.json<ApiResponse<unknown>>(
        {
          success: false,
          error: "Member not found",
        },
        { status: 404 }
      );
    }

    // ?脣?閰脫??⊥隞??臬
    const expensesPaid = await prisma.expense.findMany({
      where: { paidById: id },
      include: {
        participants: {
          include: {
            member: true,
          },
        },
        paidBy: true,
      },
      orderBy: { date: "desc" },
    });

    // ?脣?閰脫??∪????臬
    const expensesParticipated = await prisma.expense.findMany({
      where: {
        participants: {
          some: {
            memberId: id,
          },
        },
      },
      include: {
        participants: {
          include: {
            member: true,
          },
        },
        paidBy: true,
      },
      orderBy: { date: "desc" },
    });

    // ?蔥鈭斗?閮?銝血??
    const allTransactionIds = new Set<string>();
    const transactions = [];

    for (const expense of expensesPaid) {
      if (!allTransactionIds.has(expense.id)) {
        allTransactionIds.add(expense.id);
        transactions.push({
          ...expense,
          type: "paid",
        });
      }
    }

    for (const expense of expensesParticipated) {
      if (!allTransactionIds.has(expense.id)) {
        allTransactionIds.add(expense.id);
        transactions.push({
          ...expense,
          type: "participated",
        });
      }
    }

    // ???摨?
    transactions.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 閮??隞??∠?甈??
    const debtMap: { [memberId: string]: number } = {};

    // ????????
    const groupMembers = await prisma.member.findMany({
      where: { groupId: member.groupId, isActive: true },
    });

    for (const m of groupMembers) {
      if (m.id !== id) {
        debtMap[m.id] = 0;
      }
    }

    // 閮?甈狡
    for (const expense of transactions) {
      const participant = expense.participants.find((p) => p.memberId === id);

      if (expense.paidById === id) {
        // 閰脫??⊥隞????臬嚗隞犖甈?
        for (const p of expense.participants) {
          if (p.memberId !== id) {
            debtMap[p.memberId] = (debtMap[p.memberId] || 0) + p.amount;
          }
        }
      } else if (participant) {
        // 閰脫??∪??????臬嚗??臭?鈭?
        debtMap[expense.paidById] = (debtMap[expense.paidById] || 0) - participant.amount;
      }
    }

    // 頧??箏??靽?銵?
    const debtRelationships = Object.entries(debtMap)
      .map(([memberId, amount]) => {
        const debtor = groupMembers.find((m) => m.id === memberId);
        return {
          memberId,
          memberName: debtor?.name || "Unknown",
          amount, // 甇?銵函內閰脫??⊥??嗅??嚗??貉”蝷箇???⊥?閰脫???
        };
      })
      .filter((d) => d.amount !== 0)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    // 閮?瘛券?嚗迤?貉”蝷箸??塚?鞎銵函內??嚗?
    const netAmount = debtRelationships.reduce((sum, d) => sum + d.amount, 0);

    return NextResponse.json<ApiResponse<unknown>>({
      success: true,
      data: {
        member,
        transactions,
        debtRelationships,
        netAmount,
      },
    });
  } catch (error) {
    console.error("Error fetching member detail:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      {
        success: false,
        error: "Failed to fetch member detail",
      },
      { status: 500 }
    );
  }
}
