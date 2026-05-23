import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { NativeModules } from 'react-native';

import { DEFAULT_SETTINGS } from '../theme';
import type { AppSettings, Memo, MemosByDate } from '../types';
import { toDateKey } from '../utils/date';
import { normalizeMemos } from '../utils/memos';

const DATABASE_NAME = 'simple-calendar.db';
const MEMO_STORAGE_KEY = 'super-simple-calendar:memos';
const SETTINGS_STORAGE_KEY = 'super-simple-calendar:settings';
const MIGRATION_STORAGE_KEY = 'super-simple-calendar:sqlite-migrated';

type MemoRow = {
  id: string;
  date_key: string;
  text: string;
  created_at: string;
  updated_at: string;
};

type SettingRow = {
  key: string;
  value: string;
};


type CalendarWidgetBridge = {
  saveSummary?: (summary: string, dateKey: string, memoCount: number) => void;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const getDatabase = async () => {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME);
  const database = await databasePromise;

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS memos (
      id TEXT PRIMARY KEY NOT NULL,
      date_key TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_memos_date_key ON memos(date_key);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS widget_summary (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      date_key TEXT NOT NULL,
      summary TEXT NOT NULL,
      memo_count INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return database;
};

const rowsToMemos = (rows: MemoRow[]): MemosByDate =>
  rows.reduce<MemosByDate>((groupedMemos, row) => {
    const memo: Memo = {
      id: row.id,
      text: row.text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    groupedMemos[row.date_key] = [...(groupedMemos[row.date_key] ?? []), memo];
    return groupedMemos;
  }, {});

const flattenMemos = (memos: MemosByDate) =>
  Object.entries(memos).flatMap(([dateKey, dateMemos]) =>
    dateMemos.map((memo) => ({ dateKey, memo })),
  );

const saveWidgetSummary = async (
  database: SQLite.SQLiteDatabase,
  memos: MemosByDate,
) => {
  const todayKey = toDateKey(new Date());
  const todayMemos = memos[todayKey] ?? [];
  const summary = todayMemos.map((memo) => memo.text).join('\n');

  await database.runAsync(
    `
    INSERT OR REPLACE INTO widget_summary (
      id,
      date_key,
      summary,
      memo_count,
      updated_at
    ) VALUES (1, ?, ?, ?, ?);
    `,
    todayKey,
    summary,
    todayMemos.length,
    new Date().toISOString(),
  );

  const bridge = NativeModules.CalendarWidgetBridge as CalendarWidgetBridge | undefined;
  bridge?.saveSummary?.(summary, todayKey, todayMemos.length);
};

const migrateLegacyStorageIfNeeded = async (database: SQLite.SQLiteDatabase) => {
  const hasMigrated = await AsyncStorage.getItem(MIGRATION_STORAGE_KEY);

  if (hasMigrated) {
    return;
  }

  const [storedMemos, storedSettings] = await Promise.all([
    AsyncStorage.getItem(MEMO_STORAGE_KEY),
    AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
  ]);

  if (storedMemos) {
    const legacyMemos = normalizeMemos(JSON.parse(storedMemos));
    await saveMemosToDatabase(database, legacyMemos);
  }

  if (storedSettings) {
    const legacySettings = {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(storedSettings),
    } as AppSettings;

    await saveSettingsToDatabase(database, legacySettings);
  }

  await AsyncStorage.setItem(MIGRATION_STORAGE_KEY, 'true');
};

const saveMemosToDatabase = async (
  database: SQLite.SQLiteDatabase,
  memos: MemosByDate,
) => {
  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM memos;');

    for (const { dateKey, memo } of flattenMemos(memos)) {
      await database.runAsync(
        `
        INSERT INTO memos (
          id,
          date_key,
          text,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?);
        `,
        memo.id,
        dateKey,
        memo.text,
        memo.createdAt,
        memo.updatedAt,
      );
    }

    await saveWidgetSummary(database, memos);
  });
};

const saveSettingsToDatabase = async (
  database: SQLite.SQLiteDatabase,
  settings: AppSettings,
) => {
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);',
      'language',
      settings.language,
    );
    await database.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);',
      'theme',
      settings.theme,
    );
  });
};

export const loadStoredData = async () => {
  const database = await getDatabase();

  await migrateLegacyStorageIfNeeded(database);

  const [memoRows, settingRows] = await Promise.all([
    database.getAllAsync<MemoRow>(
      'SELECT * FROM memos ORDER BY date_key ASC, created_at ASC;',
    ),
    database.getAllAsync<SettingRow>('SELECT key, value FROM settings;'),
  ]);

  const settings = settingRows.reduce<AppSettings>(
    (nextSettings, row) => ({
      ...nextSettings,
      [row.key]: row.value,
    }),
    DEFAULT_SETTINGS,
  );

  return {
    memos: rowsToMemos(memoRows),
    settings,
  };
};

export const saveStoredMemos = async (memos: MemosByDate) => {
  const database = await getDatabase();
  await saveMemosToDatabase(database, memos);
};

export const saveStoredSettings = async (settings: AppSettings) => {
  const database = await getDatabase();
  await saveSettingsToDatabase(database, settings);
};

export const clearStoredData = async () => {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM memos;');
    await database.runAsync('DELETE FROM settings;');
    await database.runAsync('DELETE FROM widget_summary;');
  });

  await AsyncStorage.multiRemove([
    MEMO_STORAGE_KEY,
    SETTINGS_STORAGE_KEY,
    MIGRATION_STORAGE_KEY,
  ]);

  const bridge = NativeModules.CalendarWidgetBridge as CalendarWidgetBridge | undefined;
  bridge?.saveSummary?.('', toDateKey(new Date()), 0);
};
