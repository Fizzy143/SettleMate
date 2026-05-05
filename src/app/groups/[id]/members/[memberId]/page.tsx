"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ReceiptText, UserRound } from "lucide-react";
import { apiFetch } from "@/lib/clientIdentity";
import { AmountText, Badge, Card, EmptyState, LinkButton, MemberAvatar } from "@/components/ui";
import { formatCurrency, formatDate, formatSignedCurrency } from "@/lib/format";

type Member = {
  id: string;
  name: string;
  color?: string | null;
  role?: string | null;
  groupId: string;
  isActive: boolean;
};

type Expense = {
  id: string;
  name: string;
  amount: number;
  date: string;
  paidById: string;
  paidBy: Member;
  notes?: string | null;
  participants: Array<{
    id: string;
    memberId: string;
    amount: number;
    member: Member;
  }>;
  type: "paid" | "participated";
};

type DebtRelationship = {
  memberId: string;
  memberName: string;
  amount: number;
};

type MemberDetail = {
  member: Member;
  transactions: Expense[];
  debtRelationships: DebtRelationship[];
  netAmount: number;
};

export default function MemberDetailPage() {
  const params = useParams();
  const groupId = params.id as string;
  const memberId = params.memberId as string;

  const [data, setData] = useState<MemberDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemberDetail = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await apiFetch(`/api/members/${memberId}/detail`);
        const result = await response.json();
        if (result.success) setData(result.data);
        else setError(result.error || "無法載入成員明細");
      } catch (err) {
        setError("無法載入成員明細");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMemberDetail();
  }, [memberId]);

  if (isLoading) return <Card className="p-6 text-sm text-slate-500">載入成員明細中...</Card>;

  if (!data) {
    return (
      <EmptyState
        title="找不到成員"
        description={error || "這位成員不存在，或你沒有權限查看。"}
        action={<LinkButton href={`/groups/${groupId}/members`}>返回成員</LinkButton>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Link href={`/groups/${groupId}/members`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
        <ArrowLeft size={16} /> 返回成員
      </Link>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <MemberAvatar name={data.member.name} color={data.member.color} size="lg" />
            <div>
              <h2 className="text-2xl font-bold text-slate-950">{data.member.name}</h2>
              {data.member.role && <p className="mt-1 text-sm text-slate-500">{data.member.role}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-500">個人淨額</p>
            <AmountText value={data.netAmount}>{formatSignedCurrency(data.netAmount)}</AmountText>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <UserRound size={18} />
            <h3 className="font-bold text-slate-950">與其他人的關係</h3>
          </div>
          {data.debtRelationships.length === 0 ? (
            <p className="text-sm text-slate-500">目前沒有個別債務關係。</p>
          ) : (
            <div className="space-y-2">
              {data.debtRelationships.map((relationship) => (
                <div key={relationship.memberId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm font-semibold text-slate-700">{relationship.memberName}</span>
                  <AmountText value={relationship.amount}>{formatSignedCurrency(relationship.amount)}</AmountText>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText size={18} />
            <h3 className="font-bold text-slate-950">參與支出</h3>
          </div>
          <p className="text-sm text-slate-500">共 {data.transactions.length} 筆相關交易。</p>
        </Card>
      </div>

      {data.transactions.length === 0 ? (
        <EmptyState title="尚無交易" description="這位成員還沒有付款或參與分攤。" />
      ) : (
        <Card className="divide-y divide-slate-100">
          {data.transactions.map((transaction) => (
            <div key={transaction.id} className="p-4">
              <button
                type="button"
                className="w-full text-left"
                onClick={() =>
                  setExpandedTransactionId(expandedTransactionId === transaction.id ? null : transaction.id)
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="truncate font-bold text-slate-950">{transaction.name}</h3>
                      <Badge tone={transaction.type === "paid" ? "green" : "blue"}>
                        {transaction.type === "paid" ? "付款" : "分攤"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      {formatDate(transaction.date)} · 由 {transaction.paidBy.name} 支付
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <p className="font-bold text-slate-950">{formatCurrency(transaction.amount)}</p>
                    <ChevronDown
                      size={18}
                      className={`mt-1 text-slate-400 transition ${
                        expandedTransactionId === transaction.id ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
              </button>

              {expandedTransactionId === transaction.id && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {transaction.notes && <p className="mb-3 text-sm text-slate-500">{transaction.notes}</p>}
                  <div className="grid gap-2">
                    {transaction.participants.map((participant) => {
                      const isCurrentMember = participant.memberId === memberId;
                      return (
                        <div
                          key={participant.id}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                            isCurrentMember ? "border border-sky-200 bg-sky-50" : "bg-slate-50"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <MemberAvatar
                              name={participant.member.name}
                              color={participant.member.color}
                              size="sm"
                            />
                            <span className="truncate text-sm font-semibold text-slate-700">
                              {participant.member.name}
                            </span>
                            {isCurrentMember && <Badge tone="blue">目前成員</Badge>}
                          </div>
                          <span className="shrink-0 text-sm font-bold tabular-nums text-slate-950">
                            {formatCurrency(participant.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
