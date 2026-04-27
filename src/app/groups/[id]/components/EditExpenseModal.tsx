"use client";

import { useState, useEffect } from "react";

interface Member {
  id: string;
  name: string;
}

interface ExpenseParticipant {
  memberId: string;
  amount?: number;
}

export interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  expense: {
    id: string;
    name: string;
    amount: number;
    date: string;
    paidById: string;
    notes?: string;
    participants: Array<{
      id: string;
      memberId: string;
      amount: number;
    }>;
  };
  members: Array<{ id: string; name: string }>;
  onExpenseUpdated: () => void;
}

export default function EditExpenseModal({
  isOpen,
  onClose,
  groupId,
  expense,
  members,
  onExpenseUpdated,
}: EditExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");

  const [editedExpense, setEditedExpense] = useState({
    name: "",
    amount: "",
    date: "",
    paidById: "",
    notes: "",
    participants: [] as ExpenseParticipant[],
  });

  // 初始化表單資料
  useEffect(() => {
    if (isOpen && expense) {
      const detectedSplitType =
        expense.participants.length > 0 &&
        expense.participants.some((p) => {
          // 計算平均金額
          const avgAmount = expense.amount / expense.participants.length;
          return Math.abs(p.amount - avgAmount) > 0.01;
        })
          ? "custom"
          : "equal";

      setSplitType(detectedSplitType);
      setEditedExpense({
        name: expense.name,
        amount: expense.amount.toString(),
        date: expense.date,
        paidById: expense.paidById,
        notes: expense.notes || "",
        participants: expense.participants.map((p) => ({
          memberId: p.memberId,
          amount:
            detectedSplitType === "custom" ? p.amount : undefined,
        })),
      });
      setError("");
    }
  }, [isOpen, expense]);

  const handleClose = () => {
    setEditedExpense({
      name: "",
      amount: "",
      date: "",
      paidById: "",
      notes: "",
      participants: [],
    });
    setError("");
    setSplitType("equal");
    onClose();
  };

  const toggleParticipant = (memberId: string) => {
    const exists = editedExpense.participants.find(
      (p) => p.memberId === memberId
    );
    if (exists) {
      setEditedExpense({
        ...editedExpense,
        participants: editedExpense.participants.filter(
          (p) => p.memberId !== memberId
        ),
      });
    } else {
      setEditedExpense({
        ...editedExpense,
        participants: [
          ...editedExpense.participants,
          { memberId, amount: undefined },
        ],
      });
    }
  };

  const updateParticipantAmount = (memberId: string, amount: string) => {
    setEditedExpense({
      ...editedExpense,
      participants: editedExpense.participants.map((p) =>
        p.memberId === memberId
          ? { ...p, amount: amount ? parseFloat(amount) : undefined }
          : p
      ),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editedExpense.name.trim() || !editedExpense.amount) {
      setError("請填寫所有必填項目");
      return;
    }

    if (editedExpense.participants.length === 0) {
      setError("請選擇至少一個分攤人");
      return;
    }

    let participants = editedExpense.participants;

    if (splitType === "equal") {
      participants = editedExpense.participants.map((p) => ({
        ...p,
        amount: undefined,
      }));
    } else {
      // 驗證自訂分攤總額
      const totalAmount = participants.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );
      if (
        Math.abs(totalAmount - parseFloat(editedExpense.amount)) > 0.01
      ) {
        setError("分攤總額必須等於支出金額");
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editedExpense.date,
          name: editedExpense.name.trim(),
          amount: parseFloat(editedExpense.amount),
          paidById: editedExpense.paidById,
          notes: editedExpense.notes.trim() || null,
          splitType,
          participants,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onExpenseUpdated();
        handleClose();
      } else {
        setError(data.error || "更新失敗");
      }
    } catch (err) {
      setError("網路錯誤");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />

      {/* 模態窗口 */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div
          className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl w-full sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 頭部 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">編輯支出</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* 內容 */}
          <div className="p-4 sm:p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基本信息 */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    項目名稱 *
                  </label>
                  <input
                    type="text"
                    value={editedExpense.name}
                    onChange={(e) =>
                      setEditedExpense({
                        ...editedExpense,
                        name: e.target.value,
                      })
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
                    value={editedExpense.amount}
                    onChange={(e) =>
                      setEditedExpense({
                        ...editedExpense,
                        amount: e.target.value,
                      })
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
                    value={editedExpense.date}
                    onChange={(e) =>
                      setEditedExpense({
                        ...editedExpense,
                        date: e.target.value,
                      })
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
                    value={editedExpense.paidById}
                    onChange={(e) =>
                      setEditedExpense({
                        ...editedExpense,
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
                  value={editedExpense.notes}
                  onChange={(e) =>
                    setEditedExpense({
                      ...editedExpense,
                      notes: e.target.value,
                    })
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
                          checked={editedExpense.participants.some(
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
                            editedExpense.participants.some(
                              (p) => p.memberId === member.id
                            ) && (
                              <input
                                type="number"
                                step="1"
                                placeholder="金額"
                                value={
                                  editedExpense.participants.find(
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

              {/* 提交按鈕 */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                >
                  {loading ? "更新中..." : "確認更新"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
