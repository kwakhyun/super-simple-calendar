import type { CalendarDay, MemosByDate } from '../types';
import { toDateKey } from './date';

export const SWIPE_THRESHOLD = 70;

export const getCalendarDays = (
  visibleMonth: Date,
  memos: MemosByDate,
): CalendarDay[] => {
  const todayKey = toDateKey(new Date());
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDate = new Date(year, month, 1 - firstDayOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    const key = toDateKey(date);

    return {
      key,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: key === todayKey,
      memos: memos[key] ?? [],
    };
  });
};
