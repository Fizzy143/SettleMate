import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/types";

// GET /api/members/[id]/detail - 獲取成員詳情和交易記錄
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 獲取成員信息
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

    // 獲取該成員支付的支出
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

    // 獲取該成員參與的支出
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

    // 合併交易記錄並去重
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

    // 按日期排序
    transactions.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 計算與其他成員的欠債關係
    const debtMap: { [memberId: string]: number } = {};

    // 初始化所有成員
    const groupMembers = await prisma.member.findMany({
      where: { groupId: member.groupId, isActive: true },
    });

    for (const m of groupMembers) {
      if (m.id !== id) {
        debtMap[m.id] = 0;
      }
    }

    // 計算欠款
    for (const expense of transactions) {
      const participant = expense.participants.find((p) => p.memberId === id);

      if (expense.paidById === id) {
        // 該成員支付了這筆支出，其他人欠他
        for (const p of expense.participants) {
          if (p.memberId !== id) {
            debtMap[p.memberId] = (debtMap[p.memberId] || 0) + p.amount;
          }
        }
      } else if (participant) {
        // 該成員參與了這筆支出，欠支付人
        debtMap[expense.paidById] = (debtMap[expense.paidById] || 0) - participant.amount;
      }
    }

    // 轉換為債務關係列表
    const debtRelationships = Object.entries(debtMap)
      .map(([memberId, amount]) => {
        const debtor = groupMembers.find((m) => m.id === memberId);
        return {
          memberId,
          memberName: debtor?.name || "Unknown",
          amount, // 正數表示該成員欠當前成員，負數表示當前成員欠該成員
        };
      })
      .filter((d) => d.amount !== 0)
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    // 計算淨額（正數表示應收，負數表示應付）
    const netAmount = debtRelationships.reduce((sum, d) => sum + d.amount, 0);

    return NextResponse.json<ApiResponse<any>>({
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
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to fetch member detail",
      },
      { status: 500 }
    );
  }
}
