"use client";

import { use, useEffect, useRef } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageBubble } from "@/components/chat/message-bubble";
import { SuggestedQuestions } from "@/components/chat/suggested-questions";
import { ChatSkeleton } from "@/components/shared/loading-skeletons";
import { useConversationMessages, useSendMessage } from "@/hooks/use-chat";
import { useChatStore } from "@/stores/chat-store";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const { isLoading } = useConversationMessages(conversationId);
  const messages = useChatStore((s) => s.messages[conversationId]) ?? [];
  const { send, regenerate, stop, isStreaming } = useSendMessage(conversationId);

  // pin scroll to the bottom as tokens stream in
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, lastContent]);

  const isEmpty = !isLoading && messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
          {isLoading ? (
            <ChatSkeleton />
          ) : isEmpty ? (
            <div className="pt-10">
              <SuggestedQuestions
                conversationId={conversationId}
                onSelect={(q) => void send(q)}
              />
            </div>
          ) : (
            messages.map((message, i) => (
              <MessageBubble
                key={message.id}
                message={message}
                canRegenerate={
                  message.role === "assistant" &&
                  i === messages.length - 1 &&
                  !isStreaming
                }
                onRegenerate={(id) => void regenerate(id)}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput
        onSend={(content) => void send(content)}
        onStop={stop}
        isStreaming={isStreaming}
      />
    </div>
  );
}
