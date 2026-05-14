/**
 * Contact Group Store
 *
 * Groups are local-first (persisted in localStorage) so the feature works
 * immediately without a backend migration. When a backend Contact-Group API
 * is shipped the store actions can be swapped to API calls and the
 * localStorage layer removed transparently.
 *
 * AI Memory: every time a contact or group is used in a workflow node the
 * store records the (workflowCategory, contactId/groupId) pair and a usage
 * count. getSuggestionsForCategory() returns the most-used IDs for that
 * category — no external AI call needed, just frequency-based recall.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContactGroup {
  id: string;
  name: string;
  description: string;
  emoji: string;    // display icon
  color: string;    // tailwind bg class e.g. 'bg-blue-100 text-blue-700'
  contactIds: string[];
  tags: string[];   // domain tags like ['legal','hr'] for AI suggestions
  createdAt: string;
}

export interface ContactUsageEntry {
  id: string;            // contactId OR groupId
  kind: 'contact' | 'group';
  workflowCategory: string;
  usageCount: number;
  lastUsed: string;      // ISO timestamp
}

// ── Default seed groups (shown to new users) ──────────────────────────────────

const SEED_GROUPS: ContactGroup[] = [
  {
    id: 'grp-legal',
    name: 'Legal Team',
    description: 'Lawyers, counsel and compliance officers',
    emoji: '⚖️',
    color: 'bg-indigo-100 text-indigo-700',
    contactIds: [],
    tags: ['legal', 'compliance', 'nda'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp-hr',
    name: 'HR Team',
    description: 'Human resources and people ops',
    emoji: '🧑‍💼',
    color: 'bg-amber-100 text-amber-700',
    contactIds: [],
    tags: ['hr', 'onboarding', 'employee'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp-finance',
    name: 'Finance & Procurement',
    description: 'Finance controllers and procurement officers',
    emoji: '💰',
    color: 'bg-green-100 text-green-700',
    contactIds: [],
    tags: ['finance', 'procurement', 'approval'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp-executives',
    name: 'Executives',
    description: 'C-suite approvers and board members',
    emoji: '🏆',
    color: 'bg-purple-100 text-purple-700',
    contactIds: [],
    tags: ['executive', 'director', 'approval'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp-external',
    name: 'External Partners',
    description: 'Vendors, clients and external signers',
    emoji: '🤝',
    color: 'bg-teal-100 text-teal-700',
    contactIds: [],
    tags: ['vendor', 'client', 'external'],
    createdAt: new Date().toISOString(),
  },
];

// ── Store ─────────────────────────────────────────────────────────────────────

interface ContactGroupState {
  groups: ContactGroup[];
  memory: ContactUsageEntry[];

  // Group CRUD
  addGroup:               (data: Omit<ContactGroup, 'id' | 'createdAt'>) => ContactGroup;
  updateGroup:            (id: string, data: Partial<Omit<ContactGroup, 'id' | 'createdAt'>>) => void;
  deleteGroup:            (id: string) => void;

  // Membership
  addContactToGroup:      (groupId: string, contactId: string) => void;
  removeContactFromGroup: (groupId: string, contactId: string) => void;
  getGroupsForContact:    (contactId: string) => ContactGroup[];

  // AI memory
  recordUsage: (
    ids: { contactIds?: string[]; groupIds?: string[] },
    workflowCategory: string,
  ) => void;
  getSuggestionsForCategory: (category: string, limit?: number) => ContactUsageEntry[];
  clearMemory: () => void;
}

export const useContactGroupStore = create<ContactGroupState>()(
  persist(
    (set, get) => ({
      groups: SEED_GROUPS,
      memory: [],

      // ── Group CRUD ──────────────────────────────────────────────────────────

      addGroup: (data) => {
        const group: ContactGroup = {
          ...data,
          id: `grp-${nanoid(8)}`,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ groups: [...s.groups, group] }));
        return group;
      },

      updateGroup: (id, data) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === id ? { ...g, ...data } : g)),
        })),

      deleteGroup: (id) =>
        set((s) => ({
          groups:  s.groups.filter((g) => g.id !== id),
          memory:  s.memory.filter((m) => !(m.kind === 'group' && m.id === id)),
        })),

      // ── Membership ─────────────────────────────────────────────────────────

      addContactToGroup: (groupId, contactId) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId && !g.contactIds.includes(contactId)
              ? { ...g, contactIds: [...g.contactIds, contactId] }
              : g,
          ),
        })),

      removeContactFromGroup: (groupId, contactId) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId
              ? { ...g, contactIds: g.contactIds.filter((id) => id !== contactId) }
              : g,
          ),
        })),

      getGroupsForContact: (contactId) =>
        get().groups.filter((g) => g.contactIds.includes(contactId)),

      // ── AI memory ──────────────────────────────────────────────────────────

      recordUsage: ({ contactIds = [], groupIds = [] }, workflowCategory) => {
        if (!workflowCategory) return;
        const now = new Date().toISOString();
        set((s) => {
          const updated = [...s.memory];

          const upsert = (id: string, kind: 'contact' | 'group') => {
            const idx = updated.findIndex(
              (m) => m.id === id && m.kind === kind && m.workflowCategory === workflowCategory,
            );
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                usageCount: updated[idx].usageCount + 1,
                lastUsed: now,
              };
            } else {
              updated.push({ id, kind, workflowCategory, usageCount: 1, lastUsed: now });
            }
          };

          contactIds.forEach((id) => upsert(id, 'contact'));
          groupIds.forEach((id)   => upsert(id, 'group'));

          return { memory: updated };
        });
      },

      getSuggestionsForCategory: (category, limit = 5) => {
        const { memory } = get();
        // Exact category match first, then partial/tag match
        const exact = memory
          .filter((m) => m.workflowCategory.toLowerCase() === category.toLowerCase())
          .sort((a, b) => b.usageCount - a.usageCount || b.lastUsed.localeCompare(a.lastUsed))
          .slice(0, limit);

        if (exact.length >= limit) return exact;

        // Fuzzy: category word appears in each other's string
        const words = category.toLowerCase().split(/\s+/);
        const fuzzy = memory
          .filter(
            (m) =>
              !exact.find((e) => e.id === m.id && e.kind === m.kind) &&
              words.some((w) => m.workflowCategory.toLowerCase().includes(w)),
          )
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit - exact.length);

        return [...exact, ...fuzzy];
      },

      clearMemory: () => set({ memory: [] }),
    }),
    {
      name: 'contact-groups-v1',
    },
  ),
);
