"use client"; // Next.js 13+ App Router では "use client" が必要かもしれません

import React, { useMemo, useState, useEffect } from 'react';
import { Habit, FrequencyType } from '../types';

interface HabitDetailProps {
  habit: Habit;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (habit: Habit) => void;
}

const TrashIcon: React.FC<{className?: string}> = ({className}) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const EditIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];

const calculateLongestStreak = (dates: string[]): number => {
    if (dates.length < 2) return dates.length;
    const sortedDates = [...new Set(dates)].map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
    
    let longestStreak = 0;
    let currentStreak = 0;

    for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
            currentStreak = 1;
        } else {
            // NOTE: This logic only works for daily habits. A more complex check is needed for other frequencies.
            const diffDays = (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 3600 * 24);
            if (diffDays === 1) {
                currentStreak++;
            } else {
                longestStreak = Math.max(longestStreak, currentStreak);
                currentStreak = 1;
            }
        }
    }
    longestStreak = Math.max(longestStreak, currentStreak);
    return longestStreak;
}

const isHabitScheduledForDate = (habit: Habit, date: Date): boolean => {
    const habitStartDate = new Date(habit.startDate);
    habitStartDate.setHours(0,0,0,0);
    const targetDate = new Date(date);
    targetDate.setHours(0,0,0,0);

    if (targetDate < habitStartDate) return false;

    switch (habit.frequencyType) {
        case 'daily':
            return true;
        case 'weekly':
            return habit.frequencyValue.includes(targetDate.getDay());
        case 'monthly':
            return habit.frequencyValue.includes(targetDate.getDate());
        default:
            return false;
    }
};

const calculateCurrentStreak = (habit: Habit): number => {
    const { completedDates, startDate } = habit;
    if (completedDates.length === 0) return 0;
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0,0,0,0);
    
    const sortedDatesSet = new Set(completedDates);
    
    if (!isHabitScheduledForDate(habit, currentDate) || !sortedDatesSet.has(currentDate.toLocaleDateString('sv-SE'))) {
        currentDate.setDate(currentDate.getDate() - 1);
    }

    while (new Date(startDate) <= currentDate) {
        if (!isHabitScheduledForDate(habit, currentDate)) {
            currentDate.setDate(currentDate.getDate() - 1);
            continue;
        }
        if (sortedDatesSet.has(currentDate.toLocaleDateString('sv-SE'))) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}


const HabitDetail: React.FC<HabitDetailProps> = ({ habit, onClose, onDelete, onUpdate }) => {
  const [displayDate, setDisplayDate] = useState(new Date());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
      name: habit.name,
      startDate: habit.startDate,
      frequencyType: habit.frequencyType,
      frequencyValue: habit.frequencyValue,
  });

  useEffect(() => {
    setFormData({
        name: habit.name,
        startDate: habit.startDate,
        frequencyType: habit.frequencyType,
        frequencyValue: habit.frequencyValue,
    })
  }, [habit, isEditing]);


  const completedDatesSet = useMemo(() => new Set(habit.completedDates), [habit.completedDates]);

  const changeMonth = (amount: number) => {
    setDisplayDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const currentStreak = useMemo(() => calculateCurrentStreak(habit), [habit]);
  const longestStreak = useMemo(() => calculateLongestStreak(habit.completedDates), [habit.completedDates]);

  const frequencyText = useMemo(() => {
    switch(habit.frequencyType) {
      case 'daily':
        return '毎日';
      case 'weekly':
        if(habit.frequencyValue.length === 0) return '週次（曜日未設定）';
        return `毎週${habit.frequencyValue.map(d => WEEK_DAYS[d]).join('、')}曜日`;
      case 'monthly':
        if(habit.frequencyValue.length === 0) return '月次（日付未設定）';
        return `毎月${habit.frequencyValue.join('、')}日`;
      default:
        return '頻度未設定';
    }
  }, [habit.frequencyType, habit.frequencyValue]);
  
  const generateCalendar = () => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="w-10 h-10"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day)
      const dateStr = d.toLocaleDateString('sv-SE');
      const isCompleted = completedDatesSet.has(dateStr);
      const isScheduled = isHabitScheduledForDate(habit, d);
      const isToday = dateStr === new Date().toLocaleDateString('sv-SE');
      
      let dayClass = '';
      if(isCompleted) {
        dayClass = 'bg-green-500 text-white font-bold';
      } else if (isScheduled) {
        dayClass = 'bg-gray-100';
      } else {
        dayClass = 'bg-gray-300 text-gray-500';
      }

      if(isToday && !isCompleted && isScheduled) {
        dayClass += ' ring-2 ring-indigo-500';
      }

      calendarDays.push(
        <div key={day} className={`w-10 h-10 flex items-center justify-center rounded-full text-sm ${dayClass}`}>
          {day}
        </div>
      );
    }
    return calendarDays;
  };
  
  const handleDeleteConfirm = () => {
      onDelete(habit.id);
      onClose();
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
        ...habit,
        name: formData.name,
        startDate: formData.startDate,
        frequencyType: formData.frequencyType,
        frequencyValue: formData.frequencyValue,
    });
    setIsEditing(false);
  }

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
            <div>
                 <h2 className="text-2xl font-bold text-gray-800">{habit.name}</h2>
                 <p className="text-gray-500 text-sm">{isEditing ? '習慣の編集' : frequencyText}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
        </div>
       
        {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">習慣の名前</label>
                    <input type="text" value={formData.name} onChange={e => setFormData(f => ({...f, name: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                    <input type="date" value={formData.startDate} onChange={e => setFormData(f => ({...f, startDate: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">頻度</label>
                    <select value={formData.frequencyType} onChange={e => setFormData(f => ({...f, frequencyType: e.target.value as FrequencyType, frequencyValue: []}))} className="w-full p-2 border bg-white text-gray-900 border-gray-300 rounded-lg">
                      <option value="daily">毎日</option>
                      <option value="weekly">週次</option>
                      <option value="monthly">月次</option>
                    </select>
                </div>
                {formData.frequencyType === 'weekly' && (
                    <div className="flex justify-center gap-1">
                      {WEEK_DAYS.map((day, index) => (
                        <button type="button" key={index}
                          onClick={() => {
                            const newValue = formData.frequencyValue.includes(index)
                              ? formData.frequencyValue.filter(d => d !== index)
                              : [...formData.frequencyValue, index];
                            setFormData(f => ({...f, frequencyValue: newValue.sort()}));
                          }}
                          className={`w-10 h-10 rounded-full font-semibold transition-colors ${formData.frequencyValue.includes(index) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >{day}</button>
                      ))}
                    </div>
                )}
                {formData.frequencyType === 'monthly' && (
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">日付を選択 (カンマ区切り)</label>
                        <input
                            type="text" placeholder="例: 1, 15"
                            defaultValue={formData.frequencyValue.join(', ')}
                            onChange={e => {
                                const value = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 31);
                                setFormData(f => ({...f, frequencyValue: value.sort((a,b)=>a-b)}))
                            }}
                           className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                        />
                     </div>
                )}
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">キャンセル</button>
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow">保存</button>
                </div>
            </form>
        ) : (
            <>
                <div className="my-6 grid grid-cols-2 gap-4 text-center">
                    <div className="bg-orange-100 p-3 rounded-lg">
                        <p className="text-sm text-orange-700">現在の連続記録</p>
                        <p className="text-2xl font-bold text-orange-600">🔥 {currentStreak} 日</p>
                    </div>
                     <div className="bg-indigo-100 p-3 rounded-lg">
                        <p className="text-sm text-indigo-700">最長連続記録</p>
                        <p className="text-2xl font-bold text-indigo-600">🏆 {longestStreak} 日</p>
                    </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100">&larr;</button>
                    <h3 className="font-bold text-lg">{`${displayDate.getFullYear()}年 ${displayDate.getMonth() + 1}月`}</h3>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100">&rarr;</button>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 mb-2">
                    {WEEK_DAYS.map(day => <div key={day}>{day}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {generateCalendar()}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <button 
                        onClick={() => setIsConfirmOpen(true)}
                        className="flex items-center justify-center gap-2 p-3 rounded-lg text-red-600 hover:bg-red-50 font-semibold transition-colors"
                    >
                        <TrashIcon className="w-5 h-5" />
                        削除
                    </button>
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="flex items-center justify-center gap-2 p-3 rounded-lg text-indigo-600 hover:bg-indigo-50 font-semibold transition-colors"
                    >
                        <EditIcon className="w-5 h-5" />
                        編集
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
    {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center animate-fade-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-gray-800">本当に削除しますか？</h3>
                <p className="text-gray-600 my-2">習慣「{habit.name}」を削除すると、関連する全ての記録が失われ、元に戻すことはできません。</p>
                <div className="flex justify-center gap-4 mt-6">
                    <button onClick={() => setIsConfirmOpen(false)} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 font-semibold">
                        キャンセル
                    </button>
                    <button onClick={handleDeleteConfirm} className="px-6 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 font-semibold">
                        削除する
                    </button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default HabitDetail;