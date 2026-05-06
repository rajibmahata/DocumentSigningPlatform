/**
 * Full-screen layout for the workflow builder.
 * Overrides the parent dashboard layout's max-width constraint.
 */
export default function WorkflowBuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 z-20">
      {children}
    </div>
  );
}
