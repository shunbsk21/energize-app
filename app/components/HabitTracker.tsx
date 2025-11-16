"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
// ★ EnergyRecord をインポートし、パスを修正
import { Habit, View, FrequencyType, DiagnosisFrequency, EnergyRecord } from '../types'; 
import HabitDetail from './HabitDetail';

// --- Propsの定義を変更 ---
interface HabitTrackerProps {
  habits: Habit[];
  energyHistory: EnergyRecord[]; // ★ 診断履歴を受け取る
  onAddHabit: (newHabit: Omit<Habit, 'id'>) => void;
  onUpdateHabit: (updatedHabit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  setIsHelpOpen: (isOpen: boolean) => void;
  setView: (view: View) => void;
  diagnosisFrequency: DiagnosisFrequency;
  checkins?: { id: string; date: string; value: number; note?: string; createdAt?: string }[];
  checkouts?: { id: string; date: string; gratitude?: string; note?: string; rating?: number | null; createdAt?: string }[];
  // 保存ハンドラは同期/非同期どちらも許容し、rating は null を許容
  onAddCheckin?: (value: number, note?: string, dateStr?: string) => void | Promise<void>;
  onAddCheckout?: (gratitude?: string, note?: string, rating?: number | null, dateStr?: string) => void | Promise<void>;
  onUpdateCheckin?: (id: string, value: number, note?: string) => void | Promise<void>;
  onUpdateCheckout?: (id: string, gratitude?: string, note?: string, rating?: number | null) => void | Promise<void>;
}

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
    const scheduledHabits = habits.filter(h => isHabitScheduledForDate(h, date));

    if (scheduledHabits.length === 0) return 'none';

    // count as completed depending on habit type:
    const completedCount = scheduledHabits.reduce((acc, h) => {
        const type = (h.type ?? 'binary');
        if (type === 'amount') {
            const amountMap = h.completedAmounts || {};
            const val = amountMap[dateStr] ?? 0;
            const target = h.target ?? 0;
            const satisfied = target > 0 ? val >= target : val > 0;
            return acc + (satisfied ? 1 : 0);
        } else {
            const dates = h.completedDates || [];
            return acc + (dates.includes(dateStr) ? 1 : 0);
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
                className="w-10 h-10 flex items-center justify-center rounded-full text-sm cursor-pointer hover:bg-indigo-100 relative"
                onClick={() => onDateSelect(date)}
            >
              <span className={`w-8 h-8 flex items-center justify-center rounded-full ${isSelected ? 'bg-indigo-600 text-white' : ''}`}>
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
  onUpdateCheckout
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
  
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkedOutToday, setCheckedOutToday] = useState(false);

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


  const selectedDateString = selectedDate.toLocaleDateString('sv-SE');

  const scheduledHabits = useMemo(() => {
    return habits.filter(h => isHabitScheduledForDate(h, selectedDate));
  }, [habits, selectedDate]);

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
  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHabitName.trim() === '') return;
    const newHabit: Omit<Habit, 'id'> = {
      name: newHabitName.trim(),
      type: newHabitType,
      completedDates: [],
      completedAmounts: newHabitType === 'amount' ? {} : undefined,
      target: newHabitType === 'amount' ? (newHabitTarget ?? undefined) : undefined,
      unit: newHabitType === 'amount' ? (newHabitUnit || undefined) : undefined,
      startDate: newHabitStartDate,
      frequencyType: newHabitFrequency.type,
      frequencyValue: newHabitFrequency.value,
    };
    onAddHabit(newHabit);
    setNewHabitName('');
    setNewHabitStartDate(new Date().toLocaleDateString('sv-SE'));
    setNewHabitFrequency({type: 'daily', value: []});
    setNewHabitType('binary');
    setNewHabitTarget(undefined);
    setNewHabitUnit('');
    setIsAddModalOpen(false);
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
    const input = window.prompt(`達成量を入力してください（${habit.unit ?? ''}）`, '');
    if (input === null) return;
    const value = parseFloat(input.replace(',', '.'));
    if (isNaN(value)) return alert('数値を入力してください');
    const amounts = { ...(habit.completedAmounts || {}) };
    amounts[selectedDateString] = value;
    const updated: Habit = { ...habit, completedAmounts: amounts };
    onUpdateHabit(updated);
  };

  const toggleHabit = (habitId: string) => {
    const habitToToggle = habits.find(h => h.id === habitId);
    if (!habitToToggle) return;
    if (habitToToggle.type === 'amount') {
      // amount 型は prompt で値を記録する
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
    onUpdateHabit(updatedHabit);
  };
  
  // (↓ calculateStreak, handleDateSelect, formattedListDate, handleSelectHabitFromList は変更なし)
  const calculateStreak = (habit: Habit): number => {
    const startDate = new Date(habit.startDate);
    startDate.setHours(0,0,0,0);
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0,0,0,0);

    const dateKey = (d: Date) => d.toLocaleDateString('sv-SE');

    // 日毎にスケジュールされているか確認しつつ連続日数を数える
    while (currentDate >= startDate) {
        if (!isHabitScheduledForDate(habit, currentDate)) {
            currentDate.setDate(currentDate.getDate() - 1);
            continue;
        }
        const key = dateKey(currentDate);
        if (habit.type === 'amount') {
            const amountMap = habit.completedAmounts || {};
            const achieved = amountMap[key] ?? 0;
            const target = habit.target ?? 0;
            if (target > 0 ? achieved >= target : achieved > 0) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
                continue;
            }
            break;
        } else {
            const completedDatesSet = new Set(habit.completedDates || []);
            if (completedDatesSet.has(key)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
                continue;
            }
            break;
        }
    }
    return streak;
  }

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
                    <div className={`mt-1 w-8 h-8 mx-auto flex items-center justify-center rounded-full font-semibold transition-colors ${isSelected ? 'bg-indigo-600 text-white shadow' : isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
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
       <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-110 z-30"
        aria-label="新しい習慣を追加"
      >
        <PlusIcon className="w-8 h-8"/>
      </button>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setIsAddModalOpen(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 mb-4">新しい習慣を追加</h2>
                <form onSubmit={addHabit} className="space-y-4">
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

        {/* ★★★ ここからが修正点 ★★★ */}
        <h3 className="text-xl font-bold text-gray-800 mt-6 mb-4 px-2">{formattedListDate}のリスト</h3>
        <div className="space-y-3">
            {isDiagnosisDay && (
                <div 
                    onClick={() => !isDiagnosisCompleted && setView('diagnosis')} // ★ 完了時はクリックしても遷移しない
                    className={`flex items-center p-4 rounded-lg transition ${
                        isDiagnosisCompleted
                            ? 'bg-green-50 hover:bg-green-100 cursor-default' // 完了時のスタイル
                            : 'bg-indigo-50 hover:bg-indigo-100 cursor-pointer' // 未完了時のスタイル
                    }`}
                >
                    {isDiagnosisCompleted ? (
                        <CheckCircleIcon className="w-6 h-6 text-green-600"/> // ★ 完了アイコン
                    ) : (
                        <DiagnosisIcon className="w-6 h-6 text-indigo-600"/> // 未完了アイコン
                    )}
                    
                    <span className={`flex-grow mx-4 text-lg font-semibold ${
                        isDiagnosisCompleted
                            ? 'line-through text-gray-500' // 完了時のテキスト
                            : 'text-indigo-800' // 未完了時のテキスト
                    }`}>
                      エネルギーを診断する
                    </span>

                    {!isDiagnosisCompleted && (
                        <ChevronRightIcon className="w-6 h-6 text-indigo-600"/> // ★ 未完了時のみ矢印
                    )}
                </div>
            )}
            {/* ★★★ 修正点ここまで ★★★ */}


            {scheduledHabits.length > 0 ? (
                scheduledHabits.map(habit => {
                  const streak = calculateStreak(habit);
                  const habitType = (habit.type ?? 'binary');
                  const isBinaryCompleted = (habit.completedDates || []).includes(selectedDateString);
                  const amountVal = (habit.completedAmounts || {})[selectedDateString] ?? 0;
                  const amountTarget = habit.target ?? 0;
                  const isAmountCompleted = amountTarget > 0 ? amountVal >= amountTarget : amountVal > 0;
                  const isCompleted = habitType === 'amount' ? isAmountCompleted : isBinaryCompleted;

                  return (
                    <div 
                        key={habit.id} 
                        onClick={() => setSelectedHabit(habit)}
                        className={`flex items-center p-3 rounded-lg transition cursor-pointer ${isCompleted ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                    >
                        <input
                          type="checkbox"
                          checked={habitType === 'binary' ? isBinaryCompleted : Boolean(amountVal)}
                          onChange={() => toggleHabit(habit.id)}
                          className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          onClick={e => e.stopPropagation()} // Prevent opening detail modal
                        />
                        <span className={`flex-grow mx-3 text-base md:text-lg ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                          {habit.name}
                        </span>

                        {habitType === 'amount' ? (
                          <div className="text-sm text-gray-700 font-semibold mr-3">
                            {amountVal}{habit.unit ? `${habit.unit}` : ''}{habit.target ? ` / ${habit.target}` : ''}
                          </div>
                        ) : (
                          streak > 0 && <span className="text-orange-500 font-bold text-sm md:text-base mr-3">🔥 {streak}日</span>
                        )}
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