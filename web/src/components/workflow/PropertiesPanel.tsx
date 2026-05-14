'use client';
import { useWorkflowStore } from '@/store/workflowStore';
import type { ChangeEvent } from 'react';
import ContactGroupPicker, { type RecipientSelection } from './ContactGroupPicker';

// ── Fields that use the generic input renderer ─────────────────────────────
const fieldsByType: Record<string, { key: string; label: string; placeholder?: string; type?: string }[]> = {
  approval: [
    { key: 'approverEmail', label: 'Approver Email', placeholder: 'approver@company.com' },
    { key: 'approverRole',  label: 'Approver Role',  placeholder: 'manager' },
    { key: 'timeoutHours',  label: 'Timeout (hours)', placeholder: '48', type: 'number' },
  ],
  // sendEmail handled separately (uses ContactGroupPicker for "to")
  sendEmail: [
    { key: 'subject',    label: 'Subject', placeholder: 'Please review...' },
    { key: 'body',       label: 'Body',    placeholder: 'Hello {{signer.name}},\n\nPlease review...', type: 'textarea' },
    { key: 'templateId', label: 'Email Template ID (optional)' },
  ],
  delay: [
    { key: 'delayHours', label: 'Delay Hours', placeholder: '24', type: 'number' },
    { key: 'delayDays',  label: 'Delay Days',  placeholder: '0',  type: 'number' },
  ],
  condition: [
    { key: 'expression',  label: 'Expression',  placeholder: 'status == "signed"' },
    { key: 'trueLabel',   label: 'True Label',  placeholder: 'Yes' },
    { key: 'falseLabel',  label: 'False Label', placeholder: 'No' },
  ],
  documentTemplate: [
    { key: 'templateId',  label: 'Document Template ID' },
    { key: 'variables',   label: 'Variables (JSON)',    placeholder: '{}', type: 'textarea' },
  ],
  // signatureRequest handled separately (uses ContactGroupPicker for "signerEmail")
  signatureRequest: [
    { key: 'templateId',    label: 'Document Template ID' },
    { key: 'expiresInDays', label: 'Expires In Days', placeholder: '7', type: 'number' },
  ],
  webhook: [
    { key: 'url',          label: 'URL',          placeholder: 'https://...' },
    { key: 'method',       label: 'HTTP Method',  placeholder: 'POST' },
    { key: 'bodyTemplate', label: 'Body (JSON)',  placeholder: '{"key":"value"}', type: 'textarea' },
  ],
  aiAction: [
    { key: 'action',     label: 'Action', placeholder: 'summarise | classify | extract' },
    { key: 'documentId', label: 'Document ID', placeholder: '{{documentId}}' },
  ],
};

// ── Helper — extract / save RecipientSelection stored inside node config ──────
function getRecipients(config: Record<string, unknown>, key: string): RecipientSelection {
  const raw = config[key];
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Partial<RecipientSelection>;
    return {
      contactIds: Array.isArray(r.contactIds) ? (r.contactIds as string[]) : [],
      groupIds:   Array.isArray(r.groupIds)   ? (r.groupIds   as string[]) : [],
      emails:     Array.isArray(r.emails)     ? (r.emails     as string[]) : [],
    };
  }
  // Migrate legacy plain-string value
  const legacyStr = typeof raw === 'string' && raw ? raw : '';
  const emails = legacyStr
    .split(/[;,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));
  return { contactIds: [], groupIds: [], emails };
}

export default function PropertiesPanel() {
  const nodes          = useWorkflowStore((s) => s.nodes);
  const selectedId     = useWorkflowStore((s) => s.selectedNodeId);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const deleteNode     = useWorkflowStore((s) => s.deleteNode);
  const selectNode     = useWorkflowStore((s) => s.selectNode);

  const node = nodes.find((n) => n.id === selectedId);

  // workflow category hint — stored by the canvas when a template is loaded
  // falls back to empty string so AI suggestions are silent until data exists
  const workflowCategory = (nodes[0]?.data?.config?.templateCategory as string) ?? '';

  if (!node) {
    return (
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Properties</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="text-3xl mb-2">🖱</div>
            <p className="text-sm text-slate-400">Click a node on the canvas to edit its properties</p>
          </div>
        </div>
      </aside>
    );
  }

  const fields = fieldsByType[node.type ?? ''] ?? [];

  const handleLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateNodeData(node.id, { label: e.target.value });
  };

  const handleConfigChange = (key: string, value: string) => {
    updateNodeData(node.id, { config: { ...node.data.config, [key]: value } });
  };

  return (
    <aside className="w-64 bg-white border-l border-slate-200 flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Properties</h2>
        <button
          onClick={() => selectNode(null)}
          className="text-slate-400 hover:text-slate-600 text-xs"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Node type badge */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 capitalize">
            {node.type}
          </span>
          <span className="text-xs text-slate-400 font-mono truncate">{node.id}</span>
        </div>

        {/* Label */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
          <input
            type="text"
            value={node.data.label}
            onChange={handleLabelChange}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type-specific config fields */}
        {fields.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-3">
              Configuration
            </div>

            {/* ── Recipient picker for sendEmail ── */}
            {node.type === 'sendEmail' && (
              <ContactGroupPicker
                label="To"
                value={getRecipients(node.data.config, 'recipients')}
                workflowCategory={workflowCategory}
                onChange={(v) => updateNodeData(node.id, { config: { ...node.data.config, recipients: v } })}
              />
            )}

            {/* ── Recipient picker for signatureRequest ── */}
            {node.type === 'signatureRequest' && (
              <ContactGroupPicker
                label="Signer(s)"
                value={getRecipients(node.data.config, 'signers')}
                workflowCategory={workflowCategory}
                onChange={(v) => updateNodeData(node.id, { config: { ...node.data.config, signers: v } })}
              />
            )}

            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={String(node.data.config[f.key] ?? '')}
                    placeholder={f.placeholder}
                    onChange={(e) => handleConfigChange(f.key, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                ) : (
                  <input
                    type={f.type ?? 'text'}
                    value={String(node.data.config[f.key] ?? '')}
                    placeholder={f.placeholder}
                    onChange={(e) => handleConfigChange(f.key, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete button */}
      {node.type !== 'start' && node.type !== 'end' && (
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => deleteNode(node.id)}
            className="w-full py-2 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete Node
          </button>
        </div>
      )}
    </aside>
  );
}
