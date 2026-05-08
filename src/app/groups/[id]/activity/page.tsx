"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, ChevronDown } from "lucide-react";
import { apiFetch } from "@/lib/clientIdentity";
import { Badge, Card, EmptyState, MemberAvatar } from "@/components/ui";
import { formatDate } from "@/lib/format";

type ActivityDetail = {
  title: string;
  amount: string;
  date: string;
  paidByLabel: string;
  paidByName: string;
  notes?: string | null;
  participants: Array<{
    label: string;
    name: string;
    amount: string;
  }>;
};

type ActivityLog = {
  id: string;
  actionType: string;
  actionBy: string;
  content: string;
  summary?: string;
  detail?: ActivityDetail;
  createdAt: string;
};

export default function ActivityPage() {
  const params = useParams();
  const groupId = params.id as string;
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const response = await apiFetch(`/api/activity?groupId=${groupId}`);
        const data = await response.json();
        if (data.success) setLogs(data.data || []);
        else setError(data.error || "無法載入活動紀錄");
      } catch (err) {
        setError("無法載入活動紀錄");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchLogs();
  }, [groupId]);

  if (isLoading) return <Card className="p-6 text-sm text-slate-500">載入活動紀錄中...</Card>;

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
        <EmptyState title="尚無活動" description="成員或支出有變動時，會自動記錄在這裡。" />
      ) : (
        <Card className="divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 text-left"
                onClick={() => {
                  if (!log.detail) return;
                  setExpandedLogId(expandedLogId === log.id ? null : log.id);
                }}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">{log.summary || log.content}</p>
                  <p className="mt-1 text-sm text-slate-500">由 {log.actionBy} 操作</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="slate">{formatDate(log.createdAt)}</Badge>
                  {log.detail && (
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition ${expandedLogId === log.id ? "rotate-180" : ""}`}
                    />
                  )}
                </div>
              </button>

              {log.detail && expandedLogId === log.id && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="rounded-lg bg-slate-50 px-3 py-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">項目</p>
                        <p className="mt-1 truncate font-bold text-slate-950">{log.detail.title}</p>
                      </div>
                      <div className="min-w-0 text-right">
                        <p className="text-xs font-semibold text-slate-500">金額</p>
                        <p className="mt-1 break-words font-bold tabular-nums text-slate-950">
                          {log.detail.amount}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <span className="text-slate-500">
                        日期 <strong className="font-bold text-slate-950">{log.detail.date}</strong>
                      </span>
                      <span className="text-slate-500">
                        {log.detail.paidByLabel}{" "}
                        <strong className="font-bold text-slate-950">{log.detail.paidByName}</strong>
                      </span>
                    </div>
                  </div>

                  {log.detail.notes && (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {log.detail.notes}
                    </p>
                  )}

                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {log.detail.participants.map((participant, index) => (
                      <div
                        key={`${log.id}-${participant.name}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <MemberAvatar name={participant.name} size="sm" />
                          <span className="truncate text-sm font-semibold text-slate-700">
                            {participant.label}：{participant.name}
                          </span>
                        </div>
                        <p className="shrink-0 text-sm font-bold tabular-nums text-slate-950">
                          {participant.amount}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
