"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { PointerEvent, ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { apiFetch, getClientIdentity } from "@/lib/clientIdentity";
import { AmountText, Button, Card, Input, MemberAvatar } from "@/components/ui";
import { formatSignedCurrency } from "@/lib/format";
import { copyInviteUrl } from "@/lib/invite";
import ExpenseModal from "./components/ExpenseModal";

type Member = {
  id: string;
  name: string;
  color?: string | null;
  isActive: boolean;
};

type MemberTotal = {
  memberId: string;
  netAmount: number;
};

type Group = {
  id: string;
  name: string;
  inviteCode?: string | null;
  _count?: { expenses: number };
  currentUserRole?: string | null;
};

const navItems = [
  { href: "members", label: "成員", icon: Users },
  { href: "expenses", label: "支出", icon: ReceiptText },
  { href: "settlements", label: "結算", icon: CreditCard },
  { href: "activity", label: "活動", icon: Activity },
];

const SWIPE_MIN_DISTANCE = 72;
const SWIPE_MAX_OFF_AXIS_DISTANCE = 84;
const SWIPE_EDGE_GUTTER = 18;

type SwipeStart = {
  pointerId: number;
  x: number;
  y: number;
  ignore: boolean;
};

export default function GroupLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberTotals, setMemberTotals] = useState<MemberTotal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [copiedInviteCode, setCopiedInviteCode] = useState(false);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [groupError, setGroupError] = useState("");
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const swipeStartRef = useRef<SwipeStart | null>(null);
  const canManageGroup = group?.currentUserRole === "owner";
  const activeNavIndex = navItems.findIndex((item) => {
    const href = `/groups/${groupId}/${item.href}`;
    return pathname === href || pathname.startsWith(`${href}/`);
  });

  const fetchData = async () => {
    const identity = getClientIdentity();
    if (!identity) {
      router.push("/");
      return;
    }
    setIsLoading(true);
    try {
      const [groupRes, membersRes, settlementsRes] = await Promise.all([
        apiFetch(`/api/groups/${groupId}`),
        apiFetch(`/api/members?groupId=${groupId}`),
        apiFetch(`/api/settlements?groupId=${groupId}`),
      ]);
      const groupData = await groupRes.json();
      const membersData = await membersRes.json();
      const settlementsData = await settlementsRes.json();
      if (!groupData.success) {
        router.push("/");
        return;
      }
      setGroup(groupData.data);
      if (membersData.success) {
        setMembers((membersData.data || []).filter((member: Member) => member.isActive));
      }
      if (settlementsData.success) {
        setMemberTotals(settlementsData.data.memberTotals || []);
      }
    } catch (error) {
      console.error("Failed to load group", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [groupId]);

  useEffect(() => {
    const handler = () => {
      void fetchData();
    };
    window.addEventListener("settlemate:group-updated", handler);
    return () => window.removeEventListener("settlemate:group-updated", handler);
  }, [groupId]);

  useEffect(() => {
    navItems.forEach((item) => router.prefetch(`/groups/${groupId}/${item.href}`));
  }, [groupId, router]);

  const shouldIgnoreSwipeTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return true;
    return Boolean(
      target.closest(
        "button, input, select, textarea, [role='button'], [data-swipe-ignore='true']"
      )
    );
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary) return;

    const viewportWidth = window.innerWidth;
    const startsOnSystemEdge =
      event.clientX < SWIPE_EDGE_GUTTER || event.clientX > viewportWidth - SWIPE_EDGE_GUTTER;

    swipeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ignore:
        viewportWidth >= 640 ||
        activeNavIndex < 0 ||
        startsOnSystemEdge ||
        shouldIgnoreSwipeTarget(event.target),
    };
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    const swipeStart = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!swipeStart || swipeStart.ignore || swipeStart.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    const isHorizontalSwipe =
      Math.abs(deltaX) >= SWIPE_MIN_DISTANCE &&
      Math.abs(deltaY) <= SWIPE_MAX_OFF_AXIS_DISTANCE &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.4;

    if (!isHorizontalSwipe) return;

    const nextIndex = deltaX < 0 ? activeNavIndex + 1 : activeNavIndex - 1;
    const nextItem = navItems[nextIndex];
    if (!nextItem) return;

    router.push(`/groups/${groupId}/${nextItem.href}`);
  };

  const getMemberNetAmount = (memberId: string) => {
    return memberTotals.find((total) => total.memberId === memberId)?.netAmount || 0;
  };

  const handleCopyInviteCode = async () => {
    if (!group?.inviteCode) return;
    await copyInviteUrl({
      inviteCode: group.inviteCode,
      origin: window.location.origin,
      writeText: navigator.clipboard?.writeText.bind(navigator.clipboard),
      fallbackPrompt: (title, value) => {
        window.prompt(title, value);
      },
    });
    setCopiedInviteCode(true);
    window.setTimeout(() => setCopiedInviteCode(false), 1500);
  };

  const openEditGroup = () => {
    if (!group || !canManageGroup) return;
    setEditingGroupName(group.name);
    setGroupError("");
    setIsGroupMenuOpen(false);
    setIsEditGroupOpen(true);
  };

  const handleUpdateGroup = async () => {
    if (!group || !canManageGroup || !editingGroupName.trim() || isSavingGroup) return;
    setIsSavingGroup(true);
    setGroupError("");
    try {
      const response = await apiFetch(`/api/groups/${group.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editingGroupName.trim() }),
      });
      const data = await response.json();
      if (!data.success) {
        setGroupError(data.error || "更新群組失敗");
        return;
      }
      setGroup({ ...group, ...data.data });
      setIsEditGroupOpen(false);
      window.dispatchEvent(new Event("settlemate:group-updated"));
    } catch (error) {
      setGroupError("更新群組失敗");
      console.error(error);
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!group || !canManageGroup || isDeletingGroup) return;
    const confirmed = window.confirm(`確定要刪除「${group.name}」嗎？所有成員、支出與活動紀錄都會一併刪除。`);
    if (!confirmed) return;
    setIsDeletingGroup(true);
    setGroupError("");
    setIsGroupMenuOpen(false);
    try {
      const response = await apiFetch(`/api/groups/${group.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!data.success) {
        setGroupError(data.error || "刪除群組失敗");
        return;
      }
      router.push("/");
    } catch (error) {
      setGroupError("刪除群組失敗");
      console.error(error);
    } finally {
      setIsDeletingGroup(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <Card className="p-6 text-sm text-slate-500">載入群組中...</Card>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            <ArrowLeft size={16} /> 首頁
          </Link>
          <button
            type="button"
            onClick={handleCopyInviteCode}
            className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
            title="複製邀請連結"
          >
            {copiedInviteCode ? <Check size={14} /> : <Copy size={14} />}
            {copiedInviteCode
              ? "邀請連結已複製"
              : "邀請碼 " + (group.inviteCode || "未設定")}
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <section className="mb-5">
          <Card className="p-5">
            {groupError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {groupError}
              </div>
            )}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start justify-between gap-3 sm:flex-1">
                <div className="min-w-0">
                  <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-slate-950 text-white">
                    <WalletCards size={24} />
                  </div>
                  <h1 className="truncate text-2xl font-bold text-slate-950 sm:text-3xl">{group.name}</h1>
                  <p className="mt-2 text-sm text-slate-500">
                    {members.length} 位成員 · {group._count?.expenses || 0} 筆支出
                  </p>
                </div>
                {canManageGroup && (
                  <div className="relative shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsGroupMenuOpen(!isGroupMenuOpen)}
                      title="群組操作"
                    >
                      <MoreHorizontal size={18} />
                    </Button>
                    {isGroupMenuOpen && (
                      <>
                        <button
                          type="button"
                          aria-label="關閉群組操作選單"
                          className="fixed inset-0 z-10 cursor-default bg-transparent"
                          onClick={() => setIsGroupMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                          <button
                            type="button"
                            onClick={openEditGroup}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:shadow-sm focus-visible:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                          >
                            <Pencil size={15} /> 編輯
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteGroup()}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 hover:shadow-sm focus-visible:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                          >
                            <Trash2 size={15} /> 刪除群組
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <Button type="button" onClick={() => setIsExpenseModalOpen(true)}>
                <Plus size={18} /> 新增支出
              </Button>
            </div>
          </Card>
        </section>

        <Card className="mb-5 overflow-hidden">
          <div className="flex gap-3 overflow-x-auto p-4" data-swipe-ignore="true">
            {members.length === 0 ? (
              <p className="text-sm text-slate-500">尚未新增分帳成員。</p>
            ) : (
              members.map((member) => {
                const netAmount = getMemberNetAmount(member.id);
                return (
                  <Link
                    key={member.id}
                    href={`/groups/${groupId}/members/${member.id}`}
                    className="flex min-w-36 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:bg-white"
                  >
                    <MemberAvatar name={member.name} color={member.color} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{member.name}</p>
                      <AmountText value={netAmount}>{formatSignedCurrency(netAmount)}</AmountText>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        <nav className="mb-5 grid grid-cols-4 gap-2 rounded-xl bg-white p-2 shadow-sm" data-swipe-ignore="true">
          {navItems.map((item) => {
            const Icon = item.icon;
            const href = `/groups/${groupId}/${item.href}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.href}
                href={href}
                className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
                  active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div
          className="touch-pan-y"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            swipeStartRef.current = null;
          }}
        >
          {children}
        </div>

        {activeNavIndex >= 0 && (
          <div className="mt-5 flex justify-center gap-2 sm:hidden" aria-hidden="true">
            {navItems.map((item, index) => (
              <span
                key={item.href}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeNavIndex ? "w-6 bg-slate-950" : "w-1.5 bg-slate-300"
                }`}
              />
            ))}
          </div>
        )}
      </main>

      <Button
        type="button"
        className="fixed bottom-5 right-5 h-14 w-14 rounded-full p-0 shadow-lg sm:hidden"
        onClick={() => setIsExpenseModalOpen(true)}
        title="新增支出"
      >
        <Plus size={24} />
      </Button>

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        groupId={groupId}
        members={members}
        onExpenseAdded={fetchData}
      />

      {isEditGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">編輯群組</h2>
                <p className="mt-1 text-sm text-slate-500">修改群組名稱，不會影響既有成員與支出。</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsEditGroupOpen(false)}
                disabled={isSavingGroup}
              >
                <X size={20} />
              </Button>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">群組名稱</span>
              <Input
                value={editingGroupName}
                onChange={(event) => setEditingGroupName(event.target.value)}
                placeholder="輸入群組名稱"
                autoFocus
              />
            </label>
            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setIsEditGroupOpen(false)}
                disabled={isSavingGroup}
              >
                取消
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => void handleUpdateGroup()}
                disabled={!editingGroupName.trim() || isSavingGroup}
              >
                <Save size={16} /> {isSavingGroup ? "儲存中..." : "儲存"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

