import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { round } from "@/lib/calculations";
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
    amount: round(participant.amount || 0, 2),
  }));
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
    const { groupId, date, name, amount, paidById, notes, splitType, participants } = body;

    if (!groupId || !date || !name || !amount || !paidById || !participants?.length) {
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
    if (amount <= 0) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Amount must be greater than 0" },
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
          content: `Added expense "${expense.name}" for NT$${expense.amount.toFixed(2)}`,
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
