"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Member {
  id: string;
  name: string;
  role?: string;
  color?: string;
  isActive: boolean;
}

interface Group {
  id: string;
  name: string;
  createdAt: string;
}

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
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

  // 加載群組和成員
  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      setIsLoading(true);
      const [groupRes, membersRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/members?groupId=${groupId}`),
      ]);

      const groupData = await groupRes.json();
      const membersData = await membersRes.json();

      if (groupData.success) {
        setGroup(groupData.data);
      }
      if (membersData.success) {
        setMembers(membersData.data || []);
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
    if (!newMember.name.trim()) return;

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
        await fetchGroupData();
      } else {
        setError(data.error || "新增失敗");
      }
    } catch (err) {
      setError("網路錯誤");
      console.error(err);
    }
  };

  // 移除成員（標記為不啟用）
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("確定要移除此成員嗎？")) return;

    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        await fetchGroupData();
      } else {
        setError("移除失敗");
      }
    } catch (err) {
      setError("網路錯誤");
      console.error(err);
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
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-600">群組不存在</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  const activeMembers = members.filter((m) => m.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* 返回按鈕 */}
        <Link href="/" className="text-blue-600 hover:underline mb-6 inline-block">
          ← 返回首頁
        </Link>

        {/* 群組頭部 */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{group.name}</h1>
          <p className="text-gray-500">
            建立於 {new Date(group.createdAt).toLocaleDateString("zh-TW")}
          </p>
          <div className="mt-4 flex gap-2">
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              成員: {activeMembers.length}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* 成員列表 */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">👥 成員</h2>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
              >
                新增成員
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
              {activeMembers.map((member) => (
                <div
                  key={member.id}
                  className={`p-4 rounded-lg border-2 border-gray-200 ${member.color || 'bg-gray-100'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">
                        {member.name}
                      </h3>
                      {member.role && (
                        <p className="text-sm text-gray-600">{member.role}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-800 transition"
                      title="移除"
                    >
                      × 移除
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {member.id.slice(0, 8)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 快速操作 */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">⚡ 快速操作</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={`/groups/${groupId}/expenses`}
              className="block p-4 bg-blue-50 border border-blue-200 rounded-lg hover:shadow-lg transition text-center"
            >
              <p className="font-semibold text-gray-900">📝 記錄支出</p>
              <p className="text-sm text-gray-600">新增支出記錄</p>
            </Link>
            <Link
              href={`/groups/${groupId}/settlements`}
              className="block p-4 bg-green-50 border border-green-200 rounded-lg hover:shadow-lg transition text-center"
            >
              <p className="font-semibold text-gray-900">💵 查看結算</p>
              <p className="text-sm text-gray-600">誰該付給誰多少</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
