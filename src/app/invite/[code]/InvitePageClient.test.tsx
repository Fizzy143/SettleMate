import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getClientIdentity: vi.fn(),
  createProvisionalIdentity: vi.fn(),
  persistClientIdentity: vi.fn(),
  apiFetch: vi.fn(),
  apiFetchAs: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/lib/clientIdentity", () => ({
  getClientIdentity: mocks.getClientIdentity,
  createProvisionalIdentity: mocks.createProvisionalIdentity,
  persistClientIdentity: mocks.persistClientIdentity,
  apiFetch: mocks.apiFetch,
  apiFetchAs: mocks.apiFetchAs,
}));

import InvitePageClient from "./InvitePageClient";

const anonymousPreview = {
  success: true,
  data: {
    group: {
      id: "group-1",
      name: "東京旅行",
      memberCount: 6,
      expenseCount: 28,
    },
    viewerState: "anonymous",
  },
};

function previewResponse(
  viewerState: "anonymous" | "eligible" | "member" = "anonymous"
) {
  return Response.json({
    ...anonymousPreview,
    data: { ...anonymousPreview.data, viewerState },
  });
}

function joinResponse() {
  return Response.json({
    success: true,
    data: {
      groupId: "group-1",
      groupName: "東京旅行",
      currentUserRole: "member",
      memberId: "member-1",
    },
  });
}

describe("InvitePageClient", () => {
  beforeEach(() => {
    mocks.getClientIdentity.mockReturnValue(null);
    mocks.createProvisionalIdentity.mockReturnValue({
      userId: "new-user",
      displayName: "Fizzy",
    });
    mocks.persistClientIdentity.mockImplementation((identity) => identity);
    mocks.apiFetchAs.mockResolvedValue(joinResponse());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(previewResponse()));
  });

  it("shows only loading content before preview resolves", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    render(<InvitePageClient code="TYO826" />);

    expect(screen.getByRole("status")).toHaveTextContent("載入邀請中...");
    expect(screen.queryByText("SettleMate")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows the one-time identity form for an anonymous viewer", async () => {
    render(<InvitePageClient code="TYO826" />);

    expect(await screen.findByText("建立你的身分")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(
      screen.getByRole("textbox", { name: "你的顯示名稱" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: "同時將我加入分帳成員名單",
      })
    ).toBeChecked();
  });

  it("disables anonymous join for a trimmed-empty name", async () => {
    const user = userEvent.setup();
    render(<InvitePageClient code="TYO826" />);
    const input = await screen.findByRole("textbox", {
      name: "你的顯示名稱",
    });

    await user.type(input, "   ");

    expect(
      screen.getByRole("button", { name: "加入『東京旅行』" })
    ).toBeDisabled();
  });

  it("omits memberName when an anonymous viewer opts out", async () => {
    const user = userEvent.setup();
    render(<InvitePageClient code="TYO826" />);
    await user.type(
      await screen.findByRole("textbox", { name: "你的顯示名稱" }),
      "Fizzy"
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "同時將我加入分帳成員名單",
      })
    );
    await user.click(
      screen.getByRole("button", { name: "加入『東京旅行』" })
    );

    await waitFor(() =>
      expect(mocks.apiFetchAs).toHaveBeenCalledWith(
        { userId: "new-user", displayName: "Fizzy" },
        "/api/groups/join",
        {
          method: "POST",
          body: JSON.stringify({
            inviteCode: "TYO826",
            createMember: false,
          }),
        }
      )
    );
  });

  it("shows and edits member identity for an eligible viewer", async () => {
    mocks.getClientIdentity.mockReturnValue({
      userId: "user-1",
      displayName: "Fizzy",
    });
    mocks.apiFetch
      .mockResolvedValueOnce(previewResponse("eligible"))
      .mockResolvedValueOnce(joinResponse());
    const user = userEvent.setup();

    render(<InvitePageClient code="TYO826" />);

    expect(await screen.findByText("以 Fizzy 加入")).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "成員顯示名稱" });
    expect(input).toHaveValue("Fizzy");
    await user.clear(input);
    await user.type(input, "Fizzy Jr");
    await user.click(
      screen.getByRole("button", { name: "加入『東京旅行』" })
    );

    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenLastCalledWith("/api/groups/join", {
        method: "POST",
        body: JSON.stringify({
          inviteCode: "TYO826",
          createMember: true,
          memberName: "Fizzy Jr",
        }),
      })
    );
  });

  it("hides eligible member name when creation is unchecked", async () => {
    mocks.getClientIdentity.mockReturnValue({
      userId: "user-1",
      displayName: "Fizzy",
    });
    mocks.apiFetch.mockResolvedValue(previewResponse("eligible"));
    const user = userEvent.setup();

    render(<InvitePageClient code="TYO826" />);
    await screen.findByText("以 Fizzy 加入");
    await user.click(
      screen.getByRole("checkbox", { name: "建立分帳成員" })
    );

    expect(
      screen.queryByRole("textbox", { name: "成員顯示名稱" })
    ).not.toBeInTheDocument();
  });

  it("shows a direct group link for an existing member without joining", async () => {
    mocks.getClientIdentity.mockReturnValue({
      userId: "user-1",
      displayName: "Fizzy",
    });
    mocks.apiFetch.mockResolvedValue(previewResponse("member"));

    render(<InvitePageClient code="TYO826" />);

    expect(
      await screen.findByText("你已經加入這個群組")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "前往『東京旅行』" })
    ).toHaveAttribute("href", "/groups/group-1/members");
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
    expect(mocks.apiFetchAs).not.toHaveBeenCalled();
  });

  it("shows an invalid invitation without a join form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          { success: false, error: "Invite not found" },
          { status: 404 }
        )
      )
    );

    render(<InvitePageClient code="MISSING" />);

    expect(await screen.findByText("邀請連結無效")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /加入/ })).not.toBeInTheDocument();
  });

  it("persists a provisional identity only after successful join", async () => {
    const user = userEvent.setup();
    render(<InvitePageClient code="TYO826" />);
    await user.type(
      await screen.findByRole("textbox", { name: "你的顯示名稱" }),
      "Fizzy"
    );
    await user.click(
      screen.getByRole("button", { name: "加入『東京旅行』" })
    );

    await waitFor(() => {
      expect(mocks.createProvisionalIdentity).toHaveBeenCalledWith("Fizzy");
      expect(mocks.apiFetchAs).toHaveBeenCalledWith(
        { userId: "new-user", displayName: "Fizzy" },
        "/api/groups/join",
        {
          method: "POST",
          body: JSON.stringify({
            inviteCode: "TYO826",
            createMember: true,
            memberName: "Fizzy",
          }),
        }
      );
      expect(mocks.persistClientIdentity).toHaveBeenCalledWith({
        userId: "new-user",
        displayName: "Fizzy",
      });
      expect(mocks.push).toHaveBeenCalledWith("/groups/group-1/members");
    });
  });

  it("keeps anonymous form state and does not persist after failure", async () => {
    mocks.apiFetchAs.mockResolvedValue(
      new Response("Service Unavailable", { status: 500 })
    );
    const user = userEvent.setup();
    render(<InvitePageClient code="TYO826" />);
    const input = await screen.findByRole("textbox", {
      name: "你的顯示名稱",
    });
    await user.type(input, "Fizzy");
    await user.click(
      screen.getByRole("button", { name: "加入『東京旅行』" })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "伺服器暫時無法回應，請稍後再試"
    );
    expect(input).toHaveValue("Fizzy");
    expect(
      screen.getByRole("checkbox", {
        name: "同時將我加入分帳成員名單",
      })
    ).toBeChecked();
    expect(mocks.persistClientIdentity).not.toHaveBeenCalled();
  });

  it("shows a retry control for a non-JSON Firewall 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Too Many Requests", { status: 429 }))
    );

    render(<InvitePageClient code="TYO826" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "請求過於頻繁，請稍後再試"
    );
    expect(
      screen.getByRole("button", { name: "再試一次" })
    ).toBeInTheDocument();
  });
});
