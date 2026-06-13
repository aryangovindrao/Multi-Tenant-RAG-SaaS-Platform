import { apiClient, API_BASE_URL } from "./client";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgStore } from "@/stores/org-store";
import type { ChatMessage, Citation, Conversation, Paginated } from "@/types";

export const chatApi = {
  conversations: async () => {
    const { data } = await apiClient.get<Paginated<Conversation>>(
      "/conversations",
      { params: { pageSize: 50 } },
    );
    return data;
  },

  createConversation: async (payload: { documentIds?: string[] }) => {
    const { data } = await apiClient.post<Conversation>(
      "/conversations",
      payload,
    );
    return data;
  },

  messages: async (conversationId: string) => {
    const { data } = await apiClient.get<ChatMessage[]>(
      `/conversations/${conversationId}/messages`,
    );
    return data;
  },

  deleteConversation: async (conversationId: string) => {
    await apiClient.delete(`/conversations/${conversationId}`);
  },

  suggestedQuestions: async (conversationId: string) => {
    const { data } = await apiClient.get<string[]>(
      `/conversations/${conversationId}/suggestions`,
    );
    return data;
  },
};

// ─── SSE Streaming ──────────────────────────────────────────────────────────
//
// POST + ReadableStream (not EventSource — it can't send auth headers or a
// JSON body). The backend emits Server-Sent Events:
//   event: token      data: {"delta":"..."}
//   event: citations  data: [{...}]
//   event: done       data: {"messageId":"..."}
//   event: error      data: {"message":"..."}

export interface StreamHandlers {
  onToken: (delta: string) => void;
  onCitations: (citations: Citation[]) => void;
  onDone: (messageId: string) => void;
  onError: (message: string) => void;
}

export async function streamChatCompletion(
  conversationId: string,
  content: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const { tokens } = useAuthStore.getState();
  const orgId = useOrgStore.getState().activeOrgId;

  const response = await fetch(
    `${API_BASE_URL}/conversations/${conversationId}/messages/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(tokens?.accessToken && {
          Authorization: `Bearer ${tokens.accessToken}`,
        }),
        ...(orgId && { "X-Organization-Id": orgId }),
      },
      body: JSON.stringify({ content }),
      signal,
    },
  );

  if (!response.ok || !response.body) {
    handlers.onError(
      response.status === 429
        ? "Rate limit reached. Please wait a moment."
        : "Failed to get a response. Please try again.",
    );
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        let event = "message";
        let data = "";
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        if (!data) continue;

        switch (event) {
          case "token":
            handlers.onToken(JSON.parse(data).delta as string);
            break;
          case "citations":
            handlers.onCitations(JSON.parse(data) as Citation[]);
            break;
          case "done":
            handlers.onDone(JSON.parse(data).messageId as string);
            break;
          case "error":
            handlers.onError(JSON.parse(data).message as string);
            break;
        }
      }
    }
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      handlers.onError("Connection lost while streaming the response.");
    }
  } finally {
    reader.releaseLock();
  }
}
