"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { documentsApi } from "@/lib/api/documents";
import { useDocumentStore } from "@/stores/document-store";
import { useOrgStore } from "@/stores/org-store";
import type { Document, Paginated } from "@/types";

export const documentKeys = {
  list: (orgId: string | null, search: string, page: number) =>
    ["documents", orgId, { search, page }] as const,
  scope: (orgId: string | null) => ["documents", orgId] as const,
};

export function useDocuments(search: string, page = 1) {
  const orgId = useOrgStore((s) => s.activeOrgId);
  return useQuery({
    queryKey: documentKeys.list(orgId, search, page),
    queryFn: () => documentsApi.list({ search, page, pageSize: 20 }),
    enabled: !!orgId,
    placeholderData: (prev) => prev, // keep table rendered while refetching
    // Poll while any document is still being processed so status flips to
    // READY without a manual refresh.
    refetchInterval: (query) => {
      const docs = query.state.data?.items;
      const processing = docs?.some(
        (d) => d.status !== "READY" && d.status !== "FAILED",
      );
      return processing ? 4_000 : false;
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const orgId = useOrgStore((s) => s.activeOrgId);
  const { addUpload, updateUpload } = useDocumentStore();

  return useMutation({
    mutationFn: async (file: File) => {
      const uploadId = crypto.randomUUID();
      const controller = new AbortController();
      addUpload({
        id: uploadId,
        fileName: file.name,
        sizeBytes: file.size,
        progress: 0,
        status: "uploading",
        abortController: controller,
      });
      try {
        const doc = await documentsApi.upload(
          file,
          (percent) => updateUpload(uploadId, { progress: percent }),
          controller.signal,
        );
        updateUpload(uploadId, { status: "done", progress: 100 });
        return doc;
      } catch (e) {
        updateUpload(uploadId, {
          status: "error",
          error: (e as Error).message,
        });
        throw e;
      }
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.scope(orgId) });
      toast.success(`"${doc.name}" uploaded — processing started`);
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const orgId = useOrgStore((s) => s.activeOrgId);

  return useMutation({
    mutationFn: documentsApi.delete,
    // Optimistic removal from every cached page of the list.
    onMutate: async (documentId) => {
      await queryClient.cancelQueries({ queryKey: documentKeys.scope(orgId) });
      const snapshots = queryClient.getQueriesData<Paginated<Document>>({
        queryKey: documentKeys.scope(orgId),
      });
      for (const [key, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData<Paginated<Document>>(key, {
          ...data,
          items: data.items.filter((d) => d.id !== documentId),
          total: data.total - 1,
        });
      }
      return { snapshots };
    },
    onError: (e, _id, ctx) => {
      for (const [key, data] of ctx?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
      toast.error(e.message);
    },
    onSuccess: () => toast.success("Document deleted"),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: documentKeys.scope(orgId) }),
  });
}
