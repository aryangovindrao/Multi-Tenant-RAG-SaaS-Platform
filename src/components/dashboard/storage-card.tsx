"use client";

import { HardDrive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/format";

interface StorageCardProps {
  usedBytes: number;
  limitBytes: number;
}

export function StorageCard({ usedBytes, limitBytes }: StorageCardProps) {
  const percent = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          Storage
        </CardTitle>
        <HardDrive className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">
          {formatBytes(usedBytes)}
        </div>
        <Progress value={percent} className="mt-3 h-1.5" />
        <p className="text-muted-foreground mt-1.5 text-xs">
          {percent.toFixed(0)}% of {formatBytes(limitBytes)} used
        </p>
      </CardContent>
    </Card>
  );
}
