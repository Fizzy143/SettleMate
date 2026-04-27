"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface ActivityLog {
  id: string;
  actionType: string;
  actionBy: string;
  content: string;
  createdAt: string;
}

const actionTypeLabels: { [key: string]: string } = {
  add_expense: "新增支出",
  edit_expense: "修改支出",
  delete_expense: "刪除支出",
  add_member: "新增成員",
  delete_member: "刪除成員",
};

const actionTypeIcons: { [key: string]: string } = {
  add_expense: "➕",
  edit_expense: "✏️",
  delete_expense: "🗑️",
  add_member: "👤",
  delete_member: "❌",
};

export default function ActivityPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchActivityLogs();
  }, [groupId]);

  const fetchActivityLogs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/activity?groupId=${groupId}`);
      const data = await response.json();

      if (data.success) {
        setActivityLogs(data.data || []);
      } else {
        setError("加載失敗");
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
      <div className="text-center py-8">
        <p className="text-gray-600">加載中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          📋 活動紀錄
        </h2>

        {activityLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            還沒有活動紀錄
          </p>
        ) : (
          <div className="space-y-4">
            {activityLogs.map((log, index) => (
              <div
                key={log.id}
                className="flex gap-4 pb-4 border-b border-gray-200 last:border-b-0"
              >
                {/* 時間線圓點 */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">
                    {actionTypeIcons[log.actionType] || "📝"}
                  </div>
                  {index !== activityLogs.length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-300 mt-2" />
                  )}
                </div>

                {/* 活動內容 */}
                <div className="flex-1 pt-2">
                  <p className="font-semibold text-gray-900">
                    {actionTypeLabels[log.actionType] || log.actionType}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {log.content}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      操作者：<span className="font-semibold">{log.actionBy}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString("zh-TW")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
