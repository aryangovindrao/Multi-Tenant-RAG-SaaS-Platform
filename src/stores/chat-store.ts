import { create } from "zustand";
import type { ChatMessage, Citation } from "@/types";

/**
 * Holds only the *live* streaming state. Persisted conversation history is
 * server state and lives in React Query; this store owns the in-flight
 * message that React Query can't model (token-by-token updates).
 */
interface ChatState {
  /** messages per conversation, including the streaming placeholder */
  messages: Record<string, ChatMessage[]>;
  isStreaming: boolean;
  abortController: AbortController | null;

  setMessages: (conversationId: string, messages: ChatMessage[]) => void;
  appendMessage: (conversationId: string, message: ChatMessage) => void;
  appendToken: (conversationId: string, messageId: string, delta: string) => void;
  setCitations: (
    conversationId: string,
    messageId: string,
    citations: Citation[],
  ) => void;
  finalizeMessage: (
    conversationId: string,
    tempId: string,
    finalId: string,
  ) => void;
  failMessage: (conversationId: string, messageId: string, error: string) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  startStreaming: (controller: AbortController) => void;
  stopStreaming: () => void;
}

function patchMessage(
  messages: ChatMessage[],
  messageId: string,
  patch: (m: ChatMessage) => ChatMessage,
): ChatMessage[] {
  return messages.map((m) => (m.id === messageId ? patch(m) : m));
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: {},
  isStreaming: false,
  abortController: null,

  setMessages: (conversationId, messages) =>
    set((s) => ({ messages: { ...s.messages, [conversationId]: messages } })),

  appendMessage: (conversationId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] ?? []), message],
      },
    })),

  appendToken: (conversationId, messageId, delta) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: patchMessage(
          s.messages[conversationId] ?? [],
          messageId,
          (m) => ({ ...m, content: m.content + delta }),
        ),
      },
    })),

  setCitations: (conversationId, messageId, citations) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: patchMessage(
          s.messages[conversationId] ?? [],
          messageId,
          (m) => ({ ...m, citations }),
        ),
      },
    })),

  finalizeMessage: (conversationId, tempId, finalId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: patchMessage(
          s.messages[conversationId] ?? [],
          tempId,
          (m) => ({ ...m, id: finalId, isStreaming: false }),
        ),
      },
    })),

  failMessage: (conversationId, messageId, error) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: patchMessage(
          s.messages[conversationId] ?? [],
          messageId,
          (m) => ({ ...m, isStreaming: false, error }),
        ),
      },
    })),

  removeMessage: (conversationId, messageId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).filter(
          (m) => m.id !== messageId,
        ),
      },
    })),

  startStreaming: (controller) =>
    set({ isStreaming: true, abortController: controller }),

  stopStreaming: () => {
    get().abortController?.abort();
    set({ isStreaming: false, abortController: null });
  },
}));
