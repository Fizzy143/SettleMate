"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Copy,
  LogOut,
  Plus,
  Sparkles,
  Ticket,
  UserRound,
  WalletCards,
} from "lucide-react";
import { apiFetch, clearClientIdentity, getClientIdentity, saveClientIdentity, type ClientIdentity } from "@/lib/clientIdentity";
import { Badge, Button, Card, EmptyState, Input, MemberAvatar } from "@/components/ui";

type Group = {
  id: string;
  name: string;
  inviteCode?: string | null;
  createdAt: string;
  members: Array<{ id: string; name: string; color?: string | null }>;
  _count?: { expenses: number };
  currentUserRole?: string;
};

export default function Home() {
  const [identity, setIdentity] = useState<ClientIdentity | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchGroups = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/groups");
      const data = await response.json();
      if (data.success) setGroups(data.data || []);
      else setError(data.error || "無法取得群組");
    } catch (err) {
      setError("無法連線到伺服器");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedIdentity = getClientIdentity();
    setIdentity(savedIdentity);
    if (savedIdentity) {
      void fetchGroups();
    }
  }, []);

  const handleSaveIdentity = async (event: FormEvent) => {
    event.preventDefault();
    if (!displayName.trim()) return;
    const nextIdentity = saveClientIdentity(displayName);
    setIdentity(nextIdentity);
    await apiFetch("/api/users", { method: "POST" });
    await fetchGroups();
  };

  const handleCreateGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!newGroupName.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name: newGroupName }),
      });
      const data = await response.json();
      if (data.success) {
        setNewGroupName("");
        await fetchGroups();
      } else {
        setError(data.error || "建立群組失敗");
      }
    } catch (err) {
      setError("建立群組失敗");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/groups/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode }),
      });
      const data = await response.json();
      if (data.success) {
        setInviteCode("");
        await fetchGroups();
      } else {
        setError(data.error || "找不到邀請碼");
      }
    } catch (err) {
      setError("加入群組失敗");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetIdentity = () => {
    clearClientIdentity();
    setIdentity(null);
    setGroups([]);
    setDisplayName("");
  };

  if (!identity) {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center">
          <Card className="w-full p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-950 text-white">
                <WalletCards size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">SettleMate</p>
                <h1 className="text-2xl font-bold text-slate-950">開始你的分帳空間</h1>
              </div>
            </div>
            <p className="mb-6 text-sm leading-6 text-slate-600">
              輸入一個用戶名稱，我們會在這台裝置建立你的本機身份。之後首頁只會顯示你建立或加入的群組。
            </p>
            <form onSubmit={handleSaveIdentity} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">用戶名稱</span>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="例如：Fizzy"
                />
              </label>
              <Button type="submit" className="w-full" disabled={!displayName.trim()}>
                建立本機身份 <ArrowRight size={18} />
              </Button>
            </form>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              <Sparkles size={14} /> 朋友分帳工具
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              SettleMate
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              建立群組、邀請朋友、記錄支出，最後用最少筆轉帳結清。
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
            <MemberAvatar name={identity.displayName} />
            <div className="hidden sm:block">
              <p className="text-xs text-slate-500">目前使用者</p>
              <p className="text-sm font-bold text-slate-950">{identity.displayName}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={handleResetIdentity} title="切換使用者">
              <LogOut size={18} />
            </Button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950">我的群組</h2>
              <Badge tone="slate">{groups.length} 個群組</Badge>
            </div>

            {isLoading && groups.length === 0 ? (
              <Card className="p-6 text-sm text-slate-500">載入群組中...</Card>
            ) : groups.length === 0 ? (
              <EmptyState
                title="還沒有群組"
                description="先建立一個群組，或輸入朋友給你的邀請碼加入。"
              />
            ) : (
              <div className="grid gap-3">
                {groups.map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}/expenses`}>
                    <Card className="p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="mb-2 flex items-center gap-2">
                            <h3 className="truncate text-lg font-bold text-slate-950">{group.name}</h3>
                            {group.currentUserRole === "owner" && <Badge tone="blue">Owner</Badge>}
                          </div>
                          <p className="text-sm text-slate-500">
                            {group.members.length} 位成員 · {group._count?.expenses || 0} 筆支出
                          </p>
                          <div className="mt-3 flex -space-x-2">
                            {group.members.slice(0, 5).map((member) => (
                              <div key={member.id} className="rounded-full border-2 border-white">
                                <MemberAvatar name={member.name} color={member.color} size="sm" />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge tone="amber">{group.inviteCode || "尚無邀請碼"}</Badge>
                          <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
                            開啟 <ArrowRight size={16} />
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <Card className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <Plus size={18} />
                <h2 className="font-bold text-slate-950">建立群組</h2>
              </div>
              <form onSubmit={handleCreateGroup} className="space-y-3">
                <Input
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                  placeholder="例如：東京旅行"
                />
                <Button type="submit" className="w-full" disabled={!newGroupName.trim() || isLoading}>
                  建立
                </Button>
              </form>
            </Card>

            <Card className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <Ticket size={18} />
                <h2 className="font-bold text-slate-950">加入朋友群組</h2>
              </div>
              <form onSubmit={handleJoinGroup} className="space-y-3">
                <Input
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  placeholder="輸入 6 碼邀請碼"
                />
                <Button type="submit" variant="secondary" className="w-full" disabled={!inviteCode.trim() || isLoading}>
                  <Copy size={16} /> 加入群組
                </Button>
              </form>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <UserRound size={20} className="text-slate-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-950">本機身份</p>
                  <p className="text-xs text-slate-500">此身份只保存在這台瀏覽器。</p>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
