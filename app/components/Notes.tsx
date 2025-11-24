// ...existing code...
import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase'; // <- adjust path if necessary

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

const defaultNow = () => new Date().toISOString();

// Helper: get current uid (you may also pass uid as prop)
const getCurrentUid = () => {
  try {
    return auth?.currentUser?.uid ?? null;
  } catch {
    return null;
  }
};

const Notes: React.FC<{
  notes?: NoteItem[]; // optional initial
  onAddNote?: (n: Omit<NoteItem, 'id'|'createdAt'|'updatedAt'>) => void;
  onUpdateNote?: (n: NoteItem) => void;
}> = ({ notes: initialNotes, onAddNote, onUpdateNote }) => {
  // Firestore-driven: start empty and rely on snapshot listener (if uid present)
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes && initialNotes.length ? initialNotes : []);

  // Subscribe to Firestore notes; require authenticated uid
  useEffect(() => {
    const uid = getCurrentUid();
    if (!db || !uid) {
      // no subscription if not configured / not logged in
      return;
    }
    const q = query(collection(db, 'users', uid, 'notes'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const list: NoteItem[] = snap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          title: data.title ?? undefined,
          body: data.body || '',
          tags: data.tags || [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ?? defaultNow()),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt ?? undefined),
          archived: !!data.archived,
          deleted: !!data.deleted,
        };
      });
      setNotes(list);
    }, err => {
      console.error('Notes snapshot error:', err);
    });
    return () => unsub();
  }, []);

  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewArchived, setViewArchived] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null);

  // UI states
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  // actionMenuNote: when set, show centered action modal with Edit / Archive / Delete
  const [actionMenuNote, setActionMenuNote] = useState<NoteItem | null>(null);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [editingIsNew, setEditingIsNew] = useState(false);
  const [isFullscreenEditOpen, setIsFullscreenEditOpen] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{ type: 'archive'|'delete', note: NoteItem } | null>(null);

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
        if (!search.trim() && !selectedTag) return true;
        const tq = search.trim().toLowerCase();
        const inText = (!tq) || ((n.title || '').toLowerCase().includes(tq) || n.body.toLowerCase().includes(tq));
        const inTag = !selectedTag || (n.tags || []).includes(selectedTag);
        return inText && inTag;
      })
      .sort((a,b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
  }, [notes, search, selectedTag, viewArchived]);

  // helpers
  const createNote = async (title: string | undefined, body: string, tags: string[]) => {
    const uid = getCurrentUid();
    if (!db || !uid) {
      console.error('createNote: no firestore or not logged in');
      return;
    }
    const payload = { title: title || null, body, tags, archived: false, deleted: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    try {
      const ref = await addDoc(collection(db, 'users', uid, 'notes'), payload);
      // snapshot will sync and setNotes
      const createdNote: NoteItem = { id: ref.id, title: title || undefined, body, tags, createdAt: defaultNow(), updatedAt: defaultNow(), archived: false, deleted: false };
      setIsCreateOpen(false);
      setEditingNote(createdNote);
      setIsFullscreenEditOpen(true);
      onAddNote?.({ title: createdNote.title, body: createdNote.body, tags: createdNote.tags, archived: false, deleted: false });
    } catch (err) {
      console.error('createNote error:', err);
    }
  };

  // updateNote: allow caller to avoid setting activeNote (fullscreen saves should not open small detail modal)
  const updateNote = async (updated: NoteItem, opts?: { setActive?: boolean }) => {
    updated.updatedAt = defaultNow();
    const uid = getCurrentUid();
    if (!db || !uid) {
      console.error('updateNote: no firestore or not logged in');
      return;
    }
    try {
      const ref = doc(db, 'users', uid, 'notes', updated.id);
      await updateDoc(ref, { title: updated.title ?? null, body: updated.body, tags: updated.tags || [], archived: !!updated.archived, deleted: !!updated.deleted, updatedAt: serverTimestamp() });
      onUpdateNote?.(updated);
      if (opts?.setActive !== false) setActiveNote(updated);
    } catch (err) {
      console.error('updateNote error:', err);
    }
  };
  
  const archiveNote = async (id: string) => {
    const uid = getCurrentUid();
    if (!db || !uid) {
      console.error('archiveNote: no firestore or not logged in');
      return;
    }
    try {
      const ref = doc(db, 'users', uid, 'notes', id);
      await updateDoc(ref, { archived: true, updatedAt: serverTimestamp() });
      setConfirmAction(null);
    } catch (err) {
      console.error('archiveNote error:', err);
    }
  };

  const unarchiveNote = async (id: string) => {
    const uid = getCurrentUid();
    if (!db || !uid) {
      console.error('unarchiveNote: no firestore or not logged in');
      return;
    }
    try {
      const ref = doc(db, 'users', uid, 'notes', id);
      await updateDoc(ref, { archived: false, updatedAt: serverTimestamp() });
      setConfirmAction(null);
    } catch (err) {
      console.error('unarchiveNote error:', err);
    }
  };

  const logicalDeleteNote = async (id: string) => {
    const uid = getCurrentUid();
    if (!db || !uid) {
      console.error('logicalDeleteNote: no firestore or not logged in');
      return;
    }
    try {
      const ref = doc(db, 'users', uid, 'notes', id);
      await updateDoc(ref, { deleted: true, updatedAt: serverTimestamp() });
      setConfirmAction(null);
    } catch (err) {
      console.error('logicalDeleteNote error:', err);
    }
  };

  // UI helpers
  const openFullscreenEditor = (note: NoteItem) => { setEditingNote(note); setIsFullscreenEditOpen(true); setActionMenuNote(null); };

  const parseTagsInput = (s: string) => {
    return s.split(',').map(t => t.trim()).filter(Boolean).map(t => t.replace(/\s+/g,'-').toLowerCase());
  };

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          {/* header: title left, actions right (compact) */}
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-xl font-bold">メモ</h2>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md bg-gray-100 p-1">
                <button onClick={() => { setViewArchived(false); setSelectedTag(null); setSearch(''); }} className={`px-3 py-1 text-sm rounded ${!viewArchived ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'}`}>Notes</button>
                <button onClick={() => { setViewArchived(true); setSelectedTag(null); setSearch(''); }} className={`px-3 py-1 text-sm rounded ${viewArchived ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'}`}>アーカイブ</button>
              </div>
            </div>
          </div>

          {/* search + tags */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="検索（タイトル・本文）"
              className="p-2 border border-gray-200 rounded-full w-full focus:outline-none focus:ring-1 focus:ring-indigo-200"
            />
            <div className="col-span-2 sm:col-span-2 flex gap-2 items-center overflow-x-auto">
              <div className="text-sm text-gray-600 mr-2 whitespace-nowrap">タグ:</div>
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
        </div>

        {/* ノートリスト（タグごとにセクション分け） */}
        <div className="space-y-6">
          {visibleNotes.length === 0 ? (
            <p className="text-gray-500">メモがありません。</p>
          ) : (
            (() => {
              // タグごとにグルーピング（タグがないものは "未分類" に）
              const groups = new Map<string, typeof visibleNotes>();
              visibleNotes.forEach(n => {
                const key = (n.tags && n.tags.length > 0) ? n.tags[0] : '未分類';
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(n);
              });

              return Array.from(groups.entries()).map(([tag, items]) => (
                <div key={tag} className="">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-600 font-medium">#{tag}</div>
                      <div className="text-xs text-gray-400">({items.length})</div>
                    </div>
                    <div>
                      {/* セクション内アクション（必要なら追加） */}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map(n => {
                      const isExpanded = expandedNoteId === n.id;
                      // 複合キーで安定化（タグ変更でキー衝突しにくくする）
                      const stableKey = `${tag}__${n.id}`;
                      return (
                        <div key={stableKey} className="relative w-full p-3 bg-gray-50 rounded shadow-sm hover:shadow-md">
                          <div className="flex items-start justify-between">
                            <div className={`flex-1 text-left ${n.archived ? 'text-gray-400' : 'text-gray-800'} font-medium`}>{n.title || '（無題）'}</div>
                            <div className="ml-3">
                              <button onClick={() => setActionMenuNote(n)} className="px-2 py-1 text-gray-500 hover:text-gray-700" aria-label="メニュー">⋯</button>
                            </div>
                          </div>
                          <div className="mt-2">
                            {(n.tags || []).slice(0,3).map(t => <span key={t} className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded mr-1 text-xs">#{t}</span>)}
                          </div>
                          <div className="mt-3 text-sm text-gray-700" style={ isExpanded ? { whiteSpace: 'pre-wrap' } : { display: '-webkit-box', WebkitBoxOrient: 'vertical' as any, WebkitLineClamp: 5, overflow: 'hidden', whiteSpace: 'pre-wrap' } }>
                            {n.body}
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                            <div>
                              {!isExpanded ? (
                                <button onClick={() => setExpandedNoteId(n.id)} className="text-sm text-indigo-600">詳細を見る</button>
                              ) : (
                                <button onClick={() => setExpandedNoteId(null)} className="text-sm text-gray-600">閉じる</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()
          )}
        </div>

        

        {/* Floating + ボタン: フル画面作成を開く */}
        <button
          onClick={() => {
            const draft: NoteItem = { id: '', title: undefined, body: '', tags: [], createdAt: defaultNow(), updatedAt: defaultNow(), archived: false, deleted: false };
            setEditingNote(draft);
            setEditingIsNew(true);
            setIsFullscreenEditOpen(true);
            setActionMenuNote(null);
          }}
          className="fixed bottom-6 right-6 bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        
        {/* Confirm modal (centered) for menu actions: archive / delete */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 sm:px-6 lg:px-8" onClick={() => setConfirmAction(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 mx-auto" onClick={e => e.stopPropagation()}>
              <div className="text-lg font-medium mb-2">{confirmAction.note.title || '（無題）'}</div>
              <div className="text-sm text-gray-600 mb-4">
                {confirmAction.type === 'archive' && (confirmAction.note.archived ? 'アーカイブを解除しますか？' : '本当にアーカイブしますか？')}
                {confirmAction.type === 'delete' && 'このメモを削除しますか？（画面からは非表示になります）'}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmAction(null)} className="px-3 py-2 bg-gray-100 rounded">キャンセル</button>
                {confirmAction.type === 'archive' && (
                  <button
                    onClick={() => { confirmAction.note.archived ? unarchiveNote(confirmAction.note.id) : archiveNote(confirmAction.note.id); setConfirmAction(null); }}
                    className="px-3 py-2 bg-yellow-500 text-white rounded"
                  >
                    {confirmAction.note.archived ? 'アーカイブ解除' : 'アーカイブ'}
                  </button>
                )}
                {confirmAction.type === 'delete' && (
                  <button onClick={() => { logicalDeleteNote(confirmAction.note.id); setConfirmAction(null); }} className="px-3 py-2 bg-red-50 text-red-600 rounded">削除</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action modal (centered) that shows Edit / Archive / Delete choices */}
        {actionMenuNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setActionMenuNote(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
              <div className="text-lg font-medium mb-4">{actionMenuNote.title || '（無題）'}</div>
              <div className="flex flex-col">
                <button
                  onClick={() => { openFullscreenEditor(actionMenuNote); }}
                  className="w-full text-left px-4 py-3 rounded-lg border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white mb-2"
                >
                  編集する
                </button>
                <button
                  onClick={() => { setConfirmAction({ type: 'archive', note: actionMenuNote }); setActionMenuNote(null); }}
                  className="w-full text-left px-4 py-3 rounded-lg border border-yellow-200 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 mb-2"
                >
                  {actionMenuNote.archived ? 'アーカイブ解除' : 'アーカイブ'}
                </button>

                <button
                  onClick={() => { setConfirmAction({ type: 'delete', note: actionMenuNote }); setActionMenuNote(null); }}
                  className="w-full text-left px-4 py-3 rounded-lg border border-red-100 bg-white hover:bg-red-50 text-red-600 mb-3"
                >
                  削除
                </button>

                <button
                  onClick={() => setActionMenuNote(null)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-50 text-gray-700 border border-gray-100 hover:bg-gray-100"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Fullscreen editor for "編集する" (LINE風のフルスクリーン編集) */}
        {isFullscreenEditOpen && editingNote && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* header: close | title | save */}
            <div className="flex items-center justify-between p-4 border-b">
              <button
                onClick={() => { setEditingNote(null); setIsFullscreenEditOpen(false); }}
                className="text-gray-600 px-2 py-1"
              >
                閉じる
              </button>
              <div className="font-semibold">メモを編集</div>
              <button
                onClick={() => {
                  // save current editing draft stored in local state below via form submit
                  const el = document.getElementById(`fs-editor-form-${editingNote.id}`) as HTMLFormElement | null;
                  if (el) el.requestSubmit();
                }}
                className="text-white bg-indigo-600 px-4 py-2 rounded"
              >
                保存する
              </button>
            </div>

            {/* body: inline form so header save can trigger submit */}
            <div className="p-4 overflow-auto flex-1">
              <FullscreenEditorForm
                  key={editingNote.id || 'new'}
                  note={editingNote}
                  onCancel={() => { setEditingNote(null); setIsFullscreenEditOpen(false); setEditingIsNew(false); }}
                  onSave={async (title, body, tags) => {
                    // 新規 or 更新 を切り分け
                    const uid = getCurrentUid();
                    if (editingIsNew) {
                      if (!db || !uid) { console.error('create: not logged in / db missing'); return; }
                      try {
                        const payload = { title: title || null, body, tags, archived: false, deleted: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
                        const ref = await addDoc(collection(db, 'users', uid, 'notes'), payload);
                        // Firestore snapshot will sync the created note; just close editor
                        setEditingIsNew(false);
                        setIsFullscreenEditOpen(false);
                        setEditingNote(null);
                        onAddNote?.({ title: title || undefined, body, tags, archived: false, deleted: false });
                      } catch (err) {
                        console.error('create-from-fullscreen error:', err);
                      }
                    } else {
                      if (!editingNote) return;
                      const updated: NoteItem = { ...editingNote, title: title || undefined, body, tags, updatedAt: defaultNow() };
                      await updateNote(updated, { setActive: false });
                      setIsFullscreenEditOpen(false);
                      setEditingNote(null);
                    }
                  }}
                  parseTagsInput={parseTagsInput}
                  allTags={allTags}
              />
            </div>
          </div>
        )}

        
      </div>
    </>
  );
};

// small editor component used by create/edit modals
const NoteEditor: React.FC<{
  initial: { title?: string; body: string; tags?: string[] };
  onCancel: () => void;
  onSave: (title: string|undefined, body: string, tags: string[]) => void;
  parseTagsInput: (s: string) => string[];
  allTags?: string[];
}> = ({ initial, onCancel, onSave, parseTagsInput, allTags = [] }) => {
  const [title, setTitle] = useState(initial.title ?? '');
  const [body, setBody] = useState(initial.body ?? '');
  const [tags, setTags] = useState<string[]>(initial.tags ?? []);
  const [tagsInput, setTagsInput] = useState((initial.tags || []).join(', '));

  const addTag = (t: string) => {
    const v = t.trim().toLowerCase().replace(/\s+/g,'-');
    if (!v) return;
    if (!tags.includes(v)) setTags(prev => [...prev, v]);
    setTagsInput('');
  };
  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));
  const toggleTag = (t: string) => tags.includes(t) ? removeTag(t) : addTag(t);

  useEffect(() => {
    setTitle(initial.title ?? '');
    setBody(initial.body ?? '');
    setTags((initial.tags ?? []));
    setTagsInput((initial.tags || []).join(', '));
  }, [initial]);

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(title.trim() || undefined, body, tags); }} className="space-y-3">
      {/* タイトル → タグ → 詳細 の順 */}
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="タイトル" className="w-full p-2 border border-gray-200 rounded" />
      <div>
        <div className="mb-2">
          <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',' ) { e.preventDefault(); addTag(tagsInput); }
          }} placeholder="タグを入力して Enter（または既存タグをクリック）" className="w-full p-2 border border-gray-200 rounded" />
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs mb-1">
              #{t}
              <button type="button" onClick={() => removeTag(t)} className="text-indigo-600 px-1">✕</button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-1">
         {allTags.filter(t => !tags.includes(t)).map(t => (
            <button key={t} type="button" onClick={() => toggleTag(t)} className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-700">
              #{t}
            </button>
          ))}
        </div>
      </div>
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="本文" rows={10} className="w-full p-2 border border-gray-200 rounded whitespace-pre-wrap" />
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

// Fullscreen editor form (inline so header Save can trigger submit)
const FullscreenEditorForm: React.FC<{
  note: NoteItem;
  onCancel: () => void;
  onSave: (title: string|undefined, body: string, tags: string[]) => void;
  parseTagsInput: (s: string) => string[];
  allTags?: string[];
}> = ({ note, onCancel, onSave, parseTagsInput, allTags = [] }) => {
  const [title, setTitle] = useState(note.title ?? '');
  const [tags, setTags] = useState<string[]>(note.tags ?? []);
  const [tagsInput, setTagsInput] = useState((note.tags || []).join(', '));
  const [body, setBody] = useState(note.body ?? '');

  const addTag = (t: string) => {
    const v = t.trim().toLowerCase().replace(/\s+/g,'-');
    if (!v) return;
    if (!tags.includes(v)) setTags(prev => [...prev, v]);
    setTagsInput('');
  };
  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));
  const toggleTag = (t: string) => tags.includes(t) ? removeTag(t) : addTag(t);

  useEffect(() => {
    setTitle(note.title ?? '');
    setTags(note.tags ?? []);
    setTagsInput((note.tags || []).join(', '));
    setBody(note.body ?? '');
  }, [note]);

  return (
    <form id={`fs-editor-form-${note.id}`} onSubmit={e => { e.preventDefault(); onSave(title.trim() || undefined, body, tags); }} className="flex flex-col h-full">
      <div className="mb-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="タイトル" className="w-full p-3 border border-gray-200 rounded" />
      </div>
      <div className="mb-3">
        <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagsInput); }
          }} placeholder="タグを入力して Enter（または既存タグをクリック）" className="w-full p-3 border border-gray-200 rounded" />
        <div className="flex flex-wrap gap-2 mt-2 mb-1">
          {tags.map(t => <span key={t} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-sm">#{t} <button type="button" onClick={() => removeTag(t)} className="ml-2 text-indigo-600">✕</button></span>)}
        </div>
        <div className="flex flex-wrap gap-2 mb-1">
          {allTags.filter(t => !tags.includes(t)).map(t => (
            <button key={t} type="button" onClick={() => toggleTag(t)} className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-700">
              #{t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1">
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="本文" className="w-full p-3 border border-gray-200 rounded h-full min-h-[300px] resize-none whitespace-pre-wrap" />
      </div>
    </form>
  );
};

export default Notes;
// ...existing code...