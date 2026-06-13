"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { chatApi, streamChatCompletion } from "@/lib/api/chat";
import { useChatStore } from "@/stores/chat-store";
import { useOrgStore } from "@/stores/org-store";
import type { ChatMessage } from "@/types";

export const chatKeys = {
  conversations: (orgId: string | null) =>
    ["conversations", orgId] as const,
  messages: (conversationId: string) =>
    ["conversations", conversationId, "messages"] as const,
  suggestions: (conversationId: string) =>
    ["conversations", conversationId, "suggestions"] as const,
};

export function useConversations() {
  const orgId = useOrgStore((s) => s.activeOrgId);
  return useQuery({
    queryKey: chatKeys.conversations(orgId),
    queryFn: chatApi.conversations,
    enabled: !!orgId,
  });
}

export function useConversationMessages(conversationId: string | null) {
  const setMessages = useChatStore((s) => s.setMessages);
  return useQuery({
    queryKey: chatKeys.messages(conversationId ?? ""),
    queryFn: async () => {
      const messages = await chatApi.messages(conversationId!);
      setMessages(conversationId!, messages);
      return messages;
    },
    enabled: !!conversationId,
    staleTime: Infinity, // live updates flow through the chat store
  });
}

export function useSuggestedQuestions(conversationId: string | null) {
  return useQuery({
    queryKey: chatKeys.suggestions(conversationId ?? ""),
    queryFn: () => chatApi.suggestedQuestions(conversationId!),
    enabled: !!conversationId,
    staleTime: 5 * 60_000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const orgId = useOrgStore((s) => s.activeOrgId);
  const router = useRouter();
  return useMutation({
    mutationFn: chatApi.createConversation,
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversations(orgId),
      });
      router.push(`/chat/${conversation.id}`);
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const orgId = useOrgStore((s) => s.activeOrgId);
  return useMutation({
    mutationFn: chatApi.deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversations(orgId),
      });
      toast.success("Conversation deleted");
    },
    onError: (e) => toast.error(e.message),
  });
}

/**
 * Orchestrates one streamed exchange:
 *  1. append the user message + an empty assistant placeholder to the store
 *  2. open the SSE stream and feed tokens into the placeholder
 *  3. finalize (swap temp id for server id) or mark failed
 */
export function useSendMessage(conversationId: string) {
  const store = useChatStore();
  const queryClient = useQueryClient();
  const orgId = useOrgStore((s) => s.activeOrgId);

  const send = useCallback(
    async (content: string) => {
      if (store.isStreaming) return;

      const userMessage: ChatMessage = {
        id: `temp-user-${crypto.randomUUID()}`,
        conversationId,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      const assistantTempId = `temp-assistant-${crypto.randomUUID()}`;
      const assistantMessage: ChatMessage = {
        id: assistantTempId,
        conversationId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        isStreaming: true,
      };

      store.appendMessage(conversationId, userMessage);
      store.appendMessage(conversationId, assistantMessage);

      const controller = new AbortController();
      store.startStreaming(controller);

      await streamChatCompletion(
        conversationId,
        content,
        {
          onToken: (delta) =>
            useChatStore
              .getState()
              .appendToken(conversationId, assistantTempId, delta),
          onCitations: (citations) =>
            useChatStore
              .getState()
              .setCitations(conversationId, assistantTempId, citations),
          onDone: (messageId) => {
            useChatStore
              .getState()
              .finalizeMessage(conversationId, assistantTempId, messageId);
            // refresh sidebar ordering / titles
            queryClient.invalidateQueries({
              queryKey: chatKeys.conversations(orgId),
            });
          },
          onError: (message) =>
            useChatStore
              .getState()
              .failMessage(conversationId, assistantTempId, message),
        },
        controller.signal,
      );

      useChatStore.setState({ isStreaming: false, abortController: null });
    },
    [conversationId, store, queryClient, orgId],
  );

  /** Re-ask the question that produced the given assistant message. */
  const regenerate = useCallback(
    async (assistantMessageId: string) => {
      const messages =
        useChatStore.getState().messages[conversationId] ?? [];
      const idx = messages.findIndex((m) => m.id === assistantMessageId);
      const lastUser = [...messages.slice(0, idx)]
        .reverse()
        .find((m) => m.role === "user");
      if (!lastUser) return;

      // drop the old assistant answer and its user prompt copy stays
      useChatStore.getState().removeMessage(conversationId, assistantMessageId);
      await send(lastUser.content);
    },
    [conversationId, send],
  );

  return {
    send,
    regenerate,
    stop: store.stopStreaming,
    isStreaming: store.isStreaming,
  };
}
