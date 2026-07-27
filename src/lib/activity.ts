import { formatCurrency, formatDate } from "./format";

type ActivityParticipant = {
  member: { name: string };
  amount: number;
};

type ExpenseActivitySource = {
  date: Date | string;
  name: string;
  amount: number;
  kind: string;
  notes?: string | null;
  paidBy: { name: string };
  participants: ActivityParticipant[];
};

export type ActivityDetail = {
  title: string;
  amount: string;
  date: string;
  paidByLabel: string;
  paidByName: string;
  notes?: string | null;
  participants: Array<{
    label: string;
    name: string;
    amount: string;
  }>;
};

export type ParsedActivityContent = {
  summary: string;
  detail?: ActivityDetail;
};

export function buildExpenseActivityDetail(expense: ExpenseActivitySource): ActivityDetail {
  const isSettlement = expense.kind === "settlement";
  return {
    title: expense.name,
    amount: formatCurrency(expense.amount),
    date: formatDate(expense.date),
    paidByLabel: isSettlement ? "付款方" : "付款者",
    paidByName: expense.paidBy.name,
    notes: expense.notes || null,
    participants: expense.participants.map((participant) => ({
      label: isSettlement ? "收款方" : "分攤成員",
      name: participant.member.name,
      amount: formatCurrency(participant.amount),
    })),
  };
}

export function serializeActivityContent(summary: string, detail?: ActivityDetail) {
  return JSON.stringify({ version: 1, summary, detail });
}

export function parseActivityContent(content: string): ParsedActivityContent {
  try {
    const parsed = JSON.parse(content) as ParsedActivityContent & { version?: number };
    if (typeof parsed.summary === "string") {
      return {
        summary: parsed.summary,
        detail: parsed.detail,
      };
    }
  } catch {
    // Existing activity rows stored plain text. Keep them readable.
  }
  return { summary: content };
}
