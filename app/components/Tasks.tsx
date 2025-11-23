// ...existing code...
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
// Firestore (modular)
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase'; // adjust path if needed

interface TaskItem {
  id: string;
  title: string;
  details?: string;
  dueDate?: string; // ISO YYYY-MM-DD
  priority?: 'low' | 'medium' | 'high';
  done?: boolean;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

const defaultPriority: TaskItem['priority'] = 'medium';
const priorityLabel = (p?: string) => (p === 'high' ? '高' : p === 'medium' ? '中' : p === 'low' ? '低' : '未設定');
const prioritySortValue = (p?: TaskItem['priority']) => (p === 'high' ? 3 : p === 'medium' ? 2 : p === 'low' ? 1 : 0);

const toLocalISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const formatMMDD = (iso?: string) => {
  if (!iso) return '';
  // iso が YYYY-MM-DD 形式と仮定してパース（new Date(iso) のタイムゾーン落差を回避）
  const parts = iso.split('-');
  if (parts.length >= 3) {
    return `${parts[1]}/${parts[2]}`;
  }
  return iso;
};

// Simple Portal helper (render children into document.body)
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(<>{children}</>, document.body);
};

// --- Simple CalendarPicker (no external deps) ---
const CalendarPicker: React.FC<{ value?: string; onChange: (iso?: string) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  // value (YYYY-MM-DD) をローカル日付として扱う（new Date('YYYY-MM-DD') の UTC問題を回避）
  const [viewDate, setViewDate] = useState(() => (value ? new Date(`${value}T00:00:00`) : new Date()));
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // open 状態になったら表示位置を計算（下にスペースが足りなければ上に表示）
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownApproxHeight = 320; // 最大高さの目安
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setOpenUpwards(spaceBelow < dropdownApproxHeight && spaceAbove > spaceBelow);
  }, [open]);

  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startDay = startOfMonth.getDay(); // 0..6
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();

  const selectDay = (d: number) => {
    const sel = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    const iso = toLocalISO(sel); // ローカル ISO を返す
    onChange(iso);
    setOpen(false);
  };

  const todayIso = toLocalISO(new Date());

  return (
    <div className="relative inline-block" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="px-3 py-2 border border-gray-200 rounded text-sm bg-white"
        aria-haspopup="dialog"
      >
        {value ? formatMMDD(value) : '年／月／日'}
      </button>

      {open && (
        <Portal>
          <div
            className={`absolute left-0 w-64 bg-white rounded shadow-lg p-3 z-50 ${openUpwards ? 'bottom-full mb-2' : 'mt-2'}`}
            onMouseDown={e => e.stopPropagation()}
            style={{ maxHeight: 320, overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between mb-2">
              <button className="px-2 py-1 text-sm" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>{'<'}</button>
              <div className="text-sm font-medium">{viewDate.toLocaleString(undefined, { month: 'long' })} {viewDate.getFullYear()}</div>
              <button className="px-2 py-1 text-sm" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>{'>'}</button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-xs text-center mb-2">
              {['日','月','火','水','木','金','土'].map(w => <div key={w} className="text-gray-400">{w}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDay }).map((_, i) => <div key={`pad-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                const iso = toLocalISO(cellDate);
                const isSelected = value === iso;
                const isToday = iso === todayIso;
                return (
                  <button
                    key={day}
                    onClick={() => selectDay(day)}
                    className={`w-8 h-8 flex items-center justify-center rounded ${isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100' } ${isToday && !isSelected ? 'ring-2 ring-indigo-200' : ''}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <button className="px-2 py-1 text-gray-600" onClick={() => { onChange(undefined); setOpen(false); }}>クリア</button>
              <button className="px-2 py-1 text-gray-600" onClick={() => setOpen(false)}>閉じる</button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

// --- Custom Priority select with larger items ---
const PrioritySelect: React.FC<{ value?: TaskItem['priority']; onChange: (p: TaskItem['priority']) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const items: { key: TaskItem['priority']; label: string; className?: string }[] = [
    { key: 'high', label: '高', className: 'text-red-700' },
    { key: 'medium', label: '中', className: 'text-yellow-700' },
    { key: 'low', label: '低', className: 'text-green-700' },
  ];
  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="px-3 py-2 border border-gray-200 rounded text-sm bg-white min-w-[64px]">
        {value ? priorityLabel(value) : '優先度'}
      </button>
      {open && (
        <Portal>
          <div className="absolute right-4 mt-2 w-36 bg-white rounded shadow-lg z-50">
            {items.map(it => (
              <button
                key={it.key}
                onClick={() => { onChange(it.key); setOpen(false); }}
                className={`w-full text-left px-4 py-3 text-base hover:bg-gray-50 ${it.className}`}
              >
                {it.label}
              </button>
            ))}
          </div>
        </Portal>
      )}
    </div>
  );
};

export const tasksForDate = (tasks: TaskItem[], date: string) => tasks.filter(t => t.dueDate === date);

const Tasks: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 追加: 未完了 / 完了済みセクションの開閉状態
  const [incompleteOpen, setIncompleteOpen] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<TaskItem['priority']>(defaultPriority);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  // subscription
  useEffect(() => {
    const uid = auth?.currentUser?.uid ?? null;
    if (!db || !uid) {
      setTasks([]);
      return;
    }
    const q = query(collection(db, 'users', uid, 'tasks'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const list: TaskItem[] = snap.docs.map(d => {
        const data = d.data() as any;
        // dueDate が Firestore Timestamp（toDate がある）や ISO 文字列で入るケースに対応して
        // 常にローカル日付文字列 (YYYY-MM-DD) を生成する
        let dueDateStr: string | undefined = undefined;
        if (data.dueDate) {
          if (typeof data.dueDate === 'string') {
            // もし "YYYY-MM-DD" ならそのまま、ISO の場合は Date を経由してローカル日付に変換
            if (/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate)) dueDateStr = data.dueDate;
            else {
              try { dueDateStr = toLocalISO(new Date(data.dueDate)); } catch { dueDateStr = undefined; }
            }
          } else if (typeof data.dueDate.toDate === 'function') {
            try { dueDateStr = toLocalISO(data.dueDate.toDate()); } catch { dueDateStr = undefined; }
          }
        }

        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : undefined);
        const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined);
        const completedAt = data.completedAt?.toDate ? data.completedAt.toDate().toISOString() : (typeof data.completedAt === 'string' ? data.completedAt : undefined);

        return {
          id: d.id,
          title: data.title ?? '',
          details: data.details ?? '',
          dueDate: dueDateStr,
          priority: data.priority ?? undefined,
          done: !!data.done,
          createdAt,
          updatedAt,
          completedAt,
        };
      });
      setTasks(list);
    }, err => {
      console.error('Tasks snapshot error:', err);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!editingId) return;
    const t = tasks.find(x => x.id === editingId);
    if (t) {
      setTitle(t.title);
      setDetails(t.details || '');
      setDueDate(t.dueDate || undefined);
      setPriority(t.priority || defaultPriority);
      setIsCreateOpen(true);
    }
  }, [editingId, tasks]);

  // sorting: dueDate asc (empty last), priority desc
  const sorted = useMemo(() => {
    return [...tasks].sort((a,b) => {
      const aDate = a.dueDate ? a.dueDate : '9999-12-31';
      const bDate = b.dueDate ? b.dueDate : '9999-12-31';
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      const pa = prioritySortValue(a.priority);
      const pb = prioritySortValue(b.priority);
      if (pa !== pb) return pb - pa;
      return (a.title||'').localeCompare(b.title||'');
    });
  }, [tasks]);

  // 上部リストは常に未完了のみ。完了済みは showCompleted=true のときだけ別枠で表示（重複防止）
  const visible = sorted.filter(t => !t.done);
  const completedList = showCompleted ? sorted.filter(t => t.done) : [];

  // Firestore ops
  const createTask = async (payload: Omit<TaskItem,'id'|'createdAt'|'updatedAt'|'completedAt'>) => {
    const uid = auth?.currentUser?.uid ?? null;
    if (!db || !uid) return;
    try {
      await addDoc(collection(db, 'users', uid, 'tasks'), { ...payload, done: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (e) { console.error(e); }
  };

  const updateTask = async (t: TaskItem) => {
    const uid = auth?.currentUser?.uid ?? null;
    if (!db || !uid) return;
    try {
      const ref = doc(db, 'users', uid, 'tasks', t.id);
      await updateDoc(ref, { title: t.title ?? null, details: t.details ?? null, dueDate: t.dueDate ?? null, priority: t.priority ?? null, done: !!t.done, updatedAt: serverTimestamp() });
    } catch (e) { console.error(e); }
  };

  const toggleTask = async (id: string, done: boolean) => {
    const uid = auth?.currentUser?.uid ?? null;
    if (!db || !uid) return;
    try {
      const ref = doc(db, 'users', uid, 'tasks', id);
      if (done) {
        await updateDoc(ref, { done: true, completedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      } else {
        await updateDoc(ref, { done: false, completedAt: deleteField(), updatedAt: serverTimestamp() });
      }
    } catch (e) { console.error(e); }
  };

  const removeTask = async (id: string) => {
    const uid = auth?.currentUser?.uid ?? null;
    if (!db || !uid) return;
    try {
      const ref = doc(db, 'users', uid, 'tasks', id);
      await deleteDoc(ref);
    } catch (e) { console.error(e); }
  };

  const submit = async () => {
    if (!title.trim()) return;
    if (editingId) {
      await updateTask({ id: editingId, title: title.trim(), details, dueDate: dueDate || undefined, priority, done: !!tasks.find(t => t.id === editingId)?.done });
    } else {
      await createTask({ title: title.trim(), details, dueDate: dueDate || undefined, priority });
    }
    setIsCreateOpen(false);
    setEditingId(null);
    setTitle(''); setDetails('');
    setDueDate(undefined); setPriority(defaultPriority);
  };

  return (
    <>
      {/* ヘッダカード：タイトルと簡易フィルタ（画像の左上のカードに相当） */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">タスク</h2>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} />
              <span>完了済みを表示</span>
            </label>
          </div>
        </div>
        {/* ここに将来的な検索やタグフィルタを追加可能 */}
      </div>

      {/* タスクリストカード：折りたたみ対応（未完了 / 完了済み） */}
      <div className="mt-4 space-y-4">
        {/* 未完了セクションヘッダ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIncompleteOpen(v => !v)}
              className="text-left text-lg font-semibold text-gray-900 flex items-center gap-2"
              aria-expanded={incompleteOpen}
            >
              <span className={`inline-block w-5 text-center ${incompleteOpen ? 'transform rotate-90' : ''}`}>▸</span>
              <span>未完了</span>
              <span className="text-sm text-gray-500">（{visible.length}件）</span>
            </button>
          </div>
          <div className="text-sm text-gray-500">{/* 保留: 右側にフィルタやソート */}</div>
        </div>
        <div className={incompleteOpen ? 'space-y-2 transition-all' : 'hidden'}>
          {visible.length === 0 ? (
            <p className="text-gray-500">タスクがありません。</p>
          ) : (
            visible.map((t, idx) => {
              const stableKey = t.id ? t.id : `task-${idx}`;
              return (
                <div key={stableKey} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg shadow-sm hover:shadow-md">
                  <input
                    type="checkbox"
                    checked={!!t.done}
                    onChange={e => toggleTask(t.id, e.target.checked)}
                    className="w-5 h-5"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="truncate">
                        <div className={`text-sm font-medium ${t.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.title}</div>
                        {t.details ? <div className="text-xs text-gray-500 truncate mt-1">{t.details}</div> : null}
                      </div>

                      <div className="flex items-center gap-2 ml-3">
                        {t.dueDate ? <div className="text-xs text-gray-500">{formatMMDD(t.dueDate)}</div> : null}
                        <div className={`text-xs px-2 py-0.5 rounded-full ${t.priority === 'high' ? 'bg-red-100 text-red-700' : t.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {priorityLabel(t.priority)}
                        </div>
                        <button onClick={() => setEditingId(t.id)} className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100">⋯</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 完了済みセクション（折りたたみ制御） */}
        {showCompleted && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCompletedOpen(v => !v)}
                className="text-left text-sm font-medium text-gray-700 flex items-center gap-2"
                aria-expanded={completedOpen}
              >
                <span className={`inline-block w-4 text-center ${completedOpen ? 'transform rotate-90' : ''}`}>▸</span>
                <span>完了済み</span>
                <span className="text-sm text-gray-400">（{completedList.length}件）</span>
              </button>
            </div>

            <div className={completedOpen ? 'mt-3 space-y-2' : 'hidden'}>
              {completedList.length === 0 ? <div className="text-gray-500 text-sm">完了済みはありません。</div> : completedList.map((ct, idx) => {
                const stableKey = ct.id ? ct.id : `completed-${idx}`;
                return (
                  <div key={stableKey} className="flex items-center gap-3 p-2 bg-white rounded shadow-sm">
                    <div className="flex-1">
                      <div className="text-sm">{ct.title}</div>
                      <div className="text-xs text-gray-400">{ct.completedAt ? new Date(ct.completedAt).toLocaleString() : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleTask(ct.id, false)} className="px-3 py-1 text-sm bg-gray-100 rounded">元に戻す</button>
                      <button onClick={() => removeTask(ct.id)} className="px-3 py-1 text-sm text-red-600">削除</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Floating + button */}
     <button onClick={() => { setEditingId(null); setTitle(''); setDetails(''); setDueDate(undefined); setPriority(defaultPriority); setIsCreateOpen(true); }} className="fixed bottom-6 right-6 bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700">
       <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
     </button>
 
     {/* Create / Edit Modal */}
     {isCreateOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIsCreateOpen(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{editingId ? 'タスクを編集' : 'タスクを追加'}</h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-gray-500">閉じる</button>
              </div>
    
              <div className="space-y-3">
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="タイトル" className="w-full p-2 border border-gray-200 rounded" />
                <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="詳細" rows={4} className="w-full p-2 border border-gray-200 rounded" />
                <div className="flex gap-2 items-center">
                  <CalendarPicker value={dueDate} onChange={setDueDate} />
                  <PrioritySelect value={priority} onChange={setPriority} />
                  <div className="flex-1" />
                  <button onClick={submit} className="px-4 py-2 bg-indigo-600 text-white rounded">{editingId ? '更新' : '追加'}</button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
     )}

    </>
  );
};

export default Tasks;