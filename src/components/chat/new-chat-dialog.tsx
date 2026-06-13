"use client";

import { type ReactNode, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateConversation } from "@/hooks/use-chat";
import { useDocuments } from "@/hooks/use-documents";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Starts a conversation optionally scoped to a subset of documents (multi-doc
 * chat). No selection = search the whole knowledge base. The chosen ids are
 * sent to the backend, which stores them on the session and restricts RAG
 * retrieval to those documents.
 */
export function NewChatDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const { data } = useDocuments("");
  const createConversation = useCreateConversation();

  const readyDocs = (data?.items ?? []).filter((d) => d.status === "READY");

  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );

  const handleCreate = () => {
    createConversation.mutate(
      { documentIds: selected },
      {
        onSuccess: () => {
          setOpen(false);
          setSelected([]);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSelected([]);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New chat</DialogTitle>
          <DialogDescription>
            Pick documents to focus on, or leave all unchecked to search your
            entire knowledge base.
          </DialogDescription>
        </DialogHeader>

        {readyDocs.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
            No processed documents yet. You can still start a general chat.
          </p>
        ) : (
          <ScrollArea className="max-h-72 -mx-1 px-1">
            <div className="space-y-1">
              {readyDocs.map((doc) => {
                const checked = selected.includes(doc.id);
                return (
                  // role=button (not <button>) so the Radix Checkbox button
                  // isn't nested inside another button — that's invalid HTML.
                  <div
                    key={doc.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(doc.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle(doc.id);
                      }
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                      checked
                        ? "border-primary/40 bg-primary/5"
                        : "hover:bg-accent/50",
                    )}
                  >
                    <Checkbox checked={checked} className="pointer-events-none" />
                    <FileText className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {doc.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatBytes(doc.sizeBytes)}
                        {doc.pageCount ? ` · ${doc.pageCount} pages` : ""}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="sm:items-center sm:justify-between">
          <span className="text-muted-foreground text-xs">
            {selected.length > 0
              ? `Scoped to ${selected.length} document${selected.length === 1 ? "" : "s"}`
              : "Searching all documents"}
          </span>
          <Button onClick={handleCreate} disabled={createConversation.isPending}>
            {createConversation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Start chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
