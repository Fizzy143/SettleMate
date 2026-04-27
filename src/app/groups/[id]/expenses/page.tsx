"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Member {
  id: string;
  name: string;
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
  date: string;
  name: string;
  amount: number;
  paidById: string;
  paidBy: Member;
  notes?: string;
  participants: ExpenseParticipant[];
  createdAt: string;
}

interface Group {
  id: string;
  name: string;
}

export default function ExpensesPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const errorRef = useRef<HTMLDivElement>(null);

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [error, setError] = useState("");

  const [newExpense, setNewExpense] = useState({
    name: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paidById: "",
    notes: "",
    participants: [] as Array<{ memberId: string; amount?: number }>,
  });

  // 加載群組、成員、支出
  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [groupRes, membersRes, expensesRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/members?groupId=${groupId}`),
        fetch(`/api/expenses?groupId=${groupId}`),
      ]);

      const groupData = await groupRes.json();
      const membersData = await membersRes.json();
      const expensesData = await expensesRes.json();

      if (groupData.success) setGroup(groupData.data);
      if (membersData.success) {
        const activeMembers = (membersData.data || []).filter((m: Member) => m.isActive);
        setMembers(activeMembers);
      }
      if (expensesData.success) setExpenses(expensesData.data || []);
    } catch (err) {
      setError("加載失敗");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 新增支出
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newExpense.name.trim() || !newExpense.amount || !newExpense.paidById) {
      setError("請填寫所有必填項目");
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (newExpense.participants.length === 0) {
      setError("請選擇至少一個分攤人");
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    let participants = newExpense.participants;

    if (splitType === "equal") {
      const amount = parseFloat(newExpense.amount);
      participants = newExpense.participants.map((p) => ({
        ...p,
        amount: undefined,
      }));
    } else {
      // 驗證自訂分攤總額
      const totalAmount = participants.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );
      if (Math.abs(totalAmount - parseFloat(newExpense.amount)) > 0.01) {
        setError("分攤總額必須等於支出金額");
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          date: newExpense.date,
          name: newExpense.name.trim(),
          amount: parseFloat(newExpense.amount),
          paidById: newExpense.paidById,
          notes: newExpense.notes.trim() || null,
          splitType,
          participants,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewExpense({
          name: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          paidById: "",
          notes: "",
          participants: [],
        });
        setIsAddingExpense(false);
        setSplitType("equal");
        setError(""); // 成功後清除錯誤提示
        await fetchData();
      } else {
        setError(data.error || "新增失敗");
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } catch (err) {
      setError("網路錯誤");
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      console.error(err);
    }
  };

  // 刪除支出
  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("確定要刪除此支出嗎？")) return;

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        await fetchData();
      } else {
        setError("刪除失敗");
      }
    } catch (err) {
      setError("網路錯誤");
      console.error(err);
    }
  };

  // 切換參與人選擇
  const toggleParticipant = (memberId: string) => {
    const exists = newExpense.participants.find((p) => p.memberId === memberId);
    if (exists) {
      setNewExpense({
        ...newExpense,
        participants: newExpense.participants.filter(
          (p) => p.memberId !== memberId
        ),
      });
    } else {
      setNewExpense({
        ...newExpense,
        participants: [...newExpense.participants, { memberId }],
      });
    }
  };

  // 更新自訂分攤金額
  const updateParticipantAmount = (memberId: string, amount: string) => {
    setNewExpense({
      ...newExpense,
      participants: newExpense.participants.map((p) =>
        p.memberId === memberId
          ? { ...p, amount: amount ? parseFloat(amount) : undefined }
          : p
      ),
    });
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

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

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
            📝 {group.name} - 支出記錄
          </h1>
          <p className="text-gray-600">
            總支出: <span className="font-bold text-lg">NT$ {totalAmount.toFixed(2)}</span>
          </p>
        </div>

        {error && (
          <div 
            ref={errorRef}
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
          >
            {error}
          </div>
        )}

        {/* 新增支出按鈕 */}
        <button
          onClick={() => setIsAddingExpense(!isAddingExpense)}
          className="mb-8 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
        >
          {isAddingExpense ? "取消" : "+ 新增支出"}
        </button>

        {/* 新增支出表單 */}
        {isAddingExpense && (
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">新增支出</h2>

            <form onSubmit={handleAddExpense}>
              <div className="grid gap-6 mb-6">
                {/* 基本信息 */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      項目名稱 *
                    </label>
                    <input
                      type="text"
                      placeholder="例如：聚餐"
                      value={newExpense.name}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      金額 (NT$) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="0.00"
                      value={newExpense.amount}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, amount: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      日期 *
                    </label>
                    <input
                      type="date"
                      value={newExpense.date}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      付款人 *
                    </label>
                    <select
                      value={newExpense.paidById}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, paidById: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">選擇付款人</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    備註（選填）
                  </label>
                  <input
                    type="text"
                    placeholder="例如：新竹聚餐"
                    value={newExpense.notes}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, notes: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 分攤方式 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    分攤方式 *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={splitType === "equal"}
                        onChange={() => setSplitType("equal")}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-900">平均分攤</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={splitType === "custom"}
                        onChange={() => setSplitType("custom")}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-900">自訂金額</span>
                    </label>
                  </div>
                </div>

                {/* 參與人選擇 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    分攤對象 *
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {members.map((member) => (
                      <div key={member.id}>
                        <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50">
                          <input
                            type="checkbox"
                            checked={newExpense.participants.some(
                              (p) => p.memberId === member.id
                            )}
                            onChange={() => toggleParticipant(member.id)}
                            className="w-4 h-4 mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {member.name}
                            </p>
                            {splitType === "custom" &&
                              newExpense.participants.some(
                                (p) => p.memberId === member.id
                              ) && (
                                <input
                                  type="number"
                                  step="1"
                                  placeholder="金額"
                                  value={
                                    newExpense.participants.find(
                                      (p) => p.memberId === member.id
                                    )?.amount || ""
                                  }
                                  onChange={(e) =>
                                    updateParticipantAmount(
                                      member.id,
                                      e.target.value
                                    )
                                  }
                                  className="w-full mt-2 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                                />
                              )}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                確認新增
              </button>
            </form>
          </div>
        )}

        {/* 支出列表 */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📋 支出列表 ({expenses.length})
          </h2>

          {expenses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              還沒有支出記錄
            </p>
          ) : (
            <div className="space-y-4">
              {[...expenses]
                .sort((a, b) => {
                  // 先按日期從新到舊排序
                  const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
                  if (dateCompare !== 0) return dateCompare;
                  // 同一天按建立時間從新到舊排序
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((expense) => (
                <div
                  key={expense.id}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">
                        {expense.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(expense.date).toLocaleDateString("zh-TW")}{" "}
                        · 由 <span className="font-semibold">{expense.paidBy.name}</span> 支付
                      </p>
                      {expense.notes && (
                        <p className="text-sm text-gray-500 mt-1">
                          備註：{expense.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        NT$ {expense.amount.toFixed(2)}
                      </p>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-red-600 hover:text-red-800 text-sm mt-2 transition"
                      >
                        刪除
                      </button>
                    </div>
                  </div>

                  {/* 分攤詳情 */}
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <p className="font-semibold text-gray-900 mb-2">分攤：</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {expense.participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex justify-between text-gray-700"
                        >
                          <span>{participant.member.name}</span>
                          <span className="font-semibold">
                            NT$ {participant.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
