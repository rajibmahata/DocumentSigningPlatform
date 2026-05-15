'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { libraryDocumentApi, LibraryDocumentSummaryDto } from '@/lib/api';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen,
  Plus,
  Search,
  Upload,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Send,
  Eye,
  Loader2,
  FileText,
  BookMarked,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const PURPOSE_COLORS: Record<string, string> = {
  OfferLetter:      'bg-blue-100 text-blue-800',
  NDA:              'bg-purple-100 text-purple-800',
  Contract:         'bg-indigo-100 text-indigo-800',
  VendorAgreement:  'bg-amber-100 text-amber-800',
  RentalAgreement:  'bg-teal-100 text-teal-800',
  Invoice:          'bg-green-100 text-green-800',
  HRForm:           'bg-rose-100 text-rose-800',
  Legal:            'bg-slate-100 text-slate-800',
  InternalApproval: 'bg-orange-100 text-orange-800',
  Other:            'bg-gray-100 text-gray-700',
};

const PURPOSES = [
  'OfferLetter','NDA','Contract','VendorAgreement','RentalAgreement',
  'Invoice','HRForm','Legal','InternalApproval','Other',
];

type TabKey = 'all' | 'mine' | 'samples';

export default function DocumentLibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey | null) ?? 'all';
  const [tab, setTab]         = useState<TabKey>(initialTab);
  const [docs, setDocs]       = useState<LibraryDocumentSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [purpose, setPurpose] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // New document dialog
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPurpose, setNewPurpose] = useState('Other');
  const [newDesc, setNewDesc] = useState('');
  const [newMode, setNewMode] = useState<'editor' | 'upload'>('editor');
  const [creating, setCreating] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | boolean> = {};
      if (search)  params.search  = search;
      if (purpose && purpose !== 'all') params.purpose = purpose;
      if (tab === 'samples') params.isSample = true;
      if (tab === 'mine')    params.isSample = false;

      const res = await libraryDocumentApi.getAll(params as Parameters<typeof libraryDocumentApi.getAll>[0]);
      setDocs(res.data);
    } catch {
      toast.error('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, [tab, search, purpose]);   // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await libraryDocumentApi.delete(deleteId);
      toast.success('Document deleted.');
      setDeleteId(null);
      fetchDocs();
    } catch {
      toast.error('Failed to delete document.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await libraryDocumentApi.duplicate(id);
      toast.success(`Duplicated as "${res.data.name}"`);
      fetchDocs();
    } catch {
      toast.error('Failed to duplicate document.');
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Name is required.'); return; }
    setCreating(true);
    try {
      if (newMode === 'upload' && uploadFile) {
        const res = await libraryDocumentApi.uploadFile(uploadFile, newName, newPurpose, newDesc);
        toast.success('Document uploaded.');
        setShowNew(false);
        router.push(`/dashboard/documents/${res.data.id}`);
      } else {
        const res = await libraryDocumentApi.create({
          name: newName, description: newDesc, purpose: newPurpose, fileType: 'html', editorContentHtml: '<p>Start writing your document here…</p>',
        });
        toast.success('Document created.');
        setShowNew(false);
        router.push(`/dashboard/documents/${res.data.id}`);
      }
    } catch {
      toast.error('Failed to create document.');
    } finally {
      setCreating(false);
    }
  };

  const badgeClass = (p: string) => PURPOSE_COLORS[p] ?? PURPOSE_COLORS.Other;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Document Library</h1>
            <p className="text-sm text-muted-foreground">Manage, author, and reuse documents across envelopes, templates and workflows.</p>
          </div>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Document
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['all','mine','samples'] as TabKey[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'all' ? 'All Documents' : t === 'mine' ? 'My Documents' : 'Sample Documents'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={purpose} onValueChange={setPurpose}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All purposes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All purposes</SelectItem>
            {PURPOSES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-3">
          <FileText className="h-12 w-12 mx-auto opacity-30" />
          <p className="text-lg font-medium">No documents found</p>
          <p className="text-sm">Create a new document or adjust your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {docs.map(doc => (
            <div key={doc.id} className="border rounded-xl bg-card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
              {/* Card top */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{doc.name}</p>
                  {doc.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{doc.description}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/documents/${doc.id}`}><Edit className="h-4 w-4 mr-2" /> Edit</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/documents/${doc.id}?preview=1`}><Eye className="h-4 w-4 mr-2" /> Preview</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(doc.id)}>
                      <Copy className="h-4 w-4 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/send?libDocId=${doc.id}`}><Send className="h-4 w-4 mr-2" /> Use in Envelope</Link>
                    </DropdownMenuItem>
                    {!doc.isSample && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(doc.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass(doc.purpose)}`}>{doc.purpose}</span>
                {doc.isSample && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800"><BookMarked className="h-3 w-3 inline mr-1" />Sample</span>}
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground uppercase">{doc.fileType}</span>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-1">
                <span className="text-xs text-muted-foreground">{new Date(doc.updatedAt).toLocaleDateString()}</span>
                <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                  <Link href={`/dashboard/documents/${doc.id}`}>{doc.isSample ? 'View' : 'Edit'}</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Document?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. The document and its physical file will be permanently removed.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Document Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create New Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button variant={newMode === 'editor' ? 'default' : 'outline'} size="sm" onClick={() => setNewMode('editor')}>
                <Edit className="h-4 w-4 mr-1" /> Write in Editor
              </Button>
              <Button variant={newMode === 'upload' ? 'default' : 'outline'} size="sm" onClick={() => setNewMode('upload')}>
                <Upload className="h-4 w-4 mr-1" /> Upload File
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium">Document Name *</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Employment Offer Letter" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Purpose</label>
              <Select value={newPurpose} onValueChange={setNewPurpose}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PURPOSES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional description" className="mt-1" />
            </div>

            {newMode === 'upload' && (
              <div>
                <label className="text-sm font-medium">File (PDF, DOCX, TXT, HTML — max 20 MB)</label>
                <div className="mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => fileRef.current?.click()}>
                  {uploadFile ? (
                    <p className="text-sm font-medium">{uploadFile.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to select a file</p>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.html" className="hidden" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {newMode === 'upload' ? 'Upload & Save' : 'Create & Edit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
