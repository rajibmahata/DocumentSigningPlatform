import { create } from 'zustand';
import { type Node, type Edge, addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import type { NodeChange, EdgeChange, Connection } from 'reactflow';
import { nanoid } from 'nanoid';

export interface WorkflowNodeData {
  label: string;
  config: Record<string, unknown>;
}

interface WorkflowState {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  isDirty: boolean;

  // Node operations
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (type: string, label: string, position?: { x: number; y: number }) => void;
  updateNodeData: (id: string, data: Partial<WorkflowNodeData>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;

  // Serialise / deserialise
  loadFromJson: (json: string) => void;
  exportToJson: (variables?: unknown[], settings?: unknown) => string;
  reset: () => void;
}

const initialNodes: Node<WorkflowNodeData>[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 100, y: 200 },
    data: { label: 'Start', config: {} },
  },
  {
    id: 'end-1',
    type: 'end',
    position: { x: 700, y: 200 },
    data: { label: 'End', config: {} },
  },
];

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: initialNodes,
  edges: [],
  selectedNodeId: null,
  isDirty: false,

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) as Node<WorkflowNodeData>[], isDirty: true })),

  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges), isDirty: true })),

  onConnect: (connection) =>
    set((s) => ({
      edges: addEdge({ ...connection, id: nanoid(8) }, s.edges),
      isDirty: true,
    })),

  addNode: (type, label, position = { x: 300, y: 200 }) => {
    const id = `${type}-${nanoid(6)}`;
    const node: Node<WorkflowNodeData> = {
      id,
      type,
      position,
      data: { label, config: {} },
    };
    set((s) => ({ nodes: [...s.nodes, node], isDirty: true }));
  },

  updateNodeData: (id, data) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data, config: { ...n.data.config, ...(data.config ?? {}) } } } : n,
      ),
      isDirty: true,
    })),

  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      isDirty: true,
    })),

  selectNode: (id) => set({ selectedNodeId: id }),

  loadFromJson: (json) => {
    try {
      const parsed = JSON.parse(json);
      set({
        nodes: (parsed.nodes ?? []) as Node<WorkflowNodeData>[],
        edges: (parsed.edges ?? []) as Edge[],
        isDirty: false,
      });
    } catch {
      // invalid JSON — keep current state
    }
  },

  exportToJson: (variables = [], settings = {}) => {
    const { nodes, edges } = get();
    return JSON.stringify({ nodes, edges, variables, settings }, null, 2);
  },

  reset: () =>
    set({
      nodes: initialNodes,
      edges: [],
      selectedNodeId: null,
      isDirty: false,
    }),
}));
