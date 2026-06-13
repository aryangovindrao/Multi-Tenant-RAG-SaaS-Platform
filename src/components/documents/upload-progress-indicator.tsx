"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, Upload, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { useDocumentStore } from "@/stores/document-store";
import { formatBytes } from "@/lib/format";

/**
 * Lives in the topbar so in-flight uploads stay visible (and cancellable)
 * while the user navigates anywhere in the app.
 */
export function UploadProgressIndicator() {
  const uploads = useDocumentStore((s) => s.uploads);
  const removeUpload = useDocumentStore((s) => s.removeUpload);
  const clearFinished = useDocumentStore((s) => s.clearFinishedUploads);

  const active = uploads.filter((u) => u.status === "uploading");
  if (uploads.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {active.length > 0 ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          <span className="hidden text-xs sm:inline">
            {active.length > 0
              ? `Uploading ${active.length}…`
              : "Uploads"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Uploads</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={clearFinished}
          >
            Clear finished
          </Button>
        </div>
        <div className="max-h-72 space-y-3 overflow-y-auto">
          <AnimatePresence initial={false}>
            {uploads.map((u) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2">
                  {u.status === "done" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  ) : u.status === "error" ? (
                    <XCircle className="text-destructive size-4 shrink-0" />
                  ) : (
                    <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{u.fileName}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {u.status === "error"
                        ? (u.error ?? "Upload failed")
                        : `${formatBytes(u.sizeBytes)} · ${u.progress}%`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    aria-label="Cancel upload"
                    onClick={() => {
                      u.abortController.abort();
                      removeUpload(u.id);
                    }}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
                {u.status === "uploading" && (
                  <Progress value={u.progress} className="mt-1.5 h-1" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
}
