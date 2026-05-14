'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ReactFlowProvider } from 'reactflow';
import { workflowApi, type WorkflowDefinitionDto } from '@/lib/api';
import { useWorkflowStore } from '@/store/workflowStore';
import WorkflowCanvas from '@/components/workflow/WorkflowCanvas';
import NodePalette from '@/components/workflow/NodePalette';
import PropertiesPanel from '@/components/workflow/PropertiesPanel';
import WorkflowToolbar from '@/components/workflow/WorkflowToolbar';

export default function WorkflowBuilderPage() {
  const params  = useParams<{ id: string }>();
  const router  = useRouter();
  const id      = params?.id ?? '';

  const [workflow,  setWorkflow]  = useState<WorkflowDefinitionDto | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [isSaving,  setIsSaving]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const loadFromJson  = useWorkflowStore((s) => s.loadFromJson);
  const exportToJson  = useWorkflowStore((s) => s.exportToJson);
  const isDirty       = useWorkflowStore((s) => s.isDirty);
  const reset         = useWorkflowStore((s) => s.reset);

  // Load workflow definition
  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const res = await workflowApi.getById(id);
        setWorkflow(res.data);
        loadFromJson(res.data.jsonDefinition);
      } catch {
        setError('Failed to load workflow. It may have been deleted.');
      } finally {
        setLoading(false);
      }
    })();
    return () => { reset(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!workflow) return;
    setIsSaving(true);
    try {
      const json = exportToJson();
      const res  = await workflowApi.update(id, {
        name:           workflow.name,
        description:    workflow.description,
        category:       workflow.category,
        jsonDefinition: json,
      });
      setWorkflow(res.data);
      // Mark store as clean
      useWorkflowStore.setState({ isDirty: false });
    } catch {
      alert('Save failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [workflow, id, exportToJson]);

  const handlePublish = useCallback(async () => {
    if (!workflow) return;
    if (!confirm('Publish this workflow? It will be available for triggering.')) return;
    try {
      await workflowApi.publish(id);
      setWorkflow((prev) => prev ? { ...prev, status: 'Published' } : prev);
    } catch {
      alert('Publish failed. Please try again.');
    }
  }, [workflow, id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-slate-400">Loading workflow…</div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="text-4xl">⚠</div>
        <p className="text-slate-500">{error ?? 'Workflow not found'}</p>
        <button
          onClick={() => router.push('/dashboard/workflows')}
          className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50"
        >
          Back to Workflows
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <WorkflowToolbar
        workflowName={workflow.name}
        status={workflow.status}
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onPublish={handlePublish}
        onBack={() => router.push('/dashboard/workflows')}
      />

      <div className="flex flex-1 overflow-hidden">
        <NodePalette />

        <ReactFlowProvider>
          <WorkflowCanvas />
        </ReactFlowProvider>

        <PropertiesPanel />
      </div>
    </div>
  );
}
