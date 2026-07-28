export function normalizeInviteCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}


export function buildInviteUrl(inviteCode: string, origin: string): string {
  return new URL(
    "/invite/" + encodeURIComponent(normalizeInviteCode(inviteCode)),
    origin
  ).toString();
}

export type CopyInviteUrlInput = {
  inviteCode: string;
  origin: string;
  writeText?: (value: string) => Promise<void>;
  fallbackPrompt: (title: string, value: string) => void;
};

export async function copyInviteUrl({
  inviteCode,
  origin,
  writeText,
  fallbackPrompt,
}: CopyInviteUrlInput): Promise<"clipboard" | "fallback"> {
  const url = buildInviteUrl(inviteCode, origin);
  try {
    if (!writeText) throw new Error("Clipboard API unavailable");
    await writeText(url);
    return "clipboard";
  } catch {
    fallbackPrompt("複製邀請連結", url);
    return "fallback";
  }
}
