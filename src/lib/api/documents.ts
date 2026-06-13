import { apiClient } from "./client";
import type { Document, Paginated } from "@/types";

export const documentsApi = {
  list: async (params: {
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const { data } = await apiClient.get<Paginated<Document>>("/documents", {
      params,
    });
    return data;
  },

  get: async (documentId: string) => {
    const { data } = await apiClient.get<Document>(`/documents/${documentId}`);
    return data;
  },

  upload: async (
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<Document>("/documents", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 0, // large uploads must not hit the default 30s timeout
      signal,
      onUploadProgress: (e) => {
        if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
      },
    });
    return data;
  },

  delete: async (documentId: string) => {
    await apiClient.delete(`/documents/${documentId}`);
  },
};
