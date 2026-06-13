"use client";

import { MessageSquarePlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewChatDialog } from "@/components/chat/new-chat-dialog";

export default function ChatIndexPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-2xl">
        <Sparkles className="size-6" />
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Chat with your knowledge base
        </h1>
        <p className="text-muted-foreground mx-auto mt-1.5 max-w-md text-sm">
          Ask questions in plain language and get answers grounded in your
          uploaded documents — with citations you can verify.
        </p>
      </div>
      <NewChatDialog
        trigger={
          <Button size="lg" className="gap-2">
            <MessageSquarePlus className="size-4" />
            Start a new chat
          </Button>
        }
      />
    </div>
  );
}
