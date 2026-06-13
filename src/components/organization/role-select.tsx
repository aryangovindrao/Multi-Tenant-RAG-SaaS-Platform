"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/types";

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Full access incl. members & billing",
  EDITOR: "Upload documents and chat",
  VIEWER: "Chat with existing documents",
};

interface RoleSelectProps {
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function RoleSelect({ value, onChange, disabled, compact }: RoleSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)} disabled={disabled}>
      <SelectTrigger size={compact ? "sm" : "default"} className={compact ? "w-28" : "w-full"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(ROLE_DESCRIPTIONS) as Role[]).map((role) => (
          <SelectItem key={role} value={role}>
            <div>
              <span className="capitalize">{role.toLowerCase()}</span>
              {!compact && (
                <p className="text-muted-foreground text-xs">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
