"use client"; // Next.js 13+ App Router では "use client" が必要かもしれません

import React, { useState, useMemo, useRef, useEffect } from 'react';
// types.ts が MainApp.tsx と同じ階層にある想定 (`../types` -> `./types`)
import { EnergyCategory, EnergyRecord, EnergyScores, DiagnosisFrequency, FrequencyType, Habit, View } from '../types'; 
import {
  ENERGY_CATEGORIES,
  QUESTIONS,
  RATING_OPTIONS,
  getEnergyLevel,
  ADVICE_CONTENT,
  ENERGY_PERSONALITIES,
  ENERGY_PERSONALITY_HABITS
} from '../constants';

import AddHabitModal from "./AddHabitModal";
import FrequencyEditor from "./FrequencyEditor";

const THRESHOLD = 16;
const getTypeKey = (scores: EnergyScores) => {
  const p = scores.physical >= THRESHOLD ? "High" : "Low";
  const m = scores.mental >= THRESHOLD ? "High" : "Low";
  const e = scores.emotional >= THRESHOLD ? "High" : "Low";
  const i = scores.intellectual >= THRESHOLD ? "High" : "Low";
  return `P_${p}_M_${m}_E_${e}_I_${i}`;
};

// ★★★ Propsの定義を変更 ★★★
interface EnergyDiagnosisProps {
  history: EnergyRecord[];
  onComplete: (scores: EnergyScores) => void;
  setIsHelpOpen: (isOpen: boolean) => void;
  diagnosisFrequency: DiagnosisFrequency;
  // React.Dispatch<React.SetStateAction<DiagnosisFrequency>> だったものを、
  // MainApp.tsx が渡す関数の型 (Firestore保存関数) に合わせる
  setDiagnosisFrequency: (newFrequency: DiagnosisFrequency) => void; 
  habits: Habit[];
  handleAddHabit?: (newHabitData: any) => Promise<void> | void;
}

type QuizStep = EnergyCategory | 'start' | 'results';

const categoryOrder: EnergyCategory[] = ['physical', 'mental', 'emotional', 'intellectual'];

// (↓ isHabitScheduledForDate は変更なし)
const isHabitScheduledForDate = (habit: Habit, date: Date): boolean => {
    // startDate が未設定ならスケジュールされていないものとみなす
    if (!habit?.startDate) return false;

    const habitStartDate = new Date(habit.startDate);
    habitStartDate.setHours(0,0,0,0);
    const targetDate = new Date(date);
    targetDate.setHours(0,0,0,0);

    if (targetDate < habitStartDate) return false;

    const fv: number[] = habit.frequencyValue ?? [];
    switch (habit.frequencyType) {
        case 'daily':
            return true;
        case 'weekly':
            return fv.includes(targetDate.getDay());
        case 'monthly':
            return fv.includes(targetDate.getDate());
        default:
            return false;
    }
};

// (↓ calculateCompletionStatus は変更なし)
const calculateCompletionStatus = (date: Date, habits: Habit[]): 'none' | 'partial' | 'full' => {
    const dateStr = date.toLocaleDateString('sv-SE');
    const scheduledHabits = habits.filter(h => isHabitScheduledForDate(h, date));

    if (scheduledHabits.length === 0) {
        return 'none';
    }

    const completedCount = scheduledHabits.filter(h => (h.completedDates ?? []).includes(dateStr)).length;

    if (completedCount === 0) {
        return 'none';
    }
    if (completedCount === scheduledHabits.length) {
        return 'full';
    }
    return 'partial';
};


// --- Icon Components Start (変更なし) ---
const IconBody: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconMental: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);
const IconEmotional: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
);
const IconIntellectual: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);
const ChevronDownIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);
const HelpIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
);
const CalendarIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);
// --- Icon Components End ---


const categoryIcons: {[key in EnergyCategory]: React.FC<{className?: string}>} = {
    physical: IconBody,
    mental: IconMental,
    emotional: IconEmotional,
    intellectual: IconIntellectual,
}

// (↓ DatePickerModal は変更なし)
const DatePickerModal: React.FC<{
    isOpen: boolean, 
    onClose: () => void, 
    onDateSelect: (date: Date) => void,
    initialDate: Date,
    highlightedDates?: Set<string>,
    habits?: Habit[],
}> = ({isOpen, onClose, onDateSelect, initialDate, highlightedDates, habits}) => {
    const [displayDate, setDisplayDate] = useState(initialDate);
    
    const completionStatusCache = useMemo(() => {
        if (!habits) return new Map();
        const cache = new Map<string, 'none' | 'partial' | 'full'>();
        return cache;
    }, [habits]);

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
          const dateStr = date.toLocaleDateString('sv-SE');
          const hasRecord = highlightedDates?.has(dateStr);
          const isSelected = initialDate.toLocaleDateString('sv-SE') === dateStr;

          calendarDays.push(
            <div 
                key={day} 
                className="w-10 h-10 flex items-center justify-center rounded-full text-sm cursor-pointer hover:bg-indigo-100 relative"
                onClick={() => onDateSelect(date)}
            >
              <span className={`${isSelected ? 'w-9 h-9 rounded-[10px] scale-105 transform bg-indigo-600 text-white flex items-center justify-center font-semibold' : 'w-8 h-8 rounded-full flex items-center justify-center'}`}>
                {day}
              </span>
              {/* エネルギー診断の記録がある日だけ青いドットを表示（他の達成率ドットは表示しない） */}
              {hasRecord && (
                <div className="absolute bottom-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></div>
                </div>
              )}
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

const EnergyDiagnosis: React.FC<EnergyDiagnosisProps> = ({
  history,
  onComplete,
  setIsHelpOpen,
  diagnosisFrequency,
  setDiagnosisFrequency,
  habits,
  handleAddHabit
}) => {
  const [step, setStep] = useState<QuizStep>('start');
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAdviceOpen, setIsAdviceOpen] = useState(true);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isFrequencyModalOpen, setIsFrequencyModalOpen] = useState(false);
  const [isPastListOpen, setIsPastListOpen] = useState(false);
  const quizContainerRef = useRef<HTMLDivElement>(null);

  // local frequency state
  const [localFrequency, setLocalFrequency] = useState(diagnosisFrequency);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Habit modal state
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [habitDraft, setHabitDraft] = useState<{ title: string; detail: string; energy?: string } | null>(null);

  useEffect(() => {
    setLocalFrequency(diagnosisFrequency);
  }, [diagnosisFrequency]);

  // handle save -> call parent setter
  const handleSaveFrequency = () => {
    setDiagnosisFrequency(localFrequency);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
    setIsFrequencyModalOpen(false);
  };

  useEffect(() => {
    // 常に「今日」を初期選択します（タブを開いたら今日の結果を表示するため）
    setSelectedDate(() => {
      const today = new Date();
      today.setHours(0,0,0,0);
      return today;
    });
  }, [/* no deps so this runs once on mount */]);

  useEffect(() => {
    if (step !== 'start' && step !== 'results') {
      quizContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [step]);

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    const currentStepIndex = categoryOrder.indexOf(step as EnergyCategory);
    if (currentStepIndex < categoryOrder.length - 1) {
      setStep(categoryOrder[currentStepIndex + 1]);
    } else {
      const scores: EnergyScores = { physical: 0, mental: 0, emotional: 0, intellectual: 0 };
      for (const category of categoryOrder) {
        let categoryScore = 0;
        QUESTIONS[category].forEach((q: { id: string | number; isReversed?: boolean }) => {
          const answer = answers[q.id] ?? 0;
          categoryScore += q.isReversed ? 4 - answer : answer;
        });
        scores[category] = categoryScore;
      }
      onComplete(scores);
      setStep('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const startQuiz = () => {
    setAnswers({});
    setStep(categoryOrder[0]);
  }

  const recordDates = useMemo(() => new Set(history.map(r => r.date)), [history]);

  const displayedRecord = useMemo(() => {
    const dateString = selectedDate.toLocaleDateString('sv-SE');
    return history.find(r => r.date === dateString) || null;
  }, [history, selectedDate]);

  const lowestEnergy = useMemo(() => {
    if (!displayedRecord) return null;
    return (Object.keys(displayedRecord).filter(k => k !== 'date') as EnergyCategory[]).reduce((lowest, category) => {
      const score = displayedRecord[category];
      return score < lowest.score ? { category, score } : lowest;
    }, { category: 'physical' as EnergyCategory, score: Infinity });
  }, [displayedRecord]);

  // パーソナリティ診断の算出（表示用）
  const personalityResult = useMemo(() => {
    if (!displayedRecord) return null;
    const scores: EnergyScores = {
      physical: (displayedRecord as any).physical ?? 0,
      mental: (displayedRecord as any).mental ?? 0,
      emotional: (displayedRecord as any).emotional ?? 0,
      intellectual: (displayedRecord as any).intellectual ?? 0,
    };
    const key = getTypeKey(scores);
    const data = (ENERGY_PERSONALITIES as any)[key];
    const keys = Object.keys(ENERGY_PERSONALITIES);
    const index = keys.indexOf(key) + 1; // 1-based
    if (!data || index <= 0) return null;

    // 画像ファイルは固定の命名規則で配置されているため、明示的なマップで参照する
    // （提供されたファイル名一覧に完全一致するようにする）
    const IMAGE_FILE_MAP: Record<number, string> = {
      1: '1_覚醒した勇者.png',
      2: '2_傷だらけの賢者.png',
      3: '3_陽気な迷子.png',
      4: '4_冷徹なマシン.png',
      5: '5_暴走する情熱家.png',
      6: '6_悲劇の軍師.png',
      7: '7_夢見る病床の人.png',
      8: '8_ご隠居アドバイザー.png',
      9: '9_空回りのソルジャー.png',
      10: '10_優秀なロボット.png',
      11: '11_お祭りピエロ.png',
      12: '12_穏やかなナマケモノ.png',
      13: '13_憂鬱な哲学者.png',
      14: '14_さまよえる野獣.png',
      15: '15_燃え尽き前のロウソク.png',
      16: '16_冬眠中のクマ.png',
    };

    // public フォルダ直下の images/energy_personalities に置いている前提で絶対パスを生成
    const filename = IMAGE_FILE_MAP[index] || `${index}.png`;
    const imageSrc = `/images/energy_personalities/${encodeURI(filename)}`;
    return { key, data, imageSrc };
  }, [displayedRecord]);

  const currentQuestions = (step !== 'start' && step !== 'results') ? QUESTIONS[step as EnergyCategory] : [];
  const isCurrentStepAnswered = currentQuestions.every((q: { id: string | number }) => answers[q.id] !== undefined);

  // Past records list component (simple)
  const PastRecordsList: React.FC = () => {
    if (!history || history.length === 0) {
      return <p className="text-sm text-gray-500">過去の診断はありません。</p>;
    }
    const sorted = [...history].sort((a,b) => b.date.localeCompare(a.date));
    return (
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {sorted.map(r => {
          const dateLabel = new Date(r.date + 'T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
          return (
            <li key={r.date}>
              <button
                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 flex justify-between items-center"
                onClick={() => { setSelectedDate(new Date(r.date + 'T00:00:00')); setIsPastListOpen(false); }}
              >
                <div>
                  <div className="font-medium text-gray-800">{dateLabel}</div>
                  <div className="text-xs text-gray-500">{Object.entries(r).filter(([k])=>k!=='date').map(([k,v])=>`${ENERGY_CATEGORIES[k as EnergyCategory].name}: ${v}/20`).join(' ・ ')}</div>
                </div>
                <div className="text-sm text-indigo-600">詳細</div>
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  // --- JSX ---
  if (step === 'start' || step === 'results') {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {/* メインタイトル: 小さめに調整（モバイル優先） */}
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">エネルギー診断</h2>
                    <button onClick={() => setIsHelpOpen(true)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                        <HelpIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={startQuiz}
                        className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-md text-sm whitespace-nowrap"
                    >
                        {history.length > 0 ? '再診断する' : '診断を開始する'}
                    </button>

                    <button
                      onClick={() => setIsFrequencyModalOpen(true)}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                      title="診断の頻度を設定"
                    >
                      頻度設定
                    </button>
                </div>
            </div>

            <DatePickerModal 
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                onDateSelect={(date) => {
                    setSelectedDate(date);
                    setIsDatePickerOpen(false);
                }}
                initialDate={selectedDate}
                highlightedDates={recordDates}
                habits={habits}
            />

            {displayedRecord && lowestEnergy ? (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-md animate-fade-in">
                        <div className="flex items-center justify-center mb-4">
                            <button onClick={() => setIsDatePickerOpen(true)} className="flex items-center gap-2 text-xl font-bold text-gray-800 hover:text-indigo-600 transition-colors">
                               {new Date(displayedRecord.date + 'T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} の結果
                               <CalendarIcon className="w-6 h-6"/>
                            </button>
                        </div>

                        {/* 凡例: 色の説明を上部に1行で表示 */}
                        <div className="flex items-center gap-3 justify-center mb-4">
                          {[
                            { label: '充満', sample: 18 },
                            { label: '標準', sample: 13 },
                            { label: '枯渇', sample: 8 },
                          ].map(l => {
                            const lev = getEnergyLevel(l.sample);
                            const bg = (lev as any).bg || (lev as any).color || '';
                            const text = (lev as any).text || '';
                            return (
                              <div key={l.label} className="flex items-center gap-2">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${bg} ${text} border ${((lev as any).border)||'border-transparent'}`}></span>
                                <span className="text-xs text-gray-600">{l.label}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {categoryOrder.map(cat => {
                                const score = displayedRecord[cat];
                                const level = getEnergyLevel(score);
                                const Icon = categoryIcons[cat];
                                const isLowest = lowestEnergy.category === cat;
                                return (
                                    <div
                                        key={cat}
                                        className={`flex items-center justify-between p-3 rounded-lg ${isLowest ? 'ring-2 ring-offset-1' : ''} ${ (level as any).color || '' } ${ (level as any).border || '' }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Icon className="w-5 h-5 flex-shrink-0 text-gray-700" />
                                            <div className="min-w-0">
                                              {/* shortName を使い、長文を避ける */}
                                              <div className="text-sm font-medium text-gray-800 truncate whitespace-nowrap">
                                                  {(ENERGY_CATEGORIES[cat] as any).shortName || ENERGY_CATEGORIES[cat].name}
                                              </div>
                                            </div>
                                        </div>

                                        <div className="ml-4 flex-shrink-0 text-right">
                                          <div className="text-xl font-bold leading-none">{score}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                         <div className={`mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800`}>
                            <p className="font-bold">🚨 最も注意が必要なエネルギー:</p>
                            <p>{ENERGY_CATEGORIES[lowestEnergy.category].name}が枯渇気味です。休息や気分転換を優先しましょう。</p>
                        </div>

                        {/* パーソナリティ診断結果（画像 + テキスト） */}
                        {personalityResult && (
                          <div className="mt-4 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                            {personalityResult.imageSrc ? (
                              <img
                                src={personalityResult.imageSrc}
                                alt={personalityResult.data.name}
                                className="w-full h-44 md:h-56 object-cover block"
                              />
                            ) : (
                              <div className="w-full h-44 md:h-56 bg-gray-100 flex items-center justify-center text-gray-400">画像なし</div>
                            )}
                            <div className="p-4">
                              <div className="text-xs text-gray-500 mb-1">診断タイプ</div>
                              <div className="text-lg font-semibold text-gray-800">{personalityResult.data.name}</div>
                              <div className="text-sm text-gray-600 mt-2">{personalityResult.data.description}</div>
                              {personalityResult.data.advice?.habits?.length > 0 && (
                                <div className="mt-4">
                                  <div className="text-sm font-medium text-gray-700 mb-3">おすすめの習慣</div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* try to get structured habits from mapping by key; fallback to simple list */}
                                    {(() => {
                                      const key = personalityResult.key;
                                      const recs = ENERGY_PERSONALITY_HABITS[key] ?? (personalityResult.data.advice.habits.map((t: string) => ({ energy: 'mental', title: t, detail: '' })));
                                      return recs.map((h: any, idx: number) => {
                                        // h.energy は外部データなので安全に EnergyCategory にキャストして参照する
                                        const energyKey = (h.energy ?? 'mental') as EnergyCategory;
                                        const energyMeta = (ENERGY_CATEGORIES as Record<EnergyCategory, any>)[energyKey] ?? { shortName: String(h.energy), color: '#9CA3AF', name: String(h.energy) };
                                        return (
                                          <div key={idx} className="flex items-stretch gap-3 p-3 bg-gray-50 rounded-lg shadow-sm">
                                            <div className="flex-shrink-0">
                                              <span
                                                className="inline-flex items-center justify-center text-xs font-semibold rounded-full px-2 py-1 text-white"
                                                style={{ backgroundColor: energyMeta.color }}
                                                title={energyMeta.name}
                                              >
                                                {energyMeta.shortName}
                                              </span>
                                            </div>
                                            <div className="flex-1">
                                              <div className="font-medium text-gray-800 text-sm">{h.title}</div>
                                              {h.detail ? <div className="text-sm text-gray-600 mt-1">{h.detail}</div> : null}
                                            </div>
                                            <div className="flex items-start">
                                              <button
                                                onClick={() => {
                                                  setHabitDraft({ title: h.title, detail: h.detail, energy: h.energy });
                                                  setIsHabitModalOpen(true);
                                                }}
                                                className="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                                                aria-label="習慣に追加"
                                              >
                                                +
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              )}

                              {/* AddHabitModal reused */}
                              <AddHabitModal
                                isOpen={isHabitModalOpen}
                                onClose={() => { setIsHabitModalOpen(false); setHabitDraft(null); }}
                                initial={{
                                  title: habitDraft?.title?.replace(/^\s*\d+\.\s*/, '') ?? '',
                                  detail: habitDraft?.detail ?? '',
                                }}
                                onCreate={handleAddHabit}
                              />
                            </div>
                          </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <button onClick={() => setIsAdviceOpen(!isAdviceOpen)} className="w-full flex justify-between items-center text-left text-gray-800">
                            <div className="text-left">
                                <div className="text-xs text-gray-500">改善のための</div>
                                <h3 className="text-lg font-bold">パーソナルアドバイス</h3>
                            </div>
                            <ChevronDownIcon className={`w-6 h-6 transition-transform ${isAdviceOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isAdviceOpen && (
                            <div className="mt-4 space-y-4 animate-fade-in">
                                {ADVICE_CONTENT[lowestEnergy.category].map((advice, index) => (
                                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                        <h4 className="font-semibold text-indigo-700 text-sm">{advice.title}</h4>
                                        <ul className="list-disc list-inside text-gray-600 space-y-1 mt-2">
                                            {advice.points.map((point, pIndex) => <li key={pIndex}>{point}</li>)}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white p-8 rounded-xl shadow-md text-center">
                    {/* 選択中の日付表示 + カレンダーボタン（診断結果がなくても常に表示） */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="text-sm text-gray-600">
                            選択日:
                            <span className="ml-2 font-medium text-gray-800">
                                {selectedDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsDatePickerOpen(true)}
                            aria-label="カレンダーで日付を選択"
                            className="inline-flex items-center justify-center p-2 w-9 h-9 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50"
                        >
                            <CalendarIcon className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>

                    <p className="text-lg font-semibold text-gray-800 mb-4 max-w-xl mx-auto leading-relaxed">
                        診断結果はありません。<br/>ぜひ診断してみてください！
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-2">
                        <button
                            onClick={startQuiz}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
                        >
                            診断を開始する
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center justify-between mb-2">
                    {/* 見出しを控えめにして注釈風に */}
                    <h3 className="text-lg md:text-base font-semibold text-gray-800">過去の診断結果 <span className="text-sm text-gray-500">（最新5件）</span></h3>
                    <div>
                        {/* カレンダーボタンをコンパクトなアイコンボタンに（テキスト削除） */}
                        <button
                            onClick={() => { setIsPastListOpen(false); setIsDatePickerOpen(true); }}
                            aria-label="カレンダーで選ぶ"
                            className="inline-flex items-center justify-center p-2 w-9 h-9 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50"
                        >
                            <CalendarIcon className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                </div>

                <p className="text-xs text-gray-500 mb-3">※スコアは20点満点です</p>

                {/* 列ヘッダ：小さめ／折返し防止 */}
                <div className="grid grid-cols-[120px_repeat(4,1fr)] gap-3 items-center px-2 mb-3 text-xs text-gray-600">
                    <div className="font-medium truncate">日付</div>
                    {categoryOrder.map(cat => (
                        <div key={cat} className="text-center font-medium whitespace-nowrap text-xs">
                            {(ENERGY_CATEGORIES[cat] as any).shortName || ENERGY_CATEGORIES[cat].name.replace(/エネルギー|の?/g, '')}
                        </div>
                    ))}
                </div>

                <div className="space-y-3">
                    {history.length === 0 ? (
                        <p className="text-sm text-gray-500">過去の診断はありません。</p>
                    ) : (
                        [...history]
                            .sort((a, b) => b.date.localeCompare(a.date))
                            .slice(0, 5)
                            .map(r => {
                                const dateLabel = new Date(r.date + 'T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
                                return (
                                    <div
                                        key={r.date}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedDate(new Date(r.date + 'T00:00:00'))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setSelectedDate(new Date(r.date + 'T00:00:00'));
                                            }
                                        }}
                                        className="w-full text-left p-3 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition flex items-center gap-4"
                                        aria-label={`過去診断 ${dateLabel}`}
                                    >
                                        {/* 日付（幅を小さめにする） + カレンダーボタン */}
                                        <div className="w-[120px] flex-shrink-0 flex items-center gap-2">
                                            <div className="text-sm font-medium text-gray-800 truncate">{dateLabel}</div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedDate(new Date(r.date + 'T00:00:00'));
                                                    setIsDatePickerOpen(true);
                                                }}
                                                aria-label={`カレンダーで ${dateLabel} を開く`}
                                                className="p-2 rounded-md hover:bg-gray-100 inline-flex items-center justify-center"
                                            >
                                                <CalendarIcon className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </div>

                                        {/* スコア群（ラベルは上部ヘッダ、数値のみ） */}
                                        <div className="flex-1 grid grid-cols-4 gap-3">
                                            {categoryOrder.map(cat => {
                                                const score = (r as any)[cat] as number;
                                                const level = getEnergyLevel(score);
                                                const bgClass = (level as any).bg || (level as any).color || '';
                                                const textClass = (level as any).text || '';
                                                const borderClass = (level as any).border || '';
                                                return (
                                                    <div
                                                        key={cat}
                                                        className={`flex items-center justify-center rounded-lg p-2 min-h-[44px] ${bgClass} ${textClass} ${borderClass}`}
                                                    >
                                                        <div className="text-lg font-bold leading-tight">{score}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>

            {/* Frequency modal (topの頻度設定ボタンで開く) */}
            {isFrequencyModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setIsFrequencyModalOpen(false)}>
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold mb-3">診断の頻度設定</h3>
                  <FrequencyEditor frequency={localFrequency} setFrequency={setLocalFrequency} />
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setIsFrequencyModalOpen(false)} className="px-4 py-2 rounded-lg bg-white border">キャンセル</button>
                    <button onClick={handleSaveFrequency} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">保存</button>
                  </div>
                </div>
              </div>
            )}

        </div>
    );
  }

  // --- クイズ中のJSX (変更なし) ---
  return (
    <div ref={quizContainerRef} className="bg-white p-6 md:p-8 rounded-xl shadow-lg animate-fade-in">
        <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{ENERGY_CATEGORIES[step as EnergyCategory].name}</h2>
            <p className="text-gray-500">{ENERGY_CATEGORIES[step as EnergyCategory].description}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${((categoryOrder.indexOf(step as EnergyCategory) + 1) / categoryOrder.length) * 100}%` }}></div>
            </div>
        </div>
      <div className="space-y-8">
        {currentQuestions.map((q, index) => (
          <div key={q.id}>
            <p className="font-semibold text-gray-700 mb-3 text-center">{index + 1}. {q.text}</p>
            <div className="flex justify-between items-end text-center max-w-sm mx-auto">
                {RATING_OPTIONS.map(opt => (
                    <div key={opt.value} className="flex flex-col items-center gap-2 w-1/5">
                        <span className="text-xs text-gray-500 h-8 flex items-center">{opt.label}</span>
                        <button
                            onClick={() => handleAnswer(q.id, opt.value)}
                            className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 font-bold text-lg transition-all transform ${
                                answers[q.id] === opt.value
                                ? 'bg-indigo-600 border-indigo-600 text-white scale-110'
                                : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
                            }`}
                        >
                            {opt.value}
                        </button>
                    </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <button
          onClick={handleNext}
          disabled={!isCurrentStepAnswered}
          className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg"
        >
          {categoryOrder.indexOf(step as EnergyCategory) < categoryOrder.length - 1 ? '次へ' : '結果を見る'}
        </button>
      </div>
    </div>
  );
};

export default EnergyDiagnosis;