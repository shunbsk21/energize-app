import React from 'react';
import { createPortal } from 'react-dom';
import { Task, TaskDetailProps } from '../types'; 

const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(<>{children}</>, document.body);
};

export default function TaskDetail({ task, onClose, updateTask, toggleTask, removeTask }: TaskDetailProps) {
  // ローカルのstateを削除し、propsの変更をハンドリングする関数を定義
  const handleChange = (field: keyof Task, value: any) => {
    updateTask({ ...task, [field]: value });
  };

  const submit = async () => {
    if (!task.title.trim()) return;
    try {
      // updateTaskはhandleChangeですでに呼ばれているため、
      // ここでは単に閉じるだけで良い。
      // もし一括更新が必要な場合は、この関数内でupdateTaskを呼ぶ。
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
                checked={!!task.done}
                onChange={e => handleToggleDone(e.target.checked)}
                className="w-4 h-4"
              />
              <span>完了</span>
            </label>
          </div>

          <div className="space-y-3">
            <input value={task.title ?? ''} onChange={e => handleChange('title', e.target.value)} placeholder="タイトル" className="w-full p-2 border border-gray-200 rounded" />
            <textarea value={task.details ?? ''} onChange={e => handleChange('details', e.target.value)} placeholder="詳細" rows={4} className="w-full p-2 border border-gray-200 rounded" />
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={task.dueDate ?? ''} onChange={e => handleChange('dueDate', e.target.value || undefined)} className="p-2 border border-gray-200 rounded" />
              <select value={task.priority ?? 'medium'} onChange={e => handleChange('priority', e.target.value as Task['priority'])} className="p-2 border border-gray-200 rounded text-sm">
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