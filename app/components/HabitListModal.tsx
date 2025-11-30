"use client";

import React from 'react';
import { Habit, FrequencyType } from '../types';
import { EditIcon } from './Icons';

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];

export const HabitListModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    habits: Habit[];
    onSelectHabit: (habit: Habit) => void;
}> = ({ isOpen, onClose, habits, onSelectHabit }) => {
    if (!isOpen) return null;

    const getFrequencyText = (habit: Habit) => {
        switch (habit.frequencyType) {
            case 'daily':
                return '毎日';
            case 'weekly':
                if (habit.frequencyValue.length === 0) return '週次（曜日未設定）';
                return `毎週${(habit.frequencyValue as number[]).map(d => WEEK_DAYS[d]).join('、')}曜日`;
            case 'monthly':
                if (habit.frequencyValue.length === 0) return '月次（日付未設定）';
                return `毎月${(habit.frequencyValue as number[]).join('、')}日`;
            default:
                return '頻度未設定';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">設定した習慣リスト</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {habits.length > 0 ? (
                        habits.map(habit => (
                            <div key={habit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <span className="text-gray-800">{habit.name}</span>
                                    <p className="text-xs text-gray-500">{getFrequencyText(habit)}</p>
                                </div>
                                <button
                                    onClick={() => onSelectHabit(habit)}
                                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-semibold p-2 rounded-md hover:bg-indigo-50"
                                >
                                    <EditIcon className="w-4 h-4" />
                                    編集
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-center py-4">まだ習慣が設定されていません。</p>
                    )}
                </div>
            </div>
        </div>
    );
};
