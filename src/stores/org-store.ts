import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Organization, Role } from "@/types";

interface OrgState {
  organizations: Organization[];
  activeOrgId: string | null;
  setOrganizations: (orgs: Organization[]) => void;
  switchOrganization: (orgId: string) => void;
  upsertOrganization: (org: Organization) => void;
  reset: () => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set, get) => ({
      organizations: [],
      activeOrgId: null,

      setOrganizations: (orgs) => {
        const { activeOrgId } = get();
        const stillValid = orgs.some((o) => o.id === activeOrgId);
        set({
          organizations: orgs,
          activeOrgId: stillValid ? activeOrgId : (orgs[0]?.id ?? null),
        });
      },

      switchOrganization: (orgId) => set({ activeOrgId: orgId }),

      upsertOrganization: (org) =>
        set((s) => {
          const exists = s.organizations.some((o) => o.id === org.id);
          return {
            organizations: exists
              ? s.organizations.map((o) => (o.id === org.id ? org : o))
              : [...s.organizations, org],
            activeOrgId: exists ? s.activeOrgId : org.id,
          };
        }),

      reset: () => set({ organizations: [], activeOrgId: null }),
    }),
    { name: "rag.org" },
  ),
);

export const selectActiveOrg = (s: OrgState) =>
  s.organizations.find((o) => o.id === s.activeOrgId) ?? null;

const ROLE_RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };

/** True when the current user's role in the active org is >= `required`. */
export function hasRole(org: Organization | null, required: Role): boolean {
  if (!org) return false;
  return ROLE_RANK[org.role] >= ROLE_RANK[required];
}
