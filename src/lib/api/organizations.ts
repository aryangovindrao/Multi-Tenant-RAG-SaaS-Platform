import { apiClient } from "./client";
import type { Invitation, Member, Organization, Role } from "@/types";

export const organizationsApi = {
  list: async () => {
    const { data } = await apiClient.get<Organization[]>("/organizations");
    return data;
  },

  create: async (payload: { name: string }) => {
    const { data } = await apiClient.post<Organization>(
      "/organizations",
      payload,
    );
    return data;
  },

  update: async (
    orgId: string,
    payload: Partial<Pick<Organization, "name" | "logoUrl">>,
  ) => {
    const { data } = await apiClient.patch<Organization>(
      `/organizations/${orgId}`,
      payload,
    );
    return data;
  },

  delete: async (orgId: string) => {
    await apiClient.delete(`/organizations/${orgId}`);
  },

  members: async (orgId: string) => {
    const { data } = await apiClient.get<Member[]>(
      `/organizations/${orgId}/members`,
    );
    return data;
  },

  invite: async (orgId: string, payload: { email: string; role: Role }) => {
    const { data } = await apiClient.post<Invitation>(
      `/organizations/${orgId}/invitations`,
      payload,
    );
    return data;
  },

  updateMemberRole: async (orgId: string, memberId: string, role: Role) => {
    const { data } = await apiClient.patch<Member>(
      `/organizations/${orgId}/members/${memberId}`,
      { role },
    );
    return data;
  },

  removeMember: async (orgId: string, memberId: string) => {
    await apiClient.delete(`/organizations/${orgId}/members/${memberId}`);
  },
};
