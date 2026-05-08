import { NextRequest } from "next/server";
import { prisma } from "./db";

export const USER_ID_HEADER = "x-settlemate-user-id";
export const USER_NAME_HEADER = "x-settlemate-display-name";

export function getUserId(request: NextRequest): string | null {
  return request.headers.get(USER_ID_HEADER);
}

export function getDisplayName(request: NextRequest): string {
  const value = request.headers.get(USER_NAME_HEADER)?.trim();
  if (!value) return "Guest";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function ensureUser(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return null;

  return prisma.user.upsert({
    where: { id: userId },
    update: { displayName: getDisplayName(request) },
    create: { id: userId, displayName: getDisplayName(request) },
  });
}

export async function canAccessGroup(userId: string | null, groupId: string) {
  if (!userId) return false;
  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { id: true },
  });
  return Boolean(membership);
}

export async function getGroupRole(userId: string | null, groupId: string) {
  if (!userId) return null;
  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { role: true },
  });
  return membership?.role || null;
}

export async function isGroupOwner(userId: string | null, groupId: string) {
  return (await getGroupRole(userId, groupId)) === "owner";
}

export function createInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
