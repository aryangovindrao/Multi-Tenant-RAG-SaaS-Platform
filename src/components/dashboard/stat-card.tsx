"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  icon: LucideIcon;
  index?: number;
}

export function StatCard({
  title,
  value,
  delta,
  deltaLabel = "vs last 30 days",
  icon: Icon,
  index = 0,
}: StatCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            {title}
          </CardTitle>
          <Icon className="text-muted-foreground size-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">{value}</div>
          {delta !== undefined && (
            <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
              <span
                className={cn(
                  "flex items-center gap-0.5 font-medium",
                  positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                )}
              >
                {positive ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {positive ? "+" : ""}
                {delta}%
              </span>
              {deltaLabel}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
