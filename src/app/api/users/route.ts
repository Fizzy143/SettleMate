import { NextRequest, NextResponse } from "next/server";
import { ensureUser } from "@/lib/serverIdentity";
import { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  const user = await ensureUser(request);
  if (!user) {
    return NextResponse.json<ApiResponse<unknown>>(
      { success: false, error: "User identity is required" },
      { status: 401 }
    );
  }

  return NextResponse.json<ApiResponse<unknown>>({
    success: true,
    data: user,
  });
}
