"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, CheckCircle2, CreditCard } from "lucide-react";
import { apiFetch } from "@/lib/clientIdentity";
import { AmountText, Badge, Card, EmptyState, MemberAvatar } from "@/components/ui";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";

type Member = { id: string; name: string; color?: string | null; isActive: boolean };
type MemberTotal = { memberId: string; paidTotal: number; owedTotal: number; netAmount: number };
type Settlement = { from: string; fromName: string; to: string; toName: string; amount: number };
type SettlementData = { memberTotals: MemberTotal[]; settlements: Settlement[] };

export default function SettlementsPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
        if (settlementsJson.success) setSettlementData(settlementsJson.data);
        else setError(settlementsJson.error || "無法計算結算");
      } catch (err) {
        setError("無法計算結算");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [groupId]);

  const memberMap = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  if (isLoading) return <Card className="p-6 text-sm text-slate-500">計算結算中...</Card>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-white">
            <CreditCard size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-950">結算建議</h2>
            <p className="text-sm text-slate-500">用最少轉帳筆數，把所有人的帳結清。</p>
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
          title="目前不用結算"
          description="所有人的已付與應付已經平衡，或還沒有可計算的支出。"
          action={<CheckCircle2 className="mx-auto text-emerald-500" size={32} />}
        />
      ) : (
        <div className="grid gap-3">
          {settlementData?.settlements.map((settlement, index) => (
            <Card key={`${settlement.from}-${settlement.to}-${index}`} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <MemberAvatar name={settlement.fromName} color={memberMap.get(settlement.from)?.color} />
                  <div>
                    <p className="text-sm text-slate-500">付款方</p>
                    <p className="font-bold text-slate-950">{settlement.fromName}</p>
                  </div>
                </div>
                <div className="text-center">
                  <ArrowRight className="mx-auto text-slate-400" size={18} />
                  <p className="mt-1 whitespace-nowrap text-lg font-bold text-slate-950">
                    {formatCurrency(settlement.amount)}
                  </p>
                </div>
                <div className="flex min-w-0 items-center gap-3 text-right">
                  <div>
                    <p className="text-sm text-slate-500">收款方</p>
                    <p className="font-bold text-slate-950">{settlement.toName}</p>
                  </div>
                  <MemberAvatar name={settlement.toName} color={memberMap.get(settlement.to)?.color} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-950">成員明細</h3>
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
                    <p className="text-xs font-semibold text-slate-500">淨額</p>
                    <AmountText value={total.netAmount} className="mt-1 block text-base sm:text-lg">
                      {formatSignedCurrency(total.netAmount)}
                    </AmountText>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-500">已付</p>
                    <p className="mt-1 whitespace-nowrap text-sm font-bold tabular-nums text-slate-950">
                      {formatCurrency(total.paidTotal)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-500">應付</p>
                    <p className="mt-1 whitespace-nowrap text-sm font-bold tabular-nums text-slate-950">
                      {formatCurrency(total.owedTotal)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
