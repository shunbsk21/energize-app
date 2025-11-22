import React, { useState } from 'react';
import { Habit } from '../types'; // 必要に応じて types を調整

interface TaskItem { id: string; title: string; done?: boolean; note?: string; }

const Tasks: React.FC<{
  tasks?: TaskItem[];
  onAddTask?: (t: Omit<TaskItem,'id'>) => void;
  onToggleTask?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
}> = ({ tasks = [], onAddTask, onToggleTask, onDeleteTask }) => {
  const [title, setTitle] = useState('');
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">タスク</h2>
      <div className="flex gap-2 mb-4">
        <input className="flex-1 p-2 border rounded" value={title} onChange={e => setTitle(e.target.value)} placeholder="新しいタスク" />
        <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={() => { if (!title) return; onAddTask?.({ title }); setTitle(''); }}>追加</button>
      </div>
      <div className="space-y-2">
        {tasks.map(t => (
          <div key={t.id} className="flex items-center justify-between p-3 bg-white rounded shadow-sm">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={!!t.done} onChange={() => onToggleTask?.(t.id)} />
              <span className={`ml-1 ${t.done ? 'line-through text-gray-400' : ''}`}>{t.title}</span>
            </label>
            <div className="text-sm text-gray-400">
              <button onClick={() => onDeleteTask?.(t.id)} className="text-red-500">削除</button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-gray-500">タスクがありません。</p>}
      </div>
    </div>
  );
};

export default Tasks;