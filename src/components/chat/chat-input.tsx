"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
  placeholder = "Ask anything about your documents…",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // auto-grow up to ~6 lines
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="bg-background border-t p-3 sm:p-4">
      <div className="bg-muted/40 focus-within:ring-ring/30 mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border p-2 transition-shadow focus-within:ring-2">
        <Textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        {isStreaming ? (
          <Button
            size="icon"
            variant="secondary"
            className="size-9 shrink-0 rounded-xl"
            onClick={onStop}
            aria-label="Stop generating"
          >
            <Square className="size-4 fill-current" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="size-9 shrink-0 rounded-xl"
            disabled={!value.trim() || disabled}
            onClick={handleSend}
            aria-label="Send message"
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
      <p className="text-muted-foreground mx-auto mt-2 max-w-3xl text-center text-[11px]">
        Answers are generated from your documents and may be inaccurate.
        Verify important information against the cited sources.
      </p>
    </div>
  );
}
