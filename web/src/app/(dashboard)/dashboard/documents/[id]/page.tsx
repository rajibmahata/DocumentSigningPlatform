'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { libraryDocumentApi, LibraryDocumentDto, UpdateLibraryDocumentRequest } from '@/lib/api';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Code, Quote, Minus, Undo, Redo,
  Save, ArrowLeft, Copy, Eye, EyeOff, Loader2, Info,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PURPOSES = [
  'OfferLetter','NDA','Contract','VendorAgreement','RentalAgreement',
  'Invoice','HRForm','Legal','InternalApproval','Other',
];

const MERGE_TAGS = [
  '{{SignerName}}','{{Date}}','{{CompanyName}}','{{SignerEmail}}',
  '{{JobTitle}}','{{Salary}}','{{StartDate}}','{{EndDate}}',
  '{{PartyA}}','{{PartyB}}','{{Address}}','{{Amount}}',
];

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPreview = searchParams.get('preview') === '1';

  const [doc, setDoc]         = useState<LibraryDocumentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [preview, setPreview] = useState(isPreview);
  const [name, setName]       = useState('');
  const [purpose, setPurpose] = useState('Other');
  const [category, setCategory] = useState('');
  const [description, setDesc] = useState('');
  const [dirty, setDirty]     = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
    editable: true,
    onUpdate: () => setDirty(true),
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await libraryDocumentApi.getById(id);
        setDoc(res.data);
        setName(res.data.name);
        setPurpose(res.data.purpose);
        setCategory(res.data.category ?? '');
        setDesc(res.data.description ?? '');
        editor?.commands.setContent(res.data.editorContentHtml ?? '<p></p>');
        await libraryDocumentApi.touch(id);
      } catch {
        toast.error('Failed to load document.');
        router.push('/dashboard/documents');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, editor]);   // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!doc || !editor) return;
    setSaving(true);
    try {
      const payload: UpdateLibraryDocumentRequest = {
        name, purpose, category: category || undefined,
        description: description || undefined,
        editorContentHtml: editor.getHTML(),
      };
      const res = await libraryDocumentApi.update(id, payload);
      setDoc(res.data);
      setDirty(false);
      toast.success('Document saved.');
    } catch {
      toast.error('Failed to save document.');
    } finally {
      setSaving(false);
    }
  };

  const insertMergeTag = (tag: string) => {
    editor?.commands.insertContent(tag);
    editor?.commands.focus();
  };

  const handleDuplicate = async () => {
    try {
      const res = await libraryDocumentApi.duplicate(id);
      toast.success(`Duplicated as "${res.data.name}"`);
      router.push(`/dashboard/documents/${res.data.id}`);
    } catch {
      toast.error('Failed to duplicate.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background sticky top-0 z-10 gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/documents"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <Input
            value={name}
            onChange={e => { setName(e.target.value); setDirty(true); }}
            className="w-64 font-medium border-none shadow-none focus-visible:ring-0 text-base px-0"
            disabled={doc.isSample}
          />
          {doc.isSample && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">Sample</span>
          )}
          {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
        </div>
        <div className="flex items-center gap-2">
          {doc.isSample && (
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-2" /> Create a Copy
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setPreview(!preview)}>
            {preview ? <><EyeOff className="h-4 w-4 mr-2" /> Edit</> : <><Eye className="h-4 w-4 mr-2" /> Preview</>}
          </Button>
          {!doc.isSample && (
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Formatting toolbar */}
          {!preview && !doc.isSample && editor && (
            <div className="flex flex-wrap items-center gap-0.5 px-4 py-2 border-b bg-muted/30 sticky top-[57px] z-10">
              <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="h-4 w-4" /></ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="h-4 w-4" /></ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon className="h-4 w-4" /></ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough className="h-4 w-4" /></ToolBtn>
              <div className="w-px h-5 bg-border mx-1" />
              <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1"><Heading1 className="h-4 w-4" /></ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2"><Heading2 className="h-4 w-4" /></ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3"><Heading3 className="h-4 w-4" /></ToolBtn>
              <div className="w-px h-5 bg-border mx-1" />
              <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left"><AlignLeft className="h-4 w-4" /></ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center"><AlignCenter className="h-4 w-4" /></ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right"><AlignRight className="h-4 w-4" /></ToolBtn>
              <div className="w-px h-5 bg-border mx-1" />
              <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List"><List className="h-4 w-4" /></ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List"><ListOrdered className="h-4 w-4" /></ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote"><Quote className="h-4 w-4" /></ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code"><Code className="h-4 w-4" /></ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Horizontal Rule"><Minus className="h-4 w-4" /></ToolBtn>
              <div className="w-px h-5 bg-border mx-1" />
              <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo"><Undo className="h-4 w-4" /></ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo"><Redo className="h-4 w-4" /></ToolBtn>
            </div>
          )}

          {/* Editor / Preview */}
          <div className="flex-1 max-w-4xl mx-auto w-full px-8 py-8">
            {preview ? (
              <div
                className="prose prose-sm max-w-none min-h-[500px] rounded-xl border p-8 bg-white shadow-sm"
                dangerouslySetInnerHTML={{ __html: editor?.getHTML() ?? doc.editorContentHtml ?? '' }}
              />
            ) : (
              <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                <EditorContent
                  editor={editor}
                  className="prose prose-sm max-w-none p-8 min-h-[500px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 border-l bg-muted/20 flex flex-col overflow-y-auto p-4 gap-6 shrink-0">
          {/* Metadata */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Document Settings</h3>
            <div>
              <label className="text-xs text-muted-foreground">Purpose</label>
              <Select value={purpose} onValueChange={(v: string) => { setPurpose(v); setDirty(true); }} disabled={doc.isSample}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PURPOSES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Category</label>
              <Input value={category} onChange={e => { setCategory(e.target.value); setDirty(true); }} placeholder="e.g. HR" className="mt-1 h-8 text-xs" disabled={doc.isSample} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <Input value={description} onChange={e => { setDesc(e.target.value); setDirty(true); }} placeholder="Brief description" className="mt-1 h-8 text-xs" disabled={doc.isSample} />
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Version: <span className="font-medium text-foreground">v{doc.version}</span></p>
              <p>Type: <span className="font-medium text-foreground uppercase">{doc.fileType}</span></p>
              <p>Last saved: <span className="font-medium text-foreground">{new Date(doc.updatedAt).toLocaleString()}</span></p>
            </div>
          </div>

          {/* Merge tags */}
          {!preview && !doc.isSample && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-1">
                Merge Tags
                <span title="Click to insert into document"><Info className="h-3.5 w-3.5 text-muted-foreground" /></span>
              </h3>
              <div className="flex flex-wrap gap-1">
                {MERGE_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => insertMergeTag(tag)}
                    className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 rounded font-mono transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">These placeholders will be replaced when the document is used in an envelope.</p>
            </div>
          )}

          {doc.isSample && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 space-y-2">
              <p className="text-xs font-medium text-yellow-800">Sample Document</p>
              <p className="text-xs text-yellow-700">This is a read-only system template. Duplicate it to create your own editable version.</p>
              <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={handleDuplicate}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Create a Copy
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  onClick, active, title, children,
}: { onClick: () => void; active: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
