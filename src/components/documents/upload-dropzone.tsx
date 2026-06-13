"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { CloudUpload } from "lucide-react";
import { toast } from "sonner";
import { useUploadDocument } from "@/hooks/use-documents";
import { cn } from "@/lib/utils";

const MAX_SIZE_MB = 50;

export function UploadDropzone() {
  const upload = useUploadDocument();

  const onDrop = useCallback(
    (accepted: File[], rejected: import("react-dropzone").FileRejection[]) => {
      for (const rejection of rejected) {
        const reason =
          rejection.errors[0]?.code === "file-too-large"
            ? `exceeds the ${MAX_SIZE_MB} MB limit`
            : "is not a supported file type";
        toast.error(`"${rejection.file.name}" ${reason}`);
      }
      for (const file of accepted) {
        upload.mutate(file);
      }
    },
    [upload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-[border-color,background-color,transform] duration-150",
        isDragActive
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "hover:border-muted-foreground/40 hover:bg-muted/40",
      )}
    >
      <input {...getInputProps()} />
      <div
        className={cn(
          "mb-3 flex size-11 items-center justify-center rounded-full transition-colors",
          isDragActive ? "bg-primary/10" : "bg-muted",
        )}
      >
        <CloudUpload
          className={cn(
            "size-5",
            isDragActive ? "text-primary" : "text-muted-foreground",
          )}
        />
      </div>
      <p className="text-sm font-medium">
        {isDragActive ? "Drop to upload" : "Drag & drop files, or click to browse"}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">
        PDF, DOCX, TXT, MD · up to {MAX_SIZE_MB} MB each
      </p>
    </div>
  );
}
