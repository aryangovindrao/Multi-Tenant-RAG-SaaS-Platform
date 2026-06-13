"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  variant?: "default" | "dark";
  label?: string;
}

export function CopyButton({ text, variant = "default", label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      variant="ghost"
      size={label ? "sm" : "icon"}
      className={cn(
        label ? "h-7 gap-1.5 px-2 text-xs" : "size-7",
        variant === "dark" &&
          "bg-white/10 text-white hover:bg-white/20 hover:text-white",
      )}
      onClick={handleCopy}
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {label && (copied ? "Copied" : label)}
    </Button>
  );
}
