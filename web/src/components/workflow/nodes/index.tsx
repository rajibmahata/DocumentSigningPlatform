'use client';
import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { WorkflowNodeData } from '@/store/workflowStore';

// ── Base node shell ────────────────────────────────────────────────────────────

function BaseNode({
  id,
  data,
  selected,
  color,
  icon,
  sourceHandles = true,
  targetHandles = true,
}: NodeProps<WorkflowNodeData> & {
  color: string;
  icon: string;
  sourceHandles?: boolean;
  targetHandles?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl shadow-lg border-2 min-w-[160px] max-w-[200px] transition-all ${
        selected ? 'ring-2 ring-offset-2 ring-blue-400' : ''
      }`}
      style={{ borderColor: color, background: `${color}15` }}
    >
      {targetHandles && (
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-slate-400" />
      )}

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{icon}</span>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
            {data.label}
          </span>
        </div>
        {data.config && Object.keys(data.config).length > 0 && (
          <div className="text-xs text-slate-500 truncate">
            {Object.entries(data.config)
              .filter(([, v]) => v)
              .slice(0, 2)
              .map(([k, v]) => `${k}: ${String(v).slice(0, 20)}`)
              .join(' · ')}
          </div>
        )}
      </div>

      {sourceHandles && (
        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-slate-400" />
      )}
    </div>
  );
}

// ── 1. Start ───────────────────────────────────────────────────────────────────

export const StartNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} color="#22c55e" icon="▶" targetHandles={false} />
));
StartNode.displayName = 'StartNode';

// ── 2. End ────────────────────────────────────────────────────────────────────

export const EndNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} color="#64748b" icon="⏹" sourceHandles={false} />
));
EndNode.displayName = 'EndNode';

// ── 3. Approval ───────────────────────────────────────────────────────────────

export const ApprovalNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} color="#f59e0b" icon="✅" />
));
ApprovalNode.displayName = 'ApprovalNode';

// ── 4. Send Email ─────────────────────────────────────────────────────────────

export const EmailNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} color="#3b82f6" icon="✉" />
));
EmailNode.displayName = 'EmailNode';

// ── 5. Delay ─────────────────────────────────────────────────────────────────

export const DelayNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} color="#8b5cf6" icon="⏱" />
));
DelayNode.displayName = 'DelayNode';

// ── 6. Condition ─────────────────────────────────────────────────────────────

export function ConditionNode(props: NodeProps<WorkflowNodeData>) {
  const { data, selected } = props;
  return (
    <div
      className={`relative flex items-center justify-center transition-all ${selected ? 'ring-2 ring-offset-2 ring-blue-400' : ''}`}
      style={{ width: 120, height: 80 }}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-slate-400" />
      {/* Diamond shape */}
      <div
        className="flex flex-col items-center justify-center"
        style={{
          width: 100,
          height: 60,
          background: '#fff7ed',
          border: '2px solid #f97316',
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        }}
      />
      <div className="absolute text-xs font-semibold text-orange-600 text-center leading-tight px-2">
        <div>🔀</div>
        <div className="truncate max-w-[80px]">{data.label}</div>
      </div>
      {/* True handle (right) */}
      <Handle type="source" position={Position.Right} id="true" className="!w-3 !h-3 !bg-green-400" style={{ top: '30%' }} />
      {/* False handle (bottom) */}
      <Handle type="source" position={Position.Bottom} id="false" className="!w-3 !h-3 !bg-red-400" />
    </div>
  );
}

// ── 7. Document Template ──────────────────────────────────────────────────────

export const DocumentTemplateNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} color="#6366f1" icon="📄" />
));
DocumentTemplateNode.displayName = 'DocumentTemplateNode';

// ── 8. Signature Request ──────────────────────────────────────────────────────

export const SignatureRequestNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} color="#14b8a6" icon="✍" />
));
SignatureRequestNode.displayName = 'SignatureRequestNode';

// ── 9. Webhook ────────────────────────────────────────────────────────────────

export const WebhookNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} color="#ec4899" icon="🔗" />
));
WebhookNode.displayName = 'WebhookNode';

// ── 10. AI Action ─────────────────────────────────────────────────────────────

export const AIActionNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} color="#7c3aed" icon="🤖" />
));
AIActionNode.displayName = 'AIActionNode';

// ── nodeTypes map for React Flow ──────────────────────────────────────────────

export const nodeTypes = {
  start:             StartNode,
  end:               EndNode,
  approval:          ApprovalNode,
  sendEmail:         EmailNode,
  delay:             DelayNode,
  condition:         ConditionNode,
  documentTemplate:  DocumentTemplateNode,
  signatureRequest:  SignatureRequestNode,
  webhook:           WebhookNode,
  aiAction:          AIActionNode,
} as const;

export type WorkflowNodeType = keyof typeof nodeTypes;
