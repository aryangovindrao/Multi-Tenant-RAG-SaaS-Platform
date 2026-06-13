"use client";

import {
  FileText,
  FileX,
  MessageSquare,
  Settings,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityFeed } from "@/hooks/use-analytics";
import { formatRelative } from "@/lib/format";
import type { ActivityEvent } from "@/types";

const EVENT_ICONS: Record<ActivityEvent["type"], LucideIcon> = {
  DOCUMENT_UPLOADED: FileText,
  DOCUMENT_DELETED: FileX,
  QUERY_EXECUTED: MessageSquare,
  MEMBER_JOINED: Users,
  MEMBER_INVITED: UserPlus,
  ORG_UPDATED: Settings,
};

export function ActivityFeed() {
  const { data: events, isLoading } = useActivityFeed();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : !events?.length ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No activity yet. Upload a document to get started.
          </p>
        ) : (
          <ul className="space-y-4">
            {events.map((event) => {
              const Icon = EVENT_ICONS[event.type] ?? FileText;
              return (
                <li key={event.id} className="flex items-start gap-3">
                  <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
                    <Icon className="text-muted-foreground size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      <span className="font-medium">{event.actor.name}</span>{" "}
                      <span className="text-muted-foreground">
                        {event.description}
                      </span>
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatRelative(event.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
