"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Search } from "lucide-react";
import { CategoryManager, type CategorySummary } from "@/components/library/category-manager";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const SORT_LABELS = {
  playtime: "游玩时长",
  recent: "最近游玩",
  completion: "成就完成度",
  name: "名称",
} as const;

export function LibraryControls({
  categories,
  uncategorizedCount,
}: {
  categories: CategorySummary[];
  uncategorizedCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const lastPushedQuery = useRef(query);

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if ("q" in changes) lastPushedQuery.current = changes.q ?? "";
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // Only adopt the URL's query when it was changed from outside (e.g. the nav link),
  // not when it is our own debounced update catching up with what the user typed.
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    if (urlQuery !== lastPushedQuery.current) {
      lastPushedQuery.current = urlQuery;
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    if (query === (params.get("q") ?? "")) return;
    const timer = setTimeout(() => update({ q: query.trim() || null }), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [query]);

  const category = params.get("category") ?? "all";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索游戏"
            className="pl-8"
          />
        </div>

        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={params.get("platform") ?? "all"}
          onValueChange={(v) => v && update({ platform: v === "all" ? null : v })}
        >
          <ToggleGroupItem value="all">全部</ToggleGroupItem>
          <ToggleGroupItem value="steam">Steam</ToggleGroupItem>
          <ToggleGroupItem value="epic">Epic</ToggleGroupItem>
        </ToggleGroup>

        <Select
          value={params.get("sort") ?? "playtime"}
          onValueChange={(v) => update({ sort: v === "playtime" ? null : v })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                按{label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          className="ml-auto"
          value={params.get("view") ?? "grid"}
          onValueChange={(v) => v && update({ view: v === "grid" ? null : v })}
        >
          <ToggleGroupItem value="grid" aria-label="网格视图">
            <LayoutGrid />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="列表视图">
            <List />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={1.5}
          className="flex-wrap"
          value={category}
          onValueChange={(v) => v && update({ category: v === "all" ? null : v })}
        >
          <ToggleGroupItem value="all">全部分类</ToggleGroupItem>
          {categories.map((c) => (
            <ToggleGroupItem key={c.id} value={String(c.id)}>
              {c.name}
              <span className="text-muted-foreground tabular-nums">{c.gameCount}</span>
            </ToggleGroupItem>
          ))}
          <ToggleGroupItem value="none">
            未分类
            <span className="text-muted-foreground tabular-nums">{uncategorizedCount}</span>
          </ToggleGroupItem>
        </ToggleGroup>
        <CategoryManager
          categories={categories}
          onDeleted={(id) => category === String(id) && update({ category: null })}
        />
      </div>
    </div>
  );
}
