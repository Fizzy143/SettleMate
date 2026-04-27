"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  createdAt: string;
}

export default function Home() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // 加載現有群組
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      const data = await response.json();
      if (data.success) {
        setGroups(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
  };

  // 建立新群組
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName }),
      });

      const data = await response.json();
      if (data.success) {
        setNewGroupName("");
        await fetchGroups();
      } else {
        setError(data.error || "建立失敗");
      }
    } catch (err) {
      setError("網路錯誤，請重試");
      console.error("Error creating group:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 編輯群組
  const handleEditGroup = async (groupId: string) => {
    if (!editingName.trim()) return;

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName }),
      });

      const data = await response.json();
      if (data.success) {
        setEditingId(null);
        setEditingName("");
        setOpenMenuId(null);
        await fetchGroups();
      } else {
        alert(data.error || "編輯失敗");
      }
    } catch (err) {
      alert("網路錯誤，請重試");
      console.error("Error editing group:", err);
    }
  };

  // 刪除群組
  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("確定要刪除此群組嗎？此操作無法撤銷。")) return;

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        setOpenMenuId(null);
        await fetchGroups();
      } else {
        alert(data.error || "刪除失敗");
      }
    } catch (err) {
      alert("網路錯誤，請重試");
      console.error("Error deleting group:", err);
    }
  };

  // 開始編輯
  const startEdit = (group: Group) => {
    setEditingId(group.id);
    setEditingName(group.name);
    setOpenMenuId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* 頭部 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
            SettleMate
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            💰 朋友分帳工具 - 輕鬆記錄共同支出，自動計算誰該付給誰多少
          </p>
        </div>

        {/* 建立群組表單 */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📝 建立新群組
          </h2>
          <form onSubmit={handleCreateGroup} className="flex gap-3 mb-4 flex-col sm:flex-row">
            <input
              type="text"
              placeholder="輸入群組名稱（例如：2024年朋友群）"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !newGroupName.trim()}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition whitespace-nowrap"
            >
              {isLoading ? "建立中..." : "建立"}
            </button>
          </form>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        {/* 群組列表 */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📂 我的群組 ({groups.length})
          </h2>

          {groups.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              還沒有群組，建立一個開始吧！
            </p>
          ) : (
            <div className="grid gap-4">
              {groups.map((group) => (
                <div key={group.id}>
                  {editingId === group.id ? (
                    // 編輯模式
                    <div className="p-4 border border-blue-300 rounded-lg bg-blue-50 flex gap-3 flex-col sm:flex-row">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                        autoFocus
                      />
                      <div className="flex gap-2 whitespace-nowrap">
                        <button
                          onClick={() => handleEditGroup(group.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditingName("");
                          }}
                          className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition text-sm"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 正常顯示模式
                    <div className="relative">
                      <Link
                        href={`/groups/${group.id}`}
                        className="block p-4 border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition"
                      >
                        <div className="flex justify-between items-start pr-10">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {group.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              建立於{" "}
                              {new Date(group.createdAt).toLocaleDateString(
                                "zh-TW"
                              )}
                            </p>
                          </div>
                          <span className="text-2xl">→</span>
                        </div>
                      </Link>

                      {/* 三點菜單按鈕 */}
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setOpenMenuId(
                              openMenuId === group.id ? null : group.id
                            );
                          }}
                          className="p-2 hover:bg-gray-200 rounded-lg transition"
                          title="更多選項"
                        >
                          <span className="text-xl">⋮</span>
                        </button>

                        {/* 下拉菜單 */}
                        {openMenuId === group.id && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                            <button
                              onClick={() => startEdit(group)}
                              className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700 text-sm whitespace-nowrap"
                            >
                              ✏️ 編輯名稱
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm border-t border-gray-200 whitespace-nowrap"
                            >
                              🗑️ 刪除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 使用提示 */}
        <div className="mt-10 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 提示：</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ 建立朋友群組</li>
            <li>✓ 添加群組成員</li>
            <li>✓ 記錄支出（平均分攤或自訂分配）</li>
            <li>✓ 自動計算誰應該付給誰多少</li>
          </ul>
        </div>
      </div>
    </div>
  );
        </div>

        {/* 群組列表 */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            📂 我的群組 ({groups.length})
          </h2>

          {groups.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              還沒有群組，建立一個開始吧！
            </p>
          ) : (
            <div className="grid gap-4">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {group.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        建立於{" "}
                        {new Date(group.createdAt).toLocaleDateString("zh-TW")}
                      </p>
                    </div>
                    <span className="text-2xl">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 使用提示 */}
        <div className="mt-10 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 提示：</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ 建立朋友群組</li>
            <li>✓ 添加群組成員</li>
            <li>✓ 記錄支出（平均分攤或自訂分配）</li>
            <li>✓ 自動計算誰應該付給誰多少</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
