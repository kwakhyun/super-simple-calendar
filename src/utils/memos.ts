import type { Memo, MemosByDate } from '../types';

export const createMemo = (text: string): Memo => {
  const now = new Date().toISOString();

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    text,
    createdAt: now,
    updatedAt: now,
  };
};

const isMemo = (value: unknown): value is Memo => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const memo = value as Record<string, unknown>;

  return (
    typeof memo.id === 'string' &&
    typeof memo.text === 'string' &&
    typeof memo.createdAt === 'string' &&
    typeof memo.updatedAt === 'string'
  );
};

export const normalizeMemos = (value: unknown): MemosByDate => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<MemosByDate>(
    (normalizedMemos, [dateKey, dateMemos]) => {
      if (typeof dateMemos === 'string' && dateMemos.trim()) {
        normalizedMemos[dateKey] = [createMemo(dateMemos.trim())];
        return normalizedMemos;
      }

      if (Array.isArray(dateMemos)) {
        const validMemos = dateMemos.filter(isMemo);

        if (validMemos.length > 0) {
          normalizedMemos[dateKey] = validMemos;
        }
      }

      return normalizedMemos;
    },
    {},
  );
};
