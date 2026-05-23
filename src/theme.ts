import type { AppSettings, ThemeMode } from './types';

export const THEMES = {
  light: {
    background: '#f8fafc',
    card: '#ffffff',
    cardMuted: '#f1f5f9',
    text: '#0f172a',
    mutedText: '#64748b',
    subtleText: '#94a3b8',
    border: '#e2e8f0',
    gridBorder: '#eef2f7',
    primary: '#2563eb',
    primarySoft: '#dbeafe',
    primaryText: '#1d4ed8',
    danger: '#dc2626',
    dangerSoft: '#fee2e2',
    sticky: '#fef08a',
    stickyStrong: '#facc15',
    stickyText: '#713f12',
    overlay: 'rgba(15, 23, 42, 0.38)',
    shadow: '#0f172a',
  },
  dark: {
    background: '#020617',
    card: '#111827',
    cardMuted: '#1f2937',
    text: '#f8fafc',
    mutedText: '#cbd5e1',
    subtleText: '#94a3b8',
    border: '#334155',
    gridBorder: '#1e293b',
    primary: '#60a5fa',
    primarySoft: '#1e3a8a',
    primaryText: '#bfdbfe',
    danger: '#f87171',
    dangerSoft: '#7f1d1d',
    sticky: '#fde68a',
    stickyStrong: '#f59e0b',
    stickyText: '#451a03',
    overlay: 'rgba(2, 6, 23, 0.7)',
    shadow: '#000000',
  },
};

export type ThemeColors = (typeof THEMES)[ThemeMode];

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'light',
};
