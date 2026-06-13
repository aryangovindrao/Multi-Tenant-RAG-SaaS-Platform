"use client";

import { FileText } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Citation } from "@/types";

/**
 * Renders numbered source chips below an assistant message. Clicking a chip
 * reveals the cited snippet with document + page provenance.
 */
export function CitationList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground text-xs font-medium">Sources:</span>
      {citations.map((citation, i) => (
        <Popover key={`${citation.documentId}-${citation.page}-${i}`}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="bg-muted hover:bg-accent inline-flex max-w-48 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
            >
              <span className="bg-primary/10 text-primary flex size-4 shrink-0 items-center justify-center rounded-full text-[10px]">
                {i + 1}
              </span>
              <span className="truncate">{citation.documentName}</span>
              <span className="text-muted-foreground shrink-0">
                p.{citation.page}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-3">
            <div className="flex items-center gap-2">
              <FileText className="text-muted-foreground size-4 shrink-0" />
              <p className="truncate text-sm font-medium">
                {citation.documentName}
              </p>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Page {citation.page} · relevance{" "}
              {(citation.score * 100).toFixed(0)}%
            </p>
            <blockquote className="border-primary/40 text-muted-foreground mt-2 max-h-40 overflow-y-auto border-l-2 pl-3 text-xs leading-relaxed">
              {citation.snippet}
            </blockquote>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
}
