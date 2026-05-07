/**
 * ContactGroupPicker
 *
 * A smart multi-select component for choosing email recipients inside a
 * workflow node. Supports:
 *   - Individual contacts (fetched from the API)
 *   - Contact Groups (from the local-first group store)
 *   - Free-form email entry
 *   - AI memory suggestions based on workflowCategory
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { signerContactApi } from '@/lib/api';
import type { SignerContactResponse } from '@/types';
import { useContactGroupStore, type ContactGroup } from '@/store/contactGroupStore';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RecipientSelection {
  contactIds: string[];
  groupIds:   string[];
  emails:     string[];    // free-form manual entries
}

interface Props {
  value:             RecipientSelection;
  onChange:          (v: RecipientSelection) => void;
  workflowCategory?: string;   // used for AI suggestions
  placeholder?:      string;
  label?:            string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_COLORS = [
  'bg-blue-200 text-blue-800',
  'bg-green-200 text-green-800',
  'bg-purple-200 text-purple-800',
  'bg-amber-200 text-amber-800',
  'bg-teal-200 text-teal-800',
  'bg-rose-200 text-rose-800',
];
function avatarColor(str: string) {
  let n = 0;
  for (let i = 0; i < str.length; i++) n += str.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

// ── Chip component ────────────────────────────────────────────────────────────

function Chip({
  label,
  sub,
  emoji,
  colorClass,
  onRemove,
}: {
  label: string;
  sub?: string;
  emoji?: string;
  colorClass: string;
  onRemove: () => void;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass} max-w-[180px]`}
    >
      {emoji && <span>{emoji}</span>}
      <span className="truncate">{label}</span>
      {sub && <span className="opacity-60 truncate">({sub})</span>}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 opacity-60 hover:opacity-100 shrink-0 leading-none"
      >
        ×
      </button>
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ContactGroupPicker({
  value,
  onChange,
  workflowCategory = '',
  placeholder = 'Add recipients…',
  label = 'To',
}: Props) {
  const [contacts, setContacts]       = useState<SignerContactResponse[]>([]);
  const [search, setSearch]           = useState('');
  const [open, setOpen]               = useState(false);
  const [activeTab, setActiveTab]     = useState<'contacts' | 'groups' | 'suggestions'>('contacts');
  const containerRef                  = useRef<HTMLDivElement>(null);

  const groups         = useContactGroupStore((s) => s.groups);
  const getSuggestions = useContactGroupStore((s) => s.getSuggestionsForCategory);

  // ── Fetch contacts once ─────────────────────────────────────────────────────
  useEffect(() => {
    signerContactApi.list().then((r) => setContacts(r.data)).catch(() => {});
  }, []);

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const q = search.toLowerCase().trim();
  const filteredContacts = contacts.filter(
    (c) =>
      c.isActive &&
      !value.contactIds.includes(c.id) &&
      (q === '' || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)),
  );
  const filteredGroups = groups.filter(
    (g) =>
      !value.groupIds.includes(g.id) &&
      (q === '' || g.name.toLowerCase().includes(q) || g.tags.some((t) => t.includes(q))),
  );

  // ── AI suggestions ──────────────────────────────────────────────────────────
  const suggestions = workflowCategory ? getSuggestions(workflowCategory, 6) : [];
  const suggestedContacts = suggestions
    .filter((s) => s.kind === 'contact')
    .map((s) => contacts.find((c) => c.id === s.id))
    .filter((c): c is SignerContactResponse => !!c && !value.contactIds.includes(c.id));
  const suggestedGroups = suggestions
    .filter((s) => s.kind === 'group')
    .map((s) => groups.find((g) => g.id === s.id))
    .filter((g): g is ContactGroup => !!g && !value.groupIds.includes(g.id));

  // ── Handlers ────────────────────────────────────────────────────────────────
  const selectContact = useCallback(
    (c: SignerContactResponse) => {
      onChange({ ...value, contactIds: [...value.contactIds, c.id] });
      setSearch('');
    },
    [value, onChange],
  );

  const selectGroup = useCallback(
    (g: ContactGroup) => {
      onChange({ ...value, groupIds: [...value.groupIds, g.id] });
      setSearch('');
    },
    [value, onChange],
  );

  const removeContact = (id: string) =>
    onChange({ ...value, contactIds: value.contactIds.filter((x) => x !== id) });

  const removeGroup = (id: string) =>
    onChange({ ...value, groupIds: value.groupIds.filter((x) => x !== id) });

  const removeEmail = (e: string) =>
    onChange({ ...value, emails: value.emails.filter((x) => x !== e) });

  const addFreeformEmail = () => {
    const trimmed = search.trim();
    if (isValidEmail(trimmed) && !value.emails.includes(trimmed)) {
      onChange({ ...value, emails: [...value.emails, trimmed] });
      setSearch('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && isValidEmail(search.trim())) {
      e.preventDefault();
      addFreeformEmail();
    }
    if (e.key === 'Escape') setOpen(false);
  };

  // ── Resolve selected chips for display ──────────────────────────────────────
  const selectedContactObjs = value.contactIds
    .map((id) => contacts.find((c) => c.id === id))
    .filter((c): c is SignerContactResponse => !!c);

  const selectedGroupObjs = value.groupIds
    .map((id) => groups.find((g) => g.id === id))
    .filter((g): g is ContactGroup => !!g);

  const hasAnything =
    selectedContactObjs.length > 0 ||
    selectedGroupObjs.length > 0 ||
    value.emails.length > 0;

  const tabCount = {
    contacts: filteredContacts.length,
    groups:   filteredGroups.length,
    suggestions: suggestedContacts.length + suggestedGroups.length,
  };

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="block text-xs font-medium text-slate-600">{label}</label>

      {/* ── Selected chips ── */}
      {hasAnything && (
        <div className="flex flex-wrap gap-1 mb-1">
          {selectedGroupObjs.map((g) => (
            <Chip
              key={g.id}
              emoji={g.emoji}
              label={g.name}
              sub={`${g.contactIds.length} members`}
              colorClass={g.color}
              onRemove={() => removeGroup(g.id)}
            />
          ))}
          {selectedContactObjs.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              sub={c.email}
              colorClass={avatarColor(c.name)}
              onRemove={() => removeContact(c.id)}
            />
          ))}
          {value.emails.map((e) => (
            <Chip
              key={e}
              label={e}
              colorClass="bg-slate-100 text-slate-600"
              onRemove={() => removeEmail(e)}
            />
          ))}
        </div>
      )}

      {/* ── Search input ── */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={hasAnything ? 'Add more…' : placeholder}
          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && isValidEmail(search.trim()) && (
          <button
            type="button"
            onClick={addFreeformEmail}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Add email ↵
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div className="relative z-50">
          <div className="absolute top-1 left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden max-h-72 flex flex-col">

            {/* Tabs */}
            <div className="flex border-b border-slate-100 shrink-0">
              {(['contacts', 'groups', 'suggestions'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 text-xs font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-blue-500 text-blue-700 bg-blue-50'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'suggestions' ? '✨ AI' : tab}
                  {tabCount[tab] > 0 && (
                    <span className="ml-1 text-xs opacity-60">({tabCount[tab]})</span>
                  )}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Contacts tab */}
              {activeTab === 'contacts' && (
                filteredContacts.length === 0
                  ? <p className="px-3 py-4 text-xs text-slate-400 text-center">No contacts found</p>
                  : filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectContact(c)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 transition-colors text-left"
                    >
                      <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColor(c.name)}`}>
                        {initials(c.name)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{c.name}</p>
                        <p className="text-xs text-slate-400 truncate">{c.email}</p>
                      </div>
                      <span className="text-xs text-slate-300 shrink-0 capitalize">{c.role}</span>
                    </button>
                  ))
              )}

              {/* Groups tab */}
              {activeTab === 'groups' && (
                filteredGroups.length === 0
                  ? <p className="px-3 py-4 text-xs text-slate-400 text-center">No groups found</p>
                  : filteredGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => selectGroup(g)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 transition-colors text-left"
                    >
                      <span className="text-base">{g.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{g.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {g.contactIds.length} member{g.contactIds.length !== 1 ? 's' : ''}
                          {g.description ? ` · ${g.description}` : ''}
                        </p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${g.color}`}>group</span>
                    </button>
                  ))
              )}

              {/* AI suggestions tab */}
              {activeTab === 'suggestions' && (
                suggestedContacts.length === 0 && suggestedGroups.length === 0
                  ? (
                    <div className="px-3 py-4 text-xs text-slate-400 text-center">
                      <p>No suggestions yet.</p>
                      <p className="mt-1 opacity-60">AI learns from past workflow usage — the more you use, the smarter it gets.</p>
                    </div>
                  )
                  : (
                    <>
                      {suggestedGroups.length > 0 && (
                        <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          Suggested Groups
                        </div>
                      )}
                      {suggestedGroups.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => selectGroup(g)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 transition-colors text-left"
                        >
                          <span className="text-base">{g.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-800 truncate">{g.name}</p>
                            <p className="text-xs text-slate-400">{g.contactIds.length} members</p>
                          </div>
                          <span className="text-xs text-blue-400">✨</span>
                        </button>
                      ))}
                      {suggestedContacts.length > 0 && (
                        <div className="px-3 pt-2 pb-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          Suggested Contacts
                        </div>
                      )}
                      {suggestedContacts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectContact(c)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 transition-colors text-left"
                        >
                          <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColor(c.name)}`}>
                            {initials(c.name)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-800 truncate">{c.name}</p>
                            <p className="text-xs text-slate-400 truncate">{c.email}</p>
                          </div>
                          <span className="text-xs text-blue-400">✨</span>
                        </button>
                      ))}
                    </>
                  )
              )}
            </div>

            {/* Footer hint */}
            <div className="border-t border-slate-50 px-3 py-1.5 bg-slate-50 shrink-0">
              <p className="text-[10px] text-slate-400">
                Type an email address and press <kbd className="font-mono">Enter</kbd> to add it manually.
                Groups expand to all members at send time.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
