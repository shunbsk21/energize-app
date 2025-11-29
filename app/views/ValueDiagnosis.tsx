// ...existing code...
"use client";
import React, { useMemo, useState, useEffect } from "react";
import { DriverKey, Habit, DiagnosisFrequency, ValueAnswersMap, ValueResultRecord } from "../types"; // Habit をインポート
import { CATEGORIES, TYPE_INFO } from "../constants";
import { db, auth } from "../../lib/firebase";
import { signInAnonymously } from "firebase/auth"; // signInAnonymously をインポート
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import AddHabitModal from '../components/AddHabitModal';
import FrequencyEditor from '../components/FrequencyEditor';

// ★ CalendarIcon を追加
const CalendarIcon: React.FC<{className?: string}> = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>);

// ★ 修正: CATEGORIES から質問の配列を生成
const VALUE_QUESTIONS = CATEGORIES.flatMap(category => 
  category.questions.map(q => ({
    ...q,
    category: category.key,
  }))
);

// ...existing code...
const formatDateLabel = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
};

const HexagonChart: React.FC<{
  values: number[];
  labels: string[];
  max: number;
  size: number;
}> = ({ values, labels, max, size }) => {
  const center = size / 2;
  const radius = size * 0.35;

  const points = useMemo(() => {
    return values.map((value, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const r = Math.max(0, (value / max) * radius);
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  }, [values, max, radius, center]);

  const gridLines = useMemo(() => {
    const levels = 4;
    return Array.from({ length: levels }).map((_, levelIndex) => {
      const r = (radius / levels) * (levelIndex + 1);
      return labels.map((_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      }).join(' ');
    });
  }, [labels, radius, center]);

  const axisAndLabels = useMemo(() => {
    return labels.map((label, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x1 = center;
      const y1 = center;
      const x2 = center + radius * Math.cos(angle);
      const y2 = center + radius * Math.sin(angle);
      const labelX = center + (radius + 15) * Math.cos(angle);
      const labelY = center + (radius + 15) * Math.sin(angle);
      return { x1, y1, x2, y2, labelX, labelY, label };
    });
  }, [labels, radius, center]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLines.map((line, i) => <polygon key={i} points={line} fill="none" stroke="#e5e7eb" strokeWidth="1" />)}
      {axisAndLabels.map((axis, i) => (
        <g key={i}>
          <line x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="#e5e7eb" strokeWidth="1" />
          <text x={axis.labelX} y={axis.labelY} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#4b5563">{axis.label}</text>
        </g>
      ))}
      <polygon points={points} fill="rgba(79, 70, 229, 0.2)" stroke="#4f46e5" strokeWidth="2" />
    </svg>
  );
};

// ★ PurelifeDiagnosis.tsx から DatePickerModal をコピー
const DatePickerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
  initialDate: Date;
  highlightedDates?: Set<string>;
}> = ({ isOpen, onClose, onDateSelect, initialDate, highlightedDates }) => {
  const [displayDate, setDisplayDate] = useState<Date>(initialDate);
  useEffect(() => setDisplayDate(initialDate), [initialDate, isOpen]);
  if (!isOpen) return null;

  const changeMonth = (amount: number) => setDisplayDate(d => {
    const nd = new Date(d); nd.setMonth(nd.getMonth() + amount); return nd;
  });

  const generateCalendar = () => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < firstDay; i++) nodes.push(<div key={`e-${i}`} className="w-10 h-10"></div>);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toLocaleDateString('sv-SE');
      const hasRecord = highlightedDates?.has(dateStr);
      const isSelected = initialDate.toLocaleDateString('sv-SE') === dateStr;
      nodes.push(
        <div
          key={day}
          className="w-10 h-10 flex items-center justify-center rounded-full text-sm cursor-pointer hover:bg-indigo-50 relative"
          onClick={() => onDateSelect(date)}
        >
          <span className={`${isSelected ? 'w-9 h-9 rounded-[10px] scale-105 transform bg-indigo-600 text-white flex items-center justify-center font-semibold' : 'w-8 h-8 rounded-full flex items-center justify-center'}`}>
            {day}
          </span>
          {hasRecord && (
            <div className="absolute bottom-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></div>
            </div>
          )}
        </div>
      );
    }
    return nodes;
  };
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-4 z-10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100">&larr;</button>
          <h3 className="font-bold text-lg">{`${displayDate.getFullYear()}年 ${displayDate.getMonth() + 1}月`}</h3>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100">&rarr;</button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 mb-2">
          {['日','月','火','水','木','金','土'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1 place-items-center">
          {generateCalendar()}
        </div>
      </div>
    </div>
  );
};

const formatLocalISO = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

interface ValueDiagnosisProps {
  handleAddHabit?: (newHabitData: any) => Promise<void> | void;
  setIsHelpOpen?: (open: boolean) => void;
}

export default function ValueDiagnosis({ handleAddHabit, setIsHelpOpen }: ValueDiagnosisProps) {
  const defaultAnswers = useMemo(() => {
    const m: AnswersMap = {};
    VALUE_QUESTIONS.forEach(q => { m[String(q.id)] = 3; }); // ★ 修正: q.id を string に変換
    return m;
  }, []);

  const [answers, setAnswers] = useState<ValueAnswersMap>(defaultAnswers);
  const [history, setHistory] = useState<ValueResultRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ValueResultRecord | null>(null);
  const [step, setStep] = useState<'idle'|'quiz'|'results'>('idle');
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 6;
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [habitDraft, setHabitDraft] = useState<any>(null);
  const [isFrequencyModalOpen, setIsFrequencyModalOpen] = useState(false);
  const [localFrequency, setLocalFrequency] = useState<DiagnosisFrequency>({ frequencyType: 'daily', frequencyValue: [] });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // ★ カレンダーモーダルの表示状態
  const recordDates = useMemo(() => new Set(history.map(h => h.date)), [history]); // ★ 履歴のある日付セット

  const getCurrentUid = () => {
    try { return auth?.currentUser?.uid ?? null; } catch { return null; }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (!auth?.currentUser) {
          await signInAnonymously(auth);
        }
        const myUid = getCurrentUid();
        if (!mounted) return;
        setUid(myUid);
        if (!myUid) {
          setLoading(false);
          return;
        }
        const userHistCol = collection(db, 'users', myUid, 'valueHistory');
        const q = query(userHistCol, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const items = snap.docs.map(d => {
          const data: any = d.data();
          return {
            id: d.id,
            date: data.date,
            scores: data.scores || {},
            type: data.type || '',
            top1: data.top1,
            top2: data.top2,
            createdAt: data.createdAt,
          } as ValueResultRecord;
        });
        setHistory(items);
        const todayIso = formatLocalISO(new Date());
        const todayRec = items.find(r => r.date === todayIso) || null;
        if (todayRec) {
          setSelectedRecord(todayRec);
          setStep('results');
        } else {
          setStep('idle');
        }

        // --- 頻度設定を読み込む ---
        try {
          const settingsRef = doc(db, "users", myUid, "settings", "main");
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists() && settingsSnap.data().valueDiagnosisFrequency) {
            setLocalFrequency(settingsSnap.data().valueDiagnosisFrequency);
          }
        } catch (e) { console.warn("[ValueDiagnosis] failed to load frequency", e); }

      } catch (e) {
        console.error("fetch value history error", e);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  
  const setAnswer = (id: number, val: number) => setAnswers(prev => ({ ...prev, [String(id)]: val })); // ★ 修正: id を string に変換

  const calculateResult = (currentAnswers: ValueAnswersMap) => {
    const scores: Record<DriverKey, number> = { ACH: 0, CRE: 0, CON: 0, SEC: 0, TRU: 0, JOY: 0 };
    CATEGORIES.forEach(cat => { // ★ 修正: VALUE_QUESTIONS.filter を削除し、直接 CATEGORIES を使用
      const categoryQuestions = VALUE_QUESTIONS.filter(q => q.category === cat.key);
      const sum = categoryQuestions.reduce((acc, q) => acc + (currentAnswers[q.id] ?? 3), 0);
      scores[cat.key] = sum;
    });

    // sort drivers by score
    const entries = (Object.entries(scores) as [DriverKey, number][]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const top1 = entries[0][0];
    const top2 = entries[1][0];
    const keyPair = [top1, top2].sort().join("|");
    const info = TYPE_INFO[keyPair] ?? {
      name: `${top1} × ${top2}`,
      desc: "上位2軸の組み合わせです。",
      habits: [],
    };
    return { scores, top1, top2, type: info.name, info };
  };

  const currentResult = useMemo(() => calculateResult(answers), [answers]);

  const saveResult = async () => {
    if (!uid) {
      console.warn("no uid, cannot save");
      return;
    }
    const todayIso = formatLocalISO(new Date());
    const record = {
      date: todayIso,
      scores: currentResult.scores,
      type: currentResult.type,
      top1: currentResult.top1,
      top2: currentResult.top2,
      answers,
      createdAt: serverTimestamp(),
    };
    try {
      const userHistColRef = collection(db, 'users', uid, 'valueHistory');
      await addDoc(userHistColRef, record);
      const q = query(userHistColRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ValueResultRecord));
      setHistory(items);
      const newRec = items.find(i => i.date === todayIso) ?? null;
      setSelectedRecord(newRec);
      setStep('results');
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    } catch (e) {
      console.error("saveResult error", e);
    }
  };

  const handleSaveFrequency = async () => {
    if (!uid) {
      setIsFrequencyModalOpen(false);
      return;
    }
    const docRef = doc(db, "users", uid, "settings", "main");
    try {
      await setDoc(docRef, { valueDiagnosisFrequency: localFrequency }, { merge: true });
    } catch (e) {
      console.error("save frequency error", e);
    } finally {
      setIsFrequencyModalOpen(false);
    }
  };
  const startQuiz = () => {
    setAnswers(defaultAnswers);
    setPageIndex(0);
    setStep('quiz');
    setSelectedRecord(null);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  };

  const totalPages = Math.ceil(VALUE_QUESTIONS.length / PAGE_SIZE);
  const currentPageQuestions = VALUE_QUESTIONS.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

  if (loading) {
    return <div className="p-6 text-center text-sm text-gray-500">読み込み中...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">価値観診断（Value Compass）</h1>
        <button
          onClick={() => setIsFrequencyModalOpen(true)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          title="診断の頻度を設定"
        >
          頻度設定
        </button>
      </div>

      {step === 'idle' && (
        <div className="bg-white rounded-xl p-6 shadow text-center">
          <h3 className="text-lg font-semibold mb-2">本日の診断結果はまだありません。</h3>
          <p className="text-sm text-gray-600 mb-6">あなたの価値観の軸を発見し、日々の選択に役立てましょう。</p>
          <div className="flex items-center justify-center">
            <button onClick={startQuiz} className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow">診断を開始する</button>
          </div>
        </div>
      )}

      {step === 'quiz' && (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg animate-fade-in">
          <div className="mb-6">
            <div className="text-sm text-gray-500">Value Compass — 質問 {pageIndex * PAGE_SIZE + 1}〜{Math.min((pageIndex+1)*PAGE_SIZE, VALUE_QUESTIONS.length)}</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${((pageIndex + 1) / totalPages) * 100}%` }}></div>
            </div>
          </div>

          <div className="space-y-8">
            {currentPageQuestions.map((q, qi) => (
              <div key={q.id}>
                <p className="font-semibold text-gray-700 mb-3 text-center">{pageIndex * PAGE_SIZE + qi + 1}. {q.text}</p>
                <div className="flex justify-between items-end text-center max-w-2xl mx-auto">
                  {['全く違う','ちょっと違う','どちらでもない','ややそう思う','強くそう思う'].map((label, idx) => {
                    const val = idx + 1;
                    const selected = answers[q.id] === val;
                    return (
                      <div key={val} className="flex flex-col items-center gap-2 w-1/5">
                        <span className="text-xs text-gray-500 h-8 flex items-center text-center">{label}</span>
                        <button
                          onClick={() => setAnswer(q.id, val)}
                          className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 font-bold text-lg transition-all transform ${
                            selected ? 'bg-indigo-600 border-indigo-600 text-white scale-110' : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-400'
                          }`}
                          aria-pressed={selected}
                        >
                          {val}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center flex items-center justify-between">
            <button disabled={pageIndex===0} onClick={() => setPageIndex(p => Math.max(0, p-1))} className="px-4 py-2 border rounded-md text-sm disabled:opacity-50">前へ</button>
            <div>
              {pageIndex < totalPages - 1 ? (
                <button onClick={() => setPageIndex(p => Math.min(totalPages-1, p+1))} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors">次へ</button>
              ) : (
                <button onClick={saveResult} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors">診断を完了する</button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 'results' && selectedRecord && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div className="flex-shrink-0 flex justify-center">
                <HexagonChart
                  values={CATEGORIES.map(c => Number(selectedRecord.scores?.[c.key] ?? 0))}
                  labels={CATEGORIES.map(c => c.name.replace(/\（.*\）/,'').trim())}
                  max={20}
                  size={220}
                />
              </div>

              <div className="flex-1 w-full">
                <div className="text-xs text-gray-500">{formatDateLabel(selectedRecord.date)}の診断結果</div>
                <h3 className="text-xl font-bold text-gray-800 mt-1">{selectedRecord.type}</h3>
                <p className="text-sm text-gray-600 mt-2">{TYPE_INFO[[selectedRecord.top1, selectedRecord.top2].sort().join("|")]?.desc}</p>
                
                <div className="mt-4 space-y-2">
                  {Object.entries(selectedRecord.scores)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, value]) => (
                      <div key={key} className="text-sm flex justify-between items-baseline p-2 bg-gray-50 rounded-md">
                        <span className="text-gray-600">{CATEGORIES.find(c => c.key === key)?.name}</span>
                        <span className="font-semibold text-gray-800">{value as number}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <h4 className="font-semibold">習慣アドバイス — 推奨アクション（上位タイプ向け）</h4>
            <div className="mt-2 space-y-2">
              {TYPE_INFO[[selectedRecord.top1, selectedRecord.top2].sort().join("|")]?.habits?.length > 0 ? (
                TYPE_INFO[[selectedRecord.top1, selectedRecord.top2].sort().join("|")]?.habits.map((h: { title: string; content: string }, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{h.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{h.content}</div>
                    </div>
                    <button
                      onClick={() => {
                        setHabitDraft({ title: h.title, detail: h.content });
                        setIsHabitModalOpen(true);
                      }}
                      className="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                      aria-label="習慣に追加"
                    >
                      +
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-700">一般的な習慣作成から始めましょう（朝のルーチン、週次レビュー、休息の確保など）。</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={startQuiz}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow"
            >
              再診断する
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800">過去の診断結果 <span className="text-sm text-gray-500">（最新5件）</span></h3>
          <button onClick={() => setIsCalendarOpen(true)} className="p-2 rounded-full hover:bg-gray-100" aria-label="カレンダーで過去の診断を表示">
            <CalendarIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        {history.length === 0 ? (
          <div className="text-sm text-gray-500">診断履歴がありません。</div>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 5).map(rec => (
              <li key={rec.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium inline">{formatDateLabel(rec.date)}</div>
                  <div className="ml-3 inline text-sm text-gray-500">{rec.type}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setSelectedRecord(rec); setStep('results'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm text-indigo-600">詳細</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ★ カレンダーモーダルを追加 */}
      <DatePickerModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        initialDate={new Date()}
        highlightedDates={recordDates}
        onDateSelect={(date) => {
          const dStr = date.toLocaleDateString('sv-SE');
          const rec = history.find(h => String(h.date) === dStr) ?? null;
          setSelectedRecord(rec);
          setStep(rec ? 'results' : 'idle');
          setIsCalendarOpen(false);
          try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
        }}
      />

      <AddHabitModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        initial={{ title: habitDraft?.title ?? '', detail: habitDraft?.detail ?? '' }}
        onCreate={handleAddHabit}
      />
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

    </>
  );
}