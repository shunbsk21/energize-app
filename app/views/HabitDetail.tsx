"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Habit, FrequencyType } from '../types';
import {
  isHabitScheduledForDate,
  calculateCurrentStreak,
  calculateLongestStreak,
  normalizeKey
} from '../utils/habits';
import { EditIcon, TrashIcon } from '../components/Icons';
import { formatDateKey } from '../utils/dates';
import { ActionModal } from '../components/ActionModal'; 

interface HabitDetailProps {
  habit: Habit;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (habit: Habit) => void;
}

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];

// textarea 自動リサイズヘルパ（このファイル内で使用）
const autoGrowTextArea = (el?: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
};

const HabitDetail: React.FC<HabitDetailProps> = ({ habit, onClose, onDelete, onUpdate }) => {
  const detailsRef = React.useRef<HTMLTextAreaElement | null>(null);

  const [displayDate, setDisplayDate] = useState(new Date());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: habit.name,
    startDate: habit.startDate,
    frequencyType: habit.frequencyType,
    frequencyValue: habit.frequencyValue,
    type: (habit.type ?? 'binary') as 'binary' | 'amount',
    target: habit.target ?? undefined,
    unit: habit.unit ?? '',
    detail: habit.detail ?? '',
    skippedDates: habit.skippedDates ?? []
  });

  // isEditingがtrueになった時に、フォームデータをhabit propから初期化する
  useEffect(() => {
    if (isEditing) {
      setFormData({
        name: habit.name,
        startDate: habit.startDate,
        frequencyType: habit.frequencyType,
        frequencyValue: habit.frequencyValue,
        type: (habit.type ?? 'binary') as 'binary' | 'amount',
        target: habit.target ?? undefined,
        unit: habit.unit ?? '',
        detail: habit.detail ?? '',
        skippedDates: habit.skippedDates ?? []
      });
      // 自動リサイズを一度実行
      setTimeout(() => autoGrowTextArea(detailsRef.current), 0);
    }
  }, [isEditing, habit]);

  const completedDatesSet = useMemo(() => new Set((habit.completedDates || []).map(normalizeKey)), [habit.completedDates]);

  const changeMonth = (amount: number) => {
    setDisplayDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const currentStreak = useMemo(() => calculateCurrentStreak(habit), [habit]);
  // calculateLongestStreak expects the whole habit object
  const longestStreak = useMemo(() => calculateLongestStreak(habit), [habit]);

  const frequencyText = useMemo(() => {
    switch (habit.frequencyType) {
      case 'daily': return '毎日';
      case 'weekly':
        if (!Array.isArray(habit.frequencyValue) || habit.frequencyValue.length === 0) return '毎週：曜日未設定';
        return `毎週：${(habit.frequencyValue as number[]).map(d => WEEK_DAYS[d]).join('、')}`;
      case 'monthly':
        if (!Array.isArray(habit.frequencyValue) || habit.frequencyValue.length === 0) return '月次：日付未設定';
        return `月次：${(habit.frequencyValue as number[]).join(',')}`;
      default: return '頻度未設定';
    }
  }, [habit.frequencyType, habit.frequencyValue]);

  const [actionModalDate, setActionModalDate] = useState<Date | null>(null);
  const [pendingAmount, setPendingAmount] = useState<string>('');
  const [isEnteringAmount, setIsEnteringAmount] = useState(false);

  const performSkip = (dkey: string) => {
    const newSkips = Array.from(new Set([...(habit.skippedDates || []), dkey]));
    onUpdate({ ...habit, skippedDates: newSkips });
    setActionModalDate(null);
  };
  const performUnskip = (dkey: string) => {
    const newSkips = (habit.skippedDates || []).filter(s => s !== dkey);
    onUpdate({ ...habit, skippedDates: newSkips });
    setActionModalDate(null);
  };
  const performRecordAmount = (dkey: string, inputVal: string) => {
    const parsed = inputVal.trim() === '' ? null : Number(inputVal.replace(',', '.'));
    if (parsed !== null && isNaN(parsed)) { alert('数値を入力してください'); return; }
    const newAmounts = { ...(habit.completedAmounts || {}) };
    if (parsed === null) delete newAmounts[dkey]; else newAmounts[dkey] = parsed;
    onUpdate({ ...habit, completedAmounts: newAmounts });
    setIsEnteringAmount(false);
    setActionModalDate(null);
    setPendingAmount('');
  };
  const performToggleBinary = (dkey: string) => {
    const setDates = new Set(habit.completedDates || []);
    if (setDates.has(dkey)) setDates.delete(dkey); else setDates.add(dkey);
    onUpdate({ ...habit, completedDates: Array.from(setDates).sort() });
    setActionModalDate(null);
  };

  const handleDateClick = (d: Date) => {
    setActionModalDate(d);
    setIsEnteringAmount(false);
    setPendingAmount('');
  };

  const generateCalendar = () => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarDays: React.ReactNode[] = [];

    for (let i = 0; i < firstDay; i++) calendarDays.push(<div key={`empty-${i}`} className="w-10 h-10"></div>);

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = formatDateKey(d);
      const isScheduled = isHabitScheduledForDate(habit, d);
      const isToday = dateStr === formatDateKey(new Date());

      const amountMap = habit.completedAmounts || {};
      const amountVal = amountMap[dateStr] ?? 0;
      const target = habit.target ?? 0;
      const isAmountFull = target > 0 ? amountVal >= target : false;
      const isAmountPartial = !isAmountFull && amountVal > 0;

      const isBinaryCompleted = completedDatesSet.has(dateStr);
      const isSkipped = habit.skippedDates?.includes(dateStr) ?? false;

      let dayClass = '';
      if (habit.type === 'amount') {
        if (isAmountFull) dayClass = 'bg-green-500 text-white font-bold';
        else if (isAmountPartial) dayClass = 'bg-green-100 text-green-800';
        else if (isScheduled) dayClass = 'bg-gray-100';
        else dayClass = 'bg-gray-300 text-gray-500';
      } else {
        if (isBinaryCompleted) dayClass = 'bg-green-500 text-white font-bold';
        else if (isScheduled) dayClass = 'bg-gray-100';
        else dayClass = 'bg-gray-300 text-gray-500';
      }
      // 選択日は actionModalDate（あれば）または今日を選択状態として表示
      const selectedKey = actionModalDate ? formatDateKey(actionModalDate) : formatDateKey(new Date());
      const isSelected = dateStr === selectedKey;
      if (isToday && ((habit.type === 'amount' ? !isAmountFull && isScheduled : !isBinaryCompleted && isScheduled))) {
        dayClass += ' ring-2 ring-indigo-500';
      }
      if (isSkipped) dayClass = 'bg-yellow-100 text-yellow-800';

      calendarDays.push(
        <div
          key={day}
          onClick={() => handleDateClick(d)}
          className="w-10 h-10 flex items-center justify-center text-sm cursor-pointer"
          title={isSkipped ? 'スキップ済み: クリックで解除' : 'クリックで記録 / スキップ'}
        >
          <span
            className={`relative w-8 h-8 rounded-full flex items-center justify-center ${dayClass} ${isSelected ? 'bg-indigo-600 text-white font-semibold scale-105 transform' : ''}`}
          >
            {day}
            {/* スキップ時は丸の上に斜め線（右上→左下）を描画して視認性を高める */}
            {isSkipped && (
              <span className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <span style={{ position: 'absolute', width: '140%', height: '2px', backgroundColor: '#D97706', transform: 'rotate(-45deg)' }} />
              </span>
            )}
          </span>
        </div>
      );
    }

    return calendarDays;
  };

  const handleDeleteConfirm = () => {
    onDelete(habit.id);
    onClose();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // undefined を送らないために条件付きでフィールドを追加/削除する
    const base: Partial<Habit> = {
      ...habit,
      name: formData.name,
      startDate: formData.startDate,
      frequencyType: formData.frequencyType,
      frequencyValue: formData.frequencyValue,
      type: formData.type, 
      detail: formData.detail ?? undefined,
      skippedDates: formData.skippedDates ?? (habit.skippedDates ?? []),
      // completedDates は常に配列として保持（binary タイプで使う）
      completedDates: habit.completedDates ?? []
    };

    if (formData.type === 'amount') {
      base.target = formData.target ?? 0;
      base.unit = formData.unit ?? '';
      base.completedAmounts = habit.completedAmounts ?? {};
    } else {
      // binary タイプなら amount 関連フィールドは削除して undefined を送らない
      delete base.target;
      delete base.unit;
      delete base.completedAmounts;
    }

    const updatedHabit: Habit = base as Habit;
    onUpdate(updatedHabit);
    setIsEditing(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={!actionModalDate ? onClose : undefined}
      >
        <div className="relative w-full max-w-md">
          {actionModalDate && (
            // 下のモーダル（wrapper）全体を覆う暗いレイヤー。
            // wrapper 内に配置されるので画面下の固定タブは覆いません。
            <div className="absolute inset-0 z-40 rounded-2xl bg-black/60 pointer-events-auto" />
          )}
          <div className="relative z-30 bg-white rounded-2xl shadow-xl w-full p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{habit.name}</h2>
                {isEditing ? (
                  <p className="text-gray-500 text-sm">習慣の編集</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded-md">{frequencyText}</div>
                      {habit.type === 'amount' && habit.target ? (
                        <div className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded-md">
                          目標: <span className="font-semibold">{habit.target}</span>{habit.unit ? ` ${habit.unit}` : ''}
                        </div>
                      ) : null}
                    </div>
                    {/* 追加: タイトル・タグの下に詳細を小さなテキストで表示 */}
                    {habit.detail ? (
                      <p className="text-sm text-gray-500 line-clamp-3">{habit.detail}</p>
                    ) : null}
                  </div>
                )}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">詳細（任意）</label>
                  <textarea
                    ref={detailsRef}
                    value={formData.detail}
                    onInput={e => autoGrowTextArea(e.currentTarget as HTMLTextAreaElement)}
                    onChange={e => setFormData(f => ({...f, detail: e.target.value}))}
                    placeholder="例: 朝の10分で深呼吸しながら行う"
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900 resize-none"
                  />
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
                          const currentFrequencyValue = formData.frequencyValue as number[];
                          const newValue = currentFrequencyValue.includes(index)
                            ? currentFrequencyValue.filter(d => d !== index)
                            : [...currentFrequencyValue, index];
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
                        setFormData(f => ({...f, frequencyValue: value.sort((a,b)=>a-b)}));
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">タイプ</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="habitType" value="binary" checked={formData.type==='binary'} onChange={() => setFormData(f => ({...f, type: 'binary'}))} />
                      <span className="text-sm">1回でも実施</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="habitType" value="amount" checked={formData.type==='amount'} onChange={() => setFormData(f => ({...f, type: 'amount'}))} />
                      <span className="text-sm">規定量の実施</span>
                    </label>
                  </div>
                </div>

                {formData.type === 'amount' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">目標値</label>
                      <input type="number" value={formData.target ?? ''} onChange={e => setFormData(f => ({...f, target: e.target.value === '' ? undefined : Number(e.target.value)}))} className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">単位</label>
                      <input type="text" value={formData.unit} onChange={e => setFormData(f => ({...f, unit: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
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
          {/* ActionModal を同じ fixed コンテナ内に置く（外側に render されていたものをここに移動） */}
          {actionModalDate && (
            <ActionModal
              habit={habit}
              actionModalDate={actionModalDate}
              isEnteringAmount={isEnteringAmount}
              pendingAmount={pendingAmount}
              onClose={() => setActionModalDate(null)}
              onToggleBinary={performToggleBinary}
              onSkip={performSkip}
              onUnskip={performUnskip}
              onRecordAmount={performRecordAmount}
              setIsEnteringAmount={setIsEnteringAmount}
              setPendingAmount={setPendingAmount}
            />
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