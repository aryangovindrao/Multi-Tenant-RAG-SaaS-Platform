"use client";

import { useState } from "react";
import { FileText, MessageSquare, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDeleteDocument } from "@/hooks/use-documents";
import { useCreateConversation } from "@/hooks/use-chat";
import { formatBytes, formatRelative } from "@/lib/format";
import type { Document } from "@/types";
import { DocumentStatusBadge } from "./document-status-badge";

interface DocumentTableProps {
  documents: Document[];
  canManage: boolean;
}

export function DocumentTable({ documents, canManage }: DocumentTableProps) {
  const deleteDocument = useDeleteDocument();
  const createConversation = useCreateConversation();
  const [confirmDelete, setConfirmDelete] = useState<Document | null>(null);

  return (
    <>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Size</TableHead>
              <TableHead className="hidden lg:table-cell">Pages</TableHead>
              <TableHead className="hidden md:table-cell">Uploaded</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <FileText className="text-muted-foreground size-4" />
                    </div>
                    <div className="min-w-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="max-w-[200px] truncate text-sm font-medium sm:max-w-xs">
                            {doc.name}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>{doc.name}</TooltipContent>
                      </Tooltip>
                      <p className="text-muted-foreground text-xs sm:hidden">
                        <DocumentStatusBadge status={doc.status} />
                      </p>
                      {doc.status === "FAILED" && doc.errorMessage && (
                        <p className="text-destructive truncate text-xs">
                          {doc.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <DocumentStatusBadge status={doc.status} />
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                  {formatBytes(doc.sizeBytes)}
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-sm lg:table-cell">
                  {doc.pageCount ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="text-sm">{formatRelative(doc.createdAt)}</p>
                  <p className="text-muted-foreground text-xs">
                    by {doc.uploadedBy.name}
                  </p>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="gap-2"
                        disabled={doc.status !== "READY"}
                        onClick={() =>
                          createConversation.mutate({ documentIds: [doc.id] })
                        }
                      >
                        <MessageSquare className="size-4" />
                        Chat with document
                      </DropdownMenuItem>
                      {canManage && (
                        <DropdownMenuItem
                          variant="destructive"
                          className="gap-2"
                          onClick={() => setConfirmDelete(doc)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              &ldquo;{confirmDelete?.name}&rdquo; and all of its embeddings
              will be permanently removed. Conversations citing it will lose
              their sources.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) deleteDocument.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
