"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  apiFetchAs,
  createProvisionalIdentity,
  getClientIdentity,
  persistClientIdentity,
  type ClientIdentity,
} from "@/lib/clientIdentity";
import { readApiResponse } from "@/lib/apiResponse";
import type { InvitePreview, JoinGroupResult } from "@/types/invite";

type ViewStatus = "loading" | "ready" | "invalid" | "error";

function validName(value: string) {
  const length = value.trim().length;
  return length >= 1 && length <= 50;
}

export default function InvitePageClient({ code }: { code: string }) {
  const router = useRouter();
  const [identity, setIdentity] = useState<ClientIdentity | null>(null);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [status, setStatus] = useState<ViewStatus>("loading");
  const [displayName, setDisplayName] = useState("");
  const [createMember, setCreateMember] = useState(true);
  const [memberName, setMemberName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadPreview = useCallback(async (currentIdentity: ClientIdentity | null) => {
    setStatus("loading");
    setError("");

    try {
      const path = `/api/invites/${encodeURIComponent(code)}`;
      const response = currentIdentity
        ? await apiFetch(path)
        : await fetch(path);
      const result = await readApiResponse<InvitePreview>(response);

      if (response.status === 404) {
        setPreview(null);
        setStatus("invalid");
        return;
      }
      if (!result.success || !result.data) {
        setPreview(null);
        setError(result.error || "無法載入邀請");
        setStatus("error");
        return;
      }

      setPreview(result.data);
      setStatus("ready");
    } catch (loadError) {
      console.error("Failed to load invite:", loadError);
      setPreview(null);
      setError("伺服器暫時無法回應，請稍後再試");
      setStatus("error");
    }
  }, [code]);

  useEffect(() => {
    const savedIdentity = getClientIdentity();
    setIdentity(savedIdentity);
    if (savedIdentity) {
      setMemberName(savedIdentity.displayName);
    }
    void loadPreview(savedIdentity);
  }, [loadPreview]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview || preview.viewerState === "member") return;

    const isAnonymous = !identity;
    const trimmedDisplayName = displayName.trim();
    if (isAnonymous && !validName(trimmedDisplayName)) return;
    if (!isAnonymous && createMember && !validName(memberName)) return;

    const provisionalIdentity = isAnonymous
      ? createProvisionalIdentity(trimmedDisplayName)
      : null;
    const requestIdentity = provisionalIdentity || identity;
    if (!requestIdentity) return;

    const body = {
      inviteCode: code,
      createMember,
      ...(createMember
        ? {
            memberName: isAnonymous ? trimmedDisplayName : memberName.trim(),
          }
        : {}),
    };

    setIsSubmitting(true);
    setError("");
    try {
      const response = provisionalIdentity
        ? await apiFetchAs(provisionalIdentity, "/api/groups/join", {
            method: "POST",
            body: JSON.stringify(body),
          })
        : await apiFetch("/api/groups/join", {
            method: "POST",
            body: JSON.stringify(body),
          });
      const result = await readApiResponse<JoinGroupResult>(response);

      if (!result.success || !result.data) {
        setError(result.error || "加入群組失敗");
        return;
      }

      if (provisionalIdentity) {
        persistClientIdentity(provisionalIdentity);
      }
      router.push(`/groups/${result.data.groupId}/members`);
    } catch (submitError) {
      console.error("Failed to join group:", submitError);
      setError("伺服器暫時無法回應，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 px-4 text-slate-950">
        <p role="status">載入邀請中...</p>
      </main>
    );
  }

  if (status === "invalid") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 px-4 text-slate-950">
        <section className="rounded-2xl bg-white p-6 text-center shadow-lg">
          <h1 className="text-xl font-bold">邀請連結無效</h1>
          <p className="mt-2 text-sm text-slate-600">
            邀請碼不存在，或群組已被刪除
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
          >
            回到首頁
          </Link>
        </section>
      </main>
    );
  }

  if (status === "error" && !preview) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 px-4 text-slate-950">
        <section className="rounded-2xl bg-white p-6 text-center shadow-lg">
          <p role="alert" className="text-sm font-medium text-rose-700">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void loadPreview(identity)}
            className="mt-5 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
          >
            再試一次
          </button>
        </section>
      </main>
    );
  }

  if (!preview) return null;

  const group = preview.group;
  const joinDisabled =
    isSubmitting ||
    (!identity ? !validName(displayName) : createMember && !validName(memberName));

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-xl overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-xl">
        <section className="bg-slate-950 px-6 py-8 text-white sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500 text-lg font-black text-white">
              S
            </span>
            <p className="text-lg font-bold text-white">SettleMate</p>
          </div>
          <p className="mt-8 text-sm font-semibold text-sky-300">預覽群組</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
            {group.name}
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            朋友邀請你加入這個分帳群組
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <p className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-200">
              <strong className="mr-1.5 text-base text-white">
                {group.memberCount}
              </strong>
              目前分帳成員
            </p>
            <p className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-200">
              <strong className="mr-1.5 text-base text-white">
                {group.expenseCount}
              </strong>
              已記錄支出
            </p>
          </div>
        </section>

        <section className="bg-slate-50 px-6 py-6 text-slate-950 sm:px-8">
          {preview.viewerState === "member" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-bold text-slate-950">
                你已經加入這個群組
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                不會重複建立群組資格或分帳成員
              </p>
              <Link
                href={`/groups/${group.id}/members`}
                className="mt-6 flex w-full justify-center rounded-xl bg-slate-950 px-5 py-3.5 font-bold text-white"
              >
                前往『{group.name}』
              </Link>
              <Link
                href="/"
                className="mt-3 flex justify-center py-2 text-sm font-medium text-slate-500"
              >
                回到首頁
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                {!identity ? (
                  <>
                    <h2 className="text-xl font-bold text-slate-950">
                      建立你的身分
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      第一次使用 SettleMate
                    </p>
                    <label className="mt-5 block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">
                        你的顯示名稱
                      </span>
                      <input
                        value={displayName}
                        maxLength={50}
                        onChange={(event) => {
                          setDisplayName(event.target.value);
                          setError("");
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        autoComplete="nickname"
                      />
                    </label>
                    <p className="mt-2 text-xs text-slate-500">
                      這個名稱會儲存在目前裝置上
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-sky-500 text-lg font-bold text-white">
                      {identity.displayName.slice(0, 1)}
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-slate-950">
                        以 {identity.displayName} 加入
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        這是你目前的裝置身分
                      </p>
                    </div>
                  </div>
                )}

                <div className="my-5 h-px bg-slate-200" />

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={
                      identity
                        ? "建立分帳成員"
                        : "同時將我加入分帳成員名單"
                    }
                    checked={createMember}
                    onChange={(event) => {
                      setCreateMember(event.target.checked);
                      setError("");
                    }}
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-sky-500"
                  />
                  <span>
                    <span className="block font-semibold text-slate-950">
                      {identity
                        ? "建立分帳成員"
                        : "同時將我加入分帳成員名單"}
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      {identity
                        ? "名稱可在加入前修改"
                        : "使用相同名稱；加入群組後可修改暱稱"}
                    </span>
                  </span>
                </label>

                {identity && createMember && (
                  <label className="mt-5 block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      成員顯示名稱
                    </span>
                    <input
                      value={memberName}
                      maxLength={50}
                      onChange={(event) => {
                        setMemberName(event.target.value);
                        setError("");
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      autoComplete="nickname"
                    />
                  </label>
                )}
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={joinDisabled}
                className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-4 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                {isSubmitting
                  ? "加入中..."
                  : error
                    ? "再試一次"
                    : `加入『${group.name}』`}
              </button>
              <Link
                href="/"
                className="mt-3 flex justify-center py-2 text-sm font-medium text-slate-500"
              >
                取消
              </Link>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
