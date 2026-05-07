"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, MoreHorizontal, Pencil, ReceiptText, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/clientIdentity";
import { Badge, Button, Card, EmptyState, MemberAvatar } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import EditExpenseModal from "../components/EditExpenseModal";

type Member = {
  id: string;
  name: string;
  color?: string | null;
  isActive: boolean;
};

type ExpenseParticipant = {
  id: string;
  memberId: string;
  amount: number;
  member: Member;
};

type Expense = {
  id: string;
  date: string;
  name: string;
  amount: number;
  paidById: string;
  kind: "expense" | "settlement";
  paidBy: Member;
  notes?: string | null;
  participants: ExpenseParticipant[];
  createdAt: string;
};

export default function ExpensesPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [membersRes, expensesRes] = await Promise.all([
        apiFetch(`/api/members?groupId=${groupId}`),
        apiFetch(`/api/expenses?groupId=${groupId}`),
      ]);
      const membersData = await membersRes.json();
      const expensesData = await expensesRes.json();
      if (membersData.success) {
        setMembers((membersData.data || []).filter((member: Member) => member.isActive));
      }
      if (expensesData.success) setExpenses(expensesData.data || []);
      if (!expensesData.success) setError(expensesData.error || "無法載入支出");
    } catch (err) {
      setError("無法載入支出");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [groupId]);

  const totalAmount = useMemo(
    () =>
      expenses.reduce(
        (sum, expense) => sum + (expense.kind === "settlement" ? 0 : expense.amount),
        0
      ),
    [expenses]
  );

  const handleDeleteExpense = async (expense: Expense) => {
    const label = expense.kind === "settlement" ? "還款紀錄" : "支出";
    if (!confirm(`確定要刪除這筆${label}嗎？`)) return;
    try {
      const response = await apiFetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        await fetchData();
        window.dispatchEvent(new Event("settlemate:group-updated"));
      }
      else setError(data.error || "刪除支出失敗");
    } catch (err) {
      setError("刪除支出失敗");
      console.error(err);
    }
  };

  if (isLoading) {
    return <Card className="p-6 text-sm text-slate-500">載入支出中...</Card>;
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 sm:col-span-2">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-white">
              <ReceiptText size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">支出紀錄</h2>
              <p className="text-sm text-slate-500">依日期排序，快速掃描誰付款與分攤明細。</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-semibold text-slate-500">總支出</p>
          <p className="mt-2 max-w-full break-words text-2xl font-bold text-slate-950">{formatCurrency(totalAmount)}</p>
        </Card>
      </section>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {expenses.length === 0 ? (
        <EmptyState title="尚無支出" description="點擊新增支出，記錄第一筆共同花費。" />
      ) : (
        <div className="grid gap-3">
          {expenses.map((expense) => (
            <Card key={expense.id} className="p-4">
              <div
                className="cursor-pointer"
                onClick={() =>
                  setExpandedExpenseId(expandedExpenseId === expense.id ? null : expense.id)
                }
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className="max-w-full truncate text-lg font-bold text-slate-950">{expense.name}</h3>
                        <Badge tone="slate">{formatDate(expense.date)}</Badge>
                        {expense.kind === "settlement" && <Badge tone="blue">還款</Badge>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-start gap-1">
                      <div className="relative" onClick={(event) => event.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setOpenMenuId(openMenuId === expense.id ? null : expense.id)}
                          title="支出操作"
                        >
                          <MoreHorizontal size={18} />
                        </Button>
                        {openMenuId === expense.id && (
                          <>
                            <button
                              type="button"
                              aria-label="關閉支出操作選單"
                              className="fixed inset-0 z-10 cursor-default bg-transparent"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 top-11 z-20 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                              {expense.kind !== "settlement" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedExpense(expense);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:shadow-sm focus-visible:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                                >
                                  <Pencil size={15} /> 編輯
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  void handleDeleteExpense(expense);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 hover:shadow-sm focus-visible:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                              >
                                <Trash2 size={15} /> 刪除
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <ChevronDown
                        size={18}
                        className={`mt-3 text-slate-400 transition ${
                          expandedExpenseId === expense.id ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <p className="max-w-full break-words text-lg font-bold tabular-nums text-slate-950 sm:text-xl">
                      {formatCurrency(expense.amount)}
                    </p>
                    <div className="flex min-w-0 items-center justify-end gap-2 text-right text-sm text-slate-500">
                      <span className="min-w-0 truncate">
                        {expense.kind === "settlement" ? (
                          <>
                            <strong className="text-slate-700">{expense.paidBy.name}</strong> 還給{" "}
                            <strong className="text-slate-700">
                              {expense.participants[0]?.member.name || "Unknown"}
                            </strong>
                          </>
                        ) : (
                          <>
                            由 <strong className="text-slate-700">{expense.paidBy.name}</strong> 付款
                          </>
                        )}
                      </span>
                      <MemberAvatar name={expense.paidBy.name} color={expense.paidBy.color} size="sm" />
                    </div>
                  </div>
                </div>
              </div>

              {expandedExpenseId === expense.id && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {expense.notes && (
                    <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {expense.notes}
                    </p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {expense.participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <MemberAvatar name={participant.member.name} color={participant.member.color} size="sm" />
                          <span className="text-sm font-semibold text-slate-700">
                            {expense.kind === "settlement" ? `收款方：${participant.member.name}` : participant.member.name}
                          </span>
                        </div>
                        <span className="max-w-full break-words text-sm font-bold tabular-nums text-slate-950">
                          {formatCurrency(participant.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {selectedExpense && (
        <EditExpenseModal
          isOpen={Boolean(selectedExpense)}
          onClose={() => setSelectedExpense(null)}
          groupId={groupId}
          expense={selectedExpense}
          members={members}
          onExpenseUpdated={fetchData}
        />
      )}
    </div>
  );
}

