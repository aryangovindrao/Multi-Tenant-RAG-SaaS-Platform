"use client";

import { useState } from "react";
import { FileSearch, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { DocumentTable } from "@/components/documents/document-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { TableSkeleton } from "@/components/shared/loading-skeletons";
import { useDocuments } from "@/hooks/use-documents";
import { useDebounce } from "@/hooks/use-debounce";
import { useOrgStore, selectActiveOrg, hasRole } from "@/stores/org-store";

export default function DocumentsPage() {
  const activeOrg = useOrgStore(selectActiveOrg);
  const canEdit = hasRole(activeOrg, "EDITOR");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const { data, isLoading } = useDocuments(debouncedSearch);

  const documents = data?.items ?? [];
  const isEmpty = !isLoading && documents.length === 0 && !debouncedSearch;
  const noResults = !isLoading && documents.length === 0 && !!debouncedSearch;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Documents"
        description={
          data ? `${data.total} document${data.total === 1 ? "" : "s"} in this workspace` : undefined
        }
      />

      {canEdit && <UploadDropzone />}

      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search documents…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isEmpty ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description={
            canEdit
              ? "Upload your first PDF to start asking questions about it."
              : "An editor or admin needs to upload documents before you can chat."
          }
        />
      ) : noResults ? (
        <EmptyState
          icon={FileSearch}
          title="No matches"
          description={`Nothing found for "${debouncedSearch}". Try a different search.`}
        />
      ) : (
        <DocumentTable documents={documents} canManage={canEdit} />
      )}
    </div>
  );
}
