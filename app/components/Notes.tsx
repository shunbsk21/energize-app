// ...existing code...
import React, { useEffect, useMemo, useState } from 'react';

interface NoteItem {
  id: string;
  title?: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  archived?: boolean;
  deleted?: boolean; // logical delete
}

const STORAGE_KEY = 'energize_notes_v1';

const defaultNow = () => new Date().toISOString();

const parseNotesFromStorage = (): NoteItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NoteItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveNotesToStorage = (notes: NoteItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {}
};

const Notes: React.FC<{
  notes?: NoteItem[]; // optional initial
  onAddNote?: (n: Omit<NoteItem, 'id'|'createdAt'|'updatedAt'>) => void;
  onUpdateNote?: (n: NoteItem) => void;
}> = ({ notes: initialNotes, onAddNote, onUpdateNote }) => {
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    if (initialNotes && initialNotes.length) return initialNotes;
    if (typeof window !== 'undefined') return parseNotesFromStorage();
    return [];
  });

  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewArchived, setViewArchived] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null);

  useEffect(() => { saveNotesToStorage(notes); }, [notes]);

  // derived tag list from all non-deleted notes
  const allTags = useMemo(() => {
    const s = new Set<string>();
    notes.forEach(n => {
      if (n.deleted) return;
      (n.tags || []).forEach(t => s.add(t));
    });
    return Array.from(s).sort();
  }, [notes]);

  const visibleNotes = useMemo(() => {
    return notes
      .filter(n => !n.deleted)
      .filter(n => (viewArchived ? !!n.archived : !n.archived))
      .filter(n => {
        if (!query.trim() && !selectedTag) return true;
        const tq = query.trim().toLowerCase();
        const inText = (!tq) || ((n.title || '').toLowerCase().includes(tq) || n.body.toLowerCase().includes(tq));
        const inTag = !selectedTag || (n.tags || []).includes(selectedTag);
        return inText && inTag;
      })
      .sort((a,b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
  }, [notes, query, selectedTag, viewArchived]);

  // helpers
  const createNote = (title: string, body: string, tags: string[]) => {
    const n: NoteItem = { id: String(Date.now()), title: title || undefined, body, tags, createdAt: defaultNow(), updatedAt: defaultNow(), archived: false, deleted: false };
    setNotes(prev => { const next = [n, ...prev]; saveNotesToStorage(next); return next; });
    onAddNote?.({ title: n.title, body: n.body, tags: n.tags, archived: n.archived, deleted: n.deleted });
    setIsCreateOpen(false);
    setActiveNote(n);
  };

  const updateNote = (updated: NoteItem) => {
    updated.updatedAt = defaultNow();
    setNotes(prev => {
      const next = prev.map(p => p.id === updated.id ? updated : p);
      saveNotesToStorage(next);
      return next;
    });
    onUpdateNote?.(updated);
    setActiveNote(updated);
  };

  const archiveNote = (id: string) => {
    setNotes(prev => {
      const next = prev.map(n => n.id === id ? {...n, archived: true, updatedAt: defaultNow()} : n);
      saveNotesToStorage(next);
      return next;
    });
    if (activeNote && activeNote.id === id) setActiveNote(prev => prev ? {...prev, archived: true} : prev);
  };

  const unarchiveNote = (id: string) => {
    setNotes(prev => {
      const next = prev.map(n => n.id === id ? {...n, archived: false, updatedAt: defaultNow()} : n);
      saveNotesToStorage(next);
      return next;
    });
    if (activeNote && activeNote.id === id) setActiveNote(prev => prev ? {...prev, archived: false} : prev);
  };

  const logicalDeleteNote = (id: string) => {
    setNotes(prev => {
      const next = prev.map(n => n.id === id ? {...n, deleted: true, updatedAt: defaultNow()} : n);
      saveNotesToStorage(next);
      return next;
    });
    if (activeNote && activeNote.id === id) setActiveNote(null);
  };

  // UI components for modals and tag parsing
  const parseTagsInput = (s: string) => {
    return s.split(',').map(t => t.trim()).filter(Boolean).map(t => t.replace(/\s+/g,'-').toLowerCase());
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-xl font-bold">メモ</h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md bg-gray-100 p-1">
            <button onClick={() => { setViewArchived(false); setSelectedTag(null); setQuery(''); }} className={`px-3 py-1 text-sm rounded ${!viewArchived ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'}`}>Notes</button>
            <button onClick={() => { setViewArchived(true); setSelectedTag(null); setQuery(''); }} className={`px-3 py-1 text-sm rounded ${viewArchived ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'}`}>アーカイブ</button>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="検索（タイトル・本文）" className="p-2 border rounded w-full" />
        <div className="col-span-2 sm:col-span-2 flex gap-2 items-center">
          <div className="text-sm text-gray-600 mr-2">タグ:</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedTag(null)} className={`px-2 py-1 text-sm rounded ${selectedTag ? 'bg-gray-100 text-gray-700' : 'bg-green-50 text-green-700 font-semibold'}`}>すべて</button>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setSelectedTag(prev => prev === tag ? null : tag)} className={`px-2 py-1 text-sm rounded ${selectedTag === tag ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {visibleNotes.length === 0 ? (
          <p className="text-gray-500">メモがありません。</p>
        ) : (
          visibleNotes.map(n => (
            <button key={n.id} onClick={() => setActiveNote(n)} className="w-full text-left p-3 bg-white rounded shadow-sm hover:shadow-md flex flex-col">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className={`font-medium ${n.archived ? 'text-gray-400' : 'text-gray-800'}`}>{n.title || '（無題）'}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                <div className="ml-3 text-sm">
                  {n.tags.map(t => <span key={t} className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded ml-1">#{t}</span>)}
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600 line-clamp-3">{n.body}</div>
            </button>
          ))
        )}
      </div>

      {/* Floating + button */}
      <button onClick={() => setIsCreateOpen(true)} className="fixed bottom-6 right-6 bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setIsCreateOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">新しいメモ</h3>
            <NoteEditor
              initial={{ title: '', body: '', tags: [] }}
              onCancel={() => setIsCreateOpen(false)}
              onSave={(t,b,ts) => createNote(t,b,ts)}
              parseTagsInput={parseTagsInput}
            />
          </div>
        </div>
      )}

      {/* Detail / Edit Modal */}
      {activeNote && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setActiveNote(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{activeNote.title || '（無題）'}</h3>
              <div className="text-sm text-gray-500">{new Date(activeNote.createdAt).toLocaleString()}</div>
            </div>

            <NoteEditor
              initial={activeNote}
              onCancel={() => setActiveNote(null)}
              onSave={(title, body, tags) => updateNote({...activeNote, title: title || undefined, body, tags})}
              parseTagsInput={parseTagsInput}
            />

            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                {!activeNote.archived ? (
                  <button onClick={() => archiveNote(activeNote.id)} className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded">アーカイブ</button>
                ) : (
                  <button onClick={() => unarchiveNote(activeNote.id)} className="px-3 py-2 bg-green-100 text-green-700 rounded">アーカイブ解除</button>
                )}
                <button onClick={() => logicalDeleteNote(activeNote.id)} className="px-3 py-2 bg-red-50 text-red-600 rounded">削除</button>
              </div>
              <button onClick={() => setActiveNote(null)} className="px-4 py-2 bg-gray-100 rounded">閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// small editor component used by create/edit modals
const NoteEditor: React.FC<{
  initial: { title?: string; body: string; tags?: string[] };
  onCancel: () => void;
  onSave: (title: string|undefined, body: string, tags: string[]) => void;
  parseTagsInput: (s: string) => string[];
}> = ({ initial, onCancel, onSave, parseTagsInput }) => {
  const [title, setTitle] = useState(initial.title ?? '');
  const [body, setBody] = useState(initial.body ?? '');
  const [tagsInput, setTagsInput] = useState((initial.tags || []).join(', '));

  useEffect(() => {
    setTitle(initial.title ?? '');
    setBody(initial.body ?? '');
    setTagsInput((initial.tags || []).join(', '));
  }, [initial]);

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(title.trim() || undefined, body, parseTagsInput(tagsInput)); }} className="space-y-3">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="タイトル" className="w-full p-2 border rounded" />
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="本文" rows={8} className="w-full p-2 border rounded" />
      <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="タグ（カンマ区切り）" className="w-full p-2 border rounded" />
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">タグは半角カンマで区切ってください</div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-2 bg-gray-100 rounded">キャンセル</button>
          <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded">保存</button>
        </div>
      </div>
    </form>
  );
};

export default Notes;
// ...existing code...