import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  apiFetch: vi.fn(),
  getClientIdentity: vi.fn(),
  saveClientIdentity: vi.fn(),
  clearClientIdentity: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/lib/clientIdentity", () => ({
  apiFetch: mocks.apiFetch,
  getClientIdentity: mocks.getClientIdentity,
  saveClientIdentity: mocks.saveClientIdentity,
  clearClientIdentity: mocks.clearClientIdentity,
}));

import Home from "./page";

describe("Home invite entry", () => {
  beforeEach(() => {
    mocks.getClientIdentity.mockReturnValue({
      userId: "user-1",
      displayName: "Fizzy",
    });
    mocks.apiFetch.mockResolvedValue(
      Response.json({ success: true, data: [] })
    );
  });

  it("routes a normalized manual invite code to the invite page", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const input = await screen.findByPlaceholderText("輸入 6 碼邀請碼");

    await user.type(input, " tyo826 ");
    await user.click(screen.getByRole("button", { name: /加入群組/ }));

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/invite/TYO826")
    );
    expect(mocks.apiFetch).not.toHaveBeenCalledWith(
      "/api/groups/join",
      expect.anything()
    );
  });
});
