import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { round } from "@/lib/calculations";
import { canAccessGroup, getDisplayName, getUserId } from "@/lib/serverIdentity";
import { ApiResponse } from "@/types";

type UpdateExpenseRequest = {
  date?: string;
  name?: string;
  amount?: number;
  paidById?: string;
  notes?: string;
  splitType?: "equal" | "custom";
  participants?: Array<{ memberId: string; amount?: number }>;
};

async function getExpenseWithAccess(request: NextRequest, id: string) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { paidBy: true },
  });
  if (!expense) return null;
  const allowed = await canAccessGroup(getUserId(request), expense.groupId);
  return allowed ? expense : null;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expense = await getExpenseWithAccess(request, id);
    if (!expense) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }
    const fullExpense = await prisma.expense.findUnique({
      where: { id },
      include: { paidBy: true, participants: { include: { member: true } } },
    });
    return NextResponse.json<ApiResponse<unknown>>({ success: true, data: fullExpense });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to fetch expense" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existingExpense = await getExpenseWithAccess(request, id);
    if (!existingExpense) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    const body: UpdateExpenseRequest = await request.json();
    const amount = body.amount || existingExpense.amount;
    const splitType = body.splitType || "custom";
    let participantAmounts:
      | Array<{ memberId: string; amount: number }>
      | undefined;

    if (body.amount || body.splitType || body.participants) {
      if (!body.participants?.length) {
        return NextResponse.json<ApiResponse<unknown>>(
          { success: false, error: "Participants are required" },
          { status: 400 }
        );
      }
      try {
        participantAmounts = resolveParticipantAmounts(amount, splitType, body.participants);
      } catch (error) {
        return NextResponse.json<ApiResponse<unknown>>(
          { success: false, error: (error as Error).message },
          { status: 400 }
        );
      }
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(body.date && { date: new Date(body.date) }),
        ...(body.name && { name: body.name.trim() }),
        ...(body.amount && { amount: round(body.amount, 2) }),
        ...(body.paidById && { paidById: body.paidById }),
        ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
        ...(participantAmounts && {
          participants: {
            deleteMany: {},
            createMany: { data: participantAmounts },
          },
        }),
      },
      include: { paidBy: true, participants: { include: { member: true } } },
    });

    prisma.activityLog
      .create({
        data: {
          groupId: existingExpense.groupId,
          actionType: "edit_expense",
          actionBy: getDisplayName(request),
          content: `Updated expense "${expense.name}" for NT$${expense.amount.toFixed(2)}`,
        },
      })
      .catch((logError) => console.error("Failed to create activity log:", logError));

    return NextResponse.json<ApiResponse<unknown>>({ success: true, data: expense });
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expense = await getExpenseWithAccess(request, id);
    if (!expense) {
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: "Expense not found" },
        { status: 404 }
      );
    }

    await prisma.expense.delete({ where: { id } });

    prisma.activityLog
      .create({
        data: {
          groupId: expense.groupId,
          actionType: "delete_expense",
          actionBy: getDisplayName(request),
          content: `Deleted expense "${expense.name}"`,
        },
      })
      .catch((logError) => console.error("Failed to create activity log:", logError));

    return NextResponse.json<ApiResponse<unknown>>({ success: true, data: { id } });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
