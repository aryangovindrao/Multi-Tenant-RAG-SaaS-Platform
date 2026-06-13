import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return <Skeleton className="h-[300px] w-full rounded-xl" />;
}

export function ChatSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-end">
        <Skeleton className="h-12 w-2/3 max-w-md rounded-2xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="h-4 w-5/6 max-w-md" />
        <Skeleton className="h-4 w-3/4 max-w-sm" />
      </div>
    </div>
  );
}
