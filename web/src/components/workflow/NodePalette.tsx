'use client';
import { useWorkflowStore } from '@/store/workflowStore';

interface PaletteItem {
  type: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const palette: PaletteItem[] = [
  { type: 'start',            label: 'Start',             icon: '▶',  color: '#22c55e', description: 'Trigger entry point' },
  { type: 'end',              label: 'End',               icon: '⏹',  color: '#64748b', description: 'Workflow termination' },
  { type: 'approval',         label: 'Approval',          icon: '✅', color: '#f59e0b', description: 'Human approval step' },
  { type: 'sendEmail',        label: 'Send Email',        icon: '✉',  color: '#3b82f6', description: 'Send an email notification' },
  { type: 'delay',            label: 'Delay',             icon: '⏱',  color: '#8b5cf6', description: 'Wait for a period of time' },
  { type: 'condition',        label: 'Condition',         icon: '🔀', color: '#f97316', description: 'Branch based on condition' },
  { type: 'documentTemplate', label: 'Doc Template',      icon: '📄', color: '#6366f1', description: 'Fill a document template' },
  { type: 'signatureRequest', label: 'Signature Request', icon: '✍',  color: '#14b8a6', description: 'Request a signature' },
  { type: 'webhook',          label: 'Webhook',           icon: '🔗', color: '#ec4899', description: 'Call an external endpoint' },
  { type: 'aiAction',         label: 'AI Action',         icon: '🤖', color: '#7c3aed', description: 'Run an AI operation' },
];

export default function NodePalette() {
  const addNode = useWorkflowStore((s) => s.addNode);

  const onDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/workflow-node', JSON.stringify({ type: item.type, label: item.label }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Node Types</h2>
        <p className="text-xs text-slate-400 mt-0.5">Drag or click to add</p>
      </div>
      <div className="flex-1 p-2 space-y-1">
        {palette.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item)}
            title={item.description}
            onClick={() =>
              addNode(item.type, item.label, {
                x: 300 + Math.random() * 100,
                y: 100 + Math.random() * 200,
              })
            }
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-colors text-left group cursor-grab active:cursor-grabbing select-none"
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: `${item.color}20`, color: item.color }}
            >
              {item.icon}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-700 truncate">{item.label}</div>
              <div className="text-xs text-slate-400 truncate">{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
