import type { ReactNode } from "react";
import { ConversationList } from "@/components/chat/conversation-list";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    // h-[calc(100svh-3.5rem)] = viewport minus the 14-unit topbar
    <div className="flex h-[calc(100svh-3.5rem)]">
      <aside className="bg-muted/20 hidden w-64 shrink-0 border-r lg:block">
        <ConversationList />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
