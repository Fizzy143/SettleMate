/**
 * 應用全局類型定義
 */

export type Group = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Member = {
  id: string;
  groupId: string;
  name: string;
  role?: string | null;
  color?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Expense = {
  id: string;
  groupId: string;
  date: Date;
  name: string;
  amount: number;
  paidById: string;
  kind: "expense" | "settlement";
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ExpenseParticipant = {
  id: string;
  expenseId: string;
  memberId: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
};

// API 響應類型
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// 分攤方式類型
export enum SplitType {
  EQUAL = "equal", // 平均分攤
  CUSTOM = "custom", // 自訂金額分攤
}
