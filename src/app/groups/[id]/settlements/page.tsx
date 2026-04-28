"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface MemberTotal {
  memberId: string;
  paidTotal: number;
  owedTotal: number;
  netAmount: number;
}

interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

interface SettlementData {
  memberTotals: MemberTotal[];
  settlements: Settlement[];
}

interface Group {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  isActive: boolean;
}

export default function SettlementsPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // 加載群組和結算數據
  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [groupRes, membersRes, settlementRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/members?groupId=${groupId}`),
        fetch(`/api/settlements?groupId=${groupId}`),
      ]);

      const groupData = await groupRes.json();
      const membersData = await membersRes.json();
      const settlementRes_ = await settlementRes.json();

      if (groupData.success) setGroup(groupData.data);
      if (membersData.success) {
        const activeMembers = (membersData.data || []).filter((m: Member) => m.isActive);
        setMembers(activeMembers);
      }
      if (settlementRes_.success) setSettlementData(settlementRes_.data);
    } catch (err) {
      setError("加載失敗");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">加載中...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
        <Link href="/" className="text-blue-600 hover:underline">
          ← 返回首頁
        </Link>
      </div>
    );
  }

  const memberMap = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* 返回按鈕 */}
        <Link
          href={`/groups/${groupId}`}
          className="text-blue-600 hover:underline mb-6 inline-block"
        >
          ← 返回群組
        </Link>

        {/* 頭部 */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            💵 {group.name} - 結算
          </h1>
          <p className="text-gray-600">
            快速查看每個人的應收應付情況
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* 成員總額表格 */}
        {settlementData && settlementData.memberTotals.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              👥 成員統計
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      成員
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      代墊金額
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      應負擔
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">
                      淨額
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {settlementData.memberTotals.map((total) => {
                    const member = memberMap.get(total.memberId);
                    const isPositive = total.netAmount > 0.01;

                    return (
                      <tr key={total.memberId} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          {member?.name || "未知"}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">
                          NT$ {total.paidTotal.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">
                          NT$ {total.owedTotal.toFixed(2)}
                        </td>
                        <td
                          className={`text-right py-3 px-4 font-bold text-lg ${
                            isPositive
                              ? "text-green-600"
                              : total.netAmount < -0.01
                              ? "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {isPositive ? "+ " : total.netAmount < -0.01 ? "- " : ""}
                          NT$ {Math.abs(total.netAmount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <p>
                💡 提示：
                <br />
                + 表示應該<span className="font-bold">收錢</span>
                <br />
                - 表示應該<span className="font-bold">付錢</span>
              </p>
            </div>
          </div>
        )}

        {/* 轉賬計劃 */}
        {settlementData && settlementData.settlements.length > 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              💸 轉賬計劃
            </h2>

            <div className="space-y-3">
              {settlementData.settlements.map((settlement, index) => (
                <div
                  key={index}
                  className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-lg"
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-lg font-bold text-gray-900 flex-1 min-w-max">
                      {settlement.fromName}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-2xl text-orange-600">→</span>
                      <span className="text-2xl font-bold text-blue-600">
                        NT$ {settlement.amount.toFixed(2)}
                      </span>
                      <span className="text-2xl text-orange-600">→</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 flex-1 text-right min-w-max">
                      {settlement.toName}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-900 mb-2">✅ 完成以下轉賬即可結清：</p>
              <ol className="space-y-2 text-sm text-green-800 list-decimal list-inside">
                {settlementData.settlements.map((settlement, index) => (
                  <li key={index}>
                    <span className="font-semibold">{settlement.fromName}</span> 傳送{" "}
                    <span className="font-bold">NT$ {settlement.amount.toFixed(2)}</span> 給{" "}
                    <span className="font-semibold">{settlement.toName}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
            <div className="text-center py-8">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-gray-600 font-semibold">
                所有人都已結清！沒有需要轉賬的費用。
              </p>
            </div>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="mt-8 flex gap-3 justify-center">
          <Link
            href={`/groups/${groupId}`}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            回到群組
          </Link>
          <Link
            href={`/groups/${groupId}/expenses`}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
          >
            記錄更多支出
          </Link>
        </div>
      </div>
    </div>
  );
}
