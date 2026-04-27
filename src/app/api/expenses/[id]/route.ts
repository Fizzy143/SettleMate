import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/types";
import { round } from "@/lib/calculations";

// GET /api/expenses/[id] - 獲取單個支出詳情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        paidBy: true,
        participants: {
          include: {
            member: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "Expense not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to fetch expense",
      },
      { status: 500 }
    );
  }
}

interface UpdateExpenseRequest {
  date?: string;
  name?: string;
  amount?: number;
  paidById?: string;
  notes?: string;
  splitType?: "equal" | "custom";
  participants?: Array<{
    memberId: string;
    amount?: number;
  }>;
}

// PUT /api/expenses/[id] - 更新支出
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateExpenseRequest = await request.json();

    // 獲取原有支出
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "Expense not found",
        },
        { status: 404 }
      );
    }

    const amount = body.amount || existingExpense.amount;
    const splitType = body.splitType || "custom";
    const participants = body.participants;

    // 如果更新了金額或分攤方式，需要重新計算分攤
    let participantAmounts:
      | Array<{ memberId: string; amount: number }>
      | undefined;

    if (body.amount || body.splitType || body.participants) {
      if (!participants) {
        return NextResponse.json<ApiResponse<any>>(
          {
            success: false,
            error: "Participants are required",
          },
          { status: 400 }
        );
      }

      if (splitType === "equal") {
        const amountPerPerson = round(amount / participants.length, 2);
        const remainder = round(
          amount - amountPerPerson * participants.length,
          2
        );

        participantAmounts = participants.map((p, index) => ({
          memberId: p.memberId,
          amount:
            index === 0
              ? round(amountPerPerson + remainder, 2)
              : amountPerPerson,
        }));
      } else {
        participantAmounts = participants.map((p) => ({
          memberId: p.memberId,
          amount: round(p.amount || 0, 2),
        }));

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
      }
    }

    // 更新支出
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(body.date && { date: new Date(body.date) }),
        ...(body.name && { name: body.name.trim() }),
        ...(body.amount && { amount: round(body.amount, 2) }),
        ...(body.paidById && { paidById: body.paidById }),
        ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
        // 如果有新的分攤方式，先刪除舊的參與者，再新增
        ...(participantAmounts && {
          participants: {
            deleteMany: {},
            createMany: {
              data: participantAmounts,
            },
          },
        }),
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

    // 記錄活動日誌
    try {
      await prisma.activityLog.create({
        data: {
          groupId: existingExpense.groupId,
          actionType: "edit_expense",
          actionBy: expense.paidBy.name,
          content: `編輯了支出「${expense.name}」，金額 NT$${expense.amount.toFixed(2)}`,
        },
      });
    } catch (logError) {
      console.error("Failed to create activity log:", logError);
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to update expense",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/expenses/[id] - 刪除支出
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 先獲取支出信息用於日誌記錄
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { paidBy: true },
    });

    if (!expense) {
      return NextResponse.json<ApiResponse<any>>(
        {
          success: false,
          error: "Expense not found",
        },
        { status: 404 }
      );
    }

    // 刪除支出
    await prisma.expense.delete({
      where: { id },
    });

    // 記錄活動日誌
    try {
      await prisma.activityLog.create({
        data: {
          groupId: expense.groupId,
          actionType: "delete_expense",
          actionBy: expense.paidBy.name,
          content: `刪除了支出「${expense.name}」`,
        },
      });
    } catch (logError) {
      console.error("Failed to create activity log:", logError);
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json<ApiResponse<any>>(
      {
        success: false,
        error: "Failed to delete expense",
      },
      { status: 500 }
    );
  }
}
