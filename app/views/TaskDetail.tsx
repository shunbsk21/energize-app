import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TaskItem {
  id: string;
  title: string;
  details?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  done?: boolean;
}

const toLocalISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const formatMMDD = (iso?: string) => {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
  return iso;
};

const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(<>{children}</>, document.body);
};

export default function TaskDetail({
  task,
  onClose,
  updateTask,
  toggleTask,
  removeTask,
}: {
  task: TaskItem;
  onClose: () => void;
  updateTask: (t: TaskItem) => Promise<void> | void;
  toggleTask: (id: string, done: boolean) => Promise<void> | void;
  removeTask: (id: string) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(task.title || '');
  const [details, setDetails] = useState(task.details || '');
  const [dueDate, setDueDate] = useState<string | undefined>(task.dueDate || undefined);
  const [priority, setPriority] = useState<TaskItem['priority']>(task.priority || 'medium');
  const [done, setDone] = useState(!!task.done);
  useEffect(() => {
    setTitle(task.title || '');
    setDetails(task.details || '');
    setDueDate(task.dueDate || undefined);
    setPriority(task.priority || 'medium');
    setDone(!!task.done);
  }, [task]);

  const submit = async () => {
    if (!title.trim()) return;
    try {
      await updateTask({ id: task.id, title: title.trim(), details: details || undefined, dueDate: dueDate || undefined, priority, done });
    } catch (e) {
      console.error('TaskDetail update error', e);
    }
    onClose();
  };

  const handleDelete = async () => {
    try {
      await removeTask(task.id);
    } catch (e) {
      console.error('TaskDetail delete error', e);
    }
    onClose();
  };

  const handleToggleDone = async (v: boolean) => {
    setDone(v);
    try { await toggleTask(task.id, v); } catch (e) { console.error(e); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">タスクを編集</h3>
            <button onClick={onClose} className="text-gray-500">閉じる</button>
          </div>

          {/* 完了チェックはタイトルの上に配置 */}
          <div className="flex items-center justify-end mb-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={done}
                onChange={e => handleToggleDone(e.target.checked)}
                className="w-4 h-4"
              />
              <span>完了</span>
            </label>
          </div>

          <div className="space-y-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="タイトル" className="w-full p-2 border border-gray-200 rounded" />
            <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="詳細" rows={4} className="w-full p-2 border border-gray-200 rounded" />
            <div className="flex items-center gap-2">
              <input type="date" value={dueDate || ''} onChange={e => setDueDate(e.target.value || undefined)} className="p-2 border border-gray-200 rounded" />
              <select value={priority} onChange={e => setPriority(e.target.value as any)} className="p-2 border border-gray-200 rounded text-sm">
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
              <div className="flex-1" />
            </div>
          </div>

          {/* フッター：削除（左） / 更新（右） */}
          <div className="mt-6 flex items-center justify-between">
            <button onClick={handleDelete} className="px-4 py-2 text-sm text-red-600 border border-red-100 rounded">削除</button>
            <button onClick={submit} className="px-4 py-2 bg-indigo-600 text-white rounded">更新</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}