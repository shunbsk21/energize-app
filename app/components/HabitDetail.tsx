"use client";

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

const normalizeKey = (d: string) => {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('sv-SE');
  } catch {
    return String(d);
  }
};

const getDoneSetForHabit = (habit: Habit): Set<string> => {
  // amount タイプ: completedAmounts の実値を正しく評価して日付キーを正規化して集める
  if (habit.type === 'amount') {
    const amtMap = habit.completedAmounts || {};
    const target = habit.target ?? 0;
    const keys: string[] = [];
    Object.entries(amtMap).forEach(([rawKey, rawVal]) => {
      const key = normalizeKey(rawKey);
      const v = Number(rawVal as any);
      if (Number.isNaN(v)) return;
      if (target > 0 ? v >= target : v > 0) keys.push(key);
    });
    // 保険: completedDates にも値が入っている場合は正規化して追加
    (habit.completedDates || []).forEach(d => keys.push(normalizeKey(d)));
    return new Set(keys);
  }
  // binary タイプ
  return new Set((habit.completedDates || []).map(normalizeKey));
};

const calculateLongestStreak = (habit: Habit): number => {
  const doneSet = getDoneSetForHabit(habit);
  const skipSet = new Set(((habit as any).skippedDates || []).map(normalizeKey));
  if (!doneSet || doneSet.size === 0) return 0;

  // safe parser: "YYYY-MM-DD" -> local Date, fallback to Date()
  const parseKeyToDate = (k: string): Date | null => {
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/;
    const m = String(k).match(ymd);
    if (m) {
      const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
      const dt = new Date(y, mo, d);
      dt.setHours(0,0,0,0);
      return dt;
    }
    const dt = new Date(k);
    if (!Number.isNaN(dt.getTime())) { dt.setHours(0,0,0,0); return dt; }
    return null;
  };

  // start: habit.startDate と done/skip の最古日のうち、より過去側（min）を起点にする
  const allKeys = [...Array.from(doneSet), ...Array.from(skipSet)] as string[];
  const parsedDates = allKeys.map(k => parseKeyToDate(k)).filter(Boolean) as Date[];
  let startFromHabit = parseKeyToDate(habit.startDate) || null;
  if (startFromHabit) startFromHabit.setHours(0,0,0,0);
  let earliestRecorded: Date | null = null;
  if (parsedDates.length > 0) {
    earliestRecorded = parsedDates.reduce((a,b) => a.getTime() <= b.getTime() ? a : b);
    earliestRecorded.setHours(0,0,0,0);
  }
  let start: Date;
  if (startFromHabit && earliestRecorded) {
    start = (earliestRecorded.getTime() < startFromHabit.getTime()) ? earliestRecorded : startFromHabit;
  } else if (startFromHabit) {
    start = startFromHabit;
  } else if (earliestRecorded) {
    start = earliestRecorded;
  } else {
    start = new Date();
    start.setHours(0,0,0,0);
  }

  const end = new Date(); end.setHours(0,0,0,0);

  const isScheduled = (date: Date) => {
    if (date < start) return false;
    const key = date.toLocaleDateString('sv-SE');
    // 予定日の判定に加え、「その日に記録済み（done）／スキップ済み」であれば
    // 非予定日でも連続記録計算に含める（ユーザーの要求に合わせる）
    if (doneSet.has(key) || skipSet.has(key)) return true;
    switch (habit.frequencyType) {
      case 'daily': return true;
      case 'weekly': {
        const fv = habit.frequencyValue || [];
        const dow = date.getDay(); // 0-6
        return fv.includes(dow);
      }
      case 'monthly': {
        const fv = habit.frequencyValue || [];
        return fv.includes(date.getDate());
      }
      default: return false;
    }
  };

  // scheduledDates ascending
  const scheduledDates: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (isScheduled(d)) scheduledDates.push(new Date(d));
  }

  // scan from newest -> oldest (currentStreak と同じ遡りロジックを利用)
  let longest = 0;
  let inRun = false;
  let doneCountInRun = 0;

  for (let i = scheduledDates.length - 1; i >= 0; i--) {
    const d = scheduledDates[i];
    // 日付キーを定義（done/skip は normalizeKey 相当の "sv-SE" フォーマットで保持している）
    const key = d.toLocaleDateString('sv-SE');
    if (doneSet.has(key) || skipSet.has(key)) {
      inRun = true;
      if (doneSet.has(key)) doneCountInRun += 1;
      continue;
    }
    // scheduled day but neither done nor skip => end current run
    if (inRun) {
      longest = Math.max(longest, doneCountInRun);
      inRun = false;
      doneCountInRun = 0;
    }
  }
  if (inRun) longest = Math.max(longest, doneCountInRun);
  return longest;
};

const calculateCurrentStreak = (habit: Habit): number => {
  const doneSet = getDoneSetForHabit(habit);
  if (!doneSet || doneSet.size === 0) return 0;

  const skipSet = new Set(((habit as any).skippedDates || []).map(normalizeKey));
  // start: habit.startDate (正規化) か、done/skip の最古日、最終的に今日より前の最小日を起点にする
  const parseKeyToDate = (k: string): Date | null => {
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/;
    const m = String(k).match(ymd);
    if (m) {
      const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
      const dt = new Date(y, mo, d);
      dt.setHours(0,0,0,0);
      return dt;
    }
    const dt = new Date(k);
    if (!Number.isNaN(dt.getTime())) { dt.setHours(0,0,0,0); return dt; }
    return null;
  };
  const allKeysCurr = [...Array.from(doneSet), ...Array.from(skipSet)] as string[];
  const parsedCurr = allKeysCurr.map(k => parseKeyToDate(k)).filter(Boolean) as Date[];
  // start: habit.startDate と done/skip の最古日のうち、より過去側（min）を起点にする
  let startFromHabit = parseKeyToDate(habit.startDate) || null;
  if (startFromHabit) startFromHabit.setHours(0,0,0,0);
  let earliestRecordedCurr: Date | null = null;
  if (parsedCurr.length > 0) {
    earliestRecordedCurr = parsedCurr.reduce((a,b) => a.getTime() <= b.getTime() ? a : b);
    earliestRecordedCurr.setHours(0,0,0,0);
  }
  let start: Date;
  if (startFromHabit && earliestRecordedCurr) {
    start = (earliestRecordedCurr.getTime() < startFromHabit.getTime()) ? earliestRecordedCurr : startFromHabit;
  } else if (startFromHabit) {
    start = startFromHabit;
  } else if (earliestRecordedCurr) {
    start = earliestRecordedCurr;
  } else {
    start = new Date();
    start.setHours(0,0,0,0);
  }

  const isScheduled = (date: Date) => {
    if (date < start) return false;
    const key = date.toLocaleDateString('sv-SE');
    // 非予定日でもその日に記録済みなら「スケジュールあり」と見なす
    if (doneSet.has(key) || skipSet.has(key)) return true;
    switch (habit.frequencyType) {
      case 'daily': return true;
      case 'weekly': return (habit.frequencyValue || []).includes(date.getDay());
      case 'monthly': return (habit.frequencyValue || []).includes(date.getDate());
      default: return false;
    }
  };

  // 直近で「実際に記録（done or skip）されている予定日」を探す（今日が未実施でも直近の完了日から遡る）
  const today = new Date(); today.setHours(0,0,0,0);
  let lastRecordedScheduled: Date | null = null;
  for (let d = new Date(today); d >= start; d.setDate(d.getDate() - 1)) {
    if (!isScheduled(d)) continue;
    const k = d.toLocaleDateString('sv-SE');
    if (doneSet.has(k) || skipSet.has(k)) { lastRecordedScheduled = new Date(d); break; }
  }
  if (!lastRecordedScheduled) return 0;

  // lastRecordedScheduled を基点に遡る（done は +1、skip は継続だがカウントしない）
  let streak = 0;
  // 追加チェック：lastRecordedScheduled より最近の scheduled 日で「未実施かつ未スキップ」がある場合は
  // 「丸1日空けた」とみなし現在の連続記録を 0 にする
  for (let d = new Date(lastRecordedScheduled); d <= new Date(); d.setDate(d.getDate() + 1)) {
    if (d.getTime() === lastRecordedScheduled.getTime()) continue; // 基点自身は除外
    if (!isScheduled(d)) continue;
    const k = d.toLocaleDateString('sv-SE');
    if (!doneSet.has(k) && !skipSet.has(k)) {
      return 0;
    }
  }

  for (let cur = new Date(lastRecordedScheduled); cur >= start; cur.setDate(cur.getDate() - 1)) {
    if (!isScheduled(cur)) continue;
    const key = cur.toLocaleDateString('sv-SE');
    if (doneSet.has(key)) { streak++; continue; }
    if (skipSet.has(key)) { continue; }
    break;
  }
  return streak;
};

const isHabitScheduledForDate = (habit: Habit, date: Date): boolean => {
  const habitStartDate = new Date(habit.startDate);
  habitStartDate.setHours(0,0,0,0);
  const targetDate = new Date(date);
  targetDate.setHours(0,0,0,0);
  if (targetDate < habitStartDate) return false;

  const skipDates: string[] = (habit as any).skippedDates ?? [];
  const dkey = targetDate.toLocaleDateString('sv-SE');
  if (skipDates.includes(dkey)) return false;

  switch (habit.frequencyType) {
    case 'daily': return true;
    case 'weekly': return habit.frequencyValue.includes(targetDate.getDay());
    case 'monthly': return habit.frequencyValue.includes(targetDate.getDate());
    default: return false;
  }
};

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
    details: habit.details ?? '',
    skippedDates: habit.skippedDates ?? []
  });

  useEffect(() => {
    setFormData({
      name: habit.name,
      startDate: habit.startDate,
      frequencyType: habit.frequencyType,
      frequencyValue: habit.frequencyValue,
      type: (habit.type ?? 'binary') as 'binary' | 'amount',
      target: habit.target ?? undefined,
      unit: habit.unit ?? '',
      details: habit.details ?? '',
      skippedDates: habit.skippedDates ?? []
    });
    // 自動リサイズを一度実行
    setTimeout(() => autoGrowTextArea(detailsRef.current), 0);
  }, [habit, isEditing]);

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
        if (!habit.frequencyValue || habit.frequencyValue.length === 0) return '毎週：曜日未設定';
        return `毎週：${habit.frequencyValue.map(d => WEEK_DAYS[d]).join('、')}`;
      case 'monthly':
        if (!habit.frequencyValue || habit.frequencyValue.length === 0) return '月次：日付未設定';
        return `月次：${habit.frequencyValue.join(',')}`;
      default: return '頻度未設定';
    }
  }, [habit.frequencyType, habit.frequencyValue]);

  const dateKey = (d: Date) => d.toLocaleDateString('sv-SE');

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
      const dateStr = d.toLocaleDateString('sv-SE');
      const isScheduled = isHabitScheduledForDate(habit, d);
      const isToday = dateStr === new Date().toLocaleDateString('sv-SE');

      const amountMap = habit.completedAmounts || {};
      const amountVal = amountMap[dateStr] ?? 0;
      const target = habit.target ?? 0;
      const isAmountFull = target > 0 ? amountVal >= target : false;
      const isAmountPartial = !isAmountFull && amountVal > 0;

      const isBinaryCompleted = completedDatesSet.has(dateStr);
      const skipDates: string[] = (habit as any).skippedDates ?? [];
      const isSkipped = skipDates.includes(dateStr);

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
      const selectedKey = actionModalDate ? dateKey(actionModalDate) : new Date().toLocaleDateString('sv-SE');
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

  const ActionModal: React.FC = () => {
    if (!actionModalDate) return null;
    const dkey = dateKey(actionModalDate);
    const skipDates: string[] = (habit as any).skippedDates ?? [];
    const isSkipped = skipDates.includes(dkey);
    const amountMap = habit.completedAmounts || {};
    const currentAmount = amountMap[dkey] ?? '';
    const isBinaryDone = (habit.completedDates || []).includes(dkey);

    // 親 fixed コンテナ内に absolute 表示、画面下の固定タブを避けるため bottom を確保
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ bottom: '84px' }} onClick={e => e.stopPropagation()}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-xl font-semibold text-gray-900">{habit.name}</div>
              <div className="text-base text-gray-600">{actionModalDate.toLocaleDateString()}</div>
            </div>
            <button
              onClick={() => setActionModalDate(null)}
              aria-label="閉じる"
              className="text-gray-600 hover:text-gray-900 text-3xl leading-none"
            >
              ×
            </button>
          </div>
          {/* ボタン群 / 入力フォーム（既存ロジックをそのまま使用） */}
          {!isEnteringAmount ? (
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 flex flex-col items-center gap-2 py-4 bg-indigo-600 text-white rounded-lg shadow-lg"
                onClick={() => {
                  if (habit.type === 'amount') {
                    setIsEnteringAmount(true);
                    setPendingAmount(currentAmount ? String(currentAmount) : '');
                  } else {
                    performToggleBinary(dkey);
                  }
                }}
              >
                {/* アイコン */}
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" stroke="white" />
                </svg>
                <span className="font-medium">{habit.type === 'amount' ? '記録する' : (isBinaryDone ? '取り消す' : '記録する')}</span>
              </button>

              <button
                type="button"
                className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-lg border ${isSkipped ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-white border-gray-200 text-gray-700'}`}
                onClick={() => { isSkipped ? performUnskip(dkey) : performSkip(dkey); }}
              >
                <svg className={`w-8 h-8 ${isSkipped ? 'text-yellow-700' : 'text-gray-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4" />
                  <path d="M12 22v-4" />
                  <path d="M4.93 4.93l2.83 2.83" />
                  <path d="M16.24 16.24l2.83 2.83" />
                </svg>
                <span className="font-medium">{isSkipped ? 'スキップ解除' : 'この日をスキップ'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); performRecordAmount(dkey, pendingAmount); }}>
              <label className="block text-sm text-gray-700 mb-2">達成量（{habit.unit ?? ''}）</label>
              <input autoFocus value={pendingAmount} onChange={e => setPendingAmount(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md mb-3" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-md">保存</button>
                <button type="button" className="flex-1 py-3 bg-gray-100 rounded-md" onClick={() => { setIsEnteringAmount(false); setPendingAmount(''); }}>戻る</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  const handleDeleteConfirm = () => {
    onDelete(habit.id);
    onClose();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // undefined を送らないために条件付きでフィールドを追加/削除する
    const base: any = {
      ...habit,
      name: formData.name,
      startDate: formData.startDate,
      frequencyType: formData.frequencyType,
      frequencyValue: formData.frequencyValue,
      type: formData.type,
      details: formData.details ?? undefined,
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

    const updatedHabit: Habit = base;
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
                    {habit.details ? (
                      <p className="text-sm text-gray-500 line-clamp-3">{habit.details}</p>
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
                    value={formData.details}
                    onInput={e => autoGrowTextArea(e.currentTarget as HTMLTextAreaElement)}
                    onChange={e => setFormData(f => ({...f, details: e.target.value}))}
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
          {actionModalDate && <ActionModal />}
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