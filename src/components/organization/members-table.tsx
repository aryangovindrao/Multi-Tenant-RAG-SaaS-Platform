"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { TableSkeleton } from "@/components/shared/loading-skeletons";
import {
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "@/hooks/use-organizations";
import { useAuthStore } from "@/stores/auth-store";
import { formatRelative, initials } from "@/lib/format";
import { RoleSelect } from "./role-select";

interface MembersTableProps {
  orgId: string;
  /** whether the current user can manage roles/removal */
  canManage: boolean;
}

export function MembersTable({ orgId, canManage }: MembersTableProps) {
  const { data: members, isLoading } = useMembers(orgId);
  const updateRole = useUpdateMemberRole(orgId);
  const removeMember = useRemoveMember(orgId);
  const currentUserId = useAuthStore((s) => s.user?.id);

  if (isLoading) return <TableSkeleton rows={4} />;

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Role</TableHead>
            {canManage && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members?.map((member) => {
            const isSelf = member.user.id === currentUserId;
            return (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarImage src={member.user.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {initials(member.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.user.name}
                        {isSelf && (
                          <span className="text-muted-foreground"> (you)</span>
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={member.status === "ACTIVE" ? "secondary" : "outline"}
                  >
                    {member.status === "ACTIVE" ? "Active" : "Invited"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatRelative(member.joinedAt)}
                </TableCell>
                <TableCell>
                  {canManage && !isSelf ? (
                    <RoleSelect
                      compact
                      value={member.role}
                      disabled={updateRole.isPending}
                      onChange={(role) =>
                        updateRole.mutate({ memberId: member.id, role })
                      }
                    />
                  ) : (
                    <span className="text-sm capitalize">
                      {member.role.toLowerCase()}
                    </span>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell>
                    {!isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2"
                            onClick={() => removeMember.mutate(member.id)}
                          >
                            <Trash2 className="size-4" />
                            Remove from organization
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
