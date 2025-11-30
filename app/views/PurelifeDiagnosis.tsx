"use client";
import React, { useEffect, useMemo, useState } from "react";
import FrequencyEditor from '../components/FrequencyEditor';
import { PURELIFE_QUESTIONS, PURELIFE_CATEGORIES, PURELIFE_ADVICE } from '../constants';
import { PurelifeAnswersMap, PurelifeResultRecord } from '../types';
import AddHabitModal from '../components/AddHabitModal';
import DatePickerModal from '../components/DatePickerModal';
import { HelpIcon, CalendarIcon } from '../components/Icons';
import { db, auth } from "../../lib/firebase";
import { signInAnonymously } from "firebase/auth";
import { formatLocalISO, formatDateLabel } from '../utils/dates';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { arrayUnion } from "firebase/firestore";

interface PurelifeProps {
  handleAddHabit?: (newHabitData: any) => Promise<void> | void;
  setIsHelpOpen?: (open: boolean) => void;
}

const defaultFrequency = { frequencyType: "daily", frequencyValue: [] };

/* DatePickerModal and RecordsPickerModal unchanged from previous version */
const RecordsPickerModal: React.FC<{ open: boolean; onClose: () => void; onSelect: (rec: PurelifeResultRecord | null) => void; history: PurelifeResultRecord[] }> = ({ open, onClose, onSelect, history }) => {
  if (!open) return null;
  const items = [...history].sort((a,b) => (b.date).localeCompare(a.date)).slice(0, 50);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white rounded-xl p-4 z-10 w-full max-w-md shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">過去の診断</h3>
          <button onClick={onClose} className="text-sm text-gray-500">閉じる</button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.length === 0 ? <div className="text-sm text-gray-500">過去の診断はありません。</div> : items.map(r => (
            <button key={r.id} onClick={() => { onSelect(r); onClose(); }} className="w-full text-left p-3 bg-gray-50 rounded-lg flex items-center gap-3 hover:bg-gray-100">
              <div className="flex-1">
                <div className="font-medium">{formatDateLabel(r.date)}</div>
                <div className="text-xs text-gray-500">総合: {r.overall}/100</div>
              </div>
              <div className="text-sm text-indigo-600">表示</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const recordDatesFromHistory = (history: PurelifeResultRecord[] = []) => {
  return new Set(history.map(h => String(h.date)));
};

const PurelifeDiagnosis: React.FC<PurelifeProps> = ({
  handleAddHabit,
  setIsHelpOpen
}) => {
  // default answers
  const defaultAnswers = useMemo(() => {
    const m: AnswersMap = {};
    PURELIFE_QUESTIONS.forEach(q => { m[q.id] = 3; });
    return m;
  }, []);

  const [answers, setAnswers] = useState<PurelifeAnswersMap>(defaultAnswers);
  const [history, setHistory] = useState<PurelifeResultRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<PurelifeResultRecord | null>(null);
  const [step, setStep] = useState<'idle'|'quiz'|'results'>('idle');
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 5;
  const [isFrequencyModalOpen, setIsFrequencyModalOpen] = useState(false);
  const [localFrequency, setLocalFrequency] = useState<any>(defaultFrequency);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [habitDraft, setHabitDraft] = useState<any>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const recordDates = useMemo(() => recordDatesFromHistory(history), [history]);

  const getCurrentUid = () => {
    try { return auth?.currentUser?.uid ?? null; } catch { return null; }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // ensure anon auth if needed
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
        // per-user subcollection: users/{uid}/purelifeHistory (matches your rules pattern)
        const userHistCol = collection(db, 'users', myUid, 'purelifeHistory');
        const q = query(userHistCol, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const items = snap.docs.map(d => {
          const data: any = d.data();
          return {
            id: d.id,
            date: data.date,
            categories: data.categories || {},
            overall: data.overall || 0,
            createdAt: data.createdAt,
        } as PurelifeResultRecord;
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

        // --- load saved frequency from users/{uid}/settings/main ---
        try {
          const settingsRef = doc(db, "users", myUid, "settings", "main");
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            const data: any = settingsSnap.data();
              // prefer explicit purelife key, fall back to generic 'frequency' if present
            if (data.purelifeFrequency) {
              setLocalFrequency(data.purelifeFrequency);
            } else if (data.frequency) {
              setLocalFrequency(data.frequency);
            }
          }
        } catch (e) {
          console.warn("[Purelife] failed to load saved frequency", e);
        }
         // per-user subcollection done
      } catch (e) {
        console.error("fetch history error", e);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAnswer = (id: string, val: number) => setAnswers(prev => ({ ...prev, [id]: val }));

  const calcCategoryScore = (categoryKey: string, answersMap: PurelifeAnswersMap) => {
    const qs = PURELIFE_QUESTIONS.filter(q => q.category === categoryKey);
    const sumInternal = qs.reduce((acc, q) => acc + ((answersMap[q.id] ?? 3) * 2), 0);
    return sumInternal;
  };

  const categoryScoresForCurrentAnswers = useMemo(() => {
    const obj: Record<string, number> = {};
    PURELIFE_CATEGORIES.forEach(c => { obj[c.key] = calcCategoryScore(c.key, answers); });
    return obj;
  }, [answers]);

  const overallScoreForCurrent = useMemo(() => {
    const totalInternal = Object.values(categoryScoresForCurrentAnswers).reduce((a,b)=>a+b,0);
    return Math.round(totalInternal / 2);
  }, [categoryScoresForCurrentAnswers]);

  const saveResult = async () => {
    // ensure uid / auth
    if (!uid) {
      console.warn("no uid, cannot save");
      return;
    }
    const todayIso = formatLocalISO(new Date());
    const record = {
      date: todayIso,
      categories: categoryScoresForCurrentAnswers,
      overall: overallScoreForCurrent,
      createdAt: serverTimestamp(),
    };
    try {
      // write to users/{uid}/purelifeHistory (one doc per push)
      const userHistColRef = collection(db, 'users', uid, 'purelifeHistory');
      await addDoc(userHistColRef, record);
      // refresh local history
      const q = query(userHistColRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => {
        const data: any = d.data();
        return {
          id: d.id,
          date: data.date,
          categories: data.categories || {},
          overall: data.overall || 0,
          createdAt: data.createdAt,
        } as PurelifeResultRecord;
      });
      setHistory(items);
      const newRec = items.find(i => i.date === todayIso) ?? null;
      setSelectedRecord(newRec);
      setStep('results');

      // append completion date into users/{uid}/settings/main.purelifeCompletedDates (setDoc merge で堅牢化)
      try {
        const settingsRef = doc(db, 'users', uid, 'settings', 'main');
        // setDoc with merge:true + arrayUnion is safe even if doc missing
        // use local ISO (YYYY-MM-DD) to match HabitTracker / selectedDateISO
        await setDoc(settingsRef, { purelifeCompletedDates: arrayUnion(todayIso) }, { merge: true });
      } catch (e) {
        console.warn("[Purelife] failed to append completion date to settings:", e);
      }

      // dispatch global event so other components (MainApp/HabitTracker) update immediately
      try {
        // dispatch same local-ISO date so HabitTracker/MainApp event handler と一致する
        window.dispatchEvent(new CustomEvent('purelife-diagnosis-saved', { detail: { date: todayIso } }));
      } catch (e) { /* noop */ }

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
      console.log("[Purelife] saving frequency -> users/%s/settings/main", uid, { localFrequency });
      // save under a dedicated key "purelifeFrequency" to keep it separate and consistent
      await setDoc(docRef, { purelifeFrequency: localFrequency }, { merge: true });
      // read back to confirm
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        console.log("[Purelife] saved settings doc:", snap.id, snap.data());
      } else {
        console.warn("[Purelife] save succeeded but doc not found after save");
      }
    } catch (e) {
      console.error("save frequency error", e);
    } finally {
      setIsFrequencyModalOpen(false);
    }
  };

  const lowCategories = (record: PurelifeResultRecord | null) => {
    if (!record) return [];
    return Object.entries(record.categories).filter(([k,v]) => v <= 30).map(([k]) => k);
  };

  const viewDetail = (rec: PurelifeResultRecord) => {
    setSelectedRecord(rec);
    setStep('results');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  };

  const totalPages = Math.ceil(PURELIFE_QUESTIONS.length / PAGE_SIZE);

  const startQuiz = () => {
    setAnswers(defaultAnswers);
    setPageIndex(0);
    setStep('quiz');
    setSelectedRecord(null);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  };

  const currentPageQuestions = PURELIFE_QUESTIONS.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

  if (loading) {
    return <div className="p-6 text-center text-sm text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">PureLife診断</h2>
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

      {/* Top: if today's result exists show it, otherwise show no-result UI like other diagnoses */}
      {step === 'idle' && (
        <div className="bg-white rounded-xl p-6 shadow text-center">
          <div className="flex items-center justify-center mb-3">
            <div className="text-sm text-gray-500 mr-3">選択日：</div>
            <div className="font-semibold">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <button className="ml-3 p-2 bg-white border border-gray-200 rounded-lg shadow-sm" aria-label="カレンダー選択">
              <CalendarIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <h3 className="text-lg font-semibold mb-2">本日の診断結果はまだありません。</h3>
          <p className="text-sm text-gray-600 mb-6">診断を実行すると、カテゴリ別のスコアとおすすめアクションが表示されます。まずは気軽に始めてみましょう。</p>

          <div className="flex items-center justify-center">
            <button onClick={startQuiz} className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow">診断を開始する</button>
          </div>
        </div>
      )}

      {/* Quiz: 5問ずつページング（Energy診断と同系の見た目） */}
      {step === 'quiz' && (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg animate-fade-in">
          <div className="mb-6">
            <div className="text-sm text-gray-500">PureLife Check — 質問 {pageIndex * PAGE_SIZE + 1}〜{Math.min((pageIndex+1)*PAGE_SIZE, PURELIFE_QUESTIONS.length)}</div>
            <div className="text-lg font-semibold">{`今の状態を直感で選んでください`}</div>
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
                        <span className="text-xs text-gray-500 h-8 flex items-center">{label}</span>
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

      {/* Results */}
      {step === 'results' && selectedRecord && (
        <div className="bg-white rounded-xl p-4 shadow">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-gray-500">{formatDateLabel(selectedRecord.date)}</div>
              <div className="text-lg font-semibold">PureLife 結果 — {selectedRecord.overall}/100</div>
            </div>
            <div className="text-sm text-gray-600">総括</div>
          </div>

          <div className="mb-3">
            <div className="flex flex-col md:flex-row gap-2 bg-gray-50 rounded p-2">
              {['status','self','vision','action'].map((k) => {
                const v = selectedRecord.categories[k] ?? 0;
                const catLabel = PURELIFE_CATEGORIES.find(c => c.key===k)?.label || k;
                const pct = Math.round((v / 50) * 100);
                const barColor = v >= 40 ? 'bg-green-500' : (v >= 30 ? 'bg-yellow-400' : 'bg-red-500');
                return (
                  <div key={k} className="w-full md:w-1/4 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-gray-700">{catLabel}</div>
                      <div className="text-lg font-bold">{v}/50</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className={`${barColor} h-3 rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* アドバイス：低スコアがあれば改善優先で表示。全て30点以上なら最もスコアの低い項目を「さらに良くする」文脈で表示 */}
          <div className="mt-8">
            {(() => {
              const orderedKeys = ['status','self','vision','action'];
              const entries = orderedKeys.map(k => [k, selectedRecord.categories[k] ?? 0] as [string, number]);
              const lowEntries = entries.filter(([,v]) => v <= 30).sort((a,b) => a[1] - b[1]); // 小さい順（改善が必要）

              // 決定する primaryKey と文脈フラグ
              let primaryKey = '';
              let contextIsImprovement = true;
              if (lowEntries.length > 0) {
                primaryKey = lowEntries[0][0];
                contextIsImprovement = true;
              } else {
                // 全て30点より上：一番スコアが低いカテゴリを選ぶ（entries already ordered for display, but pick numeric min）
                const sorted = entries.slice().sort((a,b) => a[1] - b[1]);
                primaryKey = sorted[0][0];
                contextIsImprovement = false;
              }

              const primaryAdvice = PURELIFE_ADVICE[primaryKey] || [];

              return (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-lg font-bold">{PURELIFE_CATEGORIES.find(c => c.key===primaryKey)?.label}</div>
                      </div>
                      <div className="text-sm text-gray-500">現在: {selectedRecord.categories[primaryKey] ?? 0}/50</div>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">{contextIsImprovement ? 'まずは改善につながる習慣を試しましょう。' : 'さらに伸ばすために取り入れるとよい習慣を紹介します。'}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {primaryAdvice.map((a, idx) => (
                        <div key={idx} className="flex items-stretch gap-3 p-3 bg-gray-50 rounded-lg shadow-sm">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{a.split('：')[0]}</div>
                            <div className="text-sm text-gray-600 mt-1">{a.split('：')[1]}</div>
                          </div>
                          <div className="flex items-start">
                            <button
                              onClick={() => {
                                setHabitDraft({ title: String(a).replace(/^\s*\d+\.\s*/, ''), detail: a });
                                setIsHabitModalOpen(true);
                              }}
                              className="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                              aria-label="習慣に追加"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* History (up to 5) */}
      <div className="bg-white rounded-xl p-4 shadow">
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

        {history.length === 0 ? (
          <div className="text-sm text-gray-500">診断履歴がありません。診断を開始してください。</div>
        ) : (
          <ul className="space-y-2">
            {history.slice(0,5).map(rec => (
              <li key={rec.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="text-sm">
                  <div className="font-medium inline">{formatDateLabel(rec.date)}</div>
                  <div className="ml-3 inline text-sm text-gray-500">総合: {rec.overall}/100</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => viewDetail(rec)} className="text-sm text-indigo-600">詳細</button>
                </div>
              </li>
            ))}
          </ul>
        )}
       </div>

      {/* Frequency modal */}
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

      {/* Calendar (DatePickerModal) / records picker */}
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
      {/* 既存のリストモーダルも残す */}
      <RecordsPickerModal open={false} onClose={() => {}} onSelect={() => {}} history={history} />

      {/* AddHabitModal: opened when user taps + on advice cards */}
      <AddHabitModal
        isOpen={isHabitModalOpen}
        onClose={() => { setIsHabitModalOpen(false); setHabitDraft(null); }}
        initial={{
          title: habitDraft?.title?.replace(/^\s*\d+\.\s*/, '') ?? '',
          detail: habitDraft?.detail ?? ''
        }}
        onCreate={handleAddHabit}
      />
    </div>
  );
}

export default PurelifeDiagnosis