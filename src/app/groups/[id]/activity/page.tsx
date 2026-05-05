"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Activity } from "lucide-react";
import { apiFetch } from "@/lib/clientIdentity";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";

type ActivityLog = {
  id: string;
  actionType: string;
  actionBy: string;
  content: string;
  createdAt: string;
};

export default function ActivityPage() {
  const params = useParams();
  const groupId = params.id as string;
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const response = await apiFetch(`/api/activity?groupId=${groupId}`);
        const data = await response.json();
        if (data.success) setLogs(data.data || []);
        else setError(data.error || "無法載入活動");
      } catch (err) {
        setError("無法載入活動");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [groupId]);

  if (isLoading) return <Card className="p-6 text-sm text-slate-500">載入活動中...</Card>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-white">
            <Activity size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-950">活動紀錄</h2>
            <p className="text-sm text-slate-500">追蹤成員與支出的新增、編輯和刪除。</p>
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {logs.length === 0 ? (
        <EmptyState title="尚無活動" description="新增成員或支出後，這裡會顯示群組動態。" />
      ) : (
        <Card className="divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{log.content}</p>
                  <p className="mt-1 text-sm text-slate-500">由 {log.actionBy} 操作</p>
                </div>
                <Badge tone="slate">{formatDate(log.createdAt)}</Badge>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
