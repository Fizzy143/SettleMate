/**
 * 結算計算邏輯
 * 用於計算每個成員的應收應付情況
 */

export interface MemberTotal {
  memberId: string;
  paidTotal: number; // 總代墊金額
  owedTotal: number; // 總應負擔金額
  netAmount: number; // 淨額（正數表示應收，負數表示應付）
}

export interface Settlement {
  from: string; // 付款人 ID
  to: string; // 收款人 ID
  amount: number; // 金額（保留小數後 2 位）
}

/**
 * 計算每個成員的應收應付情況
 */
export function calculateMemberTotals(
  expenses: Array<{
    paidById: string;
    participants: Array<{
      memberId: string;
      amount: number;
    }>;
  }>,
  allMemberIds: string[]
): Map<string, MemberTotal> {
  const totals = new Map<string, MemberTotal>();

  // 初始化所有成員
  allMemberIds.forEach((memberId) => {
    totals.set(memberId, {
      memberId,
      paidTotal: 0,
      owedTotal: 0,
      netAmount: 0,
    });
  });

  // 計算代墊和應負擔
  expenses.forEach((expense) => {
    // 計算代墊金額
    const paidTotal = totals.get(expense.paidById);
    if (paidTotal) {
      const totalAmount = expense.participants.reduce((sum, p) => sum + p.amount, 0);
      paidTotal.paidTotal += totalAmount;
    }

    // 計算應負擔金額
    expense.participants.forEach((participant) => {
      const memberTotal = totals.get(participant.memberId);
      if (memberTotal) {
        memberTotal.owedTotal += participant.amount;
      }
    });
  });

  // 計算淨額
  totals.forEach((total) => {
    total.netAmount = round(total.paidTotal - total.owedTotal, 2);
  });

  return totals;
}

/**
 * 計算最少轉賬次數的結算方案
 * 基於貪心演算法
 */
export function calculateSettlements(
  memberTotals: Map<string, MemberTotal>
): Settlement[] {
  const settlements: Settlement[] = [];

  // 分離應收和應付的成員
  const debtors: Array<{ memberId: string; amount: number }> = [];
  const creditors: Array<{ memberId: string; amount: number }> = [];

  memberTotals.forEach((total) => {
    if (total.netAmount > 0.01) {
      // 應收
      creditors.push({ memberId: total.memberId, amount: round(total.netAmount, 2) });
    } else if (total.netAmount < -0.01) {
      // 應付
      debtors.push({ memberId: total.memberId, amount: round(-total.netAmount, 2) });
    }
  });

  // 貪心配對
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];

    const amount = Math.min(debtor.amount, creditor.amount);
    settlements.push({
      from: debtor.memberId,
      to: creditor.memberId,
      amount: round(amount, 2),
    });

    debtor.amount = round(debtor.amount - amount, 2);
    creditor.amount = round(creditor.amount - amount, 2);

    if (debtor.amount < 0.01) debtors.shift();
    if (creditor.amount < 0.01) creditors.shift();
  }

  return settlements;
}

/**
 * 四捨五入到指定小數位
 */
export function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
