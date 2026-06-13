import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="bg-muted/40 relative hidden flex-col justify-between border-r p-10 lg:flex">
        <div className="flex items-center gap-2 font-semibold">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <Sparkles className="size-4" />
          </div>
          Cortex
        </div>
        <blockquote className="space-y-2">
          <p className="text-lg leading-relaxed">
            &ldquo;Upload your team&rsquo;s documents and get instant,
            citation-backed answers. Cortex turned our knowledge base from a
            graveyard into a conversation.&rdquo;
          </p>
          <footer className="text-muted-foreground text-sm">
            — Head of Engineering, Series B SaaS
          </footer>
        </blockquote>
        <p className="text-muted-foreground text-xs">
          SOC 2 Type II · Tenant-isolated vector storage · Zero data retention
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
