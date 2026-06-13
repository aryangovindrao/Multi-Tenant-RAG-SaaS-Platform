import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/types";

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; className: string; pulse?: boolean }
> = {
  UPLOADING: { label: "Uploading", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400", pulse: true },
  QUEUED: { label: "Queued", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400", pulse: true },
  PROCESSING: { label: "Processing", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400", pulse: true },
  EMBEDDING: { label: "Embedding", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400", pulse: true },
  READY: { label: "Ready", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  FAILED: { label: "Failed", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="secondary" className={cn("gap-1.5 border-0", config.className)}>
      {config.pulse && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {config.label}
    </Badge>
  );
}
