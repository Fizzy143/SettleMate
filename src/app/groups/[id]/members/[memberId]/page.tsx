"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Member {
  id: string;
  name: string;
  color?: string;
  groupId: string;
  isActive: boolean;
}

interface ExpenseParticipant {
  id: string;
  memberId: string;
  amount: number;
  member: Member;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  date: string;
  paidById: string;
  paidBy: Member;
  notes?: string;
  participants: ExpenseParticipant[];
  createdAt: string;
  type: "paid" | "participated";
}

interface DebtRelationship {
  memberId: string;
  memberName: string;
  amount: number; // 正數=對方欠我，負數=我欠對方
}

interface MemberDetail {
  member: Member;
  transactions: Expense[];
  debtRelationships: DebtRelationship[];
  netAmount: number;
}

const colorClasses: { [key: string]: string } = {
  "bg-blue-200": "bg-blue-200",
  "bg-red-200": "bg-red-200",
  "bg-green-200": "bg-green-200",
  "bg-yellow-200": "bg-yellow-200",
  "bg-purple-200": "bg-purple-200",
  "bg-pink-200": "bg-pink-200",
  "bg-indigo-200": "bg-indigo-200",
  "bg-cyan-200": "bg-cyan-200",
};

export default function MemberDetailPage() {
  const params = useParams();
  const groupId = params.id as string;
  const memberId = params.memberId as string;

  const [data, setData] = useState<MemberDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMemberDetail();
  }, [memberId]);

  const fetchMemberDetail = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/members/${memberId}/detail`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "加載失敗");
      }
    } catch (err) {
      setError("網路錯誤");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8 flex items-center justify-center">
        <p className="text-gray-600">加載中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
        <Link
          href={`/groups/${groupId}/members`}
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← 返回成員列表
        </Link>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || "未找到成員"}
        </div>
      </div>
    );
  }

  const { member, transactions, debtRelationships, netAmount } = data;
  const bgColor = member.color ? colorClasses[member.color] : "bg-gray-200";

  const formatAmount = (amount: number): string => {
    if (amount > 0) return `+NT$${amount.toFixed(2)}`;
    if (amount < 0) return `-NT$${Math.abs(amount).toFixed(2)}`;
    return "NT$0.00";
  };

  const amountColor = (amount: number): string => {
    if (amount > 0) return "text-green-600 font-bold";
    if (amount < 0) return "text-red-600 font-bold";
    return "text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* 返回按鈕 */}
        <Link
          href={`/groups/${groupId}/members`}
          className="text-blue-600 hover:underline mb-6 inline-block"
        >
          ← 返回成員列表
        </Link>

        {/* 成員卡片 */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8 text-center">
          <div className={`w-24 h-24 ${bgColor} rounded-full mx-auto mb-4`} />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            {member.name}
          </h1>
          <p className={`text-3xl ${amountColor(netAmount)}`}>
            {formatAmount(netAmount)}
          </p>
          <p className="text-gray-600 text-sm mt-2">
            {netAmount > 0
              ? "該成員應收的總額"
              : netAmount < 0
              ? "該成員應付的總額"
              : "該成員已結清"}
          </p>
        </div>

        {/* 欠債關係 */}
        {debtRelationships.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💳 欠債關係</h2>
            <div className="space-y-4">
              {debtRelationships.map((debt) => (
                <div
                  key={debt.memberId}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <span className="font-semibold text-gray-900">
                    {debt.memberName}
                  </span>
                  <div className="text-right">
                    <p className={`font-bold ${amountColor(debt.amount)}`}>
                      {formatAmount(debt.amount)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {debt.amount > 0
                        ? `${debt.memberName} 欠 ${member.name}`
                        : `${member.name} 欠 ${debt.memberName}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 交易記錄 */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📝 交易記錄 ({transactions.length})
          </h2>

          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              該成員暫無交易記錄
            </p>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => {
                const participant = transaction.participants.find(
                  (p) => p.memberId === memberId
                );

                return (
                  <div
                    key={transaction.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                  >
                    {/* 標題和日期 */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">
                          {transaction.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.date).toLocaleDateString("zh-TW")}{" "}
                          · 支付人:{" "}
                          <span className="font-semibold">
                            {transaction.paidBy.name}
                          </span>
                        </p>
                        {transaction.notes && (
                          <p className="text-sm text-gray-500 mt-1">
                            備註：{transaction.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          NT$ {transaction.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* 分攤信息 */}
                    <div className="bg-gray-50 p-3 rounded text-sm mb-3">
                      <p className="font-semibold text-gray-900 mb-2">分攤明細:</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {transaction.participants.map((p) => (
                          <div
                            key={p.id}
                            className={`flex justify-between ${
                              p.memberId === memberId
                                ? "font-bold text-blue-600"
                                : "text-gray-700"
                            }`}
                          >
                            <span>{p.member.name}</span>
                            <span>NT$ {p.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 角色標籤 */}
                    <div className="flex flex-wrap gap-2">
                      {transaction.paidById === memberId && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-semibold">
                          💸 支付人
                        </span>
                      )}
                      {participant && (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-semibold">
                          ✓ 參與人 ({formatAmount(participant.amount)})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
