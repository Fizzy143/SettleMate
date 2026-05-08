import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildExpenseActivityDetail, serializeActivityContent } from "@/lib/activity";
import { round } from "@/lib/calculations";
import { validateAmount, validateParticipantAmount } from "@/lib/money";
import { canAccessGroup, getDisplayName, getUserId } from "@/lib/serverIdentity";
import { ApiResponse } from "@/types";

type ExpensePayload = {
  groupId: string;
  date: string;
  name: string;
  amount: number;
  paidById: string;
  notes?: string;
  splitType: "equal" | "custom";
  participants: Array<{ memberId: string; amount?: number }>;
};

async function assertAccess(request: NextRequest, groupId: string) {
  return canAccessGroup(getUserId(request), groupId);
}

function resolveParticipantAmounts(
  amount: number,
  splitType: "equal" | "custom",
  participants: Array<{ memberId: string; amount?: number }>
) {
  if (splitType === "equal") {
    const amountPerPerson = round(amount / participants.length, 2);
    const remainder = round(amount - amountPerPerson * participants.length, 2);
    return participants.map((participant, index) => ({
      memberId: participant.memberId,
      amount: index === 0 ? round(amountPerPerson + remainder, 2) : amountPerPerson,
    }));
  }

  const participantAmounts = participants.map((participant) => ({
    memberId: participant.memberId,
    amount: round(Number(participant.amount ?? 0), 2),
  }));
  const invalidParticipant = participantAmounts.find((participant) =>
    validateParticipantAmount(participant.amount)
  );
  if (invalidParticipant) {
    throw new Error("Participant amount must be between 0 and 1000000");
  }
  const total = participantAmounts.reduce((sum, participant) => sum + participant.amount, 0);
  if (Math.abs(total - amount) > 0.01) {
    throw new Error("Sum of participant amounts must equal total amount");
  }
  return participantAmounts;
}

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId");
    if (!groupId) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "groupId is required" },
        { status: 400 }
      );
    }
    if (!(await assertAccess(request, groupId))) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: { paidBy: true, participants: { include: { member: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json<ApiResponse<unknown>>({ success: true, data: expenses });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ExpensePayload = await request.json();
    const { groupId, date, name, paidById, notes, splitType, participants } = body;
    const amount = round(Number(body.amount), 2);

    if (!groupId || !date || !name || body.amount === undefined || !paidById || !participants?.length) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (!(await assertAccess(request, groupId))) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }
    const amountError = validateAmount(amount);
    if (amountError) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: amountError },
        { status: 400 }
      );
    }

    let participantAmounts;
    try {
      participantAmounts = resolveParticipantAmounts(amount, splitType, participants);
    } catch (error) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: (error as Error).message },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        groupId,
        date: new Date(date),
        name: name.trim(),
        amount: round(amount, 2),
        paidById,
        notes: notes?.trim() || null,
        participants: { createMany: { data: participantAmounts } },
      },
      include: { paidBy: true, participants: { include: { member: true } } },
    });

    prisma.activityLog
      .create({
        data: {
          groupId,
          actionType: "add_expense",
          actionBy: getDisplayName(request),
          content: serializeActivityContent(
            `新增支出「${expense.name}」`,
            buildExpenseActivityDetail(expense)
          ),
        },
      })
      .catch((logError) => console.error("Failed to create activity log:", logError));

    return NextResponse.json<ApiResponse<unknown>>(
      { success: true, data: expense },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
