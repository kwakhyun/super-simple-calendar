import { LOCALES } from '../i18n/translations';
import type { Language } from '../types';

export const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getDateFromKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const getMonthTitle = (date: Date, language: Language) =>
  new Intl.DateTimeFormat(LOCALES[language], {
    year: 'numeric',
    month: 'long',
  }).format(date);

export const getSelectedDateTitle = (dateKey: string, language: Language) =>
  new Intl.DateTimeFormat(LOCALES[language], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(getDateFromKey(dateKey));

export const getCurrentMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};
