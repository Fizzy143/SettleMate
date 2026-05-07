"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, CheckCircle2, CreditCard, Save, Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/clientIdentity";
import { AmountText, Badge, Button, Card, EmptyState, Input, MemberAvatar, Textarea } from "@/components/ui";
import { formatCurrency, formatDate, formatSignedCurrency } from "@/lib/format";
import { MAX_AMOUNT, validateAmount } from "@/lib/money";

type Member = { id: string; name: string; color?: string | null; isActive: boolean };
type MemberTotal = { memberId: string; paidTotal: number; owedTotal: number; netAmount: number };
type Settlement = { from: string; fromName: string; to: string; toName: string; amount: number };
type RecentPayment = {
  id: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  date: string;
  notes?: string | null;
};
type SettlementData = {
  memberTotals: MemberTotal[];
  settlements: Settlement[];
  recentPayments: RecentPayment[];
};

type PaymentModalProps = {
  settlement: Settlement;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  groupId: string;
};

function PaymentModal({ settlement, onClose, onSaved, groupId }: PaymentModalProps) {
  const [amount, setAmount] = useState(String(settlement.amount));
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLockRef.current) return;

    const parsedAmount = Number(amount);
    const amountError = validateAmount(parsedAmount);
    if (amountError) {
      setError(amountError);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      const response = await apiFetch("/api/settlements", {
        method: "POST",
        body: JSON.stringify({
          groupId,
          fromMemberId: settlement.from,
          toMemberId: settlement.to,
          amount: parsedAmount,
          date,
          notes: notes.trim() || null,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || "記錄還款失敗");
        return;
      }
      await onSaved();
      window.dispatchEvent(new Event("settlemate:group-updated"));
      onClose();
    } catch (err) {
      setError("記錄還款失敗");
      console.error(err);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 sm:items-center sm:justify-center">
      <div className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">記錄還款</h2>
            <p className="mt-1 text-sm text-slate-500">
              {settlement.fromName} 還給 {settlement.toName}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
            <X size={20} />
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">金額</span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              max={MAX_AMOUNT}
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">日期</span>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">備註</span>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="例如：現金、轉帳末五碼"
            />
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              <Save size={16} /> {isSubmitting ? "儲存中..." : "儲存"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SettlementsPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [membersRes, settlementsRes] = await Promise.all([
        apiFetch(`/api/members?groupId=${groupId}`),
        apiFetch(`/api/settlements?groupId=${groupId}`),
      ]);
      const membersData = await membersRes.json();
      const settlementsJson = await settlementsRes.json();
      if (membersData.success) {
        setMembers((membersData.data || []).filter((member: Member) => member.isActive));
      }
      if (settlementsJson.success) {
        setSettlementData({
          memberTotals: settlementsJson.data?.memberTotals || [],
          settlements: settlementsJson.data?.settlements || [],
          recentPayments: settlementsJson.data?.recentPayments || [],
        });
      } else {
        setError(settlementsJson.error || "無法計算結算");
      }
    } catch (err) {
      setError("無法計算結算");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [groupId]);

  const memberMap = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const handleDeletePayment = async (payment: RecentPayment) => {
    const confirmed = confirm(`確定要刪除 ${payment.fromName} 還給 ${payment.toName} 的紀錄嗎？`);
    if (!confirmed) return;
    setDeletingPaymentId(payment.id);
    setError("");
    try {
      const response = await apiFetch(`/api/expenses/${payment.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || "刪除還款失敗");
        return;
      }
      await fetchData();
      window.dispatchEvent(new Event("settlemate:group-updated"));
    } catch (err) {
      setError("刪除還款失敗");
      console.error(err);
    } finally {
      setDeletingPaymentId(null);
    }
  };

  if (isLoading) return <Card className="p-6 text-sm text-slate-500">載入結算中...</Card>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-white">
            <CreditCard size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-950">結算建議</h2>
            <p className="text-sm text-slate-500">記錄還款後，餘額會立即重新計算。</p>
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {settlementData && settlementData.settlements.length === 0 ? (
        <EmptyState
          title="目前不用還款"
          description="所有人的已付與應付已經平衡，或還沒有可計算的支出。"
          action={<CheckCircle2 className="mx-auto text-emerald-500" size={32} />}
        />
      ) : (
        <div className="grid gap-3">
          {settlementData?.settlements.map((settlement, index) => (
            <Card key={`${settlement.from}-${settlement.to}-${index}`} className="p-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <MemberAvatar name={settlement.fromName} color={memberMap.get(settlement.from)?.color} />
                  <div>
                    <p className="text-sm text-slate-500">付款方</p>
                    <p className="font-bold text-slate-950">{settlement.fromName}</p>
                  </div>
                </div>
                <div className="text-center">
                  <ArrowRight className="mx-auto text-slate-400" size={18} />
                  <p className="mt-1 max-w-full break-words text-lg font-bold text-slate-950">
                    {formatCurrency(settlement.amount)}
                  </p>
                </div>
                <div className="flex min-w-0 items-center gap-3 sm:justify-end sm:text-right">
                  <div>
                    <p className="text-sm text-slate-500">收款方</p>
                    <p className="font-bold text-slate-950">{settlement.toName}</p>
                  </div>
                  <MemberAvatar name={settlement.toName} color={memberMap.get(settlement.to)?.color} />
                </div>
                <Button
                  type="button"
                  className="w-full whitespace-nowrap px-4 sm:w-auto"
                  onClick={() => setSelectedSettlement(settlement)}
                >
                  <CreditCard size={16} />
                  記錄還款
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-950">最近還款</h3>
        </div>
        {settlementData?.recentPayments.length ? (
          <div className="divide-y divide-slate-100">
            {settlementData.recentPayments.map((payment) => (
              <div key={payment.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge tone="blue">還款</Badge>
                    <p className="font-bold text-slate-950">
                      {payment.fromName} 還給 {payment.toName}
                    </p>
                    <Badge tone="slate">{formatDate(payment.date)}</Badge>
                  </div>
                  {payment.notes && <p className="mt-2 text-sm text-slate-500">{payment.notes}</p>}
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <p className="text-lg font-bold tabular-nums text-slate-950">
                    {formatCurrency(payment.amount)}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="刪除還款"
                    onClick={() => void handleDeletePayment(payment)}
                    disabled={deletingPaymentId === payment.id}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-sm text-slate-500">尚未記錄還款。</div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-950">成員餘額</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {settlementData?.memberTotals.map((total) => {
            const member = memberMap.get(total.memberId);
            return (
              <div key={total.memberId} className="grid gap-4 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <MemberAvatar name={member?.name || "Unknown"} color={member?.color} />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-950">{member?.name || "Unknown"}</p>
                      <Badge tone={total.netAmount > 0 ? "green" : total.netAmount < 0 ? "red" : "slate"}>
                        {total.netAmount > 0 ? "應收" : total.netAmount < 0 ? "應付" : "已平衡"}
                      </Badge>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-slate-500">餘額</p>
                    <AmountText value={total.netAmount} className="mt-1 block text-base sm:text-lg">
                      {formatSignedCurrency(total.netAmount)}
                    </AmountText>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-500">已付款</p>
                    <p className="mt-1 max-w-full break-words text-sm font-bold tabular-nums text-slate-950">
                      {formatCurrency(total.paidTotal)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-500">應分攤</p>
                    <p className="mt-1 max-w-full break-words text-sm font-bold tabular-nums text-slate-950">
                      {formatCurrency(total.owedTotal)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {selectedSettlement && (
        <PaymentModal
          settlement={selectedSettlement}
          onClose={() => setSelectedSettlement(null)}
          onSaved={fetchData}
          groupId={groupId}
        />
      )}
    </div>
  );
}
