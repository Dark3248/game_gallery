"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type CategoryOption = { id: number; name: string };

export function CategoryPicker({
  gameId,
  categories,
  selectedIds,
  children,
}: {
  gameId: number;
  categories: CategoryOption[];
  selectedIds: number[];
  /** The trigger element; rendered with `asChild`. */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(selectedIds);
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(false);
  // Each save sends the full selection, so saves must run in order for the last one to win.
  const queue = useRef<Promise<void>>(Promise.resolve());

  const selectedKey = selectedIds.join(",");
  useEffect(() => {
    setSelected(selectedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- compare by value, not array identity
  }, [selectedKey]);

  function toggle(id: number) {
    const previous = selected;
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    setError(null);
    dirty.current = true;
    queue.current = queue.current.then(async () => {
      const res = await fetch(`/api/games/${gameId}/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: next }),
      }).catch(() => null);
      if (!res?.ok) {
        setSelected(previous);
        setError("保存失败，请重试");
      }
    });
  }

  // Refresh only once the popover closes: refreshing mid-edit could re-filter the
  // library and unmount this card while the user is still picking.
  function onOpenChange(open: boolean) {
    if (open || !dirty.current) return;
    dirty.current = false;
    queue.current.then(() => router.refresh());
  }

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        {categories.length === 0 ? (
          <p className="p-2 text-muted-foreground">还没有分类，可在游戏库顶部的「管理分类」中添加。</p>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {categories.map((c) => {
              const checked = selected.includes(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggle(c.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border border-input",
                        checked && "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {checked && <Check className="size-3" />}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {error && <p className="px-2 pb-1 text-xs text-destructive">{error}</p>}
      </PopoverContent>
    </Popover>
  );
}
