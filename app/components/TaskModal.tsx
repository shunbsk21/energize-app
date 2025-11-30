"use client";

import React, { useState, useEffect } from 'react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { title: string; details?: string; dueDate?: string; priority?: 'low'|'medium'|'high' }) => void;
  initialDate?: string;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSubmit, initialDate }) => {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [dueDate, setDueDate] = useState(initialDate || '');
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium');

  useEffect(() => {
    if (isOpen) {
      setDueDate(initialDate || '');
    }
  }, [isOpen, initialDate]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      details: details.trim() || undefined,
      dueDate: dueDate || undefined,
      priority,
    });
    // Reset state and close
    setTitle('');
    setDetails('');
    setPriority('medium');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">タスクを追加</h3>
          <button onClick={onClose} className="text-gray-500">閉じる</button>
        </div>
        <div className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="タイトル" className="w-full p-2 border border-gray-200 rounded" />
          <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="詳細" rows={3} className="w-full p-2 border border-gray-200 rounded" />
          <div className="flex items-center gap-2">
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="p-2 border border-gray-200 rounded" />
            <select value={priority} onChange={e => setPriority(e.target.value as any)} className="p-2 border border-gray-200 rounded text-sm">
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
            <div className="flex-1" />
            <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded">追加</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
