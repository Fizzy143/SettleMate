export const MAX_AMOUNT = 1_000_000;

export const AMOUNT_LIMIT_MESSAGE = "金額必須大於 0，且不可超過 NT$ 1,000,000。";
export const PARTICIPANT_AMOUNT_LIMIT_MESSAGE =
  "分攤金額不可為負數，且不可超過 NT$ 1,000,000。";

export function validateAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) {
    return AMOUNT_LIMIT_MESSAGE;
  }
  return null;
}

export function validateParticipantAmount(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > MAX_AMOUNT) {
    return PARTICIPANT_AMOUNT_LIMIT_MESSAGE;
  }
  return null;
}
