"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MoreHorizontal, Pencil, Plus, Save, UserX, Users } from "lucide-react";
import { apiFetch } from "@/lib/clientIdentity";
import { AmountText, Button, Card, EmptyState, Input, MemberAvatar } from "@/components/ui";
import { formatCurrency, formatSignedCurrency } from "@/lib/format";

type Member = {
  id: string;
  name: string;
  role?: string | null;
  color?: string | null;
  isActive: boolean;
};

type MemberStats = {
  memberId: string;
  totalExpense: number;
  netAmount: number;
};

type ExpenseSummary = {
  paidById: string;
  amount: number;
};

type SettlementTotal = {
  memberId: string;
  netAmount: number;
};

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

export default function MembersPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [memberStats, setMemberStats] = useState<Map<string, MemberStats>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<Partial<Member>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({ name: "", role: "", color: "bg-blue-200" });
  const [error, setError] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [membersRes, expensesRes, settlementsRes] = await Promise.all([
        apiFetch(`/api/members?groupId=${groupId}`),
        apiFetch(`/api/expenses?groupId=${groupId}`),
        apiFetch(`/api/settlements?groupId=${groupId}`),
      ]);
      const membersData = await membersRes.json();
      const expensesData = await expensesRes.json();
      const settlementsData = await settlementsRes.json();
      if (membersData.success) setMembers(membersData.data || []);

      if (membersData.success && expensesData.success && settlementsData.success) {
        const expenses = expensesData.data || [];
        const totals = settlementsData.data?.memberTotals || [];
        const paidMap = new Map<string, number>();
        (expenses as ExpenseSummary[]).forEach((expense) => {
          paidMap.set(expense.paidById, (paidMap.get(expense.paidById) || 0) + expense.amount);
        });
        const stats = new Map<string, MemberStats>();
        (membersData.data || []).forEach((member: Member) => {
          const total = (totals as SettlementTotal[]).find((item) => item.memberId === member.id);
          stats.set(member.id, {
            memberId: member.id,
            totalExpense: paidMap.get(member.id) || 0,
            netAmount: total?.netAmount || 0,
          });
        });
        setMemberStats(stats);
      }
    } catch (err) {
      setError("無法載入成員");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [groupId]);

  const handleAddMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!newMember.name.trim()) return;
    try {
      const response = await apiFetch("/api/members", {
        method: "POST",
        body: JSON.stringify({
          groupId,
          name: newMember.name,
          role: newMember.role || null,
          color: newMember.color,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setNewMember({ name: "", role: "", color: "bg-blue-200" });
        setIsAddingMember(false);
        await fetchData();
        window.dispatchEvent(new Event("settlemate:group-updated"));
      } else setError(data.error || "新增成員失敗");
    } catch (err) {
      setError("新增成員失敗");
      console.error(err);
    }
  };

  const handleSaveMember = async (memberId: string) => {
    if (!editingMember.name?.trim()) return;
    try {
      const response = await apiFetch(`/api/members/${memberId}`, {
        method: "PUT",
        body: JSON.stringify(editingMember),
      });
      const data = await response.json();
      if (data.success) {
        setEditingMemberId(null);
        setEditingMember({});
        await fetchData();
        window.dispatchEvent(new Event("settlemate:group-updated"));
      } else setError(data.error || "更新成員失敗");
    } catch (err) {
      setError("更新成員失敗");
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("確定要停用這位成員嗎？既有支出資料會保留。")) return;
    try {
      const response = await apiFetch(`/api/members/${memberId}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        await fetchData();
        window.dispatchEvent(new Event("settlemate:group-updated"));
      }
      else setError(data.error || "停用成員失敗");
    } catch (err) {
      setError("停用成員失敗");
      console.error(err);
    }
  };

  if (isLoading) return <Card className="p-6 text-sm text-slate-500">載入成員中...</Card>;

  const activeMembers = members.filter((member) => member.isActive);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-white">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">成員</h2>
              <p className="text-sm text-slate-500">管理分帳參與者與每個人的目前淨額。</p>
            </div>
          </div>
          <Button type="button" onClick={() => setIsAddingMember(!isAddingMember)}>
            <Plus size={18} /> 新增成員
          </Button>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {isAddingMember && (
        <Card className="p-4">
          <form onSubmit={handleAddMember} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input value={newMember.name} onChange={(event) => setNewMember({ ...newMember, name: event.target.value })} placeholder="成員名稱" />
            <Input value={newMember.role} onChange={(event) => setNewMember({ ...newMember, role: event.target.value })} placeholder="備註或代號" />
            <Button type="submit">新增</Button>
            <div className="flex flex-wrap gap-2 sm:col-span-3">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewMember({ ...newMember, color })}
                  className={`h-8 w-8 rounded-full ${color} ${newMember.color === color ? "ring-2 ring-slate-950 ring-offset-2" : ""}`}
                  aria-label={color}
                />
              ))}
            </div>
          </form>
        </Card>
      )}

      {activeMembers.length === 0 ? (
        <EmptyState title="尚無成員" description="新增成員後，就可以開始記錄共同支出。" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {activeMembers.map((member) => {
            const stats = memberStats.get(member.id);
            const isEditing = editingMemberId === member.id;
            return (
              <Card key={member.id} className="p-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">成員名稱</span>
                      <Input
                        value={editingMember.name || ""}
                        onChange={(event) => setEditingMember({ ...editingMember, name: event.target.value })}
                        placeholder="修改成員名稱"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">備註或代號</span>
                      <Input
                        value={editingMember.role || ""}
                        onChange={(event) => setEditingMember({ ...editingMember, role: event.target.value })}
                        placeholder="修改備註或代號"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditingMember({ ...editingMember, color })}
                          className={`h-8 w-8 rounded-full ${color} ${editingMember.color === color ? "ring-2 ring-slate-950 ring-offset-2" : ""}`}
                          aria-label={color}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" className="flex-1" onClick={() => handleSaveMember(member.id)}>
                        <Save size={16} /> 儲存
                      </Button>
                      <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditingMemberId(null)}>
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/groups/${groupId}/members/${member.id}`} className="flex min-w-0 items-center gap-3">
                        <MemberAvatar name={member.name} color={member.color} size="lg" />
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-bold text-slate-950">{member.name}</h3>
                          {member.role && <p className="text-sm text-slate-500">{member.role}</p>}
                        </div>
                      </Link>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId(openMenuId === member.id ? null : member.id);
                          }}
                          title="成員操作"
                        >
                          <MoreHorizontal size={18} />
                        </Button>
                        {openMenuId === member.id && (
                          <>
                            <button
                              type="button"
                              aria-label="關閉成員操作選單"
                              className="fixed inset-0 z-10 cursor-default bg-transparent"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMemberId(member.id);
                                  setEditingMember(member);
                                  setOpenMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:shadow-sm focus-visible:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                              >
                                <Pencil size={15} /> 編輯
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  void handleRemoveMember(member.id);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 hover:shadow-sm focus-visible:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                              >
                                <UserX size={15} /> 停用成員
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-500">已付款</p>
                        <p className="mt-1 font-bold text-slate-950">{formatCurrency(stats?.totalExpense || 0)}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-500">淨額</p>
                        <AmountText value={stats?.netAmount || 0}>{formatSignedCurrency(stats?.netAmount || 0)}</AmountText>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

