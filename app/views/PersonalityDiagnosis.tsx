// ...existing code...
"use client";
import React, { useMemo, useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  View,
  DiagnosisFrequency,
  FrequencyType,
  PersonalityProps,
  PersonalityDimension,
  PersonalityAnswerValue,
  PersonalityQuestion,
  PersonalityHistoryRecord,
  RecommendedHabit
} from "../types";
import {
  PERSONALITY_QUESTIONS,
  PERSONALITY_RATING_OPTIONS,
  PERSONALITY_TYPE_MAP,
  PERSONALITY_IMAGE_MAP,
  PERSONALITY_HABITS,
  ENERGY_CATEGORIES,
} from "../constants";

import { formatDateKey } from "../utils/dates";
import AddHabitModal from "../components/AddHabitModal";
import FrequencyEditor from "../components/FrequencyEditor";
import DatePickerModal from '../components/DatePickerModal';
import { HelpIcon, CalendarIcon } from "../components/Icons";

// Firestore
import { collection, query, orderBy, onSnapshot, setDoc, doc, serverTimestamp, QueryDocumentSnapshot, FirestoreError } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";

type Dimension = PersonalityDimension;

const fallbackPreference: Record<Dimension, "left" | "right"> = {
  EI: "right",
  SN: "left",
  TF: "left",
  JP: "left",
};

// QUESTIONS / TYPE_MAP / IMAGE_MAP は constants.ts からインポートしています
// 既存のコンポーネントロジックは変わりませんが、内部で使う名前を置き換えます
const QUESTIONS = PERSONALITY_QUESTIONS;
const RATING_OPTIONS = PERSONALITY_RATING_OPTIONS;
const TYPE_MAP = PERSONALITY_TYPE_MAP;
const IMAGE_FILE_MAP = PERSONALITY_IMAGE_MAP;

function calcScores(answers: Record<number, PersonalityAnswerValue>) {
  const sums: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };
  const counts: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };

  QUESTIONS.forEach(q => {
    const v = answers[q.id];
    if (!v) return;
    let w = v - 3;
    if (q.direction === "negative") w = -w;
    // q.dimension may come from external data; cast to Dimension for safe indexing
    const dim = q.dimension as Dimension;
    sums[dim] += w;
    counts[dim] += 1;
  });

  const maxes: Record<Dimension, number> = {
    EI: counts.EI * 2 || 2,
    SN: counts.SN * 2 || 2,
    TF: counts.TF * 2 || 2,
    JP: counts.JP * 2 || 2,
  };

  const letters: Record<Dimension, string> = { EI: "I", SN: "N", TF: "F", JP: "P" };
  const percents: Record<Dimension, number> = { EI: 50, SN: 50, TF: 50, JP: 50 };
  const strength: Record<Dimension, number> = { EI: 0, SN: 0, TF: 0, JP: 0 };

  (Object.keys(sums) as Dimension[]).forEach(d => {
    const score = sums[d];
    const max = maxes[d];
    if (score === 0) {
      letters[d] = fallbackPreference[d] === "left" ? (d === "EI" ? "E" : d === "SN" ? "S" : d === "TF" ? "T" : "J") : (d === "EI" ? "I" : d === "SN" ? "N" : d === "TF" ? "F" : "P");
    } else {
      letters[d] = score > 0 ? (d === "EI" ? "E" : d === "SN" ? "S" : d === "TF" ? "T" : "J") : (d === "EI" ? "I" : d === "SN" ? "N" : d === "TF" ? "F" : "P");
    }
    const pctLeft = Math.round(((score + max) / (2 * max)) * 100);
    const str = Math.round((Math.abs(score) / max) * 100);
    percents[d] = pctLeft;
    strength[d] = str;
  });

  const type = [letters.EI, letters.SN, letters.TF, letters.JP].join("");
  return { sums, counts, maxes, percents, strength, type };
}

// カレンダー用の highlightedDates と DatePickerModal を追加
const recordDatesFromHistory = (history: PersonalityHistoryRecord[]) => {
  return new Set((history || []).map(h => String(h.date)));
};

/* --- Component --- */
const DIMENSIONS: PersonalityDimension[] = ["EI", "SN", "TF", "JP"];

const getCurrentUid = () => {
  try {
    return auth?.currentUser?.uid ?? null;
  } catch {
    return null;
  }
};

const PersonalityDiagnosis: React.FC<PersonalityProps> = ({
  onComplete, 
  setIsHelpOpen,
  handleAddHabit
}) => {
  const [step, setStep] = useState<Dimension | 'start' | 'results'>('start');
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [submittedResult, setSubmittedResult] = useState<PersonalityHistoryRecord | null>(null);
  const [history, setHistory] = useState<PersonalityHistoryRecord[]>([]);

  // 頻度設定用モーダル制御（EnergyDiagnosis と同様の見た目に合わせる）
  const [isFrequencyModalOpen, setIsFrequencyModalOpen] = useState(false);
  
  // local frequency state persisted to localStorage under key "personalityDiagnosisFrequency"
  const [localFrequency, setLocalFrequency] = useState<DiagnosisFrequency>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("personalityDiagnosisFrequency") : null;
      return raw ? JSON.parse(raw) : { frequencyType: "daily", frequencyValue: [] };
    } catch {
      return { frequencyType: "daily", frequencyValue: [] };
    }
  });
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  // Habit create modal state
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [habitDraft, setHabitDraft] = useState<{ title: string; detail: string; energy?: string } | null>(null);

  // submittedResult が変わったら表示用の画像パスを決定
  const resultImageSrc = useMemo(() => {
    if (!submittedResult || !submittedResult.type) return null;
    const file = IMAGE_FILE_MAP[submittedResult.type] ?? `${submittedResult.type}.png`;
    return `/images/16personalities/${encodeURI(file)}`;
  }, [submittedResult]);
  
  // 選択中の過去履歴詳細モーダル制御
  const [selectedRecord, setSelectedRecord] = useState<PersonalityHistoryRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Firestore: subscribe to user's personality history
  const currentQuestions = step === 'start' || step === 'results' ? [] : QUESTIONS.filter(q => q.dimension === step);

  // Firestore: subscribe to user's personality history
  useEffect(() => {
    const uid = getCurrentUid();
    if (!db || !uid) return;
    const q = query(collection(db, 'users', uid, 'personalityHistory'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const items = snap.docs.map((d: QueryDocumentSnapshot) => {
        const data = d.data();
        return {
          id: d.id,
          date: data.date ?? undefined,
          type: data.type ?? undefined,
          percents: data.percents ?? undefined,
          strength: data.strength ?? undefined,
          answers: data.answers ?? undefined,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ?? undefined),
        } as PersonalityHistoryRecord;
      });
      setHistory(items);
    }, (err: FirestoreError) => {
      console.error('personalityHistory snapshot error', err);
    });
    return () => unsub();
  }, []);

  // 履歴が更新されたら、まず「今日」の結果があれば表示する（なければ no-result のまま）
  useEffect(() => {
    if (history && history.length > 0) {
      const today = formatDateKey(new Date());
      const todayRec = history.find(h => String(h.date) === today);
      if (todayRec) {
        setSubmittedResult(todayRec);
        setStep('results');
        return;
      }
    }
    // 既に submittedResult が設定されている場合は触らない（ユーザーが手動で選んでいる可能性）
  }, [history]);

  useEffect(() => {
    // keep localFrequency in sync with stored value if it exists (safe on client)
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("personalityDiagnosisFrequency") : null;
      if (raw) setLocalFrequency(JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }, []);

  const handleSaveFrequency = () => {
    try {
      localStorage.setItem("personalityDiagnosisFrequency", JSON.stringify(localFrequency));
    } catch (err) {
      console.warn("Failed to save personalityDiagnosisFrequency", err);
    }
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
    setIsFrequencyModalOpen(false);
  };

  const openRecordDetail = (rec: PersonalityHistoryRecord) => {
    // その日の記録をメイン表示にセットして結果ページへ遷移、上部へスクロール
    setSubmittedResult(rec);
    setStep('results');
    // クリーンアップしてモーダルは閉じる（もし開いていたら）
    setSelectedRecord(rec);
    setIsDetailModalOpen(false);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* noop */ }
  };

  const closeRecordDetail = () => {
    setSelectedRecord(null);
    setIsDetailModalOpen(false);
  };

  const setAnswer = (id: number, v: PersonalityAnswerValue) => {
    setAnswers(prev => ({ ...prev, [id]: v }));
  };

  const startQuiz = () => {
    setAnswers({});
    setSubmittedResult(null);
    setStep(DIMENSIONS[0]);
    // scroll or focus handled by parent if needed
  };

  const handleNext = async () => {
    const idx = DIMENSIONS.indexOf(step as PersonalityDimension);
    if (idx < DIMENSIONS.length - 1) {
      setStep(DIMENSIONS[idx + 1]);
    } else {
      // finish
      const res = calcScores(answers);
      setSubmittedResult(res);
      setStep('results');

      // Persist to Firestore (under users/{uid}/personalityHistory/{date})
      const uid = getCurrentUid();
      if (db && uid) {
        try {
          const today = formatDateKey(new Date());
          const payload = {
            date: today,
            type: res.type,
            percents: res.percents,
            strength: res.strength,
            answers: answers,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          const ref = doc(db, 'users', uid, 'personalityHistory', today);
          await setDoc(ref, payload);
          // local history will update via snapshot listener
          // mark as completed for other local UIs (HabitTracker) and notify via event
          try {
            const key = 'personalityDiagnosisCompletedDates';
            const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
            const arr: string[] = raw ? JSON.parse(raw) : [];
            if (!arr.includes(today)) {
              arr.unshift(today);
              localStorage.setItem(key, JSON.stringify(arr));
            }
          } catch (e) { /* noop */ }
          try {
            window.dispatchEvent(new CustomEvent('personality-diagnosis-saved', { detail: { date: today } }));
          } catch (e) { /* noop */ }
        } catch (err) {
          console.error('Failed to save personality result', err);
        }
      } else {
        // fallback: add to local history if not authenticated
        const date = new Date();
        const rec = { id: date.toISOString(), date: formatDateKey(date), type: res.type, percents: res.percents, strength: res.strength };
        setHistory(prev => [rec, ...prev].slice(0, 20));
        // also persist completion locally + notify
        try {
          const today = formatDateKey(date);
          const key = 'personalityDiagnosisCompletedDates';
          const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
          const arr: string[] = raw ? JSON.parse(raw) : [];
          if (!arr.includes(today)) {
            arr.unshift(today);
            localStorage.setItem(key, JSON.stringify(arr));
          }
          window.dispatchEvent(new CustomEvent('personality-diagnosis-saved', { detail: { date: today } }));
        } catch (e) { /* noop */ }
      }

      onComplete?.(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isCurrentStepAnswered = currentQuestions.length === 0 ? false : currentQuestions.every(q => answers[q.id] !== undefined);

  // Past records list (最大5件、日付の横にタイプを一行で表示)
  const PastRecordsList: React.FC = () => {
    if (!history || history.length === 0) return <p className="text-sm text-gray-500">過去の診断はありません。</p>;
    const items = history.slice(0, 5);
    return (
      <ul className="space-y-2 max-h-56 overflow-y-auto">
        {items.map((h: PersonalityHistoryRecord) => {
          const dateLabel = new Date((h.date || h.createdAt) + 'T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
          return (
            <li key={h.id ?? h.date} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
              <div className="text-sm text-gray-800 truncate">
                {dateLabel}
                <span className="text-sm text-gray-500 ml-3">— {String(h.type || '-')}</span>
              </div>
              <button onClick={() => openRecordDetail(h)} className="text-sm text-indigo-600 ml-4">詳細</button>
            </li>
          );
        })}
      </ul>
    );
  };

  // カレンダー用のハイライト日集合
  const recordDates = useMemo(() => recordDatesFromHistory(history), [history]);

  // --- Render ---
  if (step === 'start' || step === 'results') {
    const dateLabelForTitle = submittedResult?.date
      ? new Date(submittedResult.date + 'T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">パーソナリティ診断</h2>
            <button onClick={() => setIsHelpOpen?.(true)} className="text-gray-400 hover:text-indigo-600 transition-colors">
              <HelpIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFrequencyModalOpen(true)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              title="診断の頻度を設定"
            >
              頻度設定
            </button>
          </div>
        </div>

        {/* 結果表示（存在すれば） */}
        {submittedResult ? (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {/* 画像を横いっぱいに表示 */}
            {resultImageSrc ? (
              <div className="relative w-full h-44 md:h-56">
                <Image 
                  src={resultImageSrc} 
                  alt={TYPE_MAP[submittedResult.type]?.name ?? submittedResult.type} 
                  layout="fill" 
                  objectFit="cover" />
              </div>) : (
              <div className="w-full h-44 md:h-56 bg-gray-100 flex items-center justify-center text-gray-400">画像なし</div>
            )}

            <div className="p-6">
              {/* タイトル行: {日付} の診断結果 + カレンダー */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-gray-500">{dateLabelForTitle} の診断結果</div>
                  <div className="text-lg font-semibold text-gray-800">{TYPE_MAP[submittedResult.type]?.name ?? submittedResult.type}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCalendarOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                    aria-label="カレンダーで過去の診断を表示"
                  >
                    <CalendarIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-4">{TYPE_MAP[submittedResult.type]?.description ?? 'あなたの傾向を示します。'}</div>

              {/* 縦並びの軸表示 */}
              <div className="text-sm font-medium text-gray-700 mb-3">各軸の偏り（%）と強さ</div>
              <div className="space-y-3 mb-4">
                {[
                  { key: "EI", labelLeft: "外向(E)", labelRight: "内向(I)" },
                  { key: "SN", labelLeft: "感覚(S)", labelRight: "直観(N)" },
                  { key: "TF", labelLeft: "思考(T)", labelRight: "感情(F)" },
                  { key: "JP", labelLeft: "判断(J)", labelRight: "知覚(P)" },
                ].map(({ key, labelLeft, labelRight }) => {
                  // submittedResult.percents/strength indexed by Dimension — cast key to Dimension
                  const pct = submittedResult.percents[key as Dimension];
                  const str = submittedResult.strength[key as Dimension];

                  // 優先側を決めるヘルパー:
                  // pct>50 -> left 優勢, pct<50 -> right 優勢
                  // pct===50 -> submittedResult.type の文字で優先を決定 (例: INFJ の場合 EI は I が優先なら right)
                  const getDominantSide = (axisKey: string, percent: number, typeStr?: string | null) => {
                    if (percent > 50) return "left";
                    if (percent < 50) return "right";
                    if (!typeStr) return "left";
                    const idxMap: Record<string, number> = { EI: 0, SN: 1, TF: 2, JP: 3 };
                    const leftLetterMap: Record<string, string> = { EI: "E", SN: "S", TF: "T", JP: "J" };
                    const idx = idxMap[axisKey];
                    const letter = (typeStr || "")[idx] ?? leftLetterMap[axisKey];
                    return letter === leftLetterMap[axisKey] ? "left" : "right";
                  };
                  const dominant = getDominantSide(key, pct, submittedResult?.type);
                  const leftClass = dominant === "left" ? "bg-indigo-600" : "bg-gray-200";
                  const rightClass = dominant === "right" ? "bg-indigo-600" : "bg-gray-200";

                  return (
                    <div key={key} className="flex flex-col">
                      <div className="flex items-center justify-between text-sm text-gray-700">
                        <div className="w-28 text-left text-gray-600">{labelLeft}</div>
                        <div className="text-center text-sm text-gray-800 font-medium">{pct}%</div>
                        <div className="w-28 text-right text-gray-600">{labelRight}</div>
                      </div>
                      <div className="w-full rounded-full h-3 mt-2 overflow-hidden">
                        <div className="flex h-3 rounded-full overflow-hidden">
                          <div style={{ width: `${pct}%` }} className={`${leftClass} transition-all`} />
                          <div style={{ width: `${100 - pct}%` }} className={`${rightClass} transition-all`} />
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">強さ: {str}%</div>
                    </div>
                  );
                })}
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700">おすすめの習慣</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(() => {
                    const typeKey = submittedResult?.type;
                    const habits: RecommendedHabit[] = (typeKey && PERSONALITY_HABITS[typeKey]) || (TYPE_MAP[typeKey]?.habits ? TYPE_MAP[typeKey].habits.map((t: string) => ({ energy: 'mental', title: t, detail: '' })) : []);
                    if (!habits || habits.length === 0) {
                      return <div className="text-sm text-gray-500 col-span-full">自分に合う習慣を少し試して継続すること。</div>;
                    }
                    return habits.map((h: RecommendedHabit, i: number) => {
                      const energyKey = h.energy;
                      const energyMeta = ENERGY_CATEGORIES?.[energyKey];
                      // card per habit with + button
                      return (
                        <div key={i} className="flex items-stretch gap-3 p-3 bg-gray-50 rounded-lg shadow-sm">
                          <div className="flex-shrink-0">
                            <span
                              className="inline-flex items-center justify-center text-xs font-semibold rounded-full px-2 py-1 text-white"
                              style={{ backgroundColor: energyMeta?.color ?? '#9CA3AF' }}
                              title={energyMeta?.name}
                            >
                              {energyMeta?.shortName ?? energyKey}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 text-sm">{h.title}</div>
                            {h.detail ? <div className="text-sm text-gray-600 mt-1">{h.detail}</div> : null}
                          </div>
                          <div className="flex items-start">
                            <button
                              onClick={() => {
                                setHabitDraft({ title: h.title, detail: h.detail, energy: energyKey });
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

                {/* Habit creation modal (prefilled when + pressed) */}
                <AddHabitModal
                  isOpen={isHabitModalOpen}
                  onClose={() => { setIsHabitModalOpen(false); setHabitDraft(null); }}
                  initial={{
                    // タイトル先頭に付与された "1. " のような番号接頭辞を削除して渡す
                    title: habitDraft?.title?.replace(/^\s*\d+\.\s*/, '') ?? '',
                    detail: habitDraft?.detail ?? ''
                  }}
                  onCreate={handleAddHabit}
                />
              </div>

              <div className="flex justify-end mt-4">
                <button onClick={() => { setSubmittedResult(null); setStep('start'); }} className="px-3 py-1 border border-gray-200 rounded-md text-sm">もう一度やる</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-xl shadow-md">
            {/* 日付 + カレンダー */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">選択日：{dateLabelForTitle}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCalendarOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  aria-label="カレンダーで過去の診断を表示"
                >
                  <CalendarIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="text-gray-600">
                <p className="mb-3 text-lg font-semibold text-gray-800">本日の診断結果はまだありません。</p>
                <p className="text-sm text-gray-500">診断を実行すると、16タイプと詳細な結果（グラフ・おすすめの習慣など）が表示されます。</p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button onClick={startQuiz} className="px-6 py-3 bg-indigo-600 text-white rounded-lg">診断を開始する</button>
            </div>
          </div>
        )}

        {/* カレンダーモーダル: 過去の診断選択（カレンダー） */}
        <DatePickerModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          initialDate={new Date()}
          highlightedDates={recordDates}
          onDateSelect={(date) => {
            const dStr = formatDateKey(date);
            const rec = history.find(h => String(h.date) === dStr) ?? null;
            setSubmittedResult(rec);
            setStep('results');
            setIsCalendarOpen(false);
            try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
          }}
        />

        {/* 過去の診断リスト（下部） */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">過去の診断結果 <span className="text-sm text-gray-500">（最新）</span></h3>
            <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCalendarOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  aria-label="カレンダーで過去の診断を表示"
                >
                  <CalendarIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>
          </div>
          <PastRecordsList />
        </div>

        {/* 過去履歴の詳細モーダル */}
        {isDetailModalOpen && selectedRecord && (
          // ...existing detail modal unchanged...
          <div>{/* ...existing code ... */}</div>
        )}

        {/* Frequency modal (personality) */}
        {isFrequencyModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setIsFrequencyModalOpen(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-3">診断の頻度設定</h3>
              <FrequencyEditor frequency={localFrequency} setFrequency={setLocalFrequency} />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setIsFrequencyModalOpen(false)} className="px-4 py-2 rounded-lg bg-white border">キャンセル</button>
                <button onClick={handleSaveFrequency} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">保存</button>
              </div>
              {showSaveSuccess && <div className="mt-2 text-sm text-green-600">保存しました</div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Quiz step UI ---
  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{step === "EI" ? "エネルギーの充電場所" : step === "SN" ? "燃料となる情報" : step === "TF" ? "出力制御の論理" : "稼働スタイル"}</h2>
        <p className="text-gray-500 mt-1">{step === "EI" ? "エンジンはどうやって再始動する？" : step === "SN" ? "どんなデータを吸い込んで燃焼する？" : step === "TF" ? "ハンドル操作は何を基準に行う？" : "どんなペースで走行するのが得意？"}</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
          <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${((DIMENSIONS.indexOf(step as Dimension) + 1) / DIMENSIONS.length) * 100}%` }}></div>
        </div>
      </div>

      <div className="space-y-8">
        {currentQuestions.map((q, idx) => (
          <div key={q.id} className="px-2">
            <p className="font-semibold text-gray-800 mb-4">{idx + 1}. {q.text}</p>

            {/* rating area: full width, buttons larger and evenly spaced */}
            <div className="max-w-3xl mx-auto">
              <div className="flex justify-between items-end gap-3">
                {RATING_OPTIONS.map((opt) => {
                  const selected = answers[q.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setAnswer(q.id, opt.value as AnswerValue)}
                      className={`flex-1 min-w-0 flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-transform ${selected ? 'scale-105' : 'hover:scale-102'}`}
                      aria-pressed={selected}
                    >
                      {/* ラベルは固定高さにして、数字の位置を揃える */}
                      <span className="text-[11px] text-gray-500 leading-tight h-4 flex items-center justify-center">{opt.label}</span>
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg font-bold mt-2 ${
                        selected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border border-gray-300 text-gray-700'
                      }`}>
                        {opt.value}
                      </div>
                    </button>
                  );
                })}
              </div>
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
          {DIMENSIONS.indexOf(step as Dimension) < DIMENSIONS.length - 1 ? '次へ' : '結果を見る'}
        </button>
      </div>
    </div>
  );
};

export default PersonalityDiagnosis;
// ...existing code...