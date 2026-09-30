import "server-only";

import { eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { categories, gameCategories, games } = schema;

export const CATEGORY_NAME_MAX = 20;

export class CategoryError extends Error {}

export function createCategory(rawName: string) {
  const name = rawName.trim();
  if (!name) throw new CategoryError("分类名称不能为空");
  if (name.length > CATEGORY_NAME_MAX) throw new CategoryError(`分类名称最多 ${CATEGORY_NAME_MAX} 个字`);

  const db = getDb();
  const existing = db
    .select({ id: categories.id })
    .from(categories)
    .where(sql`lower(${categories.name}) = lower(${name})`)
    .get();
  if (existing) throw new CategoryError(`分类「${name}」已存在`);

  return db.insert(categories).values({ name, createdAt: new Date() }).returning().get();
}

export function deleteCategory(id: number): boolean {
  return getDb().delete(categories).where(eq(categories.id, id)).run().changes > 0;
}

/** Replaces the full set of categories assigned to a game. Unknown category ids are ignored. */
export function setGameCategories(gameId: number, categoryIds: number[]): number[] {
  const db = getDb();
  return db.transaction((tx) => {
    const game = tx.select({ id: games.id }).from(games).where(eq(games.id, gameId)).get();
    if (!game) throw new CategoryError("游戏不存在");

    const valid =
      categoryIds.length > 0
        ? tx
            .select({ id: categories.id })
            .from(categories)
            .where(inArray(categories.id, categoryIds))
            .all()
            .map((c) => c.id)
        : [];

    tx.delete(gameCategories).where(eq(gameCategories.gameId, gameId)).run();
    if (valid.length > 0) {
      tx.insert(gameCategories)
        .values(valid.map((categoryId) => ({ gameId, categoryId })))
        .run();
    }
    return valid;
  });
}
