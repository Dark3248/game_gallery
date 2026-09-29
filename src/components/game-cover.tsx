"use client";

import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tries each source in order and falls back to a placeholder when all fail. */
export function GameCover({
  sources,
  title,
  className,
}: {
  sources: (string | null | undefined)[];
  title: string;
  className?: string;
}) {
  const urls = sources.filter((s): s is string => Boolean(s));
  const [index, setIndex] = useState(0);
  const src = urls[index];

  if (!src) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-background p-3 text-center text-xs text-muted-foreground",
          className,
        )}
      >
        <Gamepad2 className="size-6" />
        <span className="line-clamp-3">{title}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote CDN images, no optimizer needed locally
    <img
      src={src}
      alt={title}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setIndex((i) => i + 1)}
      className={cn("object-cover", className)}
    />
  );
}
