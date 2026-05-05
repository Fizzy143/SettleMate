"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Activity, ArrowLeft, Check, Copy, CreditCard, Plus, ReceiptText, Users, WalletCards } from "lucide-react";
import { apiFetch, getClientIdentity } from "@/lib/clientIdentity";
import { AmountText, Button, Card, MemberAvatar } from "@/components/ui";
import { formatSignedCurrency } from "@/lib/format";
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
};

const navItems = [
  { href: "members", label: "成員", icon: Users },
  { href: "expenses", label: "支出", icon: ReceiptText },
  { href: "settlements", label: "結算", icon: CreditCard },
  { href: "activity", label: "活動", icon: Activity },
];

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

  const getMemberNetAmount = (memberId: string) => {
    return memberTotals.find((total) => total.memberId === memberId)?.netAmount || 0;
  };

  const handleCopyInviteCode = async () => {
    if (!group?.inviteCode) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(group.inviteCode);
      } else {
        throw new Error("Clipboard API is unavailable");
      }
      setCopiedInviteCode(true);
      window.setTimeout(() => setCopiedInviteCode(false), 1500);
    } catch (error) {
      console.error("Failed to copy invite code", error);
      window.prompt("複製邀請碼", group.inviteCode);
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
            title="複製邀請碼"
          >
            {copiedInviteCode ? <Check size={14} /> : <Copy size={14} />}
            邀請碼 {group.inviteCode || "未設定"}
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <section className="mb-5">
          <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-slate-950 text-white">
                  <WalletCards size={24} />
                </div>
                <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">{group.name}</h1>
                <p className="mt-2 text-sm text-slate-500">
                  {members.length} 位成員 · {group._count?.expenses || 0} 筆支出
                </p>
              </div>
              <Button type="button" onClick={() => setIsExpenseModalOpen(true)}>
                <Plus size={18} /> 新增支出
              </Button>
            </div>
          </Card>
        </section>

        <Card className="mb-5 overflow-hidden">
          <div className="flex gap-3 overflow-x-auto p-4">
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

        <nav className="mb-5 grid grid-cols-4 gap-2 rounded-xl bg-white p-2 shadow-sm">
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

        {children}
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
    </div>
  );
}
