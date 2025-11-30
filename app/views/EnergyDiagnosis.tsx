"use client"; // Next.js 13+ App Router では "use client" が必要かもしれません

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import { EnergyCategory, EnergyRecord, EnergyScores, DiagnosisFrequency, FrequencyType, Habit, View, Question, EnergyDiagnosisProps } from '../types'; 
import {
  ENERGY_CATEGORIES,
  QUESTIONS,
  RATING_OPTIONS,
  getEnergyLevel,
  ADVICE_CONTENT,
  ENERGY_PERSONALITIES,
  ENERGY_PERSONALITY_HABITS
} from '../constants';

import AddHabitModal from "../components/AddHabitModal";
import DatePickerModal from '../components/DatePickerModal';
import FrequencyEditor from "../components/FrequencyEditor";
import {
  IconBody,
  IconMental,
  IconEmotional,
  IconIntellectual,
  HelpIcon,
  CalendarIcon,
  ChevronDownIcon,
} from '../components/Icons';
import { isHabitScheduledForDate } from '../utils/habits';

const THRESHOLD = 16;
const getTypeKey = (scores: EnergyScores) => {
  const p = scores.physical >= THRESHOLD ? "High" : "Low";
  const m = scores.mental >= THRESHOLD ? "High" : "Low";
  const e = scores.emotional >= THRESHOLD ? "High" : "Low";
  const i = scores.intellectual >= THRESHOLD ? "High" : "Low";
  return `P_${p}_M_${m}_E_${e}_I_${i}`;
};

type QuizStep = EnergyCategory | 'start' | 'results';
const categoryOrder: EnergyCategory[] = ['physical', 'mental', 'emotional', 'intellectual'];

const categoryIcons: {[key in EnergyCategory]: React.FC<{className?: string}>} = {
    physical: IconBody,
    mental: IconMental,
    emotional: IconEmotional,
    intellectual: IconIntellectual,
}

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
        QUESTIONS[category].forEach((q: Question) => {
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
  const isCurrentStepAnswered = currentQuestions.every((q: Question) => answers[q.id] !== undefined);

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
                              <div className="relative w-full h-44 md:h-56">
                                <Image
                                  src={personalityResult.imageSrc}
                                  alt={personalityResult.data.name ?? ''}
                                  layout="fill"
                                  objectFit="cover"
                                />
                              </div>
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
                                            {advice.points.map((point: string, pIndex: number) => <li key={pIndex}>{point}</li>)}
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
        {currentQuestions.map((q: Question, index) => (
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