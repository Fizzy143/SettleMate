import { NextRequest, NextResponse } from "next/server";
import { normalizeInviteCode } from "@/lib/invite";
import { JoinGroupError, joinGroup } from "@/lib/joinGroup";
import { getUserId, getValidatedDisplayName } from "@/lib/serverIdentity";
import { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "User identity is required" },
      { status: 401 }
    );
  }

  const displayName = getValidatedDisplayName(request);
  if (!displayName) {
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Valid display name is required" },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const inviteCode = normalizeInviteCode(body.inviteCode);
  if (!inviteCode) {
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Invite code is required" },
      { status: 400 }
    );
  }
  if (typeof body.createMember !== "boolean") {
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "createMember must be a boolean" },
      { status: 400 }
    );
  }

  try {
    const result = await joinGroup({
      inviteCode,
      userId,
      displayName,
      createMember: body.createMember,
      memberName: body.memberName,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof JoinGroupError) {
      const status = error.code === "INVITE_NOT_FOUND" ? 404 : 400;
      const message =
        error.code === "INVITE_NOT_FOUND"
          ? "Invite code not found"
          : "Member name must be between 1 and 50 characters";
      return NextResponse.json<ApiResponse<unknown>>(
        { success: false, error: message },
        { status }
      );
    }

    console.error("Error joining group:", error);
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "Failed to join group" },
      { status: 500 }
    );
  }
}
