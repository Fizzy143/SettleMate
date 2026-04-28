import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/types";
import { round } from "@/lib/calculations";

// GET /api/expenses?groupId=xxx - 獲取特定群組的支出
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

    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: true,
        participants: {
          include: {
            member: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: expenses,
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to fetch expenses",
      },
      { status: 500 }
    );
  }
}

interface CreateExpenseRequest {
  groupId: string;
  date: string; // ISO 8601
  name: string;
  amount: number;
  paidById: string;
  notes?: string;
  splitType: "equal" | "custom";
  participants: Array<{
    memberId: string;
    amount?: number; // 對於 custom 分配
  }>;
}

// POST /api/expenses - 建立新支出
export async function POST(request: NextRequest) {
  try {
    const body: CreateExpenseRequest = await request.json();
    const {
      groupId,
      date,
      name,
      amount,
      paidById,
      notes,
      splitType,
      participants,
    } = body;

    // 驗證必填字段
    if (!groupId || !date || !name || !amount || !paidById || !participants) {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // 驗證金額
    if (amount <= 0) {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "Amount must be greater than 0",
        },
        { status: 400 }
      );
    }

    // 計算分攤金額
    let participantAmounts: Array<{ memberId: string; amount: number }> = [];

    if (splitType === "equal") {
      // 平均分攤
      const amountPerPerson = round(amount / participants.length, 2);
      const remainder = round(amount - amountPerPerson * participants.length, 2);

      participantAmounts = participants.map((p, index) => ({
        memberId: p.memberId,
        amount:
          index === 0
            ? round(amountPerPerson + remainder, 2)
            : amountPerPerson,
      }));
    } else if (splitType === "custom") {
      // 自訂分攤
      participantAmounts = participants.map((p) => ({
        memberId: p.memberId,
        amount: round(p.amount || 0, 2),
      }));

      // 驗證總金額是否匹配
      const totalParticipant = participantAmounts.reduce(
        (sum, p) => sum + p.amount,
        0
      );
      if (Math.abs(totalParticipant - amount) > 0.01) {
        return NextResponse.json<ApiResponse<any>>(
          {
            success: false,
            error: "Sum of participant amounts must equal total amount",
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "Invalid splitType",
        },
        { status: 400 }
      );
    }

    // 建立支出記錄
    const expense = await prisma.expense.create({
      data: {
        groupId,
        date: new Date(date),
        name: name.trim(),
        amount: round(amount, 2),
        paidById,
        notes: notes?.trim() || null,
        participants: {
          createMany: {
            data: participantAmounts.map((p) => ({
              memberId: p.memberId,
              amount: p.amount,
            })),
          },
        },
      },
      include: {
        paidBy: true,
        participants: {
          include: {
            member: true,
          },
        },
      },
    });

    // 異步記錄活動日誌（不等待完成，不阻擋用戶）
    prisma.activityLog.create({
      data: {
        groupId,
        actionType: "add_expense",
        actionBy: expense.paidBy.name,
        content: `新增了支出「${expense.name}」，金額 NT$${expense.amount.toFixed(2)}`,
      },
    }).catch((logError) => {
      console.error("Failed to create activity log:", logError);
    });

    return NextResponse.json<ApiResponse<any>>(
      {
        success: true,
        data: expense,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to create expense",
      },
      { status: 500 }
    );
  }
}
