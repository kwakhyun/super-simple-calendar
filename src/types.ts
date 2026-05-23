export type Language = 'en' | 'ko';

export type ThemeMode = 'light' | 'dark';

export type AppSettings = {
  language: Language;
  theme: ThemeMode;
};

export type AuthMode = 'signIn' | 'signUp';

export type Memo = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type MemosByDate = Record<string, Memo[]>;

export type CalendarDay = {
  key: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  memos: Memo[];
};

export type Translation = {
  settings: string;
  language: string;
  theme: string;
  light: string;
  dark: string;
  close: string;
  noMemos: string;
  addMemo: string;
  edit: string;
  delete: string;
  cancel: string;
  save: string;
  update: string;
  memoPlaceholder: string;
  memoHelp: string;
  memoListTitle: string;
  newMemoTitle: string;
  editMemoTitle: string;
  memoCount: (count: number) => string;
  loadMemoError: (message: string) => string;
  loadSettingsError: (message: string) => string;
  saveMemoError: (message: string) => string;
  saveSettingsError: (message: string) => string;
  account: string;
  accountHelp: string;
  openAuthPage: string;
  signIn: string;
  signUp: string;
  signOut: string;
  email: string;
  password: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  signedInAs: (email: string) => string;
  authFillAllFields: string;
  authInvalidEmail: string;
  authPasswordTooShort: string;
  authAccountExists: string;
  authInvalidCredentials: string;
  saveAccountError: (message: string) => string;
  verifyEmailTitle: string;
  verifyEmailHelp: (email: string) => string;
  verificationCodePlaceholder: string;
  verifyButton: string;
  resendCode: string;
  codeResent: string;
  continueWith: string;
  googleLogin: string;
  appleLogin: string;
  kakaoLogin: string;
  socialUnavailable: string;
};
