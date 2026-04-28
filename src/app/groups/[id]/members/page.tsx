"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Member {
  id: string;
  name: string;
  role?: string;
  color?: string;
  isActive: boolean;
}

interface MemberStats {
  memberId: string;
  totalExpense: number;
  netAmount: number;
}

// 顏色映射 - Tailwind class 到實際顏色
const colorMap: { [key: string]: string } = {
  "bg-blue-200": "#bfdbfe",
  "bg-red-200": "#fecaca",
  "bg-green-200": "#bbf7d0",
  "bg-yellow-200": "#fef08a",
  "bg-purple-200": "#e9d5ff",
  "bg-pink-200": "#fbcfe8",
  "bg-indigo-200": "#c7d2fe",
  "bg-cyan-200": "#a5f3fc",
};

export default function MembersPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [memberStats, setMemberStats] = useState<Map<string, MemberStats>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberData, setEditingMemberData] = useState<Partial<Member> | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({
    name: "",
    role: "",
    color: "bg-blue-200",
  });
  const [error, setError] = useState("");

  // 顏色選項
  const colorOptions = [
    "bg-blue-200",
    "bg-red-200",
    "bg-green-200",
    "bg-yellow-200",
    "bg-purple-200",
    "bg-pink-200",
    "bg-indigo-200",
    "bg-cyan-200",
  ];

  // 加載成員和統計數據
  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [membersRes, expensesRes, settlementsRes] = await Promise.all([
        fetch(`/api/members?groupId=${groupId}`),
        fetch(`/api/expenses?groupId=${groupId}`),
        fetch(`/api/settlements?groupId=${groupId}`),
      ]);

      const membersData = await membersRes.json();
      const expensesData = await expensesRes.json();
      const settlementsData = await settlementsRes.json();

      if (membersData.success) {
        setMembers(membersData.data || []);
      }

      // 計算每個成員的統計信息
      if (expensesData.success && settlementsData.success) {
        const statsMap = new Map<string, MemberStats>();
        const expenses = expensesData.data || [];
        const memberTotals = settlementsData.data?.memberTotals || [];

        // 計算每個成員的總支出
        const expenseByMember = new Map<string, number>();
        expenses.forEach((expense: any) => {
          const current = expenseByMember.get(expense.paidById) || 0;
          expenseByMember.set(expense.paidById, current + expense.amount);
        });

        // 構建統計信息
        (membersData.data || []).forEach((member: Member) => {
          const totalExpense = expenseByMember.get(member.id) || 0;
          const memberTotal = memberTotals.find((m: any) => m.memberId === member.id);
          const netAmount = memberTotal?.netAmount || 0;

          statsMap.set(member.id, {
            memberId: member.id,
            totalExpense,
            netAmount,
          });
        });

        setMemberStats(statsMap);
      }
    } catch (err) {
      setError("加載失敗");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 新增成員
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim() || isSubmittingMember) return;

    setIsSubmittingMember(true);
    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          name: newMember.name.trim(),
          role: newMember.role.trim() || null,
          color: newMember.color,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewMember({ name: "", role: "", color: "bg-blue-200" });
        setIsAddingMember(false);
        await fetchData();
      } else {
        setError(data.error || "新增失敗");
      }
    } catch (err) {
      setError("網路錯誤");
      console.error(err);
    } finally {
      setIsSubmittingMember(false);
    }
  };

  // 停用成員
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("確定要停用此成員嗎？（停用後不會顯示在成員列表中，但交易紀錄會保留）")) return;

    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        setOpenMenuId(null);
        await fetchData();
      } else {
        // 顯示具體的錯誤信息
        setError(data.error || "停用失敗");
      }
    } catch (err) {
      setError("網路錯誤");
      console.error(err);
    }
  };

  // 開始編輯成員
  const startEditMember = (member: Member) => {
    setEditingMemberId(member.id);
    setEditingMemberData({ ...member });
    setOpenMenuId(null);
  };

  // 保存編輯
  const handleSaveEditMember = async (memberId: string) => {
    if (!editingMemberData?.name?.trim()) return;

    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingMemberData.name.trim(),
          role: editingMemberData.role?.trim() || null,
          color: editingMemberData.color,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEditingMemberId(null);
        setEditingMemberData(null);
        await fetchData();
      } else {
        setError(data.error || "更新失敗");
      }
    } catch (err) {
      setError("網路錯誤");
      console.error(err);
    }
  };

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

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">加載中...</p>
      </div>
    );
  }

  const activeMembers = members.filter((m) => m.isActive);

  return (
    <div className="max-w-3xl mx-auto">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* 成員列表 */}
      <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            成員列表 ({activeMembers.length})
          </h2>
          <button
            onClick={() => setIsAddingMember(!isAddingMember)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            {isAddingMember ? "取消" : "+ 新增成員"}
          </button>
        </div>

        {/* 新增成員表單 */}
        {isAddingMember && (
          <form onSubmit={handleAddMember} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  成員名稱 *
                </label>
                <input
                  type="text"
                  placeholder="例如：小王"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色/標籤（選填）
                </label>
                <input
                  type="text"
                  placeholder="例如：朋友、同事"
                  value={newMember.role}
                  onChange={(e) =>
                    setNewMember({ ...newMember, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  顏色標記
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewMember({ ...newMember, color })}
                      className={`w-12 h-12 rounded-lg border-2 transition ${
                        newMember.color === color
                          ? "border-gray-900"
                          : "border-gray-300"
                      } ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingMember}
              className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
            >
              {isSubmittingMember ? "新增中..." : "新增成員"}
            </button>
          </form>
        )}

        {/* 成員卡片 */}
        {activeMembers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            還沒有成員，新增一個開始吧！
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeMembers.map((member) => {
              const stats = memberStats.get(member.id);
              const bgColor = member.color ? colorMap[member.color] : "#e5e7eb";
              const isEditing = editingMemberId === member.id;

              return (
                <div key={member.id} className="relative">
                  {isEditing ? (
                    // 編輯模式
                    <div className="p-4 rounded-lg border-2 border-blue-300 bg-blue-50">
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingMemberData?.name || ""}
                          onChange={(e) =>
                            setEditingMemberData({
                              ...editingMemberData,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="成員名稱"
                        />
                        <input
                          type="text"
                          value={editingMemberData?.role || ""}
                          onChange={(e) =>
                            setEditingMemberData({
                              ...editingMemberData,
                              role: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="角色/標籤（選填）"
                        />
                        <div className="flex flex-wrap gap-2">
                          {colorOptions.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() =>
                                setEditingMemberData({
                                  ...editingMemberData,
                                  color,
                                })
                              }
                              className={`w-8 h-8 rounded-lg border-2 transition ${
                                editingMemberData?.color === color
                                  ? "border-gray-900"
                                  : "border-gray-300"
                              } ${color}`}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleSaveEditMember(member.id)}
                            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => {
                              setEditingMemberId(null);
                              setEditingMemberData(null);
                            }}
                            className="flex-1 px-3 py-2 bg-gray-400 text-white text-sm rounded hover:bg-gray-500 transition"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // 正常顯示模式
                    <>
                      <Link
                        href={`/groups/${groupId}/members/${member.id}`}
                        style={{ backgroundColor: bgColor }}
                        className="block p-4 rounded-lg border-2 border-gray-200 hover:shadow-lg transition cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-3 pr-12">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg">
                              {member.name}
                            </h3>
                            {member.role && (
                              <p className="text-sm text-gray-600">{member.role}</p>
                            )}
                          </div>
                        </div>

                        {/* 統計信息 */}
                        <div className="bg-white bg-opacity-70 p-3 rounded text-sm space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">總支出:</span>
                            <span className="font-semibold text-gray-900">
                              NT$ {(stats?.totalExpense || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">淨額:</span>
                            <span className={`font-bold ${amountColor(stats?.netAmount || 0)}`}>
                              {formatAmount(stats?.netAmount || 0)}
                            </span>
                          </div>
                        </div>
                      </Link>

                      {/* 三點菜單按鈕 */}
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setOpenMenuId(openMenuId === member.id ? null : member.id);
                          }}
                          className="p-1 hover:bg-gray-300 rounded-lg transition"
                          title="更多選項"
                        >
                          <span className="text-xl font-bold text-gray-800">⋮</span>
                        </button>

                        {/* 下拉菜單 */}
                        {openMenuId === member.id && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                startEditMember(member);
                              }}
                              className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700 text-sm whitespace-nowrap"
                            >
                              ✏️ 編輯
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleRemoveMember(member.id);
                              }}
                              className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm border-t border-gray-200 whitespace-nowrap"
                            >
                              � 停用
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
