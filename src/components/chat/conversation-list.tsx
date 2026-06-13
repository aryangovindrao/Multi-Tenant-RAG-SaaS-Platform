"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversations, useDeleteConversation } from "@/hooks/use-chat";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NewChatDialog } from "./new-chat-dialog";

export function ConversationList() {
  const params = useParams<{ conversationId?: string }>();
  const activeId = params?.conversationId;
  const { data, isLoading } = useConversations();
  const deleteConversation = useDeleteConversation();

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <NewChatDialog
          trigger={
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              size="sm"
            >
              <Plus className="size-4" />
              New chat
            </Button>
          }
        />
      </div>

      <ScrollArea className="flex-1 px-3 pb-3">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <p className="text-muted-foreground px-2 py-8 text-center text-xs">
            No conversations yet
          </p>
        ) : (
          <div className="space-y-1">
            {data.items.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group relative rounded-lg transition-colors",
                  conversation.id === activeId
                    ? "bg-accent"
                    : "hover:bg-accent/50",
                )}
              >
                <Link
                  href={`/chat/${conversation.id}`}
                  className="block px-3 py-2 pr-9"
                >
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    <MessageSquare className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="truncate">{conversation.title || "Untitled"}</span>
                  </p>
                  <p className="text-muted-foreground mt-0.5 truncate pl-5.5 text-xs">
                    {formatRelative(conversation.updatedAt)}
                  </p>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete conversation"
                  className="absolute top-1/2 right-1.5 size-7 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteConversation.mutate(conversation.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
