import { Suspense } from "react";
import { LibraryControls } from "@/components/library/library-controls";
import { countUncategorizedGames, listCategories } from "@/lib/queries";

// The controls live in a layout because pages remount whenever search params change,
// which would reset the search box while typing.
export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">游戏库</h1>
      <Suspense>
        <LibraryControls categories={listCategories()} uncategorizedCount={countUncategorizedGames()} />
      </Suspense>
      {children}
    </div>
  );
}
