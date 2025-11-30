"use client";

import React, { useMemo } from 'react';
import { Profile, Friend, Habit } from '../types';
import { isHabitScheduledForDate, calculateCompletionPercentForDate } from '../utils/habits';
import { formatDateKey } from '../utils/dates';

export const MemberHabitsModal: React.FC<{
  memberId: string;
// ...
}> = ({ memberId, memberProfile, memberHabits, groupSharedHabitIds, currentUserId, isFollowing, onClose, onFollowUser, onEditMySharedHabits, isLoading }) => {
  const habits: Habit[] = memberHabits || memberProfile?.habits || [];
  const todayStr = formatDateKey(new Date());
  const sharedHabits = habits.filter(h => h.id && groupSharedHabitIds.includes(h.id));
  const isSelf = memberId === currentUserId;
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
    return habit.name || habit.title || habit.label || '無題の習慣';
  };

  const completionPercent = useMemo(() => calculateCompletionPercentForDate(new Date(), sharedHabits), [sharedHabits]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label="閉じる" className="absolute right-4 top-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="mb-3">
          <h3 className="text-lg font-bold">
            {memberProfile?.displayName || 'ユーザー'} の共有習慣
          </h3>
          {!isLoading && (
            <div className="flex items-baseline gap-4 mt-1">
              <p className="text-xs text-gray-400">{`共有中の習慣: ${sharedHabits.length}件`}</p>
              <p className="text-xs text-gray-500">
                今日の達成率: <span className="text-lg font-bold text-indigo-600">{completionPercent}%</span>
              </p>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-10 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">データを読み込み中...</span>
          </div>
        ) : sharedHabits.length === 0 ? (
          <div className="py-6 text-sm text-gray-500 text-center">このメンバーは、グループと共有している習慣がありません。</div>
        ) : (
          <ul className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
            {sharedHabits.map(habit => {
              const scheduled = isHabitScheduledForDate(habit, new Date());
              const completed = (habit.completedDates || []).includes(todayStr);
              return (
                <li key={habit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-800">{getTitle(habit)}</div>
                    <div className="text-xs text-gray-500">{formatFrequency(habit)} {scheduled ? '・今日対象' : '・今日は対象外'}</div>
                  </div>
                  <div className="text-sm">
                    {completed ? <span className="text-green-600 font-bold">完了</span> : <span className="text-gray-400">未実行</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-end gap-2">
          {isSelf ? (
            <button onClick={() => { onEditMySharedHabits?.(); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">共有習慣を編集</button>
          ) : (
            <>
              {isFollowing ? (
                <button disabled className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg">フォロー済み</button>
              ) : (
                <button onClick={() => { onFollowUser(memberId); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">フォローする</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};