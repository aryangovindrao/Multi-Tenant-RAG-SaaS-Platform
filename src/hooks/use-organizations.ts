"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { organizationsApi } from "@/lib/api/organizations";
import { useOrgStore } from "@/stores/org-store";
import type { Member, Role } from "@/types";

export const orgKeys = {
  all: ["organizations"] as const,
  members: (orgId: string) => ["organizations", orgId, "members"] as const,
};

export function useOrganizations() {
  const setOrganizations = useOrgStore((s) => s.setOrganizations);
  return useQuery({
    queryKey: orgKeys.all,
    queryFn: async () => {
      const orgs = await organizationsApi.list();
      setOrganizations(orgs);
      return orgs;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  const upsert = useOrgStore((s) => s.upsertOrganization);
  return useMutation({
    mutationFn: organizationsApi.create,
    onSuccess: (org) => {
      upsert(org);
      queryClient.invalidateQueries({ queryKey: orgKeys.all });
      toast.success(`Organization "${org.name}" created`);
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateOrganization(orgId: string) {
  const queryClient = useQueryClient();
  const upsert = useOrgStore((s) => s.upsertOrganization);
  return useMutation({
    mutationFn: (payload: { name?: string }) =>
      organizationsApi.update(orgId, payload),
    onSuccess: (org) => {
      upsert(org);
      queryClient.invalidateQueries({ queryKey: orgKeys.all });
      toast.success("Organization updated");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useMembers(orgId: string | null) {
  return useQuery({
    queryKey: orgKeys.members(orgId ?? ""),
    queryFn: () => organizationsApi.members(orgId!),
    enabled: !!orgId,
  });
}

export function useInviteMember(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; role: Role }) =>
      organizationsApi.invite(orgId, payload),
    onSuccess: (invite) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) });
      toast.success(`Invitation sent to ${invite.email}`);
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateMemberRole(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      organizationsApi.updateMemberRole(orgId, memberId, role),
    // Optimistic update: flip the role immediately, roll back on failure.
    onMutate: async ({ memberId, role }) => {
      await queryClient.cancelQueries({ queryKey: orgKeys.members(orgId) });
      const previous = queryClient.getQueryData<Member[]>(
        orgKeys.members(orgId),
      );
      queryClient.setQueryData<Member[]>(orgKeys.members(orgId), (old) =>
        old?.map((m) => (m.id === memberId ? { ...m, role } : m)),
      );
      return { previous };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(orgKeys.members(orgId), ctx.previous);
      }
      toast.error(e.message);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) }),
  });
}

export function useRemoveMember(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      organizationsApi.removeMember(orgId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) });
      toast.success("Member removed");
    },
    onError: (e) => toast.error(e.message),
  });
}
