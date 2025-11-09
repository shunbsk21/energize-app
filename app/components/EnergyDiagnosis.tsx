"use client"; // Next.js 13+ App Router では "use client" が必要かもしれません

import React, { useState, useMemo, useRef, useEffect } from 'react';
// types.ts が MainApp.tsx と同じ階層にある想定 (`../types` -> `./types`)
import { EnergyCategory, EnergyRecord, EnergyScores, DiagnosisFrequency, FrequencyType, Habit } from './types'; 
import { ENERGY_CATEGORIES, QUESTIONS, RATING_OPTIONS, getEnergyLevel, ADVICE_CONTENT } from '../constants';

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
}

type QuizStep = EnergyCategory | 'start' | 'results';

const categoryOrder: EnergyCategory[] = ['physical', 'mental', 'emotional', 'intellectual'];

// (↓ isHabitScheduledForDate は変更なし)
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

// (↓ calculateCompletionStatus は変更なし)
const calculateCompletionStatus = (date: Date, habits: Habit[]): 'none' | 'partial' | 'full' => {
    const dateStr = date.toLocaleDateString('sv-SE');
    const scheduledHabits = habits.filter(h => isHabitScheduledForDate(h, date));

    if (scheduledHabits.length === 0) {
        return 'none';
    }

    const completedCount = scheduledHabits.filter(h => h.completedDates.includes(dateStr)).length;

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

          const completionStatus = habits ? calculateCompletionStatus(date, habits) : 'none';

          calendarDays.push(
            <div 
                key={day} 
                className="w-10 h-10 flex items-center justify-center rounded-full text-sm cursor-pointer hover:bg-indigo-100 relative"
                onClick={() => onDateSelect(date)}
            >
              <span className={`w-8 h-8 flex items-center justify-center rounded-full ${isSelected ? 'bg-indigo-600 text-white' : ''}`}>
                {day}
              </span>
              <div className="absolute bottom-1 flex items-center justify-center gap-0.5">
                {hasRecord && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></div>}
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

// (↓ FrequencyEditor は変更なし)
const FrequencyEditor: React.FC<{
    frequency: DiagnosisFrequency;
    setFrequency: React.Dispatch<React.SetStateAction<DiagnosisFrequency>>; // ここはローカルのuseStateを使うので変更なし
}> = ({ frequency, setFrequency }) => {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">頻度</label>
                <select 
                  value={frequency.frequencyType} 
                  onChange={e => setFrequency({frequencyType: e.target.value as FrequencyType, frequencyValue: []})}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                >
                  <option value="daily">毎日</option>
                  <option value="weekly">週次</option>
                  <option value="monthly">月次</option>
                </select>
            </div>
            {frequency.frequencyType === 'weekly' && (
                <div className="flex justify-center gap-1">
                  {WEEK_DAYS.map((day, index) => (
                    <button type="button" key={index}
                      onClick={() => {
                        const newValue = frequency.frequencyValue.includes(index)
                          ? frequency.frequencyValue.filter(d => d !== index)
                          : [...frequency.frequencyValue, index];
                        setFrequency(prev => ({...prev, frequencyValue: newValue.sort()}));
                      }}
                      className={`w-10 h-10 rounded-full font-semibold transition-colors ${frequency.frequencyValue.includes(index) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >{day}</button>
                  ))}
                </div>
            )}
            {frequency.frequencyType === 'monthly' && (
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">日付を選択 (カンマ区切り)</label>
                    <input
                        type="text"
                        placeholder="例: 1, 15"
                        defaultValue={frequency.frequencyValue.join(', ')}
                        onChange={e => {
                            const value = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 31);
                            setFrequency(prev => ({...prev, frequencyValue: value.sort((a,b) => a-b)}))
                        }}
                       className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    />
                 </div>
            )}
        </div>
    );
};


const EnergyDiagnosis: React.FC<EnergyDiagnosisProps> = ({ history, onComplete, setIsHelpOpen, diagnosisFrequency, setDiagnosisFrequency, habits }) => {
  const [step, setStep] = useState<QuizStep>('start');
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAdviceOpen, setIsAdviceOpen] = useState(true);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const quizContainerRef = useRef<HTMLDivElement>(null);
  
  // ★ localFrequency は、親 (MainApp) から渡される diagnosisFrequency を初期値とする
  const [localFrequency, setLocalFrequency] = useState(diagnosisFrequency);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // ★ 親から渡される diagnosisFrequency が変わったら、localFrequency も更新する
  useEffect(() => {
    setLocalFrequency(diagnosisFrequency);
  }, [diagnosisFrequency]);


  // ★ handleSaveFrequency を修正
  const handleSaveFrequency = () => {
    // 親 (MainApp) から渡された setDiagnosisFrequency (Firestore保存関数) を呼び出す
    setDiagnosisFrequency(localFrequency);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };
  
  // (↓ useEffect[history] は変更なし)
  useEffect(() => {
    if (history.length > 0) {
      const latestRecordDate = new Date(history[history.length - 1].date + 'T00:00:00');
      setSelectedDate(latestRecordDate);
    } else {
      const today = new Date();
      setSelectedDate(today);
    }
  }, [history]);
  
  // (↓ useEffect[step] は変更なし)
  useEffect(() => {
    if (step !== 'start' && step !== 'results') {
      quizContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [step]);

  // (↓ handleAnswer, handleNext, startQuiz は変更なし)
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
        QUESTIONS[category].forEach(q => {
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

  // (↓ recordDates, displayedRecord, lowestEnergy, currentQuestions, isCurrentStepAnswered は変更なし)
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


  const currentQuestions = (step !== 'start' && step !== 'results') ? QUESTIONS[step as EnergyCategory] : [];
  const isCurrentStepAnswered = currentQuestions.every(q => answers[q.id] !== undefined);


  // --- JSX (変更なし) ---
  if (step === 'start' || step === 'results') {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-gray-800">エネルギー診断</h2>
                    <button onClick={() => setIsHelpOpen(true)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                        <HelpIcon className="w-6 h-6" />
                    </button>
                </div>
                <button
                    onClick={startQuiz}
                    className="bg-indigo-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-indigo-700 transition-colors shadow-md text-sm sm:text-base whitespace-nowrap"
                >
                    {history.length > 0 ? '再診断する' : '診断を開始する'}
                </button>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {categoryOrder.map(cat => {
                                const score = displayedRecord[cat];
                                const level = getEnergyLevel(score);
                                const isLowest = lowestEnergy.category === cat;
                                const Icon = categoryIcons[cat];
                                return (
                                    <div key={cat} className={`p-4 rounded-lg ${isLowest ? 'border-4' : 'border-2'} ${level.color}`}>
                                        <div className="flex items-center mb-2">
                                            <Icon className="w-6 h-6 mr-3" />
                                            <h4 className="font-bold text-lg">{ENERGY_CATEGORIES[cat].name}</h4>
                                        </div>
                                        <div className="flex justify-between items-baseline">
                                            <span className={`font-semibold px-3 py-1 text-sm rounded-full ${level.color}`}>{level.label}</span>
                                            <p className="text-2xl font-bold">{score}<span className="text-sm font-normal">/20</span></p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                         <div className={`mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800`}>
                            <p className="font-bold">🚨 最も注意が必要なエネルギー:</p>
                            <p>{ENERGY_CATEGORIES[lowestEnergy.category].name}が枯渇気味です。休息や気分転換を優先しましょう。</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <button onClick={() => setIsAdviceOpen(!isAdviceOpen)} className="w-full flex justify-between items-center text-left font-bold text-gray-800">
                            <h3 className="text-xl">改善のためのパーソナルアドバイス</h3>
                            <ChevronDownIcon className={`w-6 h-6 transition-transform ${isAdviceOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isAdviceOpen && (
                            <div className="mt-4 space-y-4 animate-fade-in">
                                {ADVICE_CONTENT[lowestEnergy.category].map((advice, index) => (
                                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                        <h4 className="font-bold text-indigo-700">{advice.title}</h4>
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
                <div className="bg-white p-6 rounded-xl shadow-md text-center text-gray-500">
                    <p>
                        <button onClick={() => setIsDatePickerOpen(true)} className="text-indigo-600 font-semibold hover:underline">
                         {selectedDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </button>
                        の診断記録はありません。
                    </p>
                    <p>カレンダーから記録のある日付を選択してください。</p>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-gray-800 mb-4">診断の頻度設定</h3>
                <p className="text-gray-600 mb-4 text-sm">ここで設定した頻度に合わせて、「習慣トラッカー」に診断タスクが表示されます。</p>
                {/* FrequencyEditor は localFrequency (ローカルのuseState) を操作する
                  これは変更ありません
                */}
                <FrequencyEditor frequency={localFrequency} setFrequency={setLocalFrequency} />
                <div className="mt-4 text-right">
                    <button
                        onClick={handleSaveFrequency} // ★ 保存ボタンが押された時に Firestore保存関数を呼ぶ
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md disabled:bg-gray-400"
                        disabled={JSON.stringify(localFrequency) === JSON.stringify(diagnosisFrequency)}
                    >
                        {showSaveSuccess ? '保存しました！' : '設定を保存'}
                    </button>
                </div>
            </div>
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