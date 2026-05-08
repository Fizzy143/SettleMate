"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/clientIdentity";
import { Button, Input, MemberAvatar, Select, Textarea } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { MAX_AMOUNT, validateAmount, validateParticipantAmount } from "@/lib/money";

type Member = { id: string; name: string; color?: string | null };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  members: Member[];
  onExpenseAdded: () => void | Promise<void>;
};

export default function ExpenseModal({
  isOpen,
  onClose,
  groupId,
  members,
  onExpenseAdded,
}: Props) {
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [expense, setExpense] = useState({
    name: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paidById: "",
    notes: "",
    participants: [] as Array<{ memberId: string; amount?: number }>,
  });

  const customTotal = useMemo(
    () => expense.participants.reduce((sum, participant) => sum + (participant.amount || 0), 0),
    [expense.participants]
  );
  const amount = parseFloat(expense.amount || "0");

  if (!isOpen) return null;

  const scrollToError = () => {
    if (formContainerRef.current) {
      setTimeout(() => {
        formContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
    }
  };

  const toggleParticipant = (memberId: string) => {
    const exists = expense.participants.some((participant) => participant.memberId === memberId);
    setExpense({
      ...expense,
      participants: exists
        ? expense.participants.filter((participant) => participant.memberId !== memberId)
        : [...expense.participants, { memberId }],
    });
  };

  const updateParticipantAmount = (memberId: string, value: string) => {
    setExpense({
      ...expense,
      participants: expense.participants.map((participant) =>
        participant.memberId === memberId
          ? { ...participant, amount: value ? parseFloat(value) : undefined }
          : participant
      ),
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLockRef.current) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    setError("");

    if (!expense.name.trim() || !expense.amount || !expense.paidById) {
      setError("請填寫支出名稱、金額與付款者。");
      scrollToError();
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (expense.participants.length === 0) {
      setError("請至少選擇一位分攤成員。");
      scrollToError();
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const amountError = validateAmount(amount);
    if (amountError) {
      setError(amountError);
      scrollToError();
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const invalidParticipant = expense.participants.find((participant) =>
      validateParticipantAmount(participant.amount || 0)
    );
    if (splitType === "custom" && invalidParticipant) {
      setError("分攤金額不可為負數，且不可超過 NT$ 1,000,000。");
      scrollToError();
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (splitType === "custom" && Math.abs(customTotal - amount) > 0.01) {
      setError("自訂分攤金額加總必須等於支出金額。");
      scrollToError();
      submitLockRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          groupId,
          date: expense.date,
          name: expense.name.trim(),
          amount,
          paidById: expense.paidById,
          notes: expense.notes.trim() || null,
          splitType,
          participants:
            splitType === "equal"
              ? expense.participants.map((participant) => ({ memberId: participant.memberId }))
              : expense.participants,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || "新增支出失敗。");
        scrollToError();
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }
      setExpense({
        name: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        paidById: "",
        notes: "",
        participants: [],
      });
      setSplitType("equal");
      await onExpenseAdded();
      window.dispatchEvent(new Event("settlemate:group-updated"));
      onClose();
    } catch (err) {
      setError("新增支出失敗。");
      scrollToError();
      console.error(err);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 sm:items-center sm:justify-center">
      <div ref={formContainerRef} className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">新增支出</h2>
            <p className="mt-1 text-sm text-slate-500">記錄誰先付款，以及要由哪些人分攤。</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
            <X size={20} />
          </Button>
        </div>

        {error && (
          <div ref={errorRef} className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">支出名稱</span>
              <Input
                value={expense.name}
                onChange={(event) => setExpense({ ...expense, name: event.target.value })}
                placeholder="例如：晚餐"
                lang="zh"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">金額</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                max={MAX_AMOUNT}
                step="1"
                value={expense.amount}
                onChange={(event) => setExpense({ ...expense, amount: event.target.value })}
                placeholder="0"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">日期</span>
              <Input
                type="date"
                value={expense.date}
                onChange={(event) => setExpense({ ...expense, date: event.target.value })}
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">付款者</span>
              <Select
                value={expense.paidById}
                onChange={(event) => setExpense({ ...expense, paidById: event.target.value })}
              >
                <option value="">選擇付款者</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <label>
            <span className="mb-2 block text-sm font-semibold text-slate-700">備註</span>
            <Textarea
              value={expense.notes}
              onChange={(event) => setExpense({ ...expense, notes: event.target.value })}
              placeholder="選填，例如誰忘記帶錢包"
            />
          </label>

          <div>
            <span className="mb-2 block text-sm font-semibold text-slate-700">分攤方式</span>
            <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
              {(["equal", "custom"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`h-10 rounded-md text-sm font-semibold transition ${
                    splitType === type ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {type === "equal" ? "平均分攤" : "自訂金額"}
                </button>
              ))}
            </div>
          </div>

          {splitType === "custom" && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              已分配 {formatCurrency(customTotal)} / 支出 {formatCurrency(amount)}
            </div>
          )}

          <div>
            <span className="mb-2 block text-sm font-semibold text-slate-700">分攤成員</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {members.map((member) => {
                const selected = expense.participants.some((participant) => participant.memberId === member.id);
                return (
                  <div
                    key={member.id}
                    className={`rounded-lg border p-3 ${selected ? "border-slate-950 bg-slate-50" : "border-slate-200"}`}
                  >
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleParticipant(member.id)}
                      />
                      <MemberAvatar name={member.name} color={member.color} size="sm" />
                      <span className="font-semibold text-slate-950">{member.name}</span>
                    </label>
                    {selected && splitType === "custom" && (
                      <Input
                        className="mt-3"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max={MAX_AMOUNT}
                        step="1"
                        placeholder="分攤金額"
                        value={expense.participants.find((participant) => participant.memberId === member.id)?.amount || ""}
                        onChange={(event) => updateParticipantAmount(member.id, event.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "新增中..." : "儲存支出"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
