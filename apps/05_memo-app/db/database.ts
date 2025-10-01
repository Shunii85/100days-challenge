import * as SQLite from "expo-sqlite";

// Memoの型定義 (変更なし)
export interface Memo {
  id: number;
  title: string;
  content: string | null;
  updatedAt: string;
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync("memo.db");
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS memos (
      id INTEGER PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      updatedAt TEXT NOT NULL
    );
  `);
  return db;
}

const dbPromise = initializeDatabase();

export const fetchMemos = async (): Promise<Memo[]> => {
  const db = await dbPromise;
  // ジェネリクスで返り値の型を指定できる
  return await db.getAllAsync<Memo>(
    "SELECT * FROM memos ORDER BY updatedAt DESC;"
  );
};

export const addMemo = async (
  title: string,
  content: string,
  updatedAt: string
): Promise<SQLite.SQLiteRunResult> => {
  const db = await dbPromise;
  return await db.runAsync(
    "INSERT INTO memos (title, content, updatedAt) VALUES (?, ?, ?);",
    title,
    content,
    updatedAt
  );
};

export const updateMemo = async (
  id: number,
  title: string,
  content: string,
  updatedAt: string
): Promise<SQLite.SQLiteRunResult> => {
  const db = await dbPromise;
  return await db.runAsync(
    "UPDATE memos SET title = ?, content = ?, updatedAt = ? WHERE id = ?;",
    title,
    content,
    updatedAt,
    id
  );
};

export const deleteMemo = async (
  id: number
): Promise<SQLite.SQLiteRunResult> => {
  const db = await dbPromise;
  return await db.runAsync("DELETE FROM memos WHERE id = ?;", id);
};
