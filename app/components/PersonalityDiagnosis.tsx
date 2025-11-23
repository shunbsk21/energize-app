// ...existing code...
"use client";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { View } from "../types";

// Firestore
import { collection, query, orderBy, onSnapshot, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";

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

/* --- Questions --- */
const QUESTIONS: Question[] = [
  { id: 1, text: "疲れた週末は、家で一人で過ごすよりも、友人と出かけてパーッと発散したい。", dimension: "EI", direction: "positive" },
  { id: 2, text: "考え事をするときは、誰かに話しながら整理するほうが得意だ。", dimension: "EI", direction: "positive" },
  { id: 3, text: "大勢の人がいる交流会やパーティーに参加した後、ひどく疲れを感じて一人になりたくなる。", dimension: "EI", direction: "negative" },
  { id: 4, text: "ランチタイムは、同僚や友人と雑談しながら食べるほうがエネルギーが湧く。", dimension: "EI", direction: "positive" },
  { id: 5, text: "自分が注目の的になることは、プレッシャーというよりは快感だ。", dimension: "EI", direction: "positive" },

  { id: 6, text: "新しい家電やアプリを使うときは、まず説明書やチュートリアルを順に確認したい。", dimension: "SN", direction: "positive" },
  { id: 7, text: "話を聞くとき、具体的な事実よりも、背後の意味や可能性の方に興味がある。", dimension: "SN", direction: "negative" },
  { id: 8, text: "実現していない未来のアイデアを空想するより、目の前の現実的な課題を片付ける方が好きだ。", dimension: "SN", direction: "positive" },
  { id: 9, text: "道順を教えるときは、方角よりも目印で伝えることが多い。", dimension: "SN", direction: "positive" },
  { id: 10, text: "細かい詳細にこだわるあまり、全体の大きな流れを見落とすことがある。", dimension: "SN", direction: "positive" },

  { id: 11, text: "友人に悩みを相談されたら、共感よりも先に解決策を提案したくなる。", dimension: "TF", direction: "positive" },
  { id: 12, text: "重大な決断では、自分の気持ちよりも論理的な正しさを優先する。", dimension: "TF", direction: "positive" },
  { id: 13, text: "議論の場では、誰かの感情を害してでも真実をはっきりさせるべきだと思う。", dimension: "TF", direction: "positive" },
  { id: 14, text: "人を評価するときは、成果よりも努力や貢献心を重視したい。", dimension: "TF", direction: "negative" },
  { id: 15, text: "公平とは同じルールを適用することだと思う。", dimension: "TF", direction: "positive" },

  { id: 16, text: "仕事は余裕を持って前倒しで終わらせたい。", dimension: "JP", direction: "positive" },
  { id: 17, text: "旅行のプランはきっちり決めず、その日の気分で決めるのが好きだ。", dimension: "JP", direction: "negative" },
  { id: 18, text: "部屋やデスクが整理されていないと落ち着かない。", dimension: "JP", direction: "positive" },
  { id: 19, text: "予定が急に変更になってもむしろ楽しめる柔軟性がある。", dimension: "JP", direction: "negative" },
  { id: 20, text: "物事はなるべく早く結論を出してスッキリしたい。", dimension: "JP", direction: "positive" },
];

/* --- Rating options --- */
const RATING_OPTIONS = [
  { value: 1, label: "全く違う" },
  { value: 2, label: "ちょっと違う" },
  { value: 3, label: "どちらでもない" },
  { value: 4, label: "ややそう思う" },
  { value: 5, label: "強くそう思う" },
];

/* --- TYPE_MAP / calc logic reused from previous implementation --- */
const TYPE_MAP: Record<string, { name: string; description: string; habits?: string[] }> = {
  "ESTJ": { name: "組織の指揮者 (ESTJ)", description: "現実的で秩序を重んじ、責任感が強いタイプ。", habits: ["予定表に必ず目を通す","小さなデッドラインを作る"] },
  "ESTP": { name: "行動の達人 (ESTP)", description: "即断即決で実行力のある冒険家タイプ。", habits: ["短時間の集中ワークを取り入れる","身体を動かす習慣を作る"] },
  "ESFJ": { name: "世話好きの世論家 (ESFJ)", description: "人の気持ちに敏感でチームで力を発揮する。", habits: ["感謝を伝える習慣","小さな褒めノート"] },
  "ESFP": { name: "場を盛り上げるパフォーマー (ESFP)", description: "陽気でライブ感を楽しむタイプ。", habits: ["週に1回は友人と会う","短い創作を試す"] },
  "ENTJ": { name: "戦略家の指導者 (ENTJ)", description: "ビジョンを描き、組織を動かすタイプ。", habits: ["目標を1週間単位で設定","週次レビュー"] },
  "ENTP": { name: "アイデアの発火者 (ENTP)", description: "発想豊かで議論を楽しむイノベーター。", habits: ["アイデアノートを持つ","小さな実験をする"] },
  "ENFJ": { name: "人を導く共感者 (ENFJ)", description: "人の成長を助けるカリスマタイプ。", habits: ["誰かの成長を記録する","感情を言語化する時間"] },
  "ENFP": { name: "熱量の伝道師 (ENFP)", description: "情熱的で可能性を追い求めるムードメーカー。", habits: ["新しい趣味を月1で試す","感情日記をつける"] },
  "ISTJ": { name: "堅実な守護者 (ISTJ)", description: "責任感が強く、信頼される実務家。", habits: ["ルーチンタスクを固定化","定期バックアップを習慣化"] },
  "ISTP": { name: "冷静な職人 (ISTP)", description: "問題解決に強く、柔軟に動く職人気質。", habits: ["手を動かす時間を作る","短期的な目標を立てる"] },
  "ISFJ": { name: "献身的な支援者 (ISFJ)", description: "周囲を支える安定の存在。", habits: ["身近な人へ小さな気遣いを","睡眠ルーチンを整える"] },
  "ISFP": { name: "静かな美の探求者 (ISFP)", description: "感性に従い心地よさを追求するタイプ。", habits: ["自然に触れる時間を持つ","クリエイティブな短時間習慣"] },
  "INTJ": { name: "孤高の設計者 (INTJ)", description: "長期的視点でシステムを設計する戦略家。", habits: ["週次の戦略レビュー","静かな集中タイム"] },
  "INTP": { name: "理論を紡ぐ思索家 (INTP)", description: "概念や仕組みを深掘りする探究者。", habits: ["読書ログを残す","少しのメモ習慣"] },
  "INFJ": { name: "洞察の導師 (INFJ)", description: "深い洞察と共感で価値ある導きをする。", habits: ["深掘りの時間を確保","ビジョンノートを作る"] },
  "INFP": { name: "価値を追う理想主義者 (INFP)", description: "内面の価値観に忠実な創造者。", habits: ["気持ちを言語化する習慣","価値リストを作る"] },
};

const fallbackPreference: Record<Dimension, "left" | "right"> = {
  EI: "right",
  SN: "left",
  TF: "left",
  JP: "left",
};

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
    sums[q.dimension] += w;
    counts[q.dimension] += 1;
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
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // 画像マップ（public/images/personalities に配置している前提）
  const IMAGE_FILE_MAP: Record<string, string> = {
    INTJ: '1_INTJ.png',
    INTP: '2_INTP.png',
    ENTJ: '3_ENTJ.png',
    ENTP: '4_ENTP.png',
    INFJ: '5_INFJ.png',
    INFP: '6_INFP.png',
    ENFJ: '7_ENFJ.png',
    ENFP: '8_ENFP.png',
    ISTJ: '9_ISTJ.png',
    ISFJ: '10_ISFJ.png',
    ESTJ: '11_ESTJ.png',
    ESFJ: '12_ESFJ.png',
    ISTP: '13_ISTP.png',
    ISFP: '14_ISFP.png',
    ESTP: '15_ESTP.png',
    ESFP: '16_ESFP.png',
  };

  // submittedResult が変わったら表示用の画像パスを決定
  const resultImageSrc = useMemo(() => {
    if (!submittedResult || !submittedResult.type) return null;
    const file = IMAGE_FILE_MAP[submittedResult.type] ?? `${submittedResult.type}.png`;
    return `/images/16personalities/${encodeURI(file)}`;
  }, [submittedResult]);
  
  // 選択中の過去履歴詳細モーダル制御
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const getImageForType = (type?: string | null) => {
    if (!type) return null;
    const file = IMAGE_FILE_MAP[type] ?? `${type}.png`;
    return `/images/16personalities/${encodeURI(file)}`;
  };

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
        } catch (err) {
          console.error('Failed to save personality result', err);
        }
      } else {
        // fallback: add to local history if not authenticated
        const date = new Date();
        const rec = { id: date.toISOString(), date: date.toLocaleDateString('sv-SE'), type: res.type, percents: res.percents, strength: res.strength };
        setHistory(prev => [rec, ...prev].slice(0, 20));
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
                  const pct = submittedResult.percents[key];
                  const str = submittedResult.strength[key];
                  return (
                    <div key={key} className="flex flex-col">
                      <div className="flex items-center justify-between text-sm text-gray-700">
                        <div className="w-28 text-left text-gray-600">{labelLeft}</div>
                        <div className="text-center text-sm text-gray-800 font-medium">{pct}%</div>
                        <div className="w-28 text-right text-gray-600">{labelRight}</div>
                      </div>
                      {/* 左寄り pct が 50 未満なら右寄り（青を右側に）、50 以上なら左側を青にする */}
                      <div className="w-full rounded-full h-3 mt-2 overflow-hidden">
                        <div className="flex h-3 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`${pct >= 50 ? 'bg-indigo-600' : 'bg-gray-200'} transition-all`}
                          />
                          <div
                            style={{ width: `${100 - pct}%` }}
                            className={`${pct >= 50 ? 'bg-gray-200' : 'bg-indigo-600'} transition-all`}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">強さ: {str}%</div>
                    </div>
                  );
                })}
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700">おすすめの習慣</div>
                <ul className="mt-2 list-disc list-inside text-gray-700">
                  {(TYPE_MAP[submittedResult.type]?.habits ?? ["自分に合う習慣を少し試して継続すること。"]).map((h: string, i: number) => <li key={i}>{h}</li>)}
                </ul>
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