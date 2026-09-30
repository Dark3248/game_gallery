"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tags, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type CategorySummary = { id: number; name: string; gameCount: number };

export function CategoryManager({
  categories,
  onDeleted,
}: {
  categories: CategorySummary[];
  onDeleted?: (id: number) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `添加失败（HTTP ${res.status}）`);
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove(category: CategorySummary) {
    const message =
      category.gameCount > 0
        ? `删除分类「${category.name}」？其中 ${category.gameCount} 款游戏会移出该分类，游戏本身不受影响。`
        : `删除分类「${category.name}」？`;
    if (!confirm(message)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        setError(`删除失败（HTTP ${res.status}）`);
        return;
      }
      onDeleted?.(category.id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Popover onOpenChange={(open) => !open && setError(null)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Tags />
          管理分类
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="space-y-3">
        <p className="font-medium">分类</p>
        {categories.length === 0 ? (
          <p className="text-muted-foreground">还没有分类</p>
        ) : (
          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-md py-0.5 pr-0.5 pl-2 hover:bg-muted/60"
              >
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{c.gameCount}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`删除分类 ${c.name}`}
                  disabled={pending}
                  onClick={() => remove(c)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="新分类名称"
            maxLength={20}
            className="h-7"
          />
          <Button type="submit" size="sm" disabled={pending || name.trim().length === 0}>
            <Plus />
            添加
          </Button>
        </form>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </PopoverContent>
    </Popover>
  );
}
