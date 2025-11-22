"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
// ★ EnergyRecord をインポートし、パスを修正
import { Habit, View, FrequencyType, DiagnosisFrequency, EnergyRecord } from '../types'; 
import HabitDetail from './HabitDetail';

// --- Propsの定義を変更 ---
interface HabitTrackerProps {
  habits: Habit[];
  energyHistory: EnergyRecord[];
  onAddHabit: (newHabit: Omit<Habit, 'id'>) => void;
  onUpdateHabit: (updatedHabit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  setIsHelpOpen: (isOpen: boolean) => void;
  setView: (view: View) => void;
  diagnosisFrequency: DiagnosisFrequency;
  checkins?: { id: string; date: string; value: number; note?: string; createdAt?: string }[];
  checkouts?: { id: string; date: string; gratitude?: string; note?: string; rating?: number | null; createdAt?: string }[];
  onAddCheckin?: (value: number, note?: string, dateStr?: string) => void | Promise<void>;
  onAddCheckout?: (gratitude?: string, note?: string, rating?: number | null, dateStr?: string) => void | Promise<void>;
  onUpdateCheckin?: (id: string, value: number, note?: string) => void | Promise<void>;
  onUpdateCheckout?: (id: string, gratitude?: string, note?: string, rating?: number | null) => void | Promise<void>;

  // tasks (外部から渡される)
  tasks?: {
    id: string;
    title: string;
    details?: string;
    dueDate?: string; // 'YYYY-MM-DD'
    priority?: 'low'|'medium'|'high';
    done?: boolean;
    completedAt?: string;
  }[];
  onAddTask?: (t: { title: string; details?: string; dueDate?: string; priority?: 'low'|'medium'|'high' }) => void | Promise<void>;

  // 追加: タスクの完了トグルを親に伝える
  onToggleTask?: (taskId: string, done: boolean) => Promise<void> | void;

  // 追加: タスク更新 / 削除ハンドラ（あれば呼び出す）
  onUpdateTask?: (taskId: string, payload: { title?: string; details?: string; dueDate?: string; priority?: 'low'|'medium'|'high'; done?: boolean }) => Promise<void> | void;
  onDeleteTask?: (taskId: string) => Promise<void> | void;
}

// 優先度ソート用
const prioritySortValue = (p?: 'low'|'medium'|'high') => (p === 'high' ? 3 : p === 'medium' ? 2 : p === 'low' ? 1 : 0);

// --- Icon Components Start (★ CheckCircleIcon を追加) ---

const PlusIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const ChevronLeftIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

const CalendarIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const HelpIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
);

const DiagnosisIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ListBulletIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
);

const EditIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

// ★ 完了を示すチェックアイコンを追加
const CheckCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const MoodIcon = ({ level }: { level: number }) => {
  // 簡易アイコン: emoji を利用（スタイルは調整可能）
  const map = {
    5: '⚡️',
    4: '😊',
    3: '😐',
    2: '😴',
    1: '🥀'
  } as any;
  return <span className="text-xl">{map[level]}</span>;
};
// --- Icon Components End ---


// --- Helper Functions Start (変更なし) ---

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

const calculateCompletionStatus = (date: Date, habits: Habit[]): 'none' | 'partial' | 'full' => {
      const dateStr = date.toLocaleDateString('sv-SE');
      // scheduled and not skipped
      const scheduledHabits = habits.filter(h => {
        if (!isHabitScheduledForDate(h, date)) return false;
        const skipped = ((h as any).skippedDates || []).map((s:string) => {
          const dt = new Date(s); dt.setHours(0,0,0,0); return dt.toLocaleDateString('sv-SE');
        });
        return !skipped.includes(dateStr);
      });

      if (scheduledHabits.length === 0) return 'none';

      const completedCount = scheduledHabits.reduce((acc, h) => {
        const type = (h.type ?? 'binary');
        if (type === 'amount') {
          const amountMap = h.completedAmounts || {};
          const val = amountMap[dateStr] ?? 0;
          const target = h.target ?? 0;
          const satisfied = target > 0 ? val >= target : val > 0;
          return acc + (satisfied ? 1 : 0);
        } else {
          const doneKeys = (h.completedDates || []).map(d => {
            const dt = new Date(d); dt.setHours(0,0,0,0); return dt.toLocaleDateString('sv-SE');
          });
          return acc + (doneKeys.includes(dateStr) ? 1 : 0);
        }
      }, 0);

      if (completedCount === 0) return 'none';
      if (completedCount === scheduledHabits.length) return 'full';
      return 'partial';
};


const isDiagnosisScheduledForDate = (frequency: DiagnosisFrequency, date: Date): boolean => {
    const targetDate = new Date(date);
    targetDate.setHours(0,0,0,0);

    switch (frequency.frequencyType) {
        case 'daily':
            return true;
        case 'weekly':
            return frequency.frequencyValue.includes(targetDate.getDay());
        case 'monthly':
            return frequency.frequencyValue.includes(targetDate.getDate());
        default:
            return false;
    }
};

// --- Helper Functions End ---


// --- Modal Components Start (変更なし) ---

const DatePickerModal: React.FC<{
    isOpen: boolean, 
    onClose: () => void, 
    onDateSelect: (date: Date) => void,
    initialDate: Date,
    habits: Habit[],
}> = ({isOpen, onClose, onDateSelect, initialDate, habits}) => {
    const [displayDate, setDisplayDate] = useState(initialDate);

    if (!isOpen) return null;

    const changeMonth = (amount: number) => {
      setDisplayDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + amount);
        return newDate;
      });
    };

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
          const date = new Date(year, month, day);
          const isSelected = initialDate.toLocaleDateString('sv-SE') === date.toLocaleDateString('sv-SE');
          const completionStatus = calculateCompletionStatus(date, habits);
          calendarDays.push(
            <div 
                key={day} 
                className="w-10 h-10 flex items-center justify-center text-sm cursor-pointer hover:bg-indigo-100 relative"
                onClick={() => onDateSelect(date)}
            >
              <span className={`${isSelected ? 'w-9 h-9 rounded-[10px] scale-105 transform bg-indigo-600 text-white flex items-center justify-center font-semibold' : 'w-8 h-8 rounded-full flex items-center justify-center'}`}>
                {day}
              </span>
              <div className="absolute bottom-1 flex items-center justify-center">
                {completionStatus === 'full' && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                {completionStatus === 'partial' && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>}
              </div>
            </div>
          );
        }
        return calendarDays;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100">&larr;</button>
                    <h3 className="font-bold text-lg">{`${displayDate.getFullYear()}年 ${displayDate.getMonth() + 1}月`}</h3>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100">&rarr;</button>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 mb-2">
                    {['日', '月', '火', '水', '木', '金', '土'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-y-1 place-items-center">
                    {generateCalendar()}
                </div>
            </div>
        </div>
    );
};

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];

const HabitListModal: React.FC<{
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
                return `毎週${habit.frequencyValue.map(d => WEEK_DAYS[d]).join('、')}曜日`;
            case 'monthly':
                if (habit.frequencyValue.length === 0) return '月次（日付未設定）';
                return `毎月${habit.frequencyValue.join('、')}日`;
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

// --- Modal Components End ---

// --- HabitTracker の中にモーダルを追加 ---
// --- モーダル内 textarea の自動リサイズ用ヘルパ（モジュール内どこでも可） ---
function autoGrowTextArea(el?: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
}

const CheckInModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (value: number, note?: string) => void; initial?: { value:number; note?:string } }> = ({ isOpen, onClose, onSave, initial }) => {
  const [value, setValue] = useState<number>(initial?.value ?? 4);
  const [note, setNote] = useState<string>(initial?.note ?? '');
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initial?.value ?? 4);
      setNote(initial?.note ?? '');
      setTimeout(() => autoGrowTextArea(noteRef.current), 0);
    }
  }, [isOpen, initial]);

  const DESCRIPTIONS: { [k: number]: { short: string; full: string } } = {
    5: { short: 'エネルギー満タン', full: '活力が最大限で、集中力・やる気ともに高い状態。' },
    4: { short: '元気', full: '通常のレベルより調子が良く、前向きに取り組める状態。' },
    3: { short: '普通', full: '可もなく不可もなく、日常の業務をこなせる安定した状態。' },
    2: { short: '疲労気味', full: '集中力が切れやすく、休息やリフレッシュが必要な状態。' },
    1: { short: 'エネルギー枯渇', full: '意欲や体力がなく、十分な回復を最優先すべき危険な状態。' },
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-3 w-full max-w-md max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">チェックイン: 今日のエネルギー</h3>

        {/* モーダル内部スクロール領域 */}
        <div className="max-h-[60vh] overflow-auto pr-2">
          {/* 短い表示のみ縦並び（降順）。各行をコンパクトに */}
          <div className="space-y-2 mb-3">
            {[5,4,3,2,1].map(v => (
              <button
                key={v}
                onClick={() => setValue(v)}
                aria-pressed={value === v}
                className={`w-full text-left rounded-md border transition flex items-center gap-3 py-2 px-3 ${value === v ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
              >
                {/* 数字を左に */}
                <div className="w-6 flex-shrink-0 text-sm font-medium text-gray-600">{v}.</div>

                {/* アイコンは中央寄せ */}
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  <MoodIcon level={v} />
                </div>

                {/* テキストは中央揃え（縦中央） */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 leading-tight">{DESCRIPTIONS[v].short}</div>
                </div>
              </button>
            ))}
          </div>

          {/* 選択したものの詳細説明は選択欄下にコンパクトに表示 */}
          <div className="mb-3 text-sm text-gray-700">
            <div className="text-xs text-gray-500 mb-1">選択: <span className="font-medium">{DESCRIPTIONS[value].short}</span></div>
            <div className="p-2 bg-gray-50 rounded text-sm text-gray-600 leading-relaxed">{DESCRIPTIONS[value].full}</div>
          </div>

          <textarea
            ref={noteRef}
            value={note}
            onInput={e => autoGrowTextArea(e.currentTarget as HTMLTextAreaElement)}
            onChange={e => setNote(e.target.value)}
            placeholder="メモ（任意）"
            rows={3}
            className="w-full p-2 border border-gray-200 rounded-md mb-3 resize-none text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-3 py-2 rounded-md bg-white border text-sm">キャンセル</button>
          <button onClick={() => { onSave(value, note); onClose(); }} className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm">保存</button>
        </div>
      </div>
    </div>
  );
};

// --- CheckOutModal (差し替え) ---
const CheckOutModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (gratitude?: string, note?: string, rating?: number) => void; initial?: { rating:number; gratitude?:string; note?:string } }> = ({ isOpen, onClose, onSave, initial }) => {
  const [rating, setRating] = useState<number>(initial?.rating ?? 4);
  const [gratitude, setGratitude] = useState<string>(initial?.gratitude ?? '');
  const [note, setNote] = useState<string>(initial?.note ?? '');
  const gratitudeRef = useRef<HTMLTextAreaElement | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRating(initial?.rating ?? 4);
      setGratitude(initial?.gratitude ?? '');
      setNote(initial?.note ?? '');
      setTimeout(() => { autoGrowTextArea(gratitudeRef.current); autoGrowTextArea(noteRef.current); }, 0);
    }
  }, [isOpen, initial]);

  const SAT_DESCRIPTIONS: { [k: number]: { short: string; full: string } } = {
    5: { short: '今日は最高だった', full: '非常に満足しており、達成感や喜びを感じる充実した一日。' },
    4: { short: '今日は良かった', full: '概ね満足しており、良い出来事が多かった一日。' },
    3: { short: '今日は普通', full: '特に大きな出来事もなく、平穏に過ごした一日。' },
    2: { short: 'ちょっと残念', full: 'ストレスや小さな失敗があり、気分が沈んだ一日。' },
    1: { short: '今日は最悪だった', full: '予期せぬ大きな問題や、強い不満を感じた一日。' },
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-3 w-full max-w-lg max-h-[88vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">チェックアウト: 感謝・日記</h3>

        <div className="max-h-[64vh] overflow-auto pr-2">
          <div className="text-sm text-gray-700 mb-2">今日の気分を選択してください</div>

          {/* 短い表示のみ縦並び（降順）・コンパクト */}
          <div className="space-y-2 mb-3">
            {[5,4,3,2,1].map(v => (
              <button
                key={v}
                onClick={() => setRating(v)}
                aria-pressed={rating === v}
                className={`w-full text-left rounded-md border transition flex items-center gap-3 py-2 px-3 ${rating === v ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
              >
                {/* 数字を左 */}
                <div className="w-6 flex-shrink-0 text-sm font-medium text-gray-600">{v}.</div>

                {/* アイコン */}
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  <MoodIcon level={v} />
                </div>

                {/* テキスト */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 leading-tight">{SAT_DESCRIPTIONS[v].short}</div>
                </div>
              </button>
            ))}
          </div>

          {/* 選択したものの詳細説明 */}
          <div className="mb-4 text-sm text-gray-700">
            <div className="text-xs text-gray-500 mb-1">選択: <span className="font-medium">{SAT_DESCRIPTIONS[rating].short}</span></div>
            <div className="p-2 bg-gray-50 rounded text-sm text-gray-600 leading-relaxed">{SAT_DESCRIPTIONS[rating].full}</div>
          </div>

          <div className="mb-3">
            <label className="text-sm text-gray-600">今日の感謝</label>
            <textarea
              ref={gratitudeRef}
              value={gratitude}
              onInput={e => autoGrowTextArea(e.currentTarget as HTMLTextAreaElement)}
              onChange={e => setGratitude(e.target.value)}
              placeholder="例: 一緒にランチしてくれた同僚に感謝"
              rows={1}
              className="w-full p-3 border border-gray-200 rounded-md mt-1 mb-2 resize-none text-sm"
            />
            <label className="text-sm text-gray-600">日記（任意・詳細）</label>
            <textarea
              ref={noteRef}
              value={note}
              onInput={e => autoGrowTextArea(e.currentTarget as HTMLTextAreaElement)}
              onChange={e => setNote(e.target.value)}
              placeholder="今日の出来事や振り返りを書き留めましょう"
              rows={3}
              className="w-full p-3 border border-gray-200 rounded-md mt-1 resize-none text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-3 py-2 rounded-md bg-white border text-sm">キャンセル</button>
          <button onClick={() => { onSave(gratitude, note, rating); onClose(); }} className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm">保存</button>
        </div>
      </div>
    </div>
  );
};

// --- Icon Components: add Sun/Moon (for check-in/check-out) ---
const SunIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 100 10 5 5 0 000-10z"/>
  </svg>
);
const MoonIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

// --- HabitTracker Component Start ---

const HabitTracker: React.FC<HabitTrackerProps> = ({ 
  habits, 
  energyHistory,
  onAddHabit,
  onUpdateHabit,
  onDeleteHabit,
  setIsHelpOpen, 
  setView, 
  diagnosisFrequency,
  checkins,
  checkouts,
  onAddCheckin,
  onAddCheckout,
  onUpdateCheckin,
  onUpdateCheckout,
  tasks = [],
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onDeleteTask
}) => {
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitStartDate, setNewHabitStartDate] = useState(new Date().toLocaleDateString('sv-SE'));
  const [newHabitFrequency, setNewHabitFrequency] = useState<{type: FrequencyType, value: number[]}>({type: 'daily', value: []});
  const [newHabitType, setNewHabitType] = useState<'binary' | 'amount'>('binary');
  const [newHabitTarget, setNewHabitTarget] = useState<number | undefined>(undefined);
  const [newHabitUnit, setNewHabitUnit] = useState<string>('');

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isNonScheduledOpen, setIsNonScheduledOpen] = useState(false);
  // --- 新: 固定量入力モーダル用 state（prompt を置き換える） ---
  const [isAmountModalOpen, setIsAmountModalOpen] = useState(false);
  const [amountModalHabit, setAmountModalHabit] = useState<Habit | null>(null);
  const [amountModalValue, setAmountModalValue] = useState<string>('');

  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkedOutToday, setCheckedOutToday] = useState(false);

  // --- Task add modal state (新規) ---
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  const [taskDueDate, setTaskDueDate] = useState<string>(''); // ISO YYYY-MM-DD
  const [taskPriority, setTaskPriority] = useState<'low'|'medium'|'high'>('medium');

  // --- Floating multi-button 展開 state ---
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement | null>(null);

  // --- localTasks: props から同期するローカルコピー（即時UI反映用） ---
  const [localTasks, setLocalTasks] = useState<typeof tasks>(tasks);
  useEffect(() => setLocalTasks(tasks), [tasks]);

  // --- selected task for edit modal ---
  const [selectedTask, setSelectedTask] = useState<null | {
    id: string;
    title: string;
    details?: string;
    dueDate?: string;
    priority?: 'low'|'medium'|'high';
    done?: boolean;
  }>(null);

  // edit modal fields
  const [editTitle, setEditTitle] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<'low'|'medium'|'high'>('medium');
  const [editDone, setEditDone] = useState(false);

  // 外部クリックで展開メニューを閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!fabOpen) return;
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setFabOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fabOpen]);
  
  // selectedDate をローカル日の ISO (YYYY-MM-DD) で使う（タイムゾーン差で日付がずれる問題を防ぐ）
  const formatLocalISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const selectedDateISO = formatLocalISO(selectedDate);

  useEffect(() => {
    if (selectedTask) {
      setEditTitle(selectedTask.title || '');
      setEditDetails(selectedTask.details || '');
      setEditDueDate(selectedTask.dueDate || '');
      setEditPriority(selectedTask.priority || 'medium');
      setEditDone(!!selectedTask.done);
    }
  }, [selectedTask]);
  
  // --- 当日の期日タスク（selectedDate が dueDate と一致するもの） ---
  const dueTasks = useMemo(() => {
    return (localTasks || [])
      .filter(t => t.dueDate === selectedDateISO)
      .sort((a, b) => {
        const pa = prioritySortValue(a.priority);
        const pb = prioritySortValue(b.priority);
        if (pa !== pb) return pb - pa; // 高い優先度を前に
        return (a.title || '').localeCompare(b.title || '');
      });
  }, [localTasks, selectedDateISO]);

  // タスク追加 submit
  const submitTask = async () => {
    if (!taskTitle.trim()) return;
    const payload = { title: taskTitle.trim(), details: taskDetails.trim() || undefined, dueDate: taskDueDate || selectedDateISO, priority: taskPriority };
    try {
      await onAddTask?.(payload);
    } catch (err) {
      console.error('onAddTask error', err);
    }
    // reset
    setTaskTitle(''); setTaskDetails(''); setTaskDueDate(''); setTaskPriority('medium');
    setIsTaskModalOpen(false);
    setFabOpen(false);
  };

  // タスク完了トグル時にローカル更新して親へ通知
  const handleToggleTaskLocal = async (taskId: string, nextDone: boolean) => {
    setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: nextDone, completedAt: nextDone ? new Date().toISOString() : undefined } : t));
    try {
      await onToggleTask?.(taskId, nextDone);
    } catch (err) {
      console.error('onToggleTask error', err);
    }
  };

  // タスク編集保存
  const saveTaskEdits = async () => {
    if (!selectedTask) return;
    const payload = {
      title: editTitle.trim() || selectedTask.title,
      details: editDetails.trim() || undefined,
      dueDate: editDueDate || undefined,
      priority: editPriority,
      done: editDone
    };
    // optimistic local update
    setLocalTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, ...payload } : t));
    try {
      if (onUpdateTask) {
        await onUpdateTask(selectedTask.id, payload);
      } else {
        console.warn('onUpdateTask prop not provided');
      }
    } catch (err) {
      console.error('onUpdateTask error', err);
    }
    setSelectedTask(null);
  };

  const deleteTaskConfirm = async () => {
    if (!selectedTask) return;
    const id = selectedTask.id;
    setLocalTasks(prev => prev.filter(t => t.id !== id));
    try {
      if (onDeleteTask) await onDeleteTask(id);
      else console.warn('onDeleteTask prop not provided');
    } catch (err) {
      console.error('onDeleteTask error', err);
    }
    setSelectedTask(null);
  };

  // (↓ getWeekStart, weekStart, スワイプ関連のロジックは変更なし)
  const getWeekStart = (date: Date) => {
    // return Monday-start week start date for given date
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun ... 6=Sat
    // convert to Monday-start: (0 -> 6), 1 -> 0, 2 -> 1 ...
    const offset = (day + 6) % 7;
    const diff = d.getDate() - offset;
    const start = new Date(d);
    start.setDate(diff);
    start.setHours(0,0,0,0);
    return start;
  };

  const [weekStart, setWeekStart] = useState(getWeekStart(selectedDate));
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [transitionDuration, setTransitionDuration] = useState('0.3s');
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef(0);
  const dragOffsetRef = useRef(0);
  
  // helper to avoid TS undefined since props names are in scope
  function propsOrEmpty<T>(v?: T) { return v ?? [] as unknown as T; }

  // --- checkin/checkout lookup helpers (date format: sv-SE) ---
  const getCheckinForDate = (date: Date) => {
    const d = date.toLocaleDateString('sv-SE');
    return (propsOrEmpty(checkins) || []).find((c:any) => c.date === d) || null;
  };
  const getCheckoutForDate = (date: Date) => {
    const d = date.toLocaleDateString('sv-SE');
    return (propsOrEmpty(checkouts) || []).find((c:any) => c.date === d) || null;
  };

  // --- モーダル用ドラフト state（open 時に既存値で初期化） ---
  const [checkinDraft, setCheckinDraft] = useState<{ id?: string; value: number; note?: string }>({ value: 4 });
  const [checkoutDraft, setCheckoutDraft] = useState<{ id?: string; rating: number; gratitude?: string; note?: string }>({ rating: 4 });

  // when opening modals, initialize drafts from existing records
  useEffect(() => {
    if (isCheckInOpen) {
      const rec = getCheckinForDate(selectedDate);
      if (rec) {
        setCheckinDraft({ id: rec.id, value: rec.value, note: rec.note || '' });
      } else {
        setCheckinDraft({ value: 4, note: '' });
      }
    }
  }, [isCheckInOpen, selectedDate, checkins]);

  useEffect(() => {
    if (isCheckOutOpen) {
      const rec = getCheckoutForDate(selectedDate);
      if (rec) {
        setCheckoutDraft({ id: rec.id, rating: rec.rating ?? 4, gratitude: rec.gratitude || '', note: rec.note || '' });
      } else {
        setCheckoutDraft({ rating: 4, gratitude: '', note: '' });
      }
    }
  }, [isCheckOutOpen, selectedDate, checkouts]);

  // reflect presence for button decoration
  useEffect(() => {
    setCheckedInToday(Boolean(getCheckinForDate(selectedDate)));
    setCheckedOutToday(Boolean(getCheckoutForDate(selectedDate)));
  }, [selectedDate, checkins, checkouts]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
        if(entries[0]) {
            const newWidth = entries[0].contentRect.width;
            setContainerWidth(newWidth);
            setTranslateX(-newWidth);
        }
    });
    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  const { prevWeekDays, currentWeekDays, nextWeekDays } = useMemo(() => {
    const current = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() +i);
        current.push(day);
    }
    const prev = current.map(d => { const newD = new Date(d); newD.setDate(d.getDate() - 7); return newD; });
    const next = current.map(d => { const newD = new Date(d); newD.setDate(d.getDate() + 7); return newD; });
    return { prevWeekDays: prev, currentWeekDays: current, nextWeekDays: next };
  }, [weekStart]);

  const changeWeek = useCallback((direction: -1 | 1) => {
    setWeekStart(prev => {
        const newWeekStart = new Date(prev);
        newWeekStart.setDate(newWeekStart.getDate() + (7 * direction));
        if (selectedHabit) { 
            return newWeekStart;
        }
        const newSelectedDate = new Date(selectedDate);
        newSelectedDate.setDate(newSelectedDate.getDate() + (7 * direction));
        setSelectedDate(newSelectedDate);
        return newWeekStart;
    });
  }, [selectedDate, selectedHabit]);
  
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = e.clientX;
    setTransitionDuration('0s');
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || containerWidth === 0) return;
    const currentX = e.clientX;
    dragOffsetRef.current = currentX - dragStartRef.current;
    setTranslateX(-containerWidth + dragOffsetRef.current);
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (!isDraggingRef.current || containerWidth === 0) return;
    isDraggingRef.current = false;
    
    setTransitionDuration('0.3s');
    const threshold = containerWidth / 4;
    
    if (dragOffsetRef.current < -threshold) {
      setTranslateX(-containerWidth * 2); 
    } else if (dragOffsetRef.current > threshold) {
      setTranslateX(0); 
    } else {
      setTranslateX(-containerWidth); 
    }
    dragOffsetRef.current = 0;
  };

  const onTransitionEnd = () => {
      if (translateX <= -containerWidth * 2) {
          changeWeek(1);
          setTransitionDuration('0s');
          setTranslateX(-containerWidth);
      } else if (translateX >= 0) {
          changeWeek(-1);
          setTransitionDuration('0s');
          setTranslateX(-containerWidth);
      }
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  // (↑ スワイプ関連のロジックここまで)


    // ...existing code...
    const selectedDateString = selectedDate.toLocaleDateString('sv-SE');
  
    const scheduledHabits = useMemo(() => {
      return habits.filter(h => isHabitScheduledForDate(h, selectedDate));
    }, [habits, selectedDate]);
  
    const nonScheduledHabits = useMemo(() => {
      const key = selectedDate.toLocaleDateString('sv-SE');
      return habits.filter(h => {
        // not scheduled by frequency OR explicitly scheduled but we still want "not in scheduled list"
        return !isHabitScheduledForDate(h, selectedDate);
      });
    }, [habits, selectedDate]);
  
    // helper: その日 Habit が完了扱いか（scheduledHabits を参照する前に定義）
    const isHabitCompletedOnDate = (habit: Habit, dkey: string) => {
      const type = (habit.type ?? 'binary');
      if (type === 'amount') {
        const amount = (habit.completedAmounts || {})[dkey] ?? 0;
        const target = habit.target ?? 0;
        return target > 0 ? amount >= target : amount > 0;
      } else {
        return (habit.completedDates || []).includes(dkey);
      }
    };
  
    // --- optimistic updates: ユーザー操作で即時UI反映するためのマップ ---
    const [optimistic, setOptimistic] = useState<Record<string, Habit>>({});
  
    const getDisplayedHabit = (h: Habit) => optimistic[h.id] ?? h;
  
    // --- 追加: 達成率表示・祝福用 state（明示トリガー方式に変更） ---
    const [showCelebrate, setShowCelebrate] = useState(false);
    const [lastCelebrateKey, setLastCelebrateKey] = useState<string | null>(null);
  
    // completionPercent は optimistic を考慮して計算する
    const displayedScheduled = scheduledHabits.map(h => getDisplayedHabit(h));
    const scheduledCount = displayedScheduled.length;
    const completedCount = displayedScheduled.reduce((acc, h) => acc + (isHabitCompletedOnDate(h, selectedDateString) ? 1 : 0), 0);
    const completionPercent = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;
    
    // normalize 日付キー -> sv-SE で統一
    const normalizeKey = (d: string) => {
      try {
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return String(d);
        return dt.toLocaleDateString('sv-SE');
      } catch {
        return String(d);
      }
    };

    // amount / binary 共通で「その日が done（達成）か」を返す Set を作る（キー正規化を厳密化）
    const getDoneSetForHabit = (habit: Habit): Set<string> => {
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
        // completedDates が併存している場合も取り込む（保険）
        (habit.completedDates || []).forEach(d => keys.push(normalizeKey(d)));
        return new Set(keys);
      }
      return new Set((habit.completedDates || []).map(normalizeKey));
    };

    const calculateStreak = (habit: Habit): number => {
      const doneSet = getDoneSetForHabit(habit);
      if (!doneSet || doneSet.size === 0) return 0;
      const skipSet = new Set(((habit as any).skippedDates || []).map(normalizeKey));

      // safe parser for keys like "YYYY-MM-DD" or Date strings
      const parseKeyToDate = (k: string): Date | null => {
        const ymd = /^(\d{4})-(\d{2})-(\d{2})$/;
        const m = String(k).match(ymd);
        if (m) {
          const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
          const dt = new Date(y, mo, d); dt.setHours(0,0,0,0); return dt;
        }
        const dt = new Date(k);
        if (!Number.isNaN(dt.getTime())) { dt.setHours(0,0,0,0); return dt; }
        return null;
      };

      // determine start = min(habit.startDate, earliest recorded done/skip) if available
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
        start = new Date(); start.setHours(0,0,0,0);
      }

      const isScheduled = (date: Date) => {
        if (date < start) return false;
        switch (habit.frequencyType) {
          case 'daily': return true;
          case 'weekly': return (habit.frequencyValue || []).includes(date.getDay());
          case 'monthly': return (habit.frequencyValue || []).includes(date.getDate());
          default: return false;
        }
      };

      // find latest scheduled date on or before today that has a record (done or skip)
      const today = new Date(); today.setHours(0,0,0,0);
      let lastRecordedScheduled: Date | null = null;
      for (let d = new Date(today); d >= start; d.setDate(d.getDate() - 1)) {
        if (!isScheduled(d)) continue;
        const k = d.toLocaleDateString('sv-SE');
        if (doneSet.has(k) || skipSet.has(k)) { lastRecordedScheduled = new Date(d); break; }
      }
      if (!lastRecordedScheduled) return 0;

      // count streak backwards from that recorded scheduled date (done -> +1, skip -> continue)
      let streak = 0;
      for (let cur = new Date(lastRecordedScheduled); cur >= start; cur.setDate(cur.getDate() - 1)) {
        if (!isScheduled(cur)) continue;
        const key = cur.toLocaleDateString('sv-SE');
        if (doneSet.has(key)) { streak++; continue; }
        if (skipSet.has(key)) { continue; }
        break;
      }
      return streak;
    };

    // ① 未完了優先、② 連続記録が長い順 に並べる
    const sortedScheduledHabits = useMemo(() => {
      const list = scheduledHabits.map(h => getDisplayedHabit(h));
      return list.sort((a, b) => {
        const aDone = isHabitCompletedOnDate(a, selectedDateString);
        const bDone = isHabitCompletedOnDate(b, selectedDateString);
        // 未完了を先に
        if (aDone !== bDone) return aDone ? 1 : -1;
        // 連続日数が長い方を上に
        const aStreak = calculateStreak(a);
        const bStreak = calculateStreak(b);
        if (bStreak !== aStreak) return bStreak - aStreak;
        // 最後は名前順で安定化
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
    }, [scheduledHabits, optimistic, selectedDateString]);

    // 明示的に呼び出して祝福判定を行う（更新後の状態を想定して判定できるようにする）
    const checkAndTriggerCelebrateWith = (maybeUpdatedHabit?: Habit, dateKey?: string) => {
      const dkey = dateKey ?? selectedDateString;
      // 仮想的な habits 配列を作る（もし maybeUpdatedHabit が渡れば置換）
      const hypothetical = maybeUpdatedHabit ? habits.map(h => h.id === maybeUpdatedHabit.id ? maybeUpdatedHabit : h) : habits;
      // しかし判定は optimistic 反映済みの表示状態を優先するため、
      // optimistic を適用した配列を作る
      const hypoWithOptimistic = hypothetical.map(h => optimistic[h.id] ?? h);
      const scheduled = hypoWithOptimistic.filter(h => isHabitScheduledForDate(h, selectedDate));
      const scheduledCountLocal = scheduled.length;
      const completedCountLocal = scheduled.reduce((acc, h) => acc + (isHabitCompletedOnDate(h, dkey) ? 1 : 0), 0);
      const key = `${dkey}-100`;
  
      if (scheduledCountLocal > 0 && completedCountLocal === scheduledCountLocal) {
        // 全部完了なら祝福（重複は lastCelebrateKey で抑止）
        if (lastCelebrateKey !== key) {
          setLastCelebrateKey(key);
          setShowCelebrate(true);
          setTimeout(() => setShowCelebrate(false), 3000);
        }
      } else {
        // full でない状態になったら、その日のキーをクリアしておく（再達成時に再表示させるため）
        if (lastCelebrateKey === key) {
          setLastCelebrateKey(null);
        }
      }
    };
  // ...existing code...

  const isDiagnosisDay = useMemo(() => {
    return isDiagnosisScheduledForDate(diagnosisFrequency, selectedDate);
  }, [diagnosisFrequency, selectedDate]);
  
  // ★ 診断が完了しているかチェックするロジック (★エラー修正★)
  const isDiagnosisCompleted = useMemo(() => {
      // MainAppから渡される energyHistory が undefined の可能性があるため、
      // 安全チェックを追加します (これがエラーの原因です)
      if (!energyHistory) return false; 
      return energyHistory.some(record => record.date === selectedDateString);
  }, [energyHistory, selectedDateString]);


  // (↓ addHabit, deleteHabit, updateHabit, toggleHabit は変更なし)
  // フォーム submit ハンドラ: MainApp 側の onAddHabit(newHabitData) を呼び出す
  const handleAddFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName || !newHabitName.trim()) {
      console.warn('習慣名が必要です');
      return;
    }

    const base: any = {
      name: newHabitName.trim(),
      type: newHabitType,
      startDate: newHabitStartDate ?? new Date().toLocaleDateString('sv-SE'),
      frequencyType: newHabitFrequency?.type ?? 'daily',
      frequencyValue: Array.isArray(newHabitFrequency?.value) ? newHabitFrequency.value : (newHabitFrequency?.value ? [newHabitFrequency.value] : []),
      skippedDates: [],
      createdAt: new Date().toISOString(),
    };

    if (newHabitType === 'amount') {
      base.completedAmounts = {};
        // newHabitTarget は number かもしれないため文字列比較は String() で安全化
        if (newHabitTarget !== undefined && newHabitTarget !== null && String(newHabitTarget).trim() !== '') {
          const t = Number(newHabitTarget);
          if (!Number.isNaN(t)) base.target = t;
        }
        if (newHabitUnit !== undefined && newHabitUnit !== null && String(newHabitUnit).trim() !== '') {
          base.unit = String(newHabitUnit).trim();
        }
      } else {
        // binary 等のチェック系: completedDates は配列
        base.completedDates = [];
    }

    try {
      if (onAddHabit) {
        await onAddHabit(base);
      } else {
        console.warn('onAddHabit prop is not provided');
      }
      // 成功時はフォームをクリアしてモーダルを閉じる（ローディング状態を触らない）
      setNewHabitName('');
      setNewHabitStartDate(new Date().toLocaleDateString('sv-SE'));
      setNewHabitFrequency({ type: 'daily', value: [] });
      setNewHabitType('binary');
      setNewHabitTarget(undefined);
      setNewHabitUnit('');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to add habit (via onAddHabit):', err);
    }
  };
  
  const deleteHabit = (habitId: string) => {
    onDeleteHabit(habitId);
  };
  
  const updateHabit = (updatedHabit: Habit) => {
    onUpdateHabit(updatedHabit);
    setSelectedHabit(updatedHabit); 
  };

  // binary は toggle、amount は数値入力で記録
  const recordAmountForHabit = async (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    const dkey = selectedDateString;
    const current = (habit.completedAmounts || {})[dkey];
    setAmountModalHabit(habit);
    setAmountModalValue(current !== undefined ? String(current) : '');
    setIsAmountModalOpen(true);
  };

  // ...existing code...
  const toggleHabit = (habitId: string) => {
    const habitToToggle = habits.find(h => h.id === habitId);
    if (!habitToToggle) return;
    if (habitToToggle.type === 'amount') {
      // amount 型はモーダルで値を記録する
      recordAmountForHabit(habitId);
      return;
    }
    const isCompleted = habitToToggle.completedDates.includes(selectedDateString);
    const updatedHabit: Habit = {
      ...habitToToggle,
      completedDates: isCompleted
        ? habitToToggle.completedDates.filter(date => date !== selectedDateString)
        : [...habitToToggle.completedDates, selectedDateString],
    };
    // optimistic に即時反映してチェックがすぐ付くようにする
    setOptimistic(prev => ({ ...prev, [updatedHabit.id]: updatedHabit }));
    onUpdateHabit(updatedHabit);
    // 更新後の想定状態で祝福判定（optimistic を考慮）
    setTimeout(() => checkAndTriggerCelebrateWith(updatedHabit, selectedDateString), 0);
  };

  // (↓ calculateStreak, handleDateSelect, formattedListDate, handleSelectHabitFromList は変更なし)

  // HabitDetail と同じルール：
  // - まず直近で done または skip が記録されている最新のスケジュール日を見つける
  // - そこを基点に遡り、done -> +1、skip -> 継続(カウントしない)、未記録 -> そこで終了

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setWeekStart(getWeekStart(date));
    setIsDatePickerOpen(false);
  }
  
  const formattedListDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')} (${selectedDate.toLocaleDateString('ja-JP', { weekday: 'short' })})`;

  const handleSelectHabitFromList = (habit: Habit) => {
    setSelectedHabit(habit);
    setIsListModalOpen(false);
  };

  // (↓ WeekView は変更なし)
  const WeekView = React.memo(({ days, habits, selectedDate, onDateClick }: {days: Date[], habits: Habit[], selectedDate: Date, onDateClick: (date: Date) => void}) => (
    <div className="grid grid-cols-7 gap-1 text-center w-full">
        {days.map(day => {
            const dayName = day.toLocaleDateString('ja-JP', { weekday: 'short' });
            const dateNum = day.getDate();
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const completionStatus = calculateCompletionStatus(day, habits);
            return (
                <div key={day.toISOString()} onClick={() => onDateClick(day)} className="cursor-pointer p-1 rounded-lg hover:bg-gray-50 select-none">
                    <span className={`text-xs ${isSelected ? 'text-indigo-600 font-bold' : 'text-gray-500'}`}>{dayName}</span>
                    <div className={`mt-1 mx-auto flex items-center justify-center font-semibold transition-colors ${isSelected ? 'w-9 h-9 bg-indigo-600 text-white rounded-[10px]' : 'w-8 h-8 text-gray-700 rounded-full ' + (isToday ? 'text-indigo-600' : '')}`}>
                        {dateNum}
                    </div>
                    <div className="h-2 flex items-center justify-center mt-1">
                        {completionStatus === 'full' && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                        {completionStatus === 'partial' && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>}
                    </div>
                </div>
            )
        })}
    </div>
  ));

  // --- モーダル onSave を差し替えて create / update を切替える ---
  // CheckInModal の onSave -> handleSaveCheckin
  const handleSaveCheckin = (value: number, note?: string) => {
    const rec = getCheckinForDate(selectedDate);
    if (rec && onUpdateCheckin) {
      onUpdateCheckin(rec.id, value, note);
    } else if (!rec && onAddCheckin) {
      const dateStr = selectedDate.toLocaleDateString('sv-SE');
      onAddCheckin(value, note, dateStr);
    }
    setCheckedInToday(true);
  };

  const handleSaveCheckout = (gratitude?: string, note?: string, rating?: number) => {
    const rec = getCheckoutForDate(selectedDate);
    if (rec && onUpdateCheckout) {
      onUpdateCheckout(rec.id, gratitude, note, rating);
    } else if (!rec && onAddCheckout) {
      const dateStr = selectedDate.toLocaleDateString('sv-SE');
      onAddCheckout(gratitude, note, rating, dateStr);
    }
    setCheckedOutToday(true);
  };

  const recordOrToggleForNonScheduled = async (habit: Habit) => {
    const dkey = selectedDate.toLocaleDateString('sv-SE');
    if (habit.type === 'amount') {
      // amount はモーダルで入力
      const current = (habit.completedAmounts || {})[dkey];
      setAmountModalHabit(habit);
      setAmountModalValue(current !== undefined ? String(current) : '');
      setIsAmountModalOpen(true);
      setIsNonScheduledOpen(false);
      return;
    }
    const setDates = new Set(habit.completedDates || []);
    if (setDates.has(dkey)) setDates.delete(dkey); else setDates.add(dkey);
    const updated = { ...habit, completedDates: Array.from(setDates).sort() };
    // optimistic 即時反映
    setOptimistic(prev => ({ ...prev, [updated.id]: updated }));
    onUpdateHabit(updated);
    setIsNonScheduledOpen(false);
    // 仮想更新後の状態で祝福判定
    setTimeout(() => checkAndTriggerCelebrateWith(updated, dkey), 0);
  };

  const toggleSkipForDate = (habit: Habit) => {
    const dkey = selectedDate.toLocaleDateString('sv-SE');
    const skips = habit.skippedDates ?? [];
    const exists = skips.includes(dkey);
    const newSkips = exists ? skips.filter(s => s !== dkey) : [...skips, dkey];
    onUpdateHabit({ ...habit, skippedDates: newSkips });
  };

  // モーダル
  const saveAmountModal = () => {
    if (!amountModalHabit) return;
    const dkey = selectedDateString;
    const parsed = amountModalValue.trim() === '' ? null : Number(amountModalValue.replace(',', '.'));
    if (parsed !== null && isNaN(parsed)) { alert('数値を入力してください'); return; }
    const newAmounts = { ...(amountModalHabit.completedAmounts || {}) };
    if (parsed === null) delete newAmounts[dkey]; else newAmounts[dkey] = parsed;
    const updated = { ...amountModalHabit, completedAmounts: newAmounts };
    // optimistic 即時反映
    setOptimistic(prev => ({ ...prev, [updated.id]: updated }));
    onUpdateHabit(updated);
    setIsAmountModalOpen(false);
    setAmountModalHabit(null);
    setAmountModalValue('');
    // 数値記録後に祝福判定
    setTimeout(() => checkAndTriggerCelebrateWith(updated, dkey), 0);
  };

  const cancelAmountModal = () => {
    setIsAmountModalOpen(false);
    setAmountModalHabit(null);
    setAmountModalValue('');
  };
  
  // --- JSX (変更なし) ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">習慣トラッカー</h2>
            <button onClick={() => setIsListModalOpen(true)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                <ListBulletIcon className="w-6 h-6" />
            </button>
        </div>
        {/* タイトルの下に表示されるボタン群（モバイルでは縦、デスクトップでは横） */}
        <div className="w-full sm:w-auto flex justify-start sm:justify-end">
          <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
            <button
              onClick={() => setIsCheckInOpen(true)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition ${checkedInToday ? 'bg-green-50 border border-green-300' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
              aria-pressed={checkedInToday}
            >
              <SunIcon className={`w-5 h-5 ${checkedInToday ? 'text-green-600' : 'text-gray-600'}`} />
              <span className="text-sm font-medium text-gray-800">チェックイン</span>
              {checkedInToday && <CheckCircleIcon className="w-5 h-5 text-green-600 ml-1" />}
            </button>
            <button
              onClick={() => setIsCheckOutOpen(true)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition ${checkedOutToday ? 'bg-blue-50 border border-blue-300' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
              aria-pressed={checkedOutToday}
            >
              <MoonIcon className={`w-5 h-5 ${checkedOutToday ? 'text-blue-600' : 'text-gray-600'}`} />
              <span className="text-sm font-medium text-gray-800">チェックアウト</span>
              {checkedOutToday && <CheckCircleIcon className="w-5 h-5 text-blue-600 ml-1" />}
            </button>
          </div>
          <button onClick={() => setIsHelpOpen(true)} className="text-gray-400 hover:text-indigo-600 transition-colors ml-3 hidden sm:inline-flex">
              <HelpIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onSave={(v,n) => { handleSaveCheckin(v,n); }}
        initial={checkinDraft}
      />
      <CheckOutModal
        isOpen={isCheckOutOpen}
        onClose={() => setIsCheckOutOpen(false)}
        onSave={(g,n,r) => { handleSaveCheckout(g,n,r); }}
        initial={checkoutDraft}
      />
      <DatePickerModal 
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          onDateSelect={handleDateSelect}
          initialDate={selectedDate}
          habits={habits}
      />
      <HabitListModal 
          isOpen={isListModalOpen}
          onClose={() => setIsListModalOpen(false)}
          habits={habits}
          onSelectHabit={handleSelectHabitFromList}
      />
      {/* 数量入力モーダル: system prompt の代替 */}
      {isAmountModalOpen && amountModalHabit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={cancelAmountModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">{amountModalHabit.name}</div>
                <div className="text-sm text-gray-600">{selectedDate.toLocaleDateString()}</div>
              </div>
              <button onClick={cancelAmountModal} className="text-gray-500 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); saveAmountModal(); }}>
              <label className="block text-sm text-gray-700 mb-2">達成量（{amountModalHabit.unit ?? ''}）</label>
              <input autoFocus value={amountModalValue} onChange={e => setAmountModalValue(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md mb-3" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={cancelAmountModal} className="px-4 py-2 rounded-lg bg-gray-100 text-sm">キャンセル</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* FAB: + を押すと左・上に丸ボタンを展開 */}
      <div ref={fabRef} className="fixed z-40 right-4 bottom-20 flex flex-col items-end" aria-hidden={!fabOpen}>
        {/* 子ボタンは fabOpen が true のときのみレンダリングして、リストと重ならないように十分な間隔を確保 */}
        {fabOpen && (
          <div className="flex flex-col items-end space-y-3 mb-2">
            {/* タスクボタン：他の操作ボタン（チェックイン等）に合わせた外観 */}
            <button
              onClick={() => { setIsTaskModalOpen(true); setFabOpen(false); }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
              aria-label="タスクを追加"
              title="タスクを追加"
            >
              <span className="w-8 h-8 flex items-center justify-center rounded-md bg-amber-50 text-amber-700 font-semibold">✎</span>
              <span className="text-sm font-medium text-gray-800">タスクを追加</span>
            </button>

            {/* 習慣ボタン：全体のトーンに合わせたデザイン */}
            <button
              onClick={() => { setIsAddModalOpen(true); setFabOpen(false); }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
              aria-label="習慣を追加"
              title="習慣を追加"
            >
              <span className="w-8 h-8 flex items-center justify-center rounded-md bg-indigo-50 text-indigo-600 font-semibold">＋</span>
              <span className="text-sm font-medium text-gray-800">習慣を追加</span>
            </button>
          </div>
        )}

        {/* main FAB (always visible) - 少し小さくして右寄せ */}
        <button
          onClick={() => setFabOpen(v => !v)}
          className={`mt-3 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg bg-indigo-600 hover:bg-indigo-700 transition-colors`}
          aria-label="追加メニュー"
          title="追加メニュー"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>

      {/* 習慣追加モーダル */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setIsAddModalOpen(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 mb-4">新しい習慣を追加</h2>
                <form onSubmit={handleAddFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">習慣の名前</label>
                    <input
                      type="text"
                      value={newHabitName}
                      onChange={e => setNewHabitName(e.target.value)}
                      placeholder="例: 10分間瞑想する"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-900"
                    />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                    <input
                      type="date"
                      value={newHabitStartDate}
                      onChange={e => setNewHabitStartDate(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">頻度</label>
                    <select 
                      value={newHabitFrequency.type} 
                      onChange={e => setNewHabitFrequency({type: e.target.value as FrequencyType, value: []})}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    >
                      <option value="daily">毎日</option>
                      <option value="weekly">週次</option>
                      <option value="monthly">月次</option>
                    </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">タイプ</label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                          <input type="radio" name="habitType" value="binary" checked={newHabitType==='binary'} onChange={() => setNewHabitType('binary')} />
                          <span className="text-sm">1回でも実施</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" name="habitType" value="amount" checked={newHabitType==='amount'} onChange={() => setNewHabitType('amount')} />
                          <span className="text-sm">規定量の実施</span>
                        </label>
                      </div>
                  </div>
                  {newHabitType === 'amount' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">目標値</label>
                        <input type="number" value={newHabitTarget ?? ''} onChange={e => setNewHabitTarget(e.target.value === '' ? undefined : Number(e.target.value))} className="w-full p-3 border border-gray-300 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">単位</label>
                        <input type="text" value={newHabitUnit} onChange={e => setNewHabitUnit(e.target.value)} placeholder="例: km, 分, 回" className="w-full p-3 border border-gray-300 rounded-lg" />
                      </div>
                    </div>
                  )}
                  {newHabitFrequency.type === 'weekly' && (
                    <div className="flex justify-center gap-1">
                      {WEEK_DAYS.map((day, index) => (
                        <button type="button" key={index}
                          onClick={() => {
                            const newValue = newHabitFrequency.value.includes(index)
                              ? newHabitFrequency.value.filter(d => d !== index)
                              : [...newHabitFrequency.value, index];
                            setNewHabitFrequency(prev => ({...prev, value: newValue.sort()}));
                          }}
                          className={`w-10 h-10 rounded-full font-semibold transition-colors ${newHabitFrequency.value.includes(index) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >{day}</button>
                      ))}
                    </div>
                  )}
                  {newHabitFrequency.type === 'monthly' && (
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">日付を選択 (カンマ区切り)</label>
                        <input
                            type="text"
                            placeholder="例: 1, 15"
                            defaultValue={newHabitFrequency.value.join(', ')}
                            onChange={e => {
                                const value = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 31);
                                setNewHabitFrequency(prev => ({...prev, value: value.sort((a,b) => a-b)}))
                            }}
                           className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white text-gray-900"
                        />
                     </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                     <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">キャンセル</button>
                     <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow">追加</button>
                  </div>
                </form>
            </div>
        </div>
      )}

      {/* /* Task add modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIsTaskModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">タスクを追加</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-500">閉じる</button>
            </div>
            <div className="space-y-3">
              <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="タイトル" className="w-full p-2 border border-gray-200 rounded" />
              <textarea value={taskDetails} onChange={e => setTaskDetails(e.target.value)} placeholder="詳細" rows={3} className="w-full p-2 border border-gray-200 rounded" />
              <div className="flex items-center gap-2">
                <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className="p-2 border border-gray-200 rounded" />
                <select value={taskPriority} onChange={e => setTaskPriority(e.target.value as any)} className="p-2 border border-gray-200 rounded text-sm">
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
                <div className="flex-1" />
                <button onClick={submitTask} className="px-4 py-2 bg-indigo-600 text-white rounded">追加</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 予定外タスク用モーダル */}
      {isNonScheduledOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setIsNonScheduledOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">予定外タスクをこの日で記録</h3>
              <button onClick={() => setIsNonScheduledOpen(false)} className="text-gray-500 text-2xl leading-none">&times;</button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-auto pr-2">
              {nonScheduledHabits.length === 0 ? (
                <p className="text-gray-500 text-center py-6">この日は予定外の習慣はありません。</p>
              ) : nonScheduledHabits.map(h => {
                const isSkipped = (h.skippedDates || []).includes(selectedDateString);
                return (
                  <div key={h.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-800">{h.name}</div>
                      <div className="text-xs text-gray-500">{h.frequencyType === 'weekly' ? '週次' : h.frequencyType === 'monthly' ? '月次' : '毎日'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => recordOrToggleForNonScheduled(h)} className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm">記録</button>
                      <button onClick={() => toggleSkipForDate(h)} className={`px-3 py-2 rounded-md text-sm ${isSkipped ? 'bg-yellow-100 text-yellow-800' : 'bg-white border border-gray-200'}`}>
                        {isSkipped ? 'スキップ解除' : 'この日をスキップ'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* タスク編集モーダル */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedTask(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">タスクを編集</h3>
              <button onClick={() => setSelectedTask(null)} className="text-gray-500">閉じる</button>
            </div>

            <div className="space-y-3">
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="タイトル" className="w-full p-2 border border-gray-200 rounded" />
              <textarea value={editDetails} onChange={e => setEditDetails(e.target.value)} placeholder="詳細" rows={3} className="w-full p-2 border border-gray-200 rounded" />
              <div className="flex items-center gap-2">
                <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="p-2 border border-gray-200 rounded" />
                <select value={editPriority} onChange={e => setEditPriority(e.target.value as any)} className="p-2 border border-gray-200 rounded text-sm">
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
                <label className="inline-flex items-center gap-2 ml-auto text-sm">
                  <input type="checkbox" checked={editDone} onChange={e => setEditDone(e.target.checked)} />
                  完了
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSelectedTask(null)} className="px-3 py-2 rounded-md bg-gray-100">キャンセル</button>
                <button onClick={deleteTaskConfirm} className="px-3 py-2 rounded-md bg-red-50 text-red-600">削除</button>
                <button onClick={saveTaskEdits} className="px-4 py-2 rounded-md bg-indigo-600 text-white">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-800">
                    {weekStart.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                </h3>
                <button onClick={() => setIsDatePickerOpen(true)} className="p-1 text-gray-500 hover:text-indigo-600" aria-label="日付を選択">
                    <CalendarIcon className="w-5 h-5"/>
                </button>
            </div>
             <div className="flex items-center gap-2">
                <button onClick={() => changeWeek(-1)} className="p-2 rounded-full hover:bg-gray-100" aria-label="前の週へ"><ChevronLeftIcon className="w-5 h-5 text-gray-600"/></button>
                <button onClick={() => handleDateSelect(new Date())} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200">今日</button>
                <button onClick={() => changeWeek(1)} className="p-2 rounded-full hover:bg-gray-100" aria-label="次の週へ"><ChevronRightIcon className="w-5 h-5 text-gray-600"/></button>
            </div>
        </div>
        
        <div className="overflow-hidden cursor-grab" ref={containerRef}>
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onTransitionEnd={onTransitionEnd}
                className="flex"
                style={{
                    width: '300%',
                    transform: `translateX(${translateX}px)`,
                    transition: `transform ${transitionDuration} ease-out`,
                }}
            >
                <div className="w-1/3 flex-shrink-0">
                    <WeekView days={prevWeekDays} habits={habits} selectedDate={selectedDate} onDateClick={setSelectedDate} />
                </div>
                <div className="w-1/3 flex-shrink-0">
                    <WeekView days={currentWeekDays} habits={habits} selectedDate={selectedDate} onDateClick={setSelectedDate} />
                </div>
                <div className="w-1/3 flex-shrink-0">
                    <WeekView days={nextWeekDays} habits={habits} selectedDate={selectedDate} onDateClick={setSelectedDate} />
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between mt-6 mb-4 px-2">
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-semibold text-gray-800">{formattedListDate}</h3>
            {/* 達成率バッジ */}
            <div className={`ml-3 inline-flex items-center gap-2 px-3 py-1 rounded-full font-semibold ${completionPercent === 100 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              <div className={`w-3 h-3 rounded-full ${completionPercent === 100 ? 'bg-white' : (completionPercent >= 75 ? 'bg-green-500' : completionPercent >= 40 ? 'bg-yellow-400' : 'bg-gray-400')}`} />
              <span className="text-sm">{completionPercent}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
                onClick={() => setIsNonScheduledOpen(true)}
                className="flex items-center gap-2 text-sm px-3 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                title="予定外の習慣を記録"
            >
              <ListBulletIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">予定外</span>
            </button>
          </div>
        </div>

        {/* 祝福オーバーレイ（completionPercent === 100 の場合に一時表示） */}
        {showCelebrate && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 pointer-events-auto">
            <style>{`
              @keyframes floatUp {
                0% { transform: translateY(0) scale(1); opacity: 1; }
                100% { transform: translateY(-140vh) scale(1.1); opacity: 0; }
              }
              .confetti {
                position: absolute;
                bottom: 10%;
                font-size: 28px;
                animation-name: floatUp;
                animation-timing-function: cubic-bezier(.18,.9,.35,1);
                animation-iteration-count: 1;
              }
            `}</style>
            <div className="w-full max-w-3xl mx-auto px-4">
              <div className="bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-2xl shadow-2xl px-6 py-10 md:py-16 animate-fade-in">
                <div className="text-center">
                  <div className="text-2xl md:text-2xl font-extrabold leading-tight">🎉 おめでとう！100%達成 🎉</div>
                  <div className="mt-4 text-lg md:text-xl opacity-95">今日もよく頑張りましたね！</div>
                </div>
              </div>
              {['✨','🎊','💫','🌟','🎉','✨','🎈','⭐️'].map((emo, i) => (
                <span
                  key={i}
                  className="confetti"
                  style={{
                    left: `${8 + (i * 11) % 84}%`,
                    animationDuration: `${1800 + (i * 200)}ms`,
                    animationDelay: `${200 + (i * 120)}ms`,
                    transform: `translateY(0) rotate(${(i*30)%360}deg)`
                  }}
                >
                  {emo}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* --- 診断カード（最上部） --- */}
        <div className="mb-4">
          {isDiagnosisDay && (
            <div
              onClick={() => !isDiagnosisCompleted && setView('diagnosis')}
              className={`flex items-center p-4 shadow-sm rounded-lg transition ${isDiagnosisCompleted ? 'bg-green-50 hover:bg-green-100 cursor-default' : 'bg-indigo-50 hover:bg-indigo-100 cursor-pointer'}`}
            >
              {isDiagnosisCompleted ? <CheckCircleIcon className="w-6 h-6 text-green-600" /> : <DiagnosisIcon className="w-6 h-6 text-indigo-600" />}
              <span className={`flex-grow mx-4 text-lg font-semibold ${isDiagnosisCompleted ? 'line-through text-gray-500' : 'text-indigo-800'}`}>
                エネルギーを診断する
              </span>
              {!isDiagnosisCompleted && <ChevronRightIcon className="w-6 h-6 text-indigo-600" />}
            </div>
          )}
        </div>

        {/* --- 本日のタスク（診断の下） --- */}
        <div className="mb-4">
          {dueTasks.length === 0 ? (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500">本日のタスクはありません。</div>
          ) : (
            <div className="space-y-2">
              {dueTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className={`flex items-center gap-3 p-3 border shadow-sm ${t.done ? 'opacity-80' : ''} bg-amber-50 border-amber-100 rounded-md`}
                >
                  <input
                    type="checkbox"
                    checked={!!t.done}
                    onChange={async (e) => {
                      e.stopPropagation();
                      const next = e.target.checked;
                      await handleToggleTaskLocal(t.id, next);
                    }}
                    className="w-5 h-5 cursor-pointer"
                    aria-label={`タスク完了: ${t.title}`}
                    onClick={e => e.stopPropagation()}
                  />

                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${t.done ? 'line-through text-gray-500' : 'text-gray-900'}`}>{t.title}</div>
                    {t.details ? <div className="text-xs text-gray-600 truncate mt-1">{t.details}</div> : null}
                  </div>

                  <div className="flex items-center gap-2 ml-3">
                    {t.dueDate ? <div className="text-xs text-gray-500">{new Date(t.dueDate).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}</div> : null}
                    <div className={`text-xs px-2 py-0.5 rounded-full font-semibold ${t.priority === 'high' ? 'bg-red-100 text-red-700' : t.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低'}
                    </div>
                    {/* Task badge to visually distinguish from habits */}
                    <div className="ml-2 text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full font-medium">タスク</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 既存: 習慣リスト（タスクの下） */}
        <div className="space-y-2">
            {sortedScheduledHabits.length > 0 ? (
                sortedScheduledHabits.map(habit => {
                  // habit は optimistic を反映した表示用オブジェクト（getDisplayedHabit を使っている useMemo の結果）
                  const habitType = (habit.type ?? 'binary');
                  const isCompleted = isHabitCompletedOnDate(habit, selectedDateString);
                  const amountVal = (habit.completedAmounts || {})[selectedDateString] ?? 0;
                  const isSkipped = ((habit.skippedDates || []) .map(normalizeKey)).includes(selectedDateString);
                  const streak = calculateStreak(habit);

                  return (
                    <div 
                        key={habit.id} 
                        onClick={() => setSelectedHabit(habit)}
                        className={`flex items-center p-3 shadow-sm rounded-lg transition cursor-pointer ${isCompleted ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                    >
                        <input
                          type="checkbox"
                          checked={habitType === 'binary' ? isCompleted : Boolean(amountVal)}
                          onChange={() => toggleHabit(habit.id)}
                          className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          onClick={e => e.stopPropagation()}
                        />
                        <span className={`flex-grow mx-3 text-base md:text-lg ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                          {habit.name}
                        </span>
                        {isSkipped && (
                          <div className="ml-2 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold">スキップ</div>
                        )}

                        <div className="flex items-center gap-3">
                          {habitType === 'amount' && (
                            <div className="text-sm text-gray-700 font-semibold">
                              {amountVal}{habit.unit ? `${habit.unit}` : ''}{habit.target ? ` / ${habit.target}` : ''}
                            </div>
                          )}
                          {streak > 0 && <span className="text-orange-500 font-bold text-sm md:text-base mr-3">🔥 {streak}日</span>}
                        </div>
                    </div>
                  );
                })
            ) : (
              (habits.length > 0 && !isDiagnosisDay) && <p className="text-gray-500 text-center py-4">今日やるべき習慣はありません。新しい習慣を追加するか、日付を変更してください。</p>
            )}
            {habits.length === 0 && !isDiagnosisDay && (
              <p className="text-gray-500 text-center py-4">まだ習慣がありません。右下の＋ボタンから新しい習慣を追加して始めましょう！</p>
            )}
        </div>
      </div>
      
      {selectedHabit && (
          <HabitDetail habit={selectedHabit} onClose={() => setSelectedHabit(null)} onDelete={deleteHabit} onUpdate={updateHabit} />
      )}

    </div>
  );
};

export default HabitTracker;