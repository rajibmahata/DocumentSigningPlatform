'use client';
import { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type OnSelectionChangeParams,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWorkflowStore } from '@/store/workflowStore';
import { nodeTypes } from './nodes';

export default function WorkflowCanvas() {
  const nodes          = useWorkflowStore((s) => s.nodes);
  const edges          = useWorkflowStore((s) => s.edges);
  const onNodesChange  = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange  = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect      = useWorkflowStore((s) => s.onConnect);
  const selectNode     = useWorkflowStore((s) => s.selectNode);
  const addNode        = useWorkflowStore((s) => s.addNode);

  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleSelectionChange = ({ nodes: selected }: OnSelectionChangeParams) => {
    selectNode(selected.length === 1 ? selected[0].id : null);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/workflow-node');
    if (!raw) return;

    let nodeData: { type: string; label: string };
    try { nodeData = JSON.parse(raw); } catch { return; }

    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addNode(nodeData.type, nodeData.label, position);
  }, [screenToFlowPosition, addNode]);

  return (
    <div ref={wrapperRef} className="flex-1 relative bg-slate-50" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode="Backspace"
        multiSelectionKeyCode="Shift"
        className="bg-slate-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const colors: Record<string, string> = {
              start: '#22c55e', end: '#64748b', approval: '#f59e0b',
              sendEmail: '#3b82f6', delay: '#8b5cf6', condition: '#f97316',
              documentTemplate: '#6366f1', signatureRequest: '#14b8a6',
              webhook: '#ec4899', aiAction: '#7c3aed',
            };
            return colors[n.type ?? ''] ?? '#94a3b8';
          }}
          maskColor="rgba(241,245,249,0.6)"
          style={{ background: 'white', border: '1px solid #e2e8f0' }}
        />
      </ReactFlow>

      {/* Empty state overlay */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center p-8 rounded-2xl bg-white/80 border border-slate-200 shadow">
            <div className="text-4xl mb-3">🖱</div>
            <p className="text-sm font-medium text-slate-600">Drag a node from the palette or click to add</p>
            <p className="text-xs text-slate-400 mt-1">Connect node handles to build your workflow</p>
          </div>
        </div>
      )}
    </div>
  );
}
