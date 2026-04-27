"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Group {
  id: string;
  name: string;
}

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  useEffect(() => {
    // 重定向到成員頁面
    if (groupId) {
      router.push(`/groups/${groupId}/members`);
    }
  }, [groupId, router]);

  return null;
}
