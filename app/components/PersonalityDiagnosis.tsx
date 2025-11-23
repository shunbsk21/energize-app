// ...existing code...
"use client";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { View, DiagnosisFrequency, FrequencyType } from "../types";
import {
  PERSONALITY_QUESTIONS,
  PERSONALITY_RATING_OPTIONS,
  PERSONALITY_TYPE_MAP,
  PERSONALITY_IMAGE_MAP,
  PERSONALITY_HABITS,
  ENERGY_CATEGORIES,
} from "../constants";

import AddHabitModal from "./AddHabitModal";

// Firestore
import { collection, query, orderBy, onSnapshot, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";

// --- FrequencyEditor (EnergyDiagnosis と同等のUIをここでも利用) ---
const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土'];

const FrequencyEditor: React.FC<{
  frequency: DiagnosisFrequency;
  setFrequency: React.Dispatch<React.SetStateAction<DiagnosisFrequency>>;
}> = ({ frequency, setFrequency }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">頻度</label>
        <select
          value={frequency.frequencyType}
          onChange={e => setFrequency({ frequencyType: e.target.value as FrequencyType, frequencyValue: [] })}
          className="w-full p-3 text-base border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
        >
          <option value="daily">毎日</option>
          <option value="weekly">週次</option>
          <option value="monthly">月次</option>
        </select>
      </div>

      {frequency.frequencyType === 'weekly' && (
        <div className="flex justify-center gap-1">
          {WEEK_DAYS.map((day, index) => (
            <button
              type="button"
              key={index}
              onClick={() => {
                const newValue = frequency.frequencyValue.includes(index)
                  ? frequency.frequencyValue.filter(d => d !== index)
                  : [...frequency.frequencyValue, index];
                setFrequency(prev => ({ ...prev, frequencyValue: newValue.sort() }));
              }}
              className={`w-10 h-10 rounded-full font-semibold transition-colors text-sm md:text-base ${frequency.frequencyValue.includes(index) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {day}
            </button>
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
              setFrequency(prev => ({ ...prev, frequencyValue: value.sort((a,b) => a-b) }));
            }}
            className="w-full p-3 text-base border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          />
        </div>
      )}
    </div>
  );
};

type Dimension = "EI" | "SN" | "TF" | "JP";
type AnswerValue = 1 | 2 | 3 | 4 | 5;

interface Question {
  id: number;
  text: string;
  dimension: Dimension;
  direction: "positive" | "negative";
}

interface PersonalityProps {
  onComplete?: (result: any) => void;
  setIsHelpOpen?: (open: boolean) => void;
  setView?: (v: View) => void;
  isView?: (v: View) => boolean;
}

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

// アイコン
const HelpIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
);
const CalendarIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

function calcScores(answers: Record<number, AnswerValue>) {
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

/* --- RadarChart same as before --- */
function RadarChart({ values }: { values: Record<Dimension, number> }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const axes: Dimension[] = ["EI", "SN", "TF", "JP"];
  const points = axes.map((d, i) => {
    const angle = (Math.PI / 2) - (i * (2 * Math.PI) / axes.length);
    const r = (values[d] / 100) * radius;
    return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)];
  });
  const polygon = points.map((p) => p.join(",")).join(" ");
  const labels = axes.map((d, i) => {
    const angle = (Math.PI / 2) - (i * (2 * Math.PI) / axes.length);
    const lx = cx + (radius + 18) * Math.cos(angle);
    const ly = cy - (radius + 18) * Math.sin(angle);
    const label = d === "EI" ? "外向(E)<->内向(I)" : d === "SN" ? "感覚(S)<->直観(N)" : d === "TF" ? "思考(T)<->感情(F)" : "判断(J)<->知覚(P)";
    return { x: lx, y: ly, label };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {[0.33, 0.66, 1].map((f, idx) => {
        const poly = axes.map((d, i) => {
          const angle = (Math.PI / 2) - (i * (2 * Math.PI) / axes.length);
          const r = radius * f;
          return `${cx + r * Math.cos(angle)},${cy - r * Math.sin(angle)}`;
        }).join(" ");
        return <polygon key={idx} points={poly} fill="none" stroke="#e6e6e6" strokeWidth={1} />;
      })}
      {axes.map((_, i) => {
        const angle = (Math.PI / 2) - (i * (2 * Math.PI) / axes.length);
        const x = cx + radius * Math.cos(angle);
        const y = cy - radius * Math.sin(angle);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#f0f0f0" strokeWidth={1} />;
      })}
      <polygon points={polygon} fill="rgba(79,70,229,0.12)" stroke="#4f46e5" strokeWidth={2} />
      {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#4f46e5" />)}
      {labels.map((l, i) => (
        <text key={i} x={l.x} y={l.y} fontSize={10} textAnchor="middle" fill="#334155">{l.label.split("<")[0]}</text>
      ))}
    </svg>
  );
}

/* --- Component --- */
const DIMENSIONS: Dimension[] = ["EI", "SN", "TF", "JP"];

const getCurrentUid = () => {
  try {
    return auth?.currentUser?.uid ?? null;
  } catch {
    return null;
  }
};

const PersonalityDiagnosis: React.FC<PersonalityProps> = ({ onComplete, setIsHelpOpen, setView, isView }) => {
  const [step, setStep] = useState<Dimension | 'start' | 'results'>('start');
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [submittedResult, setSubmittedResult] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);

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
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Firestore: subscribe to user's personality history
  const currentQuestions = step === 'start' || step === 'results' ? [] : QUESTIONS.filter(q => q.dimension === step);

  // Firestore: subscribe to user's personality history
  useEffect(() => {
    const uid = getCurrentUid();
    if (!db || !uid) return;
    const q = query(collection(db, 'users', uid, 'personalityHistory'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const items = snap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          date: data.date ?? undefined,
          type: data.type ?? undefined,
          percents: data.percents ?? undefined,
          strength: data.strength ?? undefined,
          answers: data.answers ?? undefined,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ?? undefined),
        };
      });
      setHistory(items);
    }, (err) => {
      console.error('personalityHistory snapshot error', err);
    });
    return () => unsub();
  }, []);

  // 履歴が更新されたら、最新を自動で表示にセット（今日の結果があれば見える）
  useEffect(() => {
    if ((!submittedResult || !submittedResult.type) && history && history.length > 0) {
      // history[0] は orderBy(createdAt, desc) により最新
      setSubmittedResult(history[0]);
      setStep('results');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const openRecordDetail = (rec: any) => {
    setSelectedRecord(rec);
    setIsDetailModalOpen(true);
  };

  const closeRecordDetail = () => {
    setSelectedRecord(null);
    setIsDetailModalOpen(false);
  };

  const setAnswer = (id: number, v: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [id]: v }));
  };

  const startQuiz = () => {
    setAnswers({});
    setSubmittedResult(null);
    setStep(DIMENSIONS[0]);
    // scroll or focus handled by parent if needed
  };

  const handleNext = async () => {
    const idx = DIMENSIONS.indexOf(step as Dimension);
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
          const today = new Date().toLocaleDateString('sv-SE');
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
        const rec = { id: date.toISOString(), date: date.toLocaleDateString('sv-SE'), type: res.type, percents: res.percents, strength: res.strength };
        setHistory(prev => [rec, ...prev].slice(0, 20));
        // also persist completion locally + notify
        try {
          const today = date.toLocaleDateString('sv-SE');
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

  // Past records list
  const PastRecordsList: React.FC = () => {
    if (!history || history.length === 0) return <p className="text-sm text-gray-500">過去の診断はありません。</p>;
    return (
      <ul className="space-y-2 max-h-56 overflow-y-auto">
        {history.map(h => {
          const dateLabel = new Date(h.date + 'T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
          return (
            <li key={h.date} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
              <div>
                <div className="font-medium text-gray-800">{dateLabel}</div>
                <div className="text-xs text-gray-500">タイプ: {h.type}</div>
              </div>
              <button onClick={() => openRecordDetail(h)} className="text-sm text-indigo-600">詳細</button>
            </li>
          );
        })}
      </ul>
    );
  };

  // Modal: 過去の診断（簡易カレンダー代替） — EnergyDiagnosis と同じ容量でリスト表示
  const RecordsPickerModal: React.FC<{ open: boolean; onClose: () => void; onSelect: (rec: any) => void; }> = ({ open, onClose, onSelect }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="bg-white rounded-xl p-4 z-10 w-full max-w-md shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">過去の診断結果</div>
            <button onClick={onClose} className="text-sm text-gray-500">閉じる</button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.length === 0 ? (
              <div className="text-sm text-gray-500">過去の診断はありません。</div>
            ) : (
              [...history].sort((a,b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)).map(h => {
                const dateLabel = new Date((h.date || h.createdAt) + 'T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
                return (
                  <button
                    key={h.id ?? h.date}
                    onClick={() => { onSelect(h); onClose(); }}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg flex items-center gap-3 hover:bg-gray-100"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{dateLabel}</div>
                      <div className="text-xs text-gray-500">タイプ: {h.type}</div>
                    </div>
                    <div className="text-sm text-indigo-600">表示</div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

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
              <img src={resultImageSrc} alt={TYPE_MAP[submittedResult.type]?.name ?? submittedResult.type} className="w-full h-44 md:h-56 object-cover block" />
            ) : (
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
                    const habits = (typeKey && PERSONALITY_HABITS[typeKey]) || (TYPE_MAP[typeKey]?.habits ? TYPE_MAP[typeKey].habits.map((t: string) => ({ energy: 'mental', title: t, detail: '' })) : []);
                    if (!habits || habits.length === 0) {
                      return <div className="text-sm text-gray-500 col-span-full">自分に合う習慣を少し試して継続すること。</div>;
                    }
                    return habits.map((h: any, i: number) => {
                      const energyKey = h.energy as 'physical'|'mental'|'emotional'|'intellectual';
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
                  // no onCreate passed: AddHabitModal will dispatch `habit-created` event which HabitTracker listens to
                />
              </div>

              <div className="flex justify-end mt-4">
                <button onClick={() => { setSubmittedResult(null); setStep('start'); }} className="px-3 py-1 border border-gray-200 rounded-md text-sm">もう一度やる</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-xl shadow-md text-center">
            <p className="text-lg font-semibold text-gray-800 mb-4">診断結果はありません。診断を開始してあなたのタイプを見つけましょう。</p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <button onClick={startQuiz} className="px-6 py-3 bg-indigo-600 text-white rounded-lg">診断を開始する</button>
            </div>
          </div>
        )}

        {/* カレンダーモーダル: 過去の診断選択 */}
        <RecordsPickerModal
          open={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          onSelect={(rec) => { setSubmittedResult(rec); setStep('results'); }}
        />

        {/* 過去の診断リスト（下部） */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">過去の診断結果 <span className="text-sm text-gray-500">（最新）</span></h3>
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