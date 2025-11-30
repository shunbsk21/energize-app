"use client";

import React, { useState, useEffect } from 'react';
import { Group as GroupType, Profile, Habit } from '../types';

export const SharedHabitsModal: React.FC<{
  group: GroupType;
  profile: Profile;
  myHabits: Habit[];
  initialSharedIds: string[];
  onClose: () => void;
  onSave: (sharedIds: string[]) => void;
}> = ({ group, profile, myHabits, initialSharedIds, onClose, onSave }) => {
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (initialSharedIds && initialSharedIds.length > 0) return new Set(initialSharedIds);
    return new Set(myHabits.map(h => h.id).filter((id): id is string => !!id));
  });

  useEffect(() => {
    if ((!initialSharedIds || initialSharedIds.length === 0) && myHabits && myHabits.length > 0) {
      setSelected(new Set(myHabits.map(h => h.id).filter((id): id is string => !!id)));
    }
    if (initialSharedIds && initialSharedIds.length > 0) {
      setSelected(new Set(initialSharedIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myHabits, JSON.stringify(initialSharedIds || [])]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };
  const selectAll = () => setSelected(new Set(myHabits.map(h => h.id).filter((id): id is string => !!id)));
  const clearAll = () => setSelected(new Set());

  const weekdayNames = ['日','月','火','水','木','金','土'];
  const formatFrequency = (habit: Habit) => {
    const type = habit.frequencyType;
    const val = habit.frequencyValue;
    if (type === 'daily') return '毎日';
    if (type === 'weekly') {
      if (Array.isArray(val) && val.length > 0) return '毎週 ' + val.map((d: number) => weekdayNames[d]).join('・');
      return '毎週';
    }
    if (type === 'monthly') {
      if (Array.isArray(val) && val.length > 0) return '毎月 ' + val.map((d: number) => `${d}日`).join('、');
      return '毎月';
    }
    if (typeof val === 'string' && val) return String(val);
    if (Array.isArray(val) && val.length) return String(val);
    return '';
  };
  const getTitle = (habit: Habit) => {
    return habit.name || (habit as any).title || (habit as any).label || '無題の習慣';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">このグループで共有する習慣を選択</h3>
          <div className="flex gap-2">
            <button onClick={selectAll} className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200">すべて選択</button>
            <button onClick={clearAll} className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200">すべて解除</button>
          </div>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
          {myHabits.length === 0 && <p className="text-sm text-gray-500">まず習慣を作成してください。</p>}
          {myHabits.map(h => (
            <label key={h.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <div className="font-medium text-gray-800">{getTitle(h)}</div>
                <div className="text-xs text-gray-400">{formatFrequency(h)}</div>
              </div>
              <input type="checkbox" checked={selected.has(h.id)} onChange={() => toggle(h.id)} />
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200">キャンセル</button>
          <button onClick={() => onSave(Array.from(selected))} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">保存</button>
        </div>
      </div>
    </div>
  );
};