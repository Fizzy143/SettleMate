export type InviteViewerState = "anonymous" | "eligible" | "member";

export type InvitePreview = {
  group: {
    id: string;
    name: string;
    memberCount: number;
    expenseCount: number;
  };
  viewerState: InviteViewerState;
};

export type JoinGroupBody = {
  inviteCode: string;
  createMember: boolean;
  memberName?: string;
};

export type JoinGroupResult = {
  groupId: string;
  groupName: string;
  currentUserRole: string;
  memberId: string | null;
};
