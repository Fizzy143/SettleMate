import type { ApiResponse } from "@/types";

export async function readApiResponse<T>(
  response: Response
): Promise<ApiResponse<T>> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return {
      success: false,
      error:
        response.status === 429
          ? "請求過於頻繁，請稍後再試"
          : "伺服器暫時無法回應，請稍後再試",
    };
  }
}
