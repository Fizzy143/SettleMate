"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/clientIdentity";
import { Button, Input, MemberAvatar, Select, Textarea } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { MAX_AMOUNT, validateAmount, validateParticipantAmount } from "@/lib/money";

type Member = { id: string; name: string; color?: string | null };

export type EditExpenseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  expense: {
    id: string;
    name: string;
    amount: number;
    date: string;
    paidById: string;
    notes?: string | null;
    participants: Array<{ id: string; memberId: string; amount: number }>;
  };
  members: Member[];
  onExpenseUpdated: () => void;
};

export default function EditExpenseModal({
  isOpen,
  onClose,
  expense,
  members,
  onExpenseUpdated,
}: EditExpenseModalProps) {
  const [splitType, setSplitType] = useState<"equal" | "custom">("custom");
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    name: expense.name,
    amount: String(expense.amount),
    date: new Date(expense.date).toISOString().split("T")[0],
    paidById: expense.paidById,
    notes: expense.notes || "",
    participants: expense.participants.map((participant): { memberId: string; amount?: number } => ({
      memberId: participant.memberId,
      amount: participant.amount,
    })),
  });

  const amount = parseFloat(form.amount || "0");
  const customTotal = useMemo(
    () => form.participants.reduce((sum, participant) => sum + (participant.amount || 0), 0),
    [form.participants]
  );

  if (!isOpen) return null;

  const scrollToError = () => {
    if (formContainerRef.current) {
      setTimeout(() => {
        formContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
    }
  };

  const toggleParticipant = (memberId: string) => {
    const exists = form.participants.some((participant) => participant.memberId === memberId);
    setForm({
      ...form,
      participants: exists
        ? form.participants.filter((participant) => participant.memberId !== memberId)
        : [...form.participants, { memberId, amount: 0 }],
    });
  };

  const updateParticipantAmount = (memberId: string, value: string) => {
    setForm({
      ...form,
      participants: form.participants.map((participant) =>
        participant.memberId === memberId
          ? { ...participant, amount: value ? parseFloat(value) : undefined }
          : participant
      ),
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.amount || !form.paidById) {
      setError("請填寫支出名稱、金額與付款者。");
      scrollToError();
      return;
    }
    if (form.participants.length === 0) {
      setError("請至少選擇一位分攤成員。");
      scrollToError();
      return;
    }
    const amountError = validateAmount(amount);
    if (amountError) {
      setError(amountError);
      scrollToError();
      return;
    }
    const invalidParticipant = form.participants.find((participant) =>
      validateParticipantAmount(participant.amount || 0)
    );
    if (splitType === "custom" && invalidParticipant) {
      setError("分攤金額不可為負數，且不可超過 NT$ 1,000,000。");
      scrollToError();
      return;
    }
    if (splitType === "custom" && Math.abs(customTotal - amount) > 0.01) {
      setError("自訂分攤金額加總必須等於支出金額。");
      scrollToError();
      return;
    }

    try {
      const response = await apiFetch(`/api/expenses/${expense.id}`, {
        method: "PUT",
        body: JSON.stringify({
          date: form.date,
          name: form.name.trim(),
          amount,
          paidById: form.paidById,
          notes: form.notes.trim() || null,
          splitType,
          participants:
            splitType === "equal"
              ? form.participants.map((participant) => ({ memberId: participant.memberId }))
              : form.participants,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || "更新支出失敗。");
        scrollToError();
        return;
      }
      onExpenseUpdated();
      window.dispatchEvent(new Event("settlemate:group-updated"));
      onClose();
    } catch (err) {
      setError("更新支出失敗。");
      scrollToError();
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 sm:items-center sm:justify-center">
      <div ref={formContainerRef} className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">編輯支出</h2>
            <p className="mt-1 text-sm text-slate-500">更新付款者、金額或分攤方式。</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
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
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">金額</span>
              <Input type="number" inputMode="decimal" min="0" max={MAX_AMOUNT} step="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">日期</span>
              <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">付款者</span>
              <Select value={form.paidById} onChange={(event) => setForm({ ...form, paidById: event.target.value })}>
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
            <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>

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

          {splitType === "custom" && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              已分配 {formatCurrency(customTotal)} / 支出 {formatCurrency(amount)}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {members.map((member) => {
              const selected = form.participants.some((participant) => participant.memberId === member.id);
              return (
                <div key={member.id} className={`rounded-lg border p-3 ${selected ? "border-slate-950 bg-slate-50" : "border-slate-200"}`}>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={selected} onChange={() => toggleParticipant(member.id)} />
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
                      value={form.participants.find((participant) => participant.memberId === member.id)?.amount || ""}
                      onChange={(event) => updateParticipantAmount(member.id, event.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" className="flex-1">
              儲存變更
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
