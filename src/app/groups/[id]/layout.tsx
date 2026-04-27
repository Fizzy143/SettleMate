"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import ExpenseModal from "./components/ExpenseModal";

interface Member {
  id: string;
  name: string;
  color?: string;
  isActive: boolean;
}

interface MemberTotal {
  memberId: string;
  netAmount: number;
}

interface Group {
  id: string;
  name: string;
}

const colorClasses: { [key: string]: string } = {
  "bg-blue-200": "bg-blue-200",
  "bg-red-200": "bg-red-200",
  "bg-green-200": "bg-green-200",
  "bg-yellow-200": "bg-yellow-200",
  "bg-purple-200": "bg-purple-200",
  "bg-pink-200": "bg-pink-200",
  "bg-indigo-200": "bg-indigo-200",
  "bg-cyan-200": "bg-cyan-200",
};

export default function GroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberTotals, setMemberTotals] = useState<MemberTotal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // 檢測手機
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    setIsMobile(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // 加載群組、成員、結算數據
  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [groupRes, membersRes, settlementsRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/members?groupId=${groupId}`),
        fetch(`/api/settlements?groupId=${groupId}`),
      ]);

      const groupData = await groupRes.json();
      const membersData = await membersRes.json();
      const settlementsData = await settlementsRes.json();

      if (groupData.success) setGroup(groupData.data);
      
      if (membersData.success) {
        const activeMembers = (membersData.data || []).filter(
          (m: Member) => m.isActive
        );
        setMembers(activeMembers);
      }

      if (settlementsData.success && settlementsData.data) {
        setMemberTotals(settlementsData.data.memberTotals || []);
      }
    } catch (err) {
      console.error("加載失敗", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 新增支出後的回調
  const handleExpenseAdded = () => {
    fetchData();
  };

  // 獲取成員的淨額
  const getMemberNetAmount = (memberId: string): number => {
    const total = memberTotals.find((m) => m.memberId === memberId);
    return total?.netAmount || 0;
  };

  // 格式化淨額顯示
  const formatNetAmount = (amount: number): string => {
    if (amount > 0) return `+NT$${amount.toFixed(2)}`;
    if (amount < 0) return `-NT$${Math.abs(amount).toFixed(2)}`;
    return "NT$0.00";
  };

  const netAmountColor = (amount: number): string => {
    if (amount > 0) return "text-green-600 font-bold";
    if (amount < 0) return "text-red-600 font-bold";
    return "text-gray-600";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8 flex items-center justify-center">
        <p className="text-gray-600">加載中...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
        <Link href="/" className="text-blue-600 hover:underline">
          ← 返回首頁
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 返回按鈕 */}
      <div className="sticky top-0 z-40 bg-white shadow-sm p-4">
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ← 返回首頁
        </Link>
      </div>

      {/* 上方：群組標題 */}
      <div className="bg-white shadow-md p-4 sm:p-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {group.name}
        </h1>
      </div>

      {/* 成員卡片區域（固定） */}
      <div className="bg-white shadow-md p-4 sm:p-6 overflow-x-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-3">👥 成員</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {members.map((member) => {
            const netAmount = getMemberNetAmount(member.id);
            const bgColor = member.color ? colorClasses[member.color] : "bg-gray-200";
            return (
              <Link
                key={member.id}
                href={`/groups/${groupId}/members/${member.id}`}
                className="flex-shrink-0 p-4 rounded-lg border border-gray-300 hover:shadow-lg transition bg-white text-center cursor-pointer"
              >
                <div className={`w-12 h-12 ${bgColor} rounded-full mx-auto mb-2`} />
                <p className="font-semibold text-gray-900 text-sm whitespace-nowrap">
                  {member.name}
                </p>
                <p className={`text-sm ${netAmountColor(netAmount)} whitespace-nowrap`}>
                  {formatNetAmount(netAmount)}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 導覽列（固定） */}
      <div className="bg-white border-b border-gray-300">
        <div className="flex justify-around overflow-x-auto">
          <Link
            href={`/groups/${groupId}/members`}
            className={`flex-1 px-4 py-3 text-center border-b-2 transition text-sm sm:text-base ${
              pathname.includes("/members") && !pathname.includes("/members/[memberId]")
                ? "border-blue-500 text-blue-600 font-semibold"
                : "border-transparent text-gray-700 hover:border-blue-300"
            }`}
          >
            👥 成員
          </Link>
          <Link
            href={`/groups/${groupId}/expenses`}
            className={`flex-1 px-4 py-3 text-center border-b-2 transition text-sm sm:text-base ${
              pathname.includes("/expenses")
                ? "border-blue-500 text-blue-600 font-semibold"
                : "border-transparent text-gray-700 hover:border-blue-300"
            }`}
          >
            📝 交易
          </Link>
          <Link
            href={`/groups/${groupId}/settlements`}
            className={`flex-1 px-4 py-3 text-center border-b-2 transition text-sm sm:text-base ${
              pathname.includes("/settlements")
                ? "border-blue-500 text-blue-600 font-semibold"
                : "border-transparent text-gray-700 hover:border-blue-300"
            }`}
          >
            💵 結算
          </Link>
          <Link
            href={`/groups/${groupId}/activity`}
            className={`flex-1 px-4 py-3 text-center border-b-2 transition text-sm sm:text-base ${
              pathname.includes("/activity")
                ? "border-blue-500 text-blue-600 font-semibold"
                : "border-transparent text-gray-700 hover:border-blue-300"
            }`}
          >
            📋 活動
          </Link>
        </div>
      </div>

      {/* 下方：動態內容區域 */}
      <div className="p-4 sm:p-8">
        {children}
      </div>

      {/* FAB 浮動按鈕（手機專用） */}
      {isMobile && (
        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition flex items-center justify-center text-2xl z-50"
        >
          +
        </button>
      )}

      {/* 新增支出模態框 */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        groupId={groupId}
        members={members}
        onExpenseAdded={handleExpenseAdded}
      />
    </div>
  );
}
