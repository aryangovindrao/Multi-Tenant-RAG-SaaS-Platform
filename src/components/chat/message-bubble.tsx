"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { AlertCircle, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/types";
import { CitationList } from "./citation-list";
import { CopyButton } from "./copy-button";
import { MarkdownRenderer } from "./markdown-renderer";

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: (messageId: string) => void;
  canRegenerate?: boolean;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onRegenerate,
  canRegenerate,
}: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm whitespace-pre-wrap sm:max-w-[70%]">
          {message.content}
        </div>
      </motion.div>
    );
  }

  const showThinking = message.isStreaming && message.content.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex gap-3"
    >
      <div className="bg-primary text-primary-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
        <Sparkles className="size-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        {showThinking ? (
          <div className="flex h-7 items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="bg-muted-foreground/60 size-1.5 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
              />
            ))}
          </div>
        ) : (
          <>
            <MarkdownRenderer content={message.content} />
            {message.isStreaming && (
              <span className="bg-foreground ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm align-text-bottom" />
            )}
          </>
        )}

        {message.error && (
          <div className="text-destructive mt-2 flex items-center gap-2 text-xs">
            <AlertCircle className="size-3.5" />
            {message.error}
          </div>
        )}

        {!message.isStreaming && message.citations && (
          <CitationList citations={message.citations} />
        )}

        {/* hover actions */}
        {!message.isStreaming && message.content && (
          <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <CopyButton text={message.content} label="Copy" />
            {canRegenerate && onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs"
                onClick={() => onRegenerate(message.id)}
              >
                <RotateCcw className="size-3.5" />
                Regenerate
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});
