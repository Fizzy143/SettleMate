import InvitePageClient from "./InvitePageClient";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <InvitePageClient code={code} />;
}
