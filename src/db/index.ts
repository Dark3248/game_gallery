import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export function resolveDataDir(): string {
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);
  if (process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, "GameGallery");
  }
  return path.join(process.cwd(), "data");
}

export function resolveDbPath(): string {
  return path.join(resolveDataDir(), "library.db");
}

type Db = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __gameGalleryDb?: Db };

function open(): Db {
  const dir = resolveDataDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  const sqlite = new Database(resolveDbPath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return drizzle(sqlite, { schema });
}

export function getDb(): Db {
  globalForDb.__gameGalleryDb ??= open();
  return globalForDb.__gameGalleryDb;
}

export function migrateDb() {
  migrate(getDb(), { migrationsFolder: path.join(process.cwd(), "drizzle") });
}

export { schema };
