import { Badge } from "@/components/ui/badge";
import type { Platform } from "@/db/schema";
import { PLATFORM_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PlatformBadge({ platform, className }: { platform: Platform; className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        platform === "steam" ? "bg-steam/20 text-steam" : "bg-epic/15 text-epic",
        className,
      )}
    >
      {PLATFORM_LABELS[platform]}
    </Badge>
  );
}
