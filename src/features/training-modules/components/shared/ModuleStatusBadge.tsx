import { Badge } from "@/components/ui/badge";

export function ModuleStatusBadge({ isPublished }: { isPublished: boolean }) {
  return (
    <Badge
      variant={isPublished ? "default" : "secondary"}
      className={`text-[10px] px-1.5 py-0 h-4 ${
        isPublished
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
      }`}
    >
      {isPublished ? "Published" : "Draft"}
    </Badge>
  );
}
