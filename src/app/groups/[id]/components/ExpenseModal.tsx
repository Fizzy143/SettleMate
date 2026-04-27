"use client";

import { useState } from "react";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  members: Array<{ id: string; name: string }>;
  onExpenseAdded: () => void;
}

export default function ExpenseModal({
  isOpen,
  onClose,
  groupId,
  members,
  onExpenseAdded,
}: ExpenseModalProps) {
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

  if (!isOpen) return null;

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

  // 提交表單
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newExpense.name.trim() || !newExpense.amount || !newExpense.paidById) {
      setError("請填寫所有必填項目");
      return;
    }

    if (newExpense.participants.length === 0) {
      setError("請選擇至少一個分攤人");
      return;
    }

    let participants = newExpense.participants;

    if (splitType === "equal") {
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
        setError("");
        setNewExpense({
          name: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          paidById: "",
          notes: "",
          participants: [],
        });
        setSplitType("equal");
        onExpenseAdded();
        onClose();
      } else {
        setError(data.error || "新增失敗");
      }
    } catch (err) {
      setError("網路錯誤");
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-lg rounded-t-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">新增支出</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

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
                  inputMode="numeric"
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
                    setNewExpense({
                      ...newExpense,
                      paidById: e.target.value,
                    })
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
                              inputMode="numeric"
                            />
                          )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              確認新增
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
