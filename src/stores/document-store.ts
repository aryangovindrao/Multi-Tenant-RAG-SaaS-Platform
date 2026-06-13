import { create } from "zustand";

export interface UploadItem {
  id: string; // client-generated
  fileName: string;
  sizeBytes: number;
  progress: number; // 0-100
  status: "uploading" | "done" | "error";
  error?: string;
  abortController: AbortController;
}

/**
 * Owns transient upload state (progress bars survive route changes because
 * this lives outside the component tree). The document list itself is server
 * state managed by React Query.
 */
interface DocumentState {
  uploads: UploadItem[];
  search: string;
  addUpload: (item: UploadItem) => void;
  updateUpload: (id: string, patch: Partial<UploadItem>) => void;
  removeUpload: (id: string) => void;
  clearFinishedUploads: () => void;
  setSearch: (search: string) => void;
}

export const useDocumentStore = create<DocumentState>()((set) => ({
  uploads: [],
  search: "",

  addUpload: (item) => set((s) => ({ uploads: [item, ...s.uploads] })),

  updateUpload: (id, patch) =>
    set((s) => ({
      uploads: s.uploads.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    })),

  removeUpload: (id) =>
    set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) })),

  clearFinishedUploads: () =>
    set((s) => ({
      uploads: s.uploads.filter((u) => u.status === "uploading"),
    })),

  setSearch: (search) => set({ search }),
}));
