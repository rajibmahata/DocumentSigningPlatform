'use client';

interface WorkflowToolbarProps {
  workflowName: string;
  status: string;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onPublish: () => void;
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  Draft:     'bg-yellow-100 text-yellow-700',
  Published: 'bg-green-100  text-green-700',
  Archived:  'bg-slate-100  text-slate-600',
};

export default function WorkflowToolbar({
  workflowName,
  status,
  isDirty,
  isSaving,
  onSave,
  onPublish,
  onBack,
}: WorkflowToolbarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 flex-shrink-0">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        ← Back
      </button>

      <div className="h-5 border-l border-slate-200" />

      {/* Name + status */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-semibold text-slate-800 truncate">{workflowName}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] ?? statusColors.Draft}`}>
          {status}
        </span>
        {isDirty && <span className="text-xs text-slate-400 italic">Unsaved changes</span>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={isSaving || !isDirty}
          className="px-4 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>

        {status !== 'Published' && (
          <button
            onClick={onPublish}
            disabled={isDirty}
            title={isDirty ? 'Save first to publish' : 'Publish workflow'}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Publish
          </button>
        )}
      </div>
    </header>
  );
}
